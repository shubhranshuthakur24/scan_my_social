<?php

namespace App\Services;

use App\Models\AutoDmTemplate;
use App\Models\AutoDmTemplateUseCase;
use App\Models\User;
use Illuminate\Support\Collection;

class AutoDmTemplateCatalogService
{
    /**
     * @return array{
     *     use_cases: array<int, array<string, mixed>>,
     *     templates: array<int, array<string, mixed>>
     * }
     */
    public function catalogForUser(User $user): array
    {
        $useCases = AutoDmTemplateUseCase::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        $templates = AutoDmTemplate::query()
            ->with('useCase:id,name,slug,sort_order')
            ->visibleToUser((int) $user->id)
            ->orderBy('use_case_id')
            ->orderByDesc('is_default')
            ->orderByDesc('is_system')
            ->orderByDesc('recommended')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get();

        return [
            'use_cases' => $useCases->map(fn (AutoDmTemplateUseCase $useCase): array => [
                'id' => (int) $useCase->id,
                'name' => (string) $useCase->name,
                'slug' => (string) $useCase->slug,
                'description' => (string) ($useCase->description ?? ''),
                'sort_order' => (int) ($useCase->sort_order ?? 0),
            ])->values()->all(),
            'templates' => $this->transformTemplates($templates, $user)->values()->all(),
        ];
    }

    /**
     * @param  Collection<int, AutoDmTemplate>  $templates
     * @return Collection<int, array<string, mixed>>
     */
    private function transformTemplates(Collection $templates, User $user): Collection
    {
        return $templates->map(function (AutoDmTemplate $template) use ($user): array {
            $payload = is_array($template->template_payload) ? $template->template_payload : [];
            $keywords = collect(is_array($template->keywords) ? $template->keywords : [])
                ->map(fn ($keyword) => trim((string) $keyword))
                ->filter()
                ->values()
                ->all();
            $replyMessages = collect(is_array($payload['reply_messages'] ?? null) ? $payload['reply_messages'] : [])
                ->map(function ($reply): array {
                    $raw = is_array($reply) ? $reply : [];

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

            $reminderMessages = collect(is_array($payload['reminder_messages'] ?? null) ? $payload['reminder_messages'] : [])
                ->map(fn ($message) => trim((string) $message))
                ->filter()
                ->values()
                ->all();

            if (empty($reminderMessages)) {
                $reminderMessages = [''];
            }

            $isSystemTemplate = (bool) $template->is_system;
            $isOwner = (int) ($template->created_by ?? 0) === (int) $user->id;
            $isSuperAdmin = $user->isSuperAdmin();

            return [
                'id' => (int) $template->id,
                'name' => (string) $template->name,
                'title' => (string) $template->title,
                'slug' => (string) $template->slug,
                'badge' => (string) ($template->badge ?? ($isSystemTemplate ? 'System' : 'My Template')),
                'description' => (string) ($template->description ?? ''),
                'recommended' => (bool) $template->recommended,
                'trigger_type' => (string) ($template->trigger_type ?? 'post'),
                'content_source' => (string) ($template->content_source ?? 'media'),
                'keywords' => $keywords,
                'reply_messages' => $replyMessages,
                'opening_message_enabled' => (bool) ($payload['opening_message_enabled'] ?? false),
                'opening_message' => (string) ($payload['opening_message'] ?? ''),
                'opening_button_text' => (string) ($payload['opening_button_text'] ?? ''),
                'public_reply_enabled' => (bool) ($payload['public_reply_enabled'] ?? true),
                'public_comment_reply' => array_values(array_filter(
                    collect(is_array($payload['public_comment_reply'] ?? null) ? $payload['public_comment_reply'] : [])
                        ->map(fn ($message) => trim((string) $message))
                        ->all(),
                    fn (string $message) => $message !== ''
                )),
                'public_reply_limit_enabled' => (bool) ($payload['public_reply_limit_enabled'] ?? true),
                'public_reply_limit_count' => (int) ($payload['public_reply_limit_count'] ?? 200),
                'ask_to_follow_enabled' => (bool) ($payload['ask_to_follow_enabled'] ?? false),
                'ask_to_follow_strict' => (bool) ($payload['ask_to_follow_strict'] ?? false),
                'ask_to_follow_message' => (string) ($payload['ask_to_follow_message'] ?? ''),
                'reminder_enabled' => (bool) ($payload['reminder_enabled'] ?? false),
                'reminder_delay_hours' => (int) ($payload['reminder_delay_hours'] ?? 20),
                'reminder_messages' => $reminderMessages,
                'reminder_primary_button_text' => (string) ($payload['reminder_primary_button_text'] ?? 'Show me more'),
                'reminder_secondary_button_text' => (string) ($payload['reminder_secondary_button_text'] ?? 'Not now'),
                'reminder_more_message' => (string) ($payload['reminder_more_message'] ?? 'Awesome. Tell me what you need next and I will help.'),
                'reminder_offer_url' => (string) ($payload['reminder_offer_url'] ?? ''),
                'reminder_offer_button_text' => (string) ($payload['reminder_offer_button_text'] ?? 'Get Premium'),
                'use_case_id' => (int) $template->use_case_id,
                'use_case_name' => (string) ($template->useCase?->name ?? ''),
                'use_case_slug' => (string) ($template->useCase?->slug ?? ''),
                'is_system' => $isSystemTemplate,
                'is_default' => (bool) $template->is_default,
                'is_active' => (bool) $template->is_active,
                'can_edit' => $isSystemTemplate ? $isSuperAdmin : $isOwner,
                'can_delete' => $isSystemTemplate ? $isSuperAdmin : $isOwner,
            ];
        });
    }
}
