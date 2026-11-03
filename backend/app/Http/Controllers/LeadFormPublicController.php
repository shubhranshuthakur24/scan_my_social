<?php

namespace App\Http\Controllers;

use App\Http\Requests\LeadFormSubmissionRequest;
use App\Models\LeadForm;
use App\Models\LeadFormSubmission;
use App\Services\LeadCaptureService;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class LeadFormPublicController extends Controller
{
    public function show(Request $request, string $publicId)
    {
        $leadForm = $this->resolvePublishedForm($publicId);
        if (! $leadForm) {
            return $this->notFoundResponse($request, $publicId);
        }

        return Inertia::render('LeadForms/PublicShow', [
            'form' => [
                'id' => $leadForm->id,
                'title' => $leadForm->title,
                'description' => $leadForm->description,
                'cover_image_url' => $leadForm->cover_image_url,
                'fields' => $leadForm->fields ?? [],
                'settings' => $leadForm->settings ?? [],
                'public_id' => $leadForm->public_id,
                'submit_url' => route('lead-forms.public.submit', ['publicId' => $leadForm->public_id]),
            ],
        ]);
    }

    public function submit(LeadFormSubmissionRequest $request, string $publicId)
    {
        $leadForm = $this->resolvePublishedForm($publicId);
        if (! $leadForm) {
            return $this->notFoundResponse($request, $publicId);
        }

        $rules = $this->buildSubmissionRules($leadForm);
        $attributes = $this->buildSubmissionAttributes($leadForm);

        $validator = Validator::make($request->all(), $rules, [], $attributes);
        if ($validator->fails()) {
            return back()
                ->withErrors($validator)
                ->withInput();
        }

        $validated = $validator->validated();
        $payload = is_array($validated['data'] ?? null) ? $validated['data'] : [];
        $payload = $this->storeUploadedFiles($payload);

        $submission = LeadFormSubmission::query()->create([
            'lead_form_id' => $leadForm->id,
            'data' => $payload,
            'metadata' => [
                'query' => $request->query(),
                'referer' => $request->headers->get('referer'),
            ],
            'ip' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 512),
            'submitted_at' => now(),
        ]);

        app(LeadCaptureService::class)->fromLeadFormSubmission($submission);

        $settings = is_array($leadForm->settings) ? $leadForm->settings : [];
        $redirectEnabled = (bool) ($settings['redirect_enabled'] ?? false);
        $redirectUrl = trim((string) ($settings['redirect_url'] ?? ''));

        return redirect()
            ->route('lead-forms.public.show', ['publicId' => $leadForm->public_id])
            ->with([
                'success' => (string) ($settings['success_message'] ?? 'Thanks, your response has been recorded.'),
                'redirect_url' => $redirectEnabled && $redirectUrl !== '' ? $redirectUrl : null,
            ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildSubmissionRules(LeadForm $leadForm): array
    {
        $rules = [
            'data' => ['required', 'array'],
        ];

        foreach ($leadForm->fields ?? [] as $field) {
            $key = trim((string) Arr::get($field, 'key'));
            $type = trim((string) Arr::get($field, 'type', 'text'));
            $isRequired = (bool) Arr::get($field, 'required', false);
            $options = collect(Arr::get($field, 'options', []))
                ->map(fn ($option) => trim((string) $option))
                ->filter()
                ->values()
                ->all();

            if ($key === '') {
                continue;
            }

            $fieldPath = "data.{$key}";
            $baseRules = $isRequired ? ['required'] : ['nullable'];

            if ($type === 'email') {
                $rules[$fieldPath] = [...$baseRules, 'string', 'email', 'max:255'];

                continue;
            }

            if ($type === 'number') {
                $rules[$fieldPath] = [...$baseRules, 'numeric'];

                continue;
            }

            if ($type === 'url') {
                $rules[$fieldPath] = [...$baseRules, 'url', 'max:2048'];

                continue;
            }

            if ($type === 'phone') {
                $rules[$fieldPath] = [...$baseRules, 'string', 'max:32', 'regex:/^[0-9+\\-()\\s]{6,32}$/'];

                continue;
            }

            if ($type === 'date') {
                $rules[$fieldPath] = [...$baseRules, 'date'];

                continue;
            }

            if (($type === 'dropdown' || $type === 'radio') && $options !== []) {
                $rules[$fieldPath] = [...$baseRules, Rule::in($options)];

                continue;
            }

            if ($type === 'checkbox') {
                $checkboxRules = [...$baseRules, 'array'];
                if ($isRequired) {
                    $checkboxRules[] = 'min:1';
                }
                $rules[$fieldPath] = $checkboxRules;
                if ($options !== []) {
                    $rules["{$fieldPath}.*"] = [Rule::in($options)];
                }

                continue;
            }

            if ($type === 'rating') {
                $maxRating = max(3, min(10, (int) Arr::get($field, 'max_rating', 5)));
                $rules[$fieldPath] = [...$baseRules, 'integer', "between:1,{$maxRating}"];

                continue;
            }

            if ($type === 'upload') {
                $rules[$fieldPath] = [...$baseRules, 'file', 'max:4096', 'mimes:jpg,jpeg,png,webp,pdf'];

                continue;
            }

            $rules[$fieldPath] = [...$baseRules, 'string', 'max:255'];
        }

        return $rules;
    }

    /**
     * @return array<string, string>
     */
    private function buildSubmissionAttributes(LeadForm $leadForm): array
    {
        $attributes = [
            'data' => 'Form Data',
        ];

        foreach ($leadForm->fields ?? [] as $field) {
            $key = trim((string) Arr::get($field, 'key'));
            $label = trim((string) Arr::get($field, 'label', $key));

            if ($key === '') {
                continue;
            }

            $attributes["data.{$key}"] = $label;
        }

        return $attributes;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function storeUploadedFiles(array $payload): array
    {
        $disk = (string) config('filesystems.upload_disk', 'public');

        foreach ($payload as $key => $value) {
            if (! $value instanceof UploadedFile) {
                continue;
            }

            $path = $value->store('lead-forms/submissions', $disk);
            $payload[$key] = Storage::disk($disk)->url($path);
        }

        return $payload;
    }

    private function resolvePublishedForm(string $publicId): ?LeadForm
    {
        return LeadForm::query()
            ->where('public_id', $publicId)
            ->where('status', 'published')
            ->first();
    }

    private function notFoundResponse(Request $request, string $publicId)
    {
        return Inertia::render('LeadForms/NotFound', [
            'public_id' => $publicId,
        ])->toResponse($request)->setStatusCode(404);
    }
}
