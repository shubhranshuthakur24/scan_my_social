<?php

namespace Database\Factories;

use App\Models\BookingAvailabilityOverride;
use App\Models\BookingEventType;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<BookingAvailabilityOverride>
 */
class BookingAvailabilityOverrideFactory extends Factory
{
    protected $model = BookingAvailabilityOverride::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = now()->addDays(fake()->numberBetween(1, 30))->toDateString();

        return [
            'host_user_id' => User::factory(),
            'booking_event_type_id' => null,
            'override_date' => $date,
            'start_time' => null,
            'end_time' => null,
            'is_available' => false,
            'reason' => fake()->optional()->sentence(),
        ];
    }

    public function forEventType(BookingEventType $eventType): self
    {
        return $this->state(fn (): array => [
            'host_user_id' => $eventType->host_user_id,
            'booking_event_type_id' => $eventType->id,
        ]);
    }
}
