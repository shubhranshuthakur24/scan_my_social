<?php

namespace Database\Factories;

use App\Models\InstagramAccount;
use App\Models\ScheduledPost;
use App\Models\ScheduledPostAnalyticsSnapshot;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScheduledPostAnalyticsSnapshot>
 */
class ScheduledPostAnalyticsSnapshotFactory extends Factory
{
    protected $model = ScheduledPostAnalyticsSnapshot::class;

    public function definition(): array
    {
        return [
            'scheduled_post_id' => ScheduledPost::factory(),
            'instagram_account_id' => InstagramAccount::factory(),
            'snapshot_date' => now()->toDateString(),
            'followers' => fake()->numberBetween(50, 5000),
            'reach' => fake()->numberBetween(10, 2000),
            'impressions' => fake()->numberBetween(10, 3000),
            'engagement' => fake()->numberBetween(0, 500),
            'likes' => fake()->numberBetween(0, 300),
            'comments' => fake()->numberBetween(0, 80),
            'shares' => fake()->numberBetween(0, 50),
            'saves' => fake()->numberBetween(0, 50),
            'raw_metrics' => [],
        ];
    }
}
