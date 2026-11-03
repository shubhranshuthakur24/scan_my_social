<?php

namespace Database\Factories;

use App\Models\InstagramAccount;
use App\Models\ScheduledPost;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScheduledPost>
 */
class ScheduledPostFactory extends Factory
{
    protected $model = ScheduledPost::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'instagram_account_id' => InstagramAccount::factory(),
            'title' => fake()->words(3, true),
            'platform' => 'instagram',
            'format' => ScheduledPost::FORMAT_IMAGE,
            'status' => ScheduledPost::STATUS_DRAFT,
            'caption' => fake()->sentence(),
            'hashtags' => ['launch'],
            'options' => [],
            'scheduled_at' => null,
            'published_at' => null,
            'retry_count' => 0,
        ];
    }

    public function scheduled(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'scheduled_at' => now()->addHour(),
        ]);
    }

    public function due(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ScheduledPost::STATUS_SCHEDULED,
            'scheduled_at' => now()->subMinute(),
        ]);
    }

    public function published(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => ScheduledPost::STATUS_PUBLISHED,
            'published_at' => now(),
            'meta_media_id' => 'ig-media-'.fake()->uuid(),
        ]);
    }
}
