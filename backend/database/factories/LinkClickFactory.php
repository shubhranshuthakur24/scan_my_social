<?php

namespace Database\Factories;

use App\Models\LinkClick;
use App\Models\LinkPageLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LinkClick>
 */
class LinkClickFactory extends Factory
{
    protected $model = LinkClick::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'link_page_link_id' => LinkPageLink::factory(),
            'clicked_at' => fake()->dateTimeBetween('-14 days'),
            'referrer' => fake()->optional()->url(),
            'user_agent' => fake()->userAgent(),
            'ip_hash' => hash('sha256', fake()->ipv4()),
        ];
    }
}
