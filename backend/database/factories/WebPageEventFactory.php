<?php

namespace Database\Factories;

use App\Models\WebPage;
use App\Models\WebPageEvent;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WebPageEvent>
 */
class WebPageEventFactory extends Factory
{
    protected $model = WebPageEvent::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'web_page_id' => WebPage::factory(),
            'type' => WebPageEvent::TYPE_VIEW,
            'block_id' => null,
            'referrer' => fake()->optional()->url(),
            'user_agent' => fake()->userAgent(),
            'ip_hash' => hash('sha256', fake()->ipv4()),
            'metadata' => [],
            'occurred_at' => now(),
        ];
    }
}
