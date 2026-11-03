<?php

namespace Database\Factories;

use App\Models\InstagramAccount;
use App\Models\InstagramAccountMediaAnalytics;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InstagramAccountMediaAnalytics>
 */
class InstagramAccountMediaAnalyticsFactory extends Factory
{
    protected $model = InstagramAccountMediaAnalytics::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'instagram_account_id' => InstagramAccount::factory(),
            'instagram_media_id' => 'ig-media-'.fake()->unique()->uuid(),
            'media_type' => fake()->randomElement(['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM', 'STORY']),
            'format' => fake()->randomElement(['image', 'video', 'carousel', 'story', 'reel']),
            'caption' => fake()->sentence(),
            'permalink' => fake()->url(),
            'media_url' => fake()->imageUrl(1080, 1080),
            'thumbnail_url' => fake()->imageUrl(320, 320),
            'posted_at' => now()->subDays(fake()->numberBetween(1, 30)),
            'synced_at' => now(),
            'reach' => fake()->numberBetween(50, 5000),
            'impressions' => fake()->numberBetween(100, 10000),
            'engagement' => fake()->numberBetween(10, 1500),
            'likes' => fake()->numberBetween(5, 900),
            'comments' => fake()->numberBetween(0, 300),
            'shares' => fake()->numberBetween(0, 150),
            'saves' => fake()->numberBetween(0, 200),
            'story_replies' => fake()->numberBetween(0, 80),
            'story_taps_forward' => fake()->numberBetween(0, 600),
            'story_taps_back' => fake()->numberBetween(0, 300),
            'story_exits' => fake()->numberBetween(0, 200),
            'raw_media' => [],
            'raw_metrics' => [],
        ];
    }
}
