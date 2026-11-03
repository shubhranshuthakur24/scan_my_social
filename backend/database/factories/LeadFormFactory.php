<?php

namespace Database\Factories;

use App\Models\LeadForm;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<LeadForm>
 */
class LeadFormFactory extends Factory
{
    protected $model = LeadForm::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'description' => fake()->sentence(),
            'cover_image_url' => fake()->optional()->imageUrl(),
            'public_id' => Str::lower(Str::random(8)),
            'status' => 'draft',
            'fields' => [
                [
                    'id' => 'name',
                    'key' => 'name',
                    'type' => 'text',
                    'label' => 'Name',
                    'placeholder' => 'Enter your name',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
                [
                    'id' => 'email',
                    'key' => 'email',
                    'type' => 'email',
                    'label' => 'Email',
                    'placeholder' => 'Enter your email',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
            ],
            'settings' => [
                'redirect_enabled' => false,
                'redirect_url' => '',
                'submit_button_label' => 'Submit',
                'success_message' => 'Thanks, your response has been recorded.',
            ],
            'published_at' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(fn () => [
            'status' => 'published',
            'published_at' => now(),
        ]);
    }
}
