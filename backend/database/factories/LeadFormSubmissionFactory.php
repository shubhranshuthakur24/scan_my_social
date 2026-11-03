<?php

namespace Database\Factories;

use App\Models\LeadForm;
use App\Models\LeadFormSubmission;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<LeadFormSubmission>
 */
class LeadFormSubmissionFactory extends Factory
{
    protected $model = LeadFormSubmission::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'lead_form_id' => LeadForm::factory(),
            'data' => [
                'name' => fake()->name(),
                'email' => fake()->safeEmail(),
            ],
            'metadata' => [
                'query' => [],
            ],
            'ip' => fake()->ipv4(),
            'user_agent' => substr((string) fake()->userAgent(), 0, 512),
            'submitted_at' => now(),
        ];
    }
}
