<?php

namespace Database\Factories;

use App\Models\InstagramAccount;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<InstagramAccount>
 */
class InstagramAccountFactory extends Factory
{
    protected $model = InstagramAccount::class;

    public function definition(): array
    {
        $username = fake()->unique()->userName();

        return [
            'user_id' => User::factory(),
            'ig_account_id' => 'ig-'.fake()->unique()->uuid(),
            'fb_page_id' => 'page-'.fake()->unique()->uuid(),
            'username' => $username,
            'profile_url' => "https://www.instagram.com/{$username}/",
            'access_token' => 'token-'.fake()->uuid(),
            'status' => 'active',
        ];
    }

    public function disconnected(): static
    {
        return $this->state(fn (array $attributes): array => [
            'status' => 'disconnected',
        ]);
    }
}
