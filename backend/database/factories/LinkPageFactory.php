<?php

namespace Database\Factories;

use App\Models\LinkPage;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LinkPage>
 */
class LinkPageFactory extends Factory
{
    protected $model = LinkPage::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->name();

        return [
            'user_id' => User::factory(),
            'slug' => 'main',
            'display_name' => $name,
            'is_primary' => true,
            'banner_url' => null,
            'theme' => 'sunrise',
            'theme_settings' => LinkPage::defaultThemeSettings(),
            'is_published' => false,
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'is_published' => true,
            'published_at' => now(),
        ]);
    }

    public function primary(): static
    {
        return $this->state(fn () => [
            'slug' => 'main',
            'is_primary' => true,
        ]);
    }
}
