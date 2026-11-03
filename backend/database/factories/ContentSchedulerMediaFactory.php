<?php

namespace Database\Factories;

use App\Models\ContentSchedulerMedia;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ContentSchedulerMedia>
 */
class ContentSchedulerMediaFactory extends Factory
{
    protected $model = ContentSchedulerMedia::class;

    public function definition(): array
    {
        $mediaType = fake()->randomElement(['image', 'video']);
        $extension = $mediaType === 'image' ? 'jpg' : 'mp4';

        return [
            'user_id' => User::factory(),
            'disk' => 'public',
            'path' => "content-scheduler/media/{$this->faker->uuid()}.{$extension}",
            'url' => "https://cdn.example.com/content/{$this->faker->uuid()}.{$extension}",
            'original_name' => "upload.{$extension}",
            'mime_type' => $mediaType === 'image' ? 'image/jpeg' : 'video/mp4',
            'media_type' => $mediaType,
            'size_bytes' => fake()->numberBetween(100_000, 5_000_000),
            'title' => fake()->words(3, true),
            'default_caption' => fake()->sentence(),
            'metadata' => [],
        ];
    }

    public function image(): static
    {
        return $this->state(fn (array $attributes): array => [
            'path' => "content-scheduler/media/{$this->faker->uuid()}.jpg",
            'url' => "https://cdn.example.com/content/{$this->faker->uuid()}.jpg",
            'original_name' => 'image.jpg',
            'mime_type' => 'image/jpeg',
            'media_type' => 'image',
            'metadata' => [
                'width' => 1080,
                'height' => 1350,
                'aspect_ratio' => 0.80,
            ],
        ]);
    }

    public function video(): static
    {
        return $this->state(fn (array $attributes): array => [
            'path' => "content-scheduler/media/{$this->faker->uuid()}.mp4",
            'url' => "https://cdn.example.com/content/{$this->faker->uuid()}.mp4",
            'original_name' => 'video.mp4',
            'mime_type' => 'video/mp4',
            'media_type' => 'video',
        ]);
    }
}
