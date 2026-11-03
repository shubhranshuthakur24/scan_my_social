<?php

namespace App\Http\Controllers;

use App\Http\Requests\AutoDmTemplateRequest;
use App\Models\AutoDmTemplate;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AutoDmTemplateController extends Controller
{
    public function store(AutoDmTemplateRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();
        $isSystemTemplate = (bool) ($validated['is_system'] ?? false);

        if ($isSystemTemplate && ! $user->isSuperAdmin()) {
            abort(403);
        }

        DB::transaction(function () use ($validated, $user, $isSystemTemplate): void {
            $this->persistTemplate($validated, $user, $isSystemTemplate);
        });

        return back()->with('success', $isSystemTemplate
            ? 'System template created successfully.'
            : 'Template saved to your library.');
    }

    public function update(AutoDmTemplateRequest $request, AutoDmTemplate $template): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $validated = $request->validated();
        $isSystemTemplate = (bool) $template->is_system;

        $this->authorizeMutation($user, $template);

        DB::transaction(function () use ($validated, $user, $template, $isSystemTemplate): void {
            $this->persistTemplate($validated, $user, $isSystemTemplate, $template);
        });

        return back()->with('success', 'Template updated successfully.');
    }

    public function destroy(Request $request, AutoDmTemplate $template): RedirectResponse
    {
        /** @var User $user */
        $user = $request->user();
        $this->authorizeMutation($user, $template);

        $template->delete();

        return back()->with('success', 'Template deleted successfully.');
    }

    private function authorizeMutation(User $user, AutoDmTemplate $template): void
    {
        if ((bool) $template->is_system) {
            if (! $user->isSuperAdmin()) {
                abort(403);
            }

            return;
        }

        if ((int) ($template->created_by ?? 0) !== (int) $user->id) {
            abort(403);
        }
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    private function persistTemplate(array $validated, User $user, bool $isSystemTemplate, ?AutoDmTemplate $existing = null): AutoDmTemplate
    {
        $title = trim((string) ($validated['title'] ?? ''));
        $name = trim((string) ($validated['name'] ?? $title));
        $customSlug = trim((string) ($validated['slug'] ?? ''));
        $baseSlug = Str::slug($customSlug !== '' ? $customSlug : $title);
        if ($baseSlug === '') {
            $baseSlug = 'autodm-template';
        }
        $slug = $this->generateUniqueSlug(
            $baseSlug,
            $isSystemTemplate,
            $isSystemTemplate ? null : (int) $user->id,
            $existing?->id
        );
        $useCaseId = (int) ($validated['use_case_id'] ?? 0);
        $isDefault = (bool) ($validated['is_default'] ?? false);

        if ($isDefault) {
            $this->clearExistingDefaultForScope(
                $useCaseId,
                $isSystemTemplate,
                $isSystemTemplate ? null : (int) $user->id,
                $existing?->id
            );
        }

        $payload = $this->buildTemplatePayload($validated, (string) ($validated['trigger_type'] ?? 'post'));

        $attributes = [
            'use_case_id' => $useCaseId,
            'is_system' => $isSystemTemplate,
            'is_default' => $isDefault,
            'is_active' => (bool) ($validated['is_active'] ?? true),
            'recommended' => (bool) ($validated['recommended'] ?? false),
            'name' => $name !== '' ? $name : $title,
            'title' => $title,
            'slug' => $slug,
            'badge' => trim((string) ($validated['badge'] ?? '')) ?: null,
            'trigger_type' => (string) ($validated['trigger_type'] ?? 'post'),
            'content_source' => (string) ($validated['content_source'] ?? 'media'),
            'description' => trim((string) ($validated['description'] ?? '')) ?: null,
            'keywords' => $this->normalizeKeywords($validated['keywords'] ?? []),
            'template_payload' => $payload,
            'sort_order' => (int) ($validated['sort_order'] ?? 0),
        ];

        if ($existing) {
            $existing->fill($attributes);
            $existing->save();

            return $existing;
        }

        $attributes['created_by'] = (int) $user->id;

        return AutoDmTemplate::create($attributes);
    }

    /**
     * @return array<int, string>
     */
    private function normalizeKeywords(mixed $rawKeywords): array
    {
        if (! is_array($rawKeywords)) {
            return [];
        }

        return collect($rawKeywords)
            ->map(fn ($keyword) => trim((string) $keyword))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function buildTemplatePayload(array $validated, string $triggerType): array
    {
        $isCommentTriggerFlow = in_array($triggerType, ['post', 'reel'], true);
        $publicReplyEnabled = $isCommentTriggerFlow && (bool) ($validated['public_reply_enabled'] ?? true);
        $publicReplies = collect($validated['public_comment_reply'] ?? [])
            ->map(fn ($message) => trim((string) $message))
            ->filter()
            ->values()
            ->all();
        $reminderMessages = collect($validated['reminder_messages'] ?? [])
            ->map(fn ($message) => trim((string) $message))
            ->filter()
            ->values()
            ->all();

        if (empty($reminderMessages)) {
            $reminderMessages = [''];
        }

        $replyMessages = collect($validated['reply_messages'] ?? [])
            ->map(function ($item): array {
                $raw = is_array($item) ? $item : [];

                return [
                    'message_text' => trim((string) ($raw['message_text'] ?? '')),
                    'media_url' => trim((string) ($raw['media_url'] ?? '')),
                ];
            })
            ->values()
            ->all();

        if (empty($replyMessages)) {
            $replyMessages = [
                [
                    'message_text' => '',
                    'media_url' => '',
                ],
            ];
        }

        return [
            'reply_messages' => $replyMessages,
            'opening_message_enabled' => (bool) ($validated['opening_message_enabled'] ?? false),
            'opening_message' => (string) ($validated['opening_message'] ?? ''),
            'opening_button_text' => (string) ($validated['opening_button_text'] ?? ''),
            'public_reply_enabled' => $publicReplyEnabled,
            'public_comment_reply' => $publicReplyEnabled ? $publicReplies : [],
            'public_reply_limit_enabled' => $publicReplyEnabled && (bool) ($validated['public_reply_limit_enabled'] ?? true),
            'public_reply_limit_count' => $publicReplyEnabled ? (int) ($validated['public_reply_limit_count'] ?? 200) : 200,
            'ask_to_follow_enabled' => (bool) ($validated['ask_to_follow_enabled'] ?? false),
            'ask_to_follow_strict' => (bool) ($validated['ask_to_follow_strict'] ?? false),
            'ask_to_follow_message' => (string) ($validated['ask_to_follow_message'] ?? ''),
            'reminder_enabled' => (bool) ($validated['reminder_enabled'] ?? false),
            'reminder_delay_hours' => (int) ($validated['reminder_delay_hours'] ?? 20),
            'reminder_messages' => $reminderMessages,
            'reminder_primary_button_text' => (string) ($validated['reminder_primary_button_text'] ?? 'Show me more'),
            'reminder_secondary_button_text' => (string) ($validated['reminder_secondary_button_text'] ?? 'Not now'),
            'reminder_more_message' => (string) ($validated['reminder_more_message'] ?? 'Awesome. Tell me what you need next and I will help.'),
            'reminder_offer_url' => (string) ($validated['reminder_offer_url'] ?? ''),
            'reminder_offer_button_text' => (string) ($validated['reminder_offer_button_text'] ?? 'Get Premium'),
        ];
    }

    private function clearExistingDefaultForScope(int $useCaseId, bool $isSystemTemplate, ?int $userId, ?int $ignoreTemplateId = null): void
    {
        AutoDmTemplate::query()
            ->where('use_case_id', $useCaseId)
            ->where('is_system', $isSystemTemplate)
            ->when(! $isSystemTemplate, function ($query) use ($userId): void {
                $query->where('created_by', $userId);
            })
            ->when($ignoreTemplateId !== null, function ($query) use ($ignoreTemplateId): void {
                $query->where('id', '!=', $ignoreTemplateId);
            })
            ->update(['is_default' => false]);
    }

    private function generateUniqueSlug(string $baseSlug, bool $isSystemTemplate, ?int $userId, ?int $ignoreTemplateId = null): string
    {
        $slug = $baseSlug;
        $suffix = 2;

        while ($this->slugExists($slug, $isSystemTemplate, $userId, $ignoreTemplateId)) {
            $slug = "{$baseSlug}-{$suffix}";
            $suffix++;
        }

        return $slug;
    }

    private function slugExists(string $slug, bool $isSystemTemplate, ?int $userId, ?int $ignoreTemplateId = null): bool
    {
        return AutoDmTemplate::query()
            ->where('slug', $slug)
            ->where('is_system', $isSystemTemplate)
            ->when($isSystemTemplate, function ($query): void {
                $query->whereNotNull('id');
            })
            ->when(! $isSystemTemplate, function ($query) use ($userId): void {
                $query->where('created_by', $userId);
            })
            ->when($ignoreTemplateId !== null, function ($query) use ($ignoreTemplateId): void {
                $query->where('id', '!=', $ignoreTemplateId);
            })
            ->exists();
    }
}
