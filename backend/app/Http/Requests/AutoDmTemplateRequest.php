<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AutoDmTemplateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    protected function prepareForValidation(): void
    {
        $triggerType = trim(strtolower((string) $this->input('trigger_type', 'post')));
        $isCommentTriggerFlow = in_array($triggerType, ['post', 'reel'], true);
        $reminderMessages = $this->normalizeStringArray($this->input('reminder_messages', []));
        $publicCommentReply = $isCommentTriggerFlow
            ? $this->normalizeStringArray($this->input('public_comment_reply', []))
            : [];

        $this->merge([
            'title' => trim((string) $this->input('title', '')),
            'name' => trim((string) $this->input('name', $this->input('title', ''))),
            'slug' => trim((string) $this->input('slug', '')),
            'badge' => trim((string) $this->input('badge', '')),
            'description' => trim((string) $this->input('description', '')),
            'trigger_type' => $triggerType,
            'content_source' => trim(strtolower((string) $this->input('content_source', 'media'))),
            'keywords' => $this->normalizeStringArray($this->input('keywords', [])),
            'reply_messages' => $this->normalizeReplyMessages($this->input('reply_messages', [])),
            'opening_message_enabled' => filter_var($this->input('opening_message_enabled', false), FILTER_VALIDATE_BOOLEAN),
            'opening_message' => trim((string) $this->input('opening_message', '')),
            'opening_button_text' => trim((string) $this->input('opening_button_text', '')),
            'public_reply_enabled' => $isCommentTriggerFlow
                ? filter_var($this->input('public_reply_enabled', true), FILTER_VALIDATE_BOOLEAN)
                : false,
            'public_comment_reply' => $publicCommentReply,
            'public_reply_limit_enabled' => $isCommentTriggerFlow
                ? filter_var($this->input('public_reply_limit_enabled', true), FILTER_VALIDATE_BOOLEAN)
                : false,
            'public_reply_limit_count' => $isCommentTriggerFlow
                ? (int) $this->input('public_reply_limit_count', 200)
                : null,
            'ask_to_follow_enabled' => filter_var($this->input('ask_to_follow_enabled', false), FILTER_VALIDATE_BOOLEAN),
            'ask_to_follow_strict' => filter_var($this->input('ask_to_follow_strict', false), FILTER_VALIDATE_BOOLEAN),
            'ask_to_follow_message' => trim((string) $this->input('ask_to_follow_message', '')),
            'reminder_enabled' => filter_var($this->input('reminder_enabled', false), FILTER_VALIDATE_BOOLEAN),
            'reminder_delay_hours' => (int) $this->input('reminder_delay_hours', 20),
            'reminder_messages' => $reminderMessages,
            'reminder_primary_button_text' => trim((string) $this->input('reminder_primary_button_text', 'Show me more')),
            'reminder_secondary_button_text' => trim((string) $this->input('reminder_secondary_button_text', 'Not now')),
            'reminder_more_message' => trim((string) $this->input('reminder_more_message', 'Awesome. Tell me what you need next and I will help.')),
            'reminder_offer_url' => trim((string) $this->input('reminder_offer_url', '')),
            'reminder_offer_button_text' => trim((string) $this->input('reminder_offer_button_text', 'Get Premium')),
            'is_system' => filter_var($this->input('is_system', false), FILTER_VALIDATE_BOOLEAN),
            'is_default' => filter_var($this->input('is_default', false), FILTER_VALIDATE_BOOLEAN),
            'is_active' => filter_var($this->input('is_active', true), FILTER_VALIDATE_BOOLEAN),
            'recommended' => filter_var($this->input('recommended', false), FILTER_VALIDATE_BOOLEAN),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $replyMessages = collect($this->input('reply_messages', []));
            $hasReplyContent = $replyMessages->contains(function ($reply): bool {
                $payload = is_array($reply) ? $reply : [];

                return trim((string) ($payload['message_text'] ?? '')) !== ''
                    || trim((string) ($payload['media_url'] ?? '')) !== '';
            });

            if (! $hasReplyContent) {
                $validator->errors()->add('reply_messages', 'Add at least one reply message with text or media URL.');
            }

            if ((bool) $this->input('opening_message_enabled') && trim((string) $this->input('opening_message')) === '') {
                $validator->errors()->add('opening_message', 'Opening message is required when enabled.');
            }

            $triggerType = (string) $this->input('trigger_type', 'post');
            $isCommentTriggerFlow = in_array($triggerType, ['post', 'reel'], true);
            $publicReplies = collect($this->input('public_comment_reply', []))
                ->map(fn ($value) => trim((string) $value))
                ->filter();

            if ($isCommentTriggerFlow && $publicReplies->isEmpty()) {
                $validator->errors()->add('public_comment_reply', 'Add at least one public comment reply for post/reel templates.');
            }

            if ((bool) $this->input('reminder_enabled')) {
                $reminderMessages = collect($this->input('reminder_messages', []))
                    ->map(fn ($value) => trim((string) $value))
                    ->filter();

                if ($reminderMessages->isEmpty()) {
                    $validator->errors()->add('reminder_messages', 'Add at least one reminder message when reminders are enabled.');
                }
            }
        });
    }

    public function rules(): array
    {
        return [
            'use_case_id' => 'required|integer|exists:autodm_template_use_cases,id',
            'title' => 'required|string|max:120',
            'name' => 'required|string|max:120',
            'slug' => 'nullable|string|max:180',
            'badge' => 'nullable|string|max:40',
            'description' => 'nullable|string|max:300',
            'trigger_type' => 'required|in:post,reel,story,any',
            'content_source' => 'required|in:media,story,any',
            'keywords' => 'nullable|array|max:25',
            'keywords.*' => 'nullable|string|max:80',
            'reply_messages' => 'required|array|min:1|max:3',
            'reply_messages.*.message_text' => 'nullable|string|max:1000',
            'reply_messages.*.media_url' => 'nullable|string|max:2048',
            'opening_message_enabled' => 'nullable|boolean',
            'opening_message' => 'nullable|string|max:1000',
            'opening_button_text' => 'nullable|string|max:80',
            'public_reply_enabled' => 'nullable|boolean',
            'public_comment_reply' => 'nullable|array|max:4',
            'public_comment_reply.*' => 'nullable|string|max:500',
            'public_reply_limit_enabled' => 'nullable|boolean',
            'public_reply_limit_count' => 'nullable|integer|min:1|max:5000',
            'ask_to_follow_enabled' => 'nullable|boolean',
            'ask_to_follow_strict' => 'nullable|boolean',
            'ask_to_follow_message' => 'nullable|string|max:1000',
            'reminder_enabled' => 'nullable|boolean',
            'reminder_delay_hours' => 'nullable|integer|between:20,23',
            'reminder_messages' => 'nullable|array|max:3',
            'reminder_messages.*' => 'nullable|string|max:1000',
            'reminder_primary_button_text' => 'nullable|string|max:30',
            'reminder_secondary_button_text' => 'nullable|string|max:30',
            'reminder_more_message' => 'nullable|string|max:1000',
            'reminder_offer_url' => 'nullable|url|max:2048',
            'reminder_offer_button_text' => 'nullable|string|max:30',
            'is_system' => 'nullable|boolean',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
            'recommended' => 'nullable|boolean',
        ];
    }

    /**
     * @return array<int, string>
     */
    private function normalizeStringArray(mixed $rawValues): array
    {
        if (! is_array($rawValues)) {
            return [];
        }

        return collect($rawValues)
            ->map(fn ($value) => trim((string) $value))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{message_text: string, media_url: string}>
     */
    private function normalizeReplyMessages(mixed $rawReplies): array
    {
        if (! is_array($rawReplies)) {
            return [];
        }

        return collect($rawReplies)
            ->map(function ($reply): array {
                if (is_array($reply)) {
                    return [
                        'message_text' => trim((string) ($reply['message_text'] ?? '')),
                        'media_url' => trim((string) ($reply['media_url'] ?? '')),
                    ];
                }

                return [
                    'message_text' => trim((string) $reply),
                    'media_url' => '',
                ];
            })
            ->values()
            ->all();
    }
}
