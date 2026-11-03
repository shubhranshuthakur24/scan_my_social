<?php

namespace Database\Factories;

use App\Models\ShortLink;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<ShortLink>
 */
class ShortLinkFactory extends Factory
{
    protected $model = ShortLink::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->words(3, true),
            'destination_url' => fake()->url(),
            'code' => Str::lower(Str::random(8)),
            'description' => fake()->optional()->sentence(),
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
        ];
    }
}
