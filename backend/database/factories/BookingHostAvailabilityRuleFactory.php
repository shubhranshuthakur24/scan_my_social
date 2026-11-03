<?php

namespace Database\Factories;

use App\Models\BookingHostAvailabilityRule;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BookingHostAvailabilityRule>
 */
class BookingHostAvailabilityRuleFactory extends Factory
{
    protected $model = BookingHostAvailabilityRule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'host_user_id' => User::factory(),
            'day_of_week' => fake()->numberBetween(0, 6),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'is_active' => true,
        ];
    }
}
