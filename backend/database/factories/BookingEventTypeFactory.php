<?php

namespace Database\Factories;

use App\Models\BookingEventType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<BookingEventType>
 */
class BookingEventTypeFactory extends Factory
{
    protected $model = BookingEventType::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->randomElement([
            '15 Minute Intro',
            '30 Minute Consultation',
            '45 Minute Strategy Call',
            '60 Minute Deep Dive',
        ]);

        return [
            'host_user_id' => User::factory(),
            'name' => $name,
            'slug' => Str::slug($name).'-'.fake()->unique()->numberBetween(10, 999),
            'description' => fake()->optional()->sentence(),
            'duration_minutes' => fake()->randomElement([15, 30, 45, 60]),
            'buffer_minutes' => fake()->randomElement([0, 5, 10]),
            'timezone' => 'UTC',
            'schedule_type' => BookingEventType::SCHEDULE_TYPE_WEEKLY,
            'one_time_date' => null,
            'one_time_start_time' => null,
            'one_time_end_time' => null,
            'location_type' => 'google_meet',
            'location_value' => 'https://meet.google.com/example-room',
            'location_label' => 'Google Meet',
            'allows_multi_seat_booking' => false,
            'seat_capacity' => 1,
            'is_active' => true,
            'sort_order' => fake()->numberBetween(1, 10),
        ];
    }

    public function oneTime(): static
    {
        return $this->state(fn (): array => [
            'schedule_type' => BookingEventType::SCHEDULE_TYPE_ONE_TIME,
            'one_time_date' => fake()->dateTimeBetween('+1 day', '+30 days')->format('Y-m-d'),
            'one_time_start_time' => '10:00:00',
            'one_time_end_time' => '12:00:00',
        ]);
    }
}
