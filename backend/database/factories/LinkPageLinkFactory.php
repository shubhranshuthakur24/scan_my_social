<?php

namespace Database\Factories;

use App\Models\LinkPage;
use App\Models\LinkPageLink;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LinkPageLink>
 */
class LinkPageLinkFactory extends Factory
{
    protected $model = LinkPageLink::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'link_page_id' => LinkPage::factory(),
            'title' => fake()->words(3, true),
            'url' => fake()->url(),
            'description' => fake()->optional()->sentence(),
            'icon' => 'link',
            'sort_order' => fake()->numberBetween(0, 50),
            'is_active' => true,
            'starts_at' => null,
            'ends_at' => null,
        ];
    }
}
