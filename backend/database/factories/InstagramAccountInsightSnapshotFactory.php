<?php

namespace Database\Factories;

use App\Models\InstagramAccount;
use App\Models\InstagramAccountInsightSnapshot;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InstagramAccountInsightSnapshot>
 */
class InstagramAccountInsightSnapshotFactory extends Factory
{
    protected $model = InstagramAccountInsightSnapshot::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'instagram_account_id' => InstagramAccount::factory(),
            'snapshot_date' => now()->toDateString(),
            'reach' => fake()->numberBetween(10, 10000),
            'impressions' => fake()->numberBetween(10, 15000),
            'profile_views' => fake()->numberBetween(0, 1500),
            'follower_count' => fake()->numberBetween(50, 50000),
            'synced_at' => now(),
            'raw_metrics' => [],
        ];
    }
}
