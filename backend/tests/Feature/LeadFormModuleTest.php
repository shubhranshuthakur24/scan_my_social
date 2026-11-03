<?php

namespace Tests\Feature;

use App\Models\LeadForm;
use App\Models\LeadFormSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class LeadFormModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_from_lead_forms_module(): void
    {
        $this->withoutVite();

        $this->get(route('lead-forms.index'))
            ->assertRedirect('/login');
    }

    public function test_authenticated_user_can_create_and_view_own_form(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->post(route('lead-forms.store'), [
                'title' => 'Creator Intake',
                'description' => 'Collect launch details.',
            ]);

        $leadForm = LeadForm::query()->where('user_id', $user->id)->firstOrFail();

        $response->assertRedirect(route('lead-forms.show', $leadForm));

        $this->actingAs($user)
            ->get(route('lead-forms.show', $leadForm))
            ->assertInertia(fn (Assert $page) => $page
                ->component('LeadForms/Show')
                ->where('form.id', $leadForm->id)
                ->where('form.status', 'draft')
            );
    }

    public function test_user_cannot_access_another_users_form(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $leadForm = LeadForm::factory()->for($owner)->create();

        $this->actingAs($otherUser)
            ->get(route('lead-forms.show', $leadForm))
            ->assertForbidden();
    }

    public function test_public_page_is_available_only_for_published_forms(): void
    {
        $this->withoutVite();
        $draftForm = LeadForm::factory()->create([
            'status' => 'draft',
            'published_at' => null,
        ]);

        $this->get(route('lead-forms.public.show', $draftForm->public_id))
            ->assertStatus(404)
            ->assertInertia(fn (Assert $page) => $page
                ->component('LeadForms/NotFound')
                ->where('public_id', $draftForm->public_id)
            );

        $publishedForm = LeadForm::factory()->published()->create();

        $response = $this->get(route('lead-forms.public.show', $publishedForm->public_id));

        $response->assertInertia(fn (Assert $page) => $page
            ->component('LeadForms/PublicShow')
            ->where('form.id', $publishedForm->id)
            ->where('form.submit_url', route('lead-forms.public.submit', $publishedForm->public_id))
        );

        $response->assertSee('lead-forms.public.submit', false);
    }

    public function test_public_submission_requires_configured_required_fields(): void
    {
        $this->withoutVite();
        $leadForm = LeadForm::factory()->published()->create([
            'fields' => [
                [
                    'id' => 'name',
                    'key' => 'name',
                    'type' => 'text',
                    'label' => 'Name',
                    'placeholder' => 'Name',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
                [
                    'id' => 'email',
                    'key' => 'email',
                    'type' => 'email',
                    'label' => 'Email',
                    'placeholder' => 'Email',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
            ],
        ]);

        $this->post(route('lead-forms.public.submit', $leadForm->public_id), [
            'data' => [
                'name' => 'Alex',
            ],
        ])->assertSessionHasErrors(['data.email']);

        $this->post(route('lead-forms.public.submit', $leadForm->public_id), [
            'data' => [
                'name' => 'Alex',
                'email' => 'alex@example.com',
            ],
        ])->assertRedirect(route('lead-forms.public.show', $leadForm->public_id));

        $this->assertDatabaseHas('lead_form_submissions', [
            'lead_form_id' => $leadForm->id,
        ]);
    }

    public function test_mobile_public_submission_accepts_native_form_payload(): void
    {
        $this->withoutVite();
        $leadForm = LeadForm::factory()->published()->create([
            'fields' => [
                [
                    'id' => 'name',
                    'key' => 'name',
                    'type' => 'text',
                    'label' => 'Name',
                    'placeholder' => 'Name',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
                [
                    'id' => 'email',
                    'key' => 'email',
                    'type' => 'email',
                    'label' => 'Email',
                    'placeholder' => 'Email',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
                [
                    'id' => 'channels',
                    'key' => 'channels',
                    'type' => 'checkbox',
                    'label' => 'Channels',
                    'placeholder' => '',
                    'required' => true,
                    'options' => ['Instagram', 'YouTube'],
                    'max_rating' => 5,
                ],
            ],
        ]);

        $this
            ->withHeader('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1')
            ->post(route('lead-forms.public.submit', $leadForm->public_id), [
                'data' => [
                    'name' => 'Mobile Visitor',
                    'email' => 'mobile@example.com',
                    'channels' => ['Instagram'],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('lead-forms.public.show', $leadForm->public_id));

        $submission = LeadFormSubmission::query()
            ->where('lead_form_id', $leadForm->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($submission);
        $this->assertSame('Mobile Visitor', $submission->data['name'] ?? null);
        $this->assertSame('mobile@example.com', $submission->data['email'] ?? null);
        $this->assertSame(['Instagram'], $submission->data['channels'] ?? null);
        $this->assertStringContainsString('iPhone', (string) $submission->user_agent);
    }

    public function test_public_submission_redirects_when_completion_redirect_is_enabled(): void
    {
        $this->withoutVite();
        $leadForm = LeadForm::factory()->published()->create([
            'settings' => [
                'redirect_enabled' => true,
                'redirect_url' => 'https://example.com/thanks',
                'submit_button_label' => 'Submit',
                'success_message' => 'Thanks',
            ],
        ]);

        $this->post(route('lead-forms.public.submit', $leadForm->public_id), [
            'data' => [
                'name' => 'Taylor',
                'email' => 'taylor@example.com',
            ],
        ])->assertRedirect(route('lead-forms.public.show', $leadForm->public_id))
            ->assertSessionHas('redirect_url', 'https://example.com/thanks');
    }

    public function test_owner_can_save_radio_field_with_comma_separated_options(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $leadForm = LeadForm::factory()->for($user)->create();

        $this->actingAs($user)
            ->patch(route('lead-forms.update', $leadForm), [
                'title' => 'Updated Lead Form',
                'description' => 'Radio field support',
                'cover_image_url' => '',
                'status' => 'draft',
                'fields' => [
                    [
                        'id' => 'gender',
                        'key' => 'gender',
                        'type' => 'radio',
                        'label' => 'Gender',
                        'placeholder' => '',
                        'required' => true,
                        'options' => 'Male, Female, Prefer not to say',
                        'max_rating' => 5,
                    ],
                ],
                'settings' => [
                    'redirect_enabled' => false,
                    'redirect_url' => '',
                    'submit_button_label' => 'Submit',
                    'success_message' => 'Thanks, your response has been recorded.',
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $leadForm->refresh();

        $this->assertSame('radio', $leadForm->fields[0]['type'] ?? null);
        $this->assertSame(
            ['Male', 'Female', 'Prefer not to say'],
            $leadForm->fields[0]['options'] ?? []
        );
    }

    public function test_public_submission_validates_required_radio_choice(): void
    {
        $this->withoutVite();
        $leadForm = LeadForm::factory()->published()->create([
            'fields' => [
                [
                    'id' => 'gender',
                    'key' => 'gender',
                    'type' => 'radio',
                    'label' => 'Gender',
                    'placeholder' => '',
                    'required' => true,
                    'options' => ['Male', 'Female'],
                    'max_rating' => 5,
                ],
            ],
        ]);

        $this->post(route('lead-forms.public.submit', $leadForm->public_id), [
            'data' => [
                'unrelated' => 'value',
            ],
        ])->assertSessionHasErrors(['data.gender']);

        $this->post(route('lead-forms.public.submit', $leadForm->public_id), [
            'data' => [
                'gender' => 'Other',
            ],
        ])->assertSessionHasErrors(['data.gender']);

        $this->post(route('lead-forms.public.submit', $leadForm->public_id), [
            'data' => [
                'gender' => 'Male',
            ],
        ])->assertRedirect(route('lead-forms.public.show', $leadForm->public_id));

        $submission = LeadFormSubmission::query()
            ->where('lead_form_id', $leadForm->id)
            ->latest('id')
            ->first();

        $this->assertNotNull($submission);
        $this->assertSame('Male', $submission->data['gender'] ?? null);
    }

    public function test_owner_can_export_submissions_as_csv(): void
    {
        $this->withoutVite();
        $user = User::factory()->create();
        $leadForm = LeadForm::factory()->for($user)->create();
        LeadFormSubmission::factory()->for($leadForm)->count(2)->create();

        $response = $this->actingAs($user)
            ->get(route('lead-forms.submissions.export', $leadForm));

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
        $this->assertStringContainsString('submission_id', $response->streamedContent());
    }

    public function test_owner_can_upload_and_remove_cover_image(): void
    {
        $this->withoutVite();
        config(['filesystems.upload_disk' => 'public']);
        Storage::fake('public');

        $user = User::factory()->create();
        $leadForm = LeadForm::factory()->for($user)->create([
            'cover_image_url' => null,
        ]);

        $this->actingAs($user)
            ->post(route('lead-forms.upload-cover', $leadForm), [
                'image' => UploadedFile::fake()->image('cover.png', 1600, 1000),
            ])
            ->assertRedirect();

        $leadForm->refresh();
        $this->assertNotNull($leadForm->cover_image_url);
        $this->assertStringStartsWith('/storage/lead-form-covers/', $leadForm->cover_image_url);

        $storedPath = str_replace('/storage/', '', (string) $leadForm->cover_image_url);
        $this->assertTrue(Storage::disk('public')->exists($storedPath));

        $this->actingAs($user)
            ->delete(route('lead-forms.remove-cover', $leadForm))
            ->assertRedirect();

        $leadForm->refresh();
        $this->assertNull($leadForm->cover_image_url);
        $this->assertFalse(Storage::disk('public')->exists($storedPath));
    }
}
