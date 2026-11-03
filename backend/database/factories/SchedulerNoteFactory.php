<?php

namespace Database\Factories;

use App\Models\SchedulerNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SchedulerNote>
 */
class SchedulerNoteFactory extends Factory
{
    protected $model = SchedulerNote::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'note_date' => now()->toDateString(),
            'content' => fake()->sentence(8),
        ];
    }
}
