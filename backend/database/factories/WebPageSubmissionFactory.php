<?php

namespace Database\Factories;

use App\Models\WebPage;
use App\Models\WebPageSubmission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<WebPageSubmission>
 */
class WebPageSubmissionFactory extends Factory
{
    protected $model = WebPageSubmission::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'web_page_id' => WebPage::factory(),
            'block_id' => (string) fake()->uuid(),
            'data' => [
                'name' => fake()->name(),
                'email' => fake()->safeEmail(),
            ],
            'metadata' => [],
            'ip_hash' => hash('sha256', fake()->ipv4()),
            'user_agent' => fake()->userAgent(),
            'submitted_at' => now(),
        ];
    }
}
