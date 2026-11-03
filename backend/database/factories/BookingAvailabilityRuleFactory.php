<?php

namespace Database\Factories;

use App\Models\BookingAvailabilityRule;
use App\Models\BookingEventType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BookingAvailabilityRule>
 */
class BookingAvailabilityRuleFactory extends Factory
{
    protected $model = BookingAvailabilityRule::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_event_type_id' => BookingEventType::factory(),
            'day_of_week' => fake()->numberBetween(1, 5),
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'is_active' => true,
        ];
    }
}
