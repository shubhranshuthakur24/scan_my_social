<?php

namespace App\Http\Controllers;

use App\Http\Requests\LeadFormRequest;
use App\Models\LeadForm;
use App\Models\LeadFormSubmission;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class LeadFormController extends Controller
{
    public function index()
    {
        $forms = LeadForm::query()
            ->where('user_id', auth()->id())
            ->withCount('submissions')
            ->latest('id')
            ->get()
            ->map(fn (LeadForm $leadForm) => $this->transformForList($leadForm))
            ->values();

        return Inertia::render('LeadForms/Index', [
            'forms' => $forms,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:120'],
            'description' => ['nullable', 'string', 'max:500'],
        ]);

        $leadForm = LeadForm::query()->create([
            'user_id' => (int) auth()->id(),
            'title' => $validated['title'],
            'description' => $validated['description'],
            'status' => 'draft',
            'fields' => $this->defaultFields(),
            'settings' => $this->defaultSettings(),
        ]);

        return redirect()
            ->route('lead-forms.show', $leadForm)
            ->with('success', 'Lead form created. Start building your fields!');
    }

    public function show(Request $request, LeadForm $leadForm)
    {
        $this->authorizeOwnership($leadForm);

        $activeTab = $this->resolveTab($request->query('tab'));
        $leadForm->loadCount('submissions');

        return Inertia::render('LeadForms/Show', [
            'active_tab' => $activeTab,
            'form' => $this->transformForShow($leadForm),
            'public_form_base_url' => route('lead-forms.public.show', ['publicId' => '__PUBLIC_ID__']),
        ]);
    }

    public function update(LeadFormRequest $request, LeadForm $leadForm)
    {
        $this->authorizeOwnership($leadForm);

        $validated = $request->validated();
        $status = (string) ($validated['status'] ?? 'draft');

        $leadForm->update([
            'title' => trim((string) ($validated['title'] ?? 'Untitled Form')),
            'description' => $this->nullableString($validated['description'] ?? null),
            'cover_image_url' => $this->nullableString($validated['cover_image_url'] ?? null),

            'status' => $status,
            'fields' => $validated['fields'] ?? [],
            'settings' => $validated['settings'] ?? $this->defaultSettings(),
            'published_at' => $status === 'published'
                ? ($leadForm->published_at ?? now())
                : null,
        ]);

        return back()->with('success', 'Lead form updated successfully.');
    }

    public function togglePublish(LeadForm $leadForm)
    {
        $this->authorizeOwnership($leadForm);

        if ($leadForm->isPublished()) {
            $leadForm->update([
                'status' => 'draft',
                'published_at' => null,
            ]);

            return back()->with('success', 'Form moved to draft.');
        }

        $leadForm->update([
            'status' => 'published',
            'published_at' => now(),
        ]);

        return back()->with('success', 'Form published successfully.');
    }

    public function submissions(Request $request, LeadForm $leadForm)
    {
        $this->authorizeOwnership($leadForm);

        $submissions = LeadFormSubmission::query()
            ->where('lead_form_id', $leadForm->id)
            ->latest('id')
            ->paginate(20)
            ->through(fn (LeadFormSubmission $submission): array => [
                'id' => $submission->id,
                'submitted_at' => $submission->submitted_at?->toIso8601String(),
                'data' => $submission->data ?? [],
                'metadata' => $submission->metadata ?? [],
            ]);

        return Inertia::render('LeadForms/Submissions', [
            'form' => $this->transformForShow($leadForm),
            'submissions' => $submissions,
        ]);
    }

    public function destroy(LeadForm $leadForm)
    {
        $this->authorizeOwnership($leadForm);
        $leadForm->delete();

        return redirect()
            ->route('lead-forms.index')
            ->with('success', 'Lead form deleted.');
    }

    public function uploadCoverImage(Request $request, LeadForm $leadForm)
    {
        $this->authorizeOwnership($leadForm);

        $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        if ($request->hasFile('image')) {
            $disk = (string) config('filesystems.upload_disk', 'public');
            $this->deleteManagedCoverImage($leadForm->cover_image_url);

            $path = $request->file('image')->store('lead-form-covers', $disk);
            $url = Storage::disk($disk)->url($path);

            $leadForm->update(['cover_image_url' => $url]);

            return back()->with('success', 'Cover image uploaded.');
        }

        return back()->with('error', 'No image file provided.');
    }

    public function removeCoverImage(LeadForm $leadForm)
    {
        $this->authorizeOwnership($leadForm);

        $this->deleteManagedCoverImage($leadForm->cover_image_url);

        $leadForm->update(['cover_image_url' => null]);

        return back()->with('success', 'Cover image removed.');
    }

    public function exportSubmissions(LeadForm $leadForm): StreamedResponse
    {
        $this->authorizeOwnership($leadForm);

        $fieldKeys = collect($leadForm->fields ?? [])
            ->map(fn ($field) => trim((string) Arr::get($field, 'key')))
            ->filter()
            ->unique()
            ->values();

        $fileName = 'lead_form_'.$leadForm->id.'_submissions_'.now()->format('Ymd_His').'.csv';

        return response()->streamDownload(function () use ($leadForm, $fieldKeys): void {
            $output = fopen('php://output', 'w');

            if ($output === false) {
                return;
            }

            fputcsv($output, ['submission_id', 'submitted_at', ...$fieldKeys->all()]);

            LeadFormSubmission::query()
                ->where('lead_form_id', $leadForm->id)
                ->latest('id')
                ->cursor()
                ->each(function (LeadFormSubmission $submission) use ($output, $fieldKeys): void {
                    $row = [
                        $submission->id,
                        $submission->submitted_at?->toDateTimeString(),
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
                });

            fclose($output);
        }, $fileName, [
            'Content-Type' => 'text/csv',
        ]);
    }

    private function authorizeOwnership(LeadForm $leadForm): void
    {
        if ((int) $leadForm->user_id !== (int) auth()->id()) {
            abort(403);
        }
    }

    private function resolveTab(?string $tab): string
    {
        $allowed = ['summary', 'editor', 'submissions', 'settings'];

        return in_array($tab, $allowed, true) ? $tab : 'summary';
    }

    /**
     * @return array<int, array<string, mixed>>
     */
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

    /**
     * @return array<string, mixed>
     */
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
        if (! $coverImageUrl) {
            return;
        }

        foreach ($this->coverImageDeletableDisks() as $disk) {
            $resolvedPath = $this->resolveDiskPath($coverImageUrl, $disk);

            if ($resolvedPath !== null) {
                Storage::disk($disk)->delete($resolvedPath);

                return;
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function coverImageDeletableDisks(): array
    {
        return array_values(array_unique([
            (string) config('filesystems.upload_disk', 'public'),
            'r2',
            'public',
        ]));
    }

    private function resolveDiskPath(string $fileUrl, string $disk): ?string
    {
        if ($disk === 'public') {
            $publicPath = '/storage/';
            if (str_starts_with($fileUrl, $publicPath)) {
                return ltrim(Str::after($fileUrl, $publicPath), '/');
            }
        }

        if (! filter_var($fileUrl, FILTER_VALIDATE_URL)) {
            return null;
        }

        $diskBaseUrl = rtrim((string) Storage::disk($disk)->url(''), '/');
        if ($diskBaseUrl === '' || ! str_starts_with($fileUrl, $diskBaseUrl)) {
            return null;
        }

        $relativePath = ltrim(Str::after($fileUrl, $diskBaseUrl), '/');

        return $relativePath === '' ? null : $relativePath;
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForList(LeadForm $leadForm): array
    {
        return [
            'id' => $leadForm->id,
            'title' => $leadForm->title,
            'status' => $leadForm->status,
            'cover_image_url' => $leadForm->cover_image_url,
            'submissions_count' => (int) ($leadForm->submissions_count ?? 0),
            'published_at' => $leadForm->published_at?->toIso8601String(),
            'updated_at' => $leadForm->updated_at?->toIso8601String(),
            'public_id' => $leadForm->public_id,
            'public_url' => route('lead-forms.public.show', ['publicId' => $leadForm->public_id]),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function transformForShow(LeadForm $leadForm): array
    {
        return [
            'id' => $leadForm->id,
            'title' => $leadForm->title,
            'description' => $leadForm->description,
            'cover_image_url' => $leadForm->cover_image_url,
            'public_id' => $leadForm->public_id,
            'public_url' => route('lead-forms.public.show', ['publicId' => $leadForm->public_id]),
            'status' => $leadForm->status,
            'fields' => $leadForm->fields ?? [],
            'settings' => $leadForm->settings ?? $this->defaultSettings(),
            'submissions_count' => (int) ($leadForm->submissions_count ?? 0),
            'published_at' => $leadForm->published_at?->toIso8601String(),
            'created_at' => $leadForm->created_at?->toIso8601String(),
            'updated_at' => $leadForm->updated_at?->toIso8601String(),
        ];
    }
}
