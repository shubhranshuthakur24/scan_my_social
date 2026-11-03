<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeadFormRequest;
use App\Models\LeadForm;
use App\Models\LeadFormSubmission;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadFormApiController extends Controller
{
    /**
     * Resolve the authenticated user.
     */
    private function resolveUser(Request $request): User
    {
        $user = Auth::user() ?: $request->user();
        if (!$user && app()->environment('local')) {
            $user = User::first();
        }

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        return $user;
    }

    /**
     * Resolve user's form with strict ownership scoping.
     */
    private function resolveUserForm(Request $request, int|string $id): LeadForm
    {
        $user = $this->resolveUser($request);

        return $user->leadForms()
            ->withCount('submissions')
            ->findOrFail($id);
    }

    /**
     * List user's lead forms with search, status filtering, and submission counts.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $query = $user->leadForms()
            ->withCount('submissions')
            ->withMax('submissions as latest_submission_at', 'submitted_at')
            ->latest('updated_at');

        if ($request->filled('q')) {
            $searchTerm = trim((string) $request->input('q'));
            $query->where(function ($q) use ($searchTerm) {
                $q->where('title', 'like', "%{$searchTerm}%")
                    ->orWhere('description', 'like', "%{$searchTerm}%");
            });
        }

        if ($request->filled('status') && in_array($request->input('status'), ['draft', 'published'], true)) {
            $query->where('status', $request->input('status'));
        }

        $perPage = min(50, max(5, (int) $request->input('per_page', 15)));
        $forms = $query->paginate($perPage);

        return response()->json([
            'forms' => $forms->items(),
            'pagination' => [
                'current_page' => $forms->currentPage(),
                'per_page' => $forms->perPage(),
                'total' => $forms->total(),
                'last_page' => $forms->lastPage(),
            ],
        ]);
    }

    /**
     * Create a new draft form.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $leadForm = $user->leadForms()->create([
            'title' => trim($validated['title']),
            'description' => $this->nullableString($validated['description'] ?? null),
            'status' => 'draft',
            'fields' => $this->defaultFields(),
            'settings' => $this->defaultSettings(),
        ]);

        $leadForm->loadCount('submissions');

        return response()->json([
            'success' => true,
            'message' => 'Lead form created successfully.',
            'form' => $leadForm,
        ], 201);
    }

    /**
     * Retrieve a specific form definition.
     */
    public function show(Request $request, int|string $id): JsonResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);

        return response()->json([
            'form' => $leadForm,
        ]);
    }

    /**
     * Update form fields, settings, title, and description.
     */
    public function update(LeadFormRequest $request, int|string $id): JsonResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);
        $validated = $request->validated();

        $leadForm->update([
            'title' => trim((string) ($validated['title'] ?? $leadForm->title)),
            'description' => $this->nullableString($validated['description'] ?? null),
            'cover_image_url' => $this->nullableString($validated['cover_image_url'] ?? null),
            'fields' => $validated['fields'] ?? $leadForm->fields,
            'settings' => $validated['settings'] ?? $this->defaultSettings(),
        ]);

        $leadForm->refresh();
        $leadForm->loadCount('submissions');

        return response()->json([
            'success' => true,
            'message' => 'Lead form updated successfully.',
            'form' => $leadForm,
        ]);
    }

    /**
     * Toggle form publication state.
     */
    public function togglePublish(Request $request, int|string $id): JsonResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);

        if ($leadForm->isPublished()) {
            $leadForm->update([
                'status' => 'draft',
                'published_at' => null,
            ]);

            return response()->json([
                'success' => true,
                'status' => 'draft',
                'published_at' => null,
                'message' => 'Form moved to draft.',
                'form' => $leadForm,
            ]);
        }

        // Validate that form has at least one field before publishing
        $fields = is_array($leadForm->fields) ? $leadForm->fields : [];
        if (empty($fields)) {
            return response()->json([
                'success' => false,
                'message' => 'A form must have at least one field before it can be published.',
            ], 422);
        }

        $leadForm->update([
            'status' => 'published',
            'published_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'status' => 'published',
            'published_at' => $leadForm->published_at?->toISOString(),
            'message' => 'Form published successfully.',
            'form' => $leadForm,
        ]);
    }

    /**
     * Soft delete form (preserves submissions & cover image for super admin audit/recovery).
     */
    public function destroy(Request $request, int|string $id): JsonResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);

        $leadForm->delete();

        return response()->json([
            'success' => true,
            'message' => 'Lead form deleted successfully.',
        ]);
    }

    /**
     * Get paginated submissions for this form.
     */
    public function submissions(Request $request, int|string $id): JsonResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);

        $query = LeadFormSubmission::query()
            ->where('lead_form_id', $leadForm->id)
            ->latest('submitted_at');

        if ($request->filled('q')) {
            $searchTerm = trim((string) $request->input('q'));
            $query->where(function ($q) use ($searchTerm) {
                $q->where('ip', 'like', "%{$searchTerm}%")
                    ->orWhere('data', 'like', "%{$searchTerm}%");
            });
        }

        $perPage = min(100, max(5, (int) $request->input('per_page', 15)));
        $submissions = $query->paginate($perPage);

        return response()->json([
            'submissions' => $submissions->items(),
            'pagination' => [
                'current_page' => $submissions->currentPage(),
                'per_page' => $submissions->perPage(),
                'total' => $submissions->total(),
                'last_page' => $submissions->lastPage(),
            ],
        ]);
    }

    /**
     * Stream CSV export of all submissions using cursor for memory efficiency.
     */
    public function exportSubmissions(Request $request, int|string $id): StreamedResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);

        $fieldKeys = collect($leadForm->fields ?? [])
            ->map(fn ($field) => trim((string) Arr::get($field, 'key')))
            ->filter()
            ->unique()
            ->values();

        $fileName = sprintf('lead-form-%s-submissions-%s.csv', $leadForm->public_id, now()->format('Y-m-d-His'));

        return response()->streamDownload(function () use ($leadForm, $fieldKeys): void {
            $output = fopen('php://output', 'w');
            if ($output === false) {
                return;
            }

            fputcsv($output, ['submission_id', 'submitted_at', 'ip', ...$fieldKeys->all()]);

            LeadFormSubmission::query()
                ->where('lead_form_id', $leadForm->id)
                ->latest('id')
                ->cursor()
                ->each(function (LeadFormSubmission $submission) use ($output, $fieldKeys): void {
                    $row = [
                        $submission->id,
                        $submission->submitted_at?->toDateTimeString(),
                        $submission->ip,
                    ];

                    $data = is_array($submission->data) ? $submission->data : [];
                    foreach ($fieldKeys as $key) {
                        $value = $data[$key] ?? null;
                        if (is_array($value)) {
                            $row[] = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
                        } else {
                            $row[] = (string) ($value ?? '');
                        }
                    }

                    fputcsv($output, $row);
                    if (ob_get_level() > 0) {
                        ob_flush();
                    }
                    flush();
                });

            fclose($output);
        }, $fileName, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    /**
     * Upload cover banner image.
     */
    public function uploadCover(Request $request, int|string $id): JsonResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);

        $request->validate([
            'image' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'mimetypes:image/jpeg,image/png,image/webp',
                'max:5120',
            ],
        ]);

        $disk = (string) config('filesystems.upload_disk', 'public');
        $this->deleteManagedCoverImage($leadForm->cover_image_url);

        $path = $request->file('image')->store('lead-form-covers', $disk);
        $url = Storage::disk($disk)->url($path);

        $leadForm->update(['cover_image_url' => $url]);

        return response()->json([
            'success' => true,
            'cover_image_url' => $url,
            'message' => 'Cover image uploaded successfully.',
        ]);
    }

    /**
     * Remove cover banner image.
     */
    public function removeCover(Request $request, int|string $id): JsonResponse
    {
        $leadForm = $this->resolveUserForm($request, $id);

        $this->deleteManagedCoverImage($leadForm->cover_image_url);
        $leadForm->update(['cover_image_url' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Cover image removed successfully.',
        ]);
    }

    private function defaultFields(): array
    {
        return [
            [
                'id' => 'name',
                'key' => 'name',
                'type' => 'text',
                'label' => 'Name',
                'placeholder' => 'Enter your name',
                'required' => true,
                'options' => [],
                'max_rating' => 5,
            ],
            [
                'id' => 'email',
                'key' => 'email',
                'type' => 'email',
                'label' => 'Email',
                'placeholder' => 'Enter your email',
                'required' => true,
                'options' => [],
                'max_rating' => 5,
            ],
        ];
    }

    private function defaultSettings(): array
    {
        return [
            'redirect_enabled' => false,
            'redirect_url' => '',
            'submit_button_label' => 'Submit',
            'success_message' => 'Thanks, your response has been recorded.',
        ];
    }

    private function nullableString(mixed $value): ?string
    {
        $normalized = trim((string) $value);

        return $normalized === '' ? null : $normalized;
    }

    private function deleteManagedCoverImage(?string $coverImageUrl): void
    {
        if (!$coverImageUrl) {
            return;
        }

        $disks = array_values(array_unique([
            (string) config('filesystems.upload_disk', 'public'),
            'r2',
            'public',
        ]));

        foreach ($disks as $disk) {
            $resolvedPath = $this->resolveDiskPath($coverImageUrl, $disk);
            if ($resolvedPath !== null && Storage::disk($disk)->exists($resolvedPath)) {
                Storage::disk($disk)->delete($resolvedPath);
                return;
            }
        }
    }

    private function resolveDiskPath(string $fileUrl, string $disk): ?string
    {
        if ($disk === 'public') {
            if (str_starts_with($fileUrl, '/storage/')) {
                return str_replace('/storage/', '', $fileUrl);
            }

            $storageUrlPrefix = (string) Storage::disk('public')->url('');
            if ($storageUrlPrefix !== '' && str_starts_with($fileUrl, $storageUrlPrefix)) {
                return ltrim(substr($fileUrl, strlen($storageUrlPrefix)), '/');
            }
        }

        $diskUrl = (string) Storage::disk($disk)->url('');
        if ($diskUrl !== '' && str_starts_with($fileUrl, $diskUrl)) {
            return ltrim(substr($fileUrl, strlen($diskUrl)), '/');
        }

        return null;
    }
}
