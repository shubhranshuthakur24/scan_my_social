<?php

namespace Database\Factories;

use App\Models\ScheduledPost;
use App\Models\ScheduledPostPublishAttempt;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ScheduledPostPublishAttempt>
 */
class ScheduledPostPublishAttemptFactory extends Factory
{
    protected $model = ScheduledPostPublishAttempt::class;

    public function definition(): array
    {
        return [
            'scheduled_post_id' => ScheduledPost::factory(),
            'status' => 'success',
            'meta_container_id' => 'container-'.fake()->uuid(),
            'meta_media_id' => 'media-'.fake()->uuid(),
            'request_payload' => [],
            'response_payload' => [],
            'error_message' => null,
            'started_at' => now(),
            'finished_at' => now(),
        ];
    }
}
