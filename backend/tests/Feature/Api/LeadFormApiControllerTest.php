<?php

namespace Tests\Feature\Api;

use App\Models\Lead;
use App\Models\LeadForm;
use App\Models\LeadFormSubmission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LeadFormApiControllerTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_cannot_access_lead_forms_api(): void
    {
        $this->getJson('/api/v1/lead-forms')->assertUnauthorized();
        $this->postJson('/api/v1/lead-forms', ['title' => 'Test'])->assertUnauthorized();
    }

    public function test_authenticated_user_can_create_and_list_forms(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/v1/lead-forms', [
            'title' => 'VIP Registration',
            'description' => 'Collect attendee details',
        ]);

        $response->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('form.title', 'VIP Registration')
            ->assertJsonPath('form.status', 'draft');

        $formId = $response->json('form.id');
        $publicId = $response->json('form.public_id');

        $this->assertNotEmpty($publicId);
        $this->assertSame(8, strlen($publicId));

        $listRes = $this->getJson('/api/v1/lead-forms');
        $listRes->assertOk()
            ->assertJsonCount(1, 'forms')
            ->assertJsonPath('forms.0.id', $formId);
    }

    public function test_ownership_isolation_prevents_user_accessing_others_form(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $formB = LeadForm::factory()->for($userB)->create([
            'title' => 'User B Form',
        ]);

        Sanctum::actingAs($userA);

        // User A cannot view, update, delete, or export User B's form
        $this->getJson("/api/v1/lead-forms/{$formB->id}")->assertNotFound();
        $this->putJson("/api/v1/lead-forms/{$formB->id}", ['title' => 'Hacked'])->assertForbidden();
        $this->postJson("/api/v1/lead-forms/{$formB->id}/publish")->assertNotFound();
        $this->deleteJson("/api/v1/lead-forms/{$formB->id}")->assertNotFound();
        $this->getJson("/api/v1/lead-forms/{$formB->id}/submissions")->assertNotFound();
        $this->getJson("/api/v1/lead-forms/{$formB->id}/submissions/export")->assertNotFound();
    }

    public function test_publish_toggle_requires_fields_and_toggles_state(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $form = LeadForm::factory()->for($user)->create([
            'status' => 'draft',
            'fields' => [],
        ]);

        // Attempting to publish an empty form fails
        $this->postJson("/api/v1/lead-forms/{$form->id}/publish")
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        // Add a field
        $form->update([
            'fields' => [
                [
                    'id' => 'name',
                    'key' => 'name',
                    'type' => 'text',
                    'label' => 'Full Name',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
            ],
        ]);

        // Now publish succeeds
        $this->postJson("/api/v1/lead-forms/{$form->id}/publish")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('status', 'published');

        $form->refresh();
        $this->assertTrue($form->isPublished());
        $this->assertNotNull($form->published_at);

        // Toggle back to draft
        $this->postJson("/api/v1/lead-forms/{$form->id}/publish")
            ->assertOk()
            ->assertJsonPath('status', 'draft');

        $form->refresh();
        $this->assertFalse($form->isPublished());
        $this->assertNull($form->published_at);
    }

    public function test_cover_image_upload_and_removal(): void
    {
        Storage::fake('public');
        config(['filesystems.upload_disk' => 'public']);

        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $form = LeadForm::factory()->for($user)->create([
            'cover_image_url' => null,
        ]);

        $file = UploadedFile::fake()->image('cover.png', 1200, 630);

        $uploadRes = $this->postJson("/api/v1/lead-forms/{$form->id}/cover", [
            'image' => $file,
        ]);

        $uploadRes->assertOk()
            ->assertJsonPath('success', true);

        $form->refresh();
        $this->assertNotNull($form->cover_image_url);

        // Remove cover
        $this->deleteJson("/api/v1/lead-forms/{$form->id}/cover")
            ->assertOk()
            ->assertJsonPath('success', true);

        $form->refresh();
        $this->assertNull($form->cover_image_url);
    }

    public function test_streaming_csv_export(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $form = LeadForm::factory()->for($user)->create([
            'fields' => [
                ['id' => 'email', 'key' => 'email', 'type' => 'email', 'label' => 'Email', 'required' => true],
            ],
        ]);

        LeadFormSubmission::factory()->for($form)->create([
            'data' => ['email' => 'lead1@example.com'],
            'ip' => '127.0.0.1',
        ]);

        $response = $this->get("/api/v1/lead-forms/{$form->id}/submissions/export");

        $response->assertOk();
        $this->assertStringContainsString('text/csv', (string) $response->headers->get('content-type'));
        $content = $response->streamedContent();
        $this->assertStringContainsString('submission_id,submitted_at,ip,email', $content);
        $this->assertStringContainsString('lead1@example.com', $content);
    }

    public function test_public_form_show_and_submit_creates_crm_lead(): void
    {
        $owner = User::factory()->create();
        $form = LeadForm::factory()->for($owner)->published()->create([
            'fields' => [
                ['id' => 'name', 'key' => 'name', 'type' => 'text', 'label' => 'Name', 'required' => true],
                ['id' => 'email', 'key' => 'email', 'type' => 'email', 'label' => 'Email', 'required' => true],
                ['id' => 'phone', 'key' => 'phone', 'type' => 'phone', 'label' => 'Phone', 'required' => false],
            ],
            'settings' => [
                'redirect_enabled' => true,
                'redirect_url' => 'https://example.com/thank-you',
                'success_message' => 'Thank you for your submission!',
            ],
        ]);

        // Draft form returns 404 on public route
        $draftForm = LeadForm::factory()->create(['status' => 'draft']);
        $this->getJson("/api/v1/public/forms/{$draftForm->public_id}")->assertNotFound();

        // Published form returns 200
        $this->getJson("/api/v1/public/forms/{$form->public_id}")
            ->assertOk()
            ->assertJsonPath('form.public_id', $form->public_id)
            ->assertJsonPath('form.title', $form->title);

        // Validation fails if required fields missing
        $this->postJson("/api/v1/public/forms/{$form->public_id}/submit", [
            'data' => ['phone' => '+1234567890'],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['data.name', 'data.email']);

        // Valid submission succeeds and creates CRM Lead
        $submitRes = $this->postJson("/api/v1/public/forms/{$form->public_id}/submit", [
            'data' => [
                'name' => 'Alice Respondent',
                'email' => 'alice@example.com',
                'phone' => '+1 555-0199',
            ],
        ]);

        $submitRes->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('message', 'Thank you for your submission!')
            ->assertJsonPath('redirect_url', 'https://example.com/thank-you');

        $submissionId = $submitRes->json('submission_id');

        $this->assertDatabaseHas('lead_form_submissions', [
            'id' => $submissionId,
            'lead_form_id' => $form->id,
        ]);

        // Verify CRM Lead was created by LeadCaptureService
        $this->assertDatabaseHas('leads', [
            'user_id' => $owner->id,
            'source_type' => Lead::SOURCE_FORM_SUBMISSION,
            'source_id' => $submissionId,
            'name' => 'Alice Respondent',
            'email' => 'alice@example.com',
            'phone' => '+1 555-0199',
        ]);
    }
}
