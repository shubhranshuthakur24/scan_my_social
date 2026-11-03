<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AutoDmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $triggerType = trim(strtolower((string) $this->input('trigger_type', '')));
        $isStoryTrigger = $triggerType === 'story';

        $this->merge([
            'match_all_comments' => $isStoryTrigger
                ? false
                : filter_var($this->input('match_all_comments', false), FILTER_VALIDATE_BOOLEAN),
            'reply_messages' => $this->normalizeReplyMessagesPayload($this->input('reply_messages', [])),
            'public_comment_reply' => $isStoryTrigger
                ? []
                : $this->normalizePublicRepliesPayload($this->input('public_comment_reply', [])),
            'public_reply_enabled' => $isStoryTrigger
                ? false
                : filter_var($this->input('public_reply_enabled', false), FILTER_VALIDATE_BOOLEAN),
            'public_reply_limit_enabled' => $isStoryTrigger
                ? false
                : filter_var($this->input('public_reply_limit_enabled', false), FILTER_VALIDATE_BOOLEAN),
            'public_reply_limit_count' => $isStoryTrigger
                ? null
                : $this->input('public_reply_limit_count'),
            'reminder_messages' => $this->normalizeReminderMessagesPayload($this->input('reminder_messages', [])),
        ]);
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $triggerType = trim(strtolower((string) $this->input('trigger_type', '')));
            $isCommentTrigger = in_array($triggerType, ['post', 'reel'], true);
            $matchAllComments = filter_var($this->input('match_all_comments', false), FILTER_VALIDATE_BOOLEAN);

            if (! $isCommentTrigger || ! $matchAllComments) {
                $keywords = collect(explode(',', (string) $this->input('keywords', '')))
                    ->map(fn ($keyword) => trim((string) $keyword))
                    ->filter()
                    ->values();

                if ($keywords->isEmpty()) {
                    $validator->errors()->add('keywords', 'Add at least one keyword or enable "Trigger on any comment".');
                }
            }

            if (! $isCommentTrigger) {
                return;
            }

            $publicReplyEnabled = filter_var($this->input('public_reply_enabled', false), FILTER_VALIDATE_BOOLEAN);
            if (! $publicReplyEnabled) {
                $validator->errors()->add('public_reply_enabled', 'Public reply is required for post/reel flows.');
            }

            $publicReplies = collect($this->input('public_comment_reply', []))
                ->map(fn ($message) => trim((string) $message))
                ->filter()
                ->values();
            if ($publicReplies->isEmpty()) {
                $validator->errors()->add('public_comment_reply', 'Add at least one public reply message for post/reel flows.');
            }
        });
    }

    public function rules(): array
    {
        return [
            'instagram_account_id' => 'required|integer|exists:instagram_accounts,id',
            'name' => 'required|string|max:120',
            'trigger_type' => 'required|in:post,reel,story',
            'trigger_value' => 'required|string',
            'trigger_media_url' => 'nullable|string|max:2048',
            'lead_form_id' => 'nullable|integer|exists:lead_forms,id',
            'keywords' => 'nullable|string',
            'match_all_comments' => 'nullable|boolean',
            'reply_messages' => 'required|array|min:1|max:1',
            'reply_messages.*.message_text' => 'nullable|string|max:1000',
            'reply_messages.*.media_url' => 'nullable|string|max:2048',
            'reply_message_indexes' => 'nullable|array',
            'reply_message_indexes.*' => 'nullable|integer|min:0',
            'reply_images' => 'nullable|array',
            'reply_images.*' => 'nullable|image|max:2048',
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
            'retrigger_existing' => 'nullable|boolean',
        ];
    }

    private function normalizeReplyMessagesPayload(mixed $rawVariants): array
    {
        if (! is_array($rawVariants)) {
            return [];
        }

        return collect($rawVariants)
            ->map(function ($variant) {
                if (is_array($variant)) {
                    return [
                        'message_text' => trim((string) ($variant['message_text'] ?? '')),
                        'media_url' => trim((string) ($variant['media_url'] ?? '')),
                    ];
                }

                return [
                    'message_text' => trim((string) $variant),
                    'media_url' => '',
                ];
            })
            ->values()
            ->all();
    }

    private function normalizePublicRepliesPayload(mixed $rawReplies): array
    {
        if (! is_array($rawReplies)) {
            return [];
        }

        return collect($rawReplies)
            ->map(fn ($reply) => trim((string) $reply))
            ->values()
            ->all();
    }

    private function normalizeReminderMessagesPayload(mixed $rawMessages): array
    {
        if (! is_array($rawMessages)) {
            return [];
        }

        return collect($rawMessages)
            ->map(function ($message) {
                if (is_array($message)) {
                    return trim((string) ($message['message_text'] ?? ''));
                }

                return trim((string) $message);
            })
            ->values()
            ->all();
    }
}
