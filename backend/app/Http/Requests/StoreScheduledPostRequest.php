<?php

namespace App\Http\Requests;

use App\Models\ContentSchedulerMedia;
use App\Models\InstagramAccount;
use App\Models\ScheduledPost;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreScheduledPostRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $isPublishingNow = $this->boolean('publish_now');
        $scheduledAtRules = [
            Rule::requiredIf(fn (): bool => $this->input('status') === ScheduledPost::STATUS_SCHEDULED && ! $isPublishingNow),
            'nullable',
            'date',
        ];

        if (! $isPublishingNow) {
            $scheduledAtRules[] = 'after:now';
        }

        return [
            'draft_post_id' => ['nullable', 'integer', Rule::exists('scheduled_posts', 'id')],
            'instagram_account_id' => ['required', 'integer', Rule::exists('instagram_accounts', 'id')],
            'title' => ['nullable', 'string', 'max:120'],
            'format' => ['required', 'string', Rule::in([
                ScheduledPost::FORMAT_IMAGE,
                ScheduledPost::FORMAT_VIDEO,
                ScheduledPost::FORMAT_REEL,
                ScheduledPost::FORMAT_STORY,
                ScheduledPost::FORMAT_CAROUSEL,
            ])],
            'status' => ['required', 'string', Rule::in([
                ScheduledPost::STATUS_DRAFT,
                ScheduledPost::STATUS_SCHEDULED,
            ])],
            'caption' => ['nullable', 'string', 'max:2200'],
            'hashtags' => ['nullable', 'array', 'max:30'],
            'hashtags.*' => ['string', 'max:80'],
            'media_asset_ids' => ['required', 'array', 'min:1', 'max:10'],
            'media_asset_ids.*' => ['integer', 'distinct', Rule::exists('content_scheduler_media', 'id')],
            'scheduled_at' => $scheduledAtRules,
            'publish_now' => ['nullable', 'boolean'],
            'options' => ['nullable', 'array'],
            'options.alt_text' => ['nullable', 'string', 'max:1000'],
            'options.location_id' => ['nullable', 'string', 'max:120'],
            'options.share_to_feed' => ['nullable', 'boolean'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $user = $this->user();
                if (! $user) {
                    return;
                }

                $account = InstagramAccount::query()
                    ->whereKey($this->integer('instagram_account_id'))
                    ->where('user_id', $user->id)
                    ->first();

                if (! $account) {
                    $validator->errors()->add('instagram_account_id', 'Select one of your connected Instagram accounts.');
                } elseif ($account->status !== 'active') {
                    $validator->errors()->add('instagram_account_id', 'This Instagram account is disconnected.');
                }

                $mediaIds = collect($this->input('media_asset_ids', []))
                    ->map(fn ($id): int => (int) $id)
                    ->filter()
                    ->values();

                $media = ContentSchedulerMedia::query()
                    ->where('user_id', $user->id)
                    ->whereIn('id', $mediaIds)
                    ->get();

                if ($media->count() !== $mediaIds->count()) {
                    $validator->errors()->add('media_asset_ids', 'Select media from your scheduler library.');

                    return;
                }

                $format = (string) $this->input('format');
                $mediaTypes = $media->pluck('media_type')->values();
                $mediaCount = $media->count();

                if (in_array($format, [ScheduledPost::FORMAT_IMAGE, ScheduledPost::FORMAT_VIDEO, ScheduledPost::FORMAT_REEL, ScheduledPost::FORMAT_STORY], true) && $mediaCount !== 1) {
                    $validator->errors()->add('media_asset_ids', 'This format requires exactly one media asset.');
                }

                if ($format === ScheduledPost::FORMAT_IMAGE && $mediaTypes->contains(fn ($type): bool => $type !== 'image')) {
                    $validator->errors()->add('media_asset_ids', 'Image posts require an image asset.');
                }

                if (in_array($format, [ScheduledPost::FORMAT_VIDEO, ScheduledPost::FORMAT_REEL], true) && $mediaTypes->contains(fn ($type): bool => $type !== 'video')) {
                    $validator->errors()->add('media_asset_ids', 'Video and Reel posts require a video asset.');
                }

                if ($format === ScheduledPost::FORMAT_CAROUSEL) {
                    if ($mediaCount < 2) {
                        $validator->errors()->add('media_asset_ids', 'Carousel posts require at least two media assets.');
                    }

                    if ($mediaCount > 10) {
                        $validator->errors()->add('media_asset_ids', 'Carousel posts can include up to ten media assets.');
                    }
                }

                $draftPostId = $this->integer('draft_post_id');
                if ($draftPostId > 0) {
                    $draftPost = ScheduledPost::query()
                        ->whereKey($draftPostId)
                        ->where('user_id', $user->id)
                        ->first();

                    if (! $draftPost) {
                        $validator->errors()->add('draft_post_id', 'The selected draft post is invalid.');

                        return;
                    }

                    if ($draftPost->status !== ScheduledPost::STATUS_DRAFT) {
                        $validator->errors()->add('draft_post_id', 'Only draft posts can be continued.');
                    }
                }
            },
        ];
    }
}
