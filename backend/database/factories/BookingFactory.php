<?php

namespace Database\Factories;

use App\Models\Booking;
use App\Models\BookingEventType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Booking>
 */
class BookingFactory extends Factory
{
    protected $model = Booking::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $startsAt = now()->addDays(2)->startOfHour();

        return [
            'booking_event_type_id' => BookingEventType::factory(),
            'host_user_id' => User::factory(),
            'cancelled_by_host_id' => null,
            'guest_name' => fake()->name(),
            'guest_email' => fake()->safeEmail(),
            'guest_phone' => fake()->numerify('+91##########'),
            'guest_timezone' => 'UTC',
            'guest_notes' => fake()->optional()->sentence(),
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => $startsAt,
            'ends_at' => $startsAt->copy()->addMinutes(30),
            'cancelled_at' => null,
            'cancellation_reason' => null,
        ];
    }
}
