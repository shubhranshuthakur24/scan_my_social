<?php

namespace Tests\Feature;

use App\Mail\BookingGuestConfirmationMail;
use App\Mail\BookingHostNotificationMail;
use App\Models\Booking;
use App\Models\BookingAvailabilityRule;
use App\Models\BookingEventType;
use App\Models\Lead;
use App\Models\LeadForm;
use App\Models\LeadFormSubmission;
use App\Models\User;
use App\Services\LeadCaptureService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UnifiedLeadsTest extends TestCase
{
    use RefreshDatabase;

    public function test_form_submission_creates_unified_lead(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $leadForm = LeadForm::factory()->for($owner)->published()->create([
            'title' => 'Newsletter Signup',
            'fields' => [
                [
                    'id' => 'full_name',
                    'key' => 'full_name',
                    'type' => 'text',
                    'label' => 'Full Name',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
                [
                    'id' => 'work_email',
                    'key' => 'work_email',
                    'type' => 'email',
                    'label' => 'Work Email',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
                [
                    'id' => 'mobile_phone',
                    'key' => 'mobile_phone',
                    'type' => 'phone',
                    'label' => 'Mobile Phone',
                    'required' => true,
                    'options' => [],
                    'max_rating' => 5,
                ],
            ],
        ]);

        $this->post(route('lead-forms.public.submit', $leadForm->public_id), [
            'data' => [
                'full_name' => 'Ada Lovelace',
                'work_email' => 'ada@example.com',
                'mobile_phone' => '+919876543210',
            ],
        ])->assertRedirect(route('lead-forms.public.show', $leadForm->public_id));

        $lead = Lead::query()->firstOrFail();

        $this->assertSame($owner->id, $lead->user_id);
        $this->assertSame(Lead::SOURCE_FORM_SUBMISSION, $lead->source_type);
        $this->assertSame('Newsletter Signup', $lead->source_label);
        $this->assertSame('Ada Lovelace', $lead->name);
        $this->assertSame('ada@example.com', $lead->email);
        $this->assertSame('+919876543210', $lead->phone);
        $this->assertSame(Lead::STATUS_NEW, $lead->status);
        $this->assertSame($leadForm->id, $lead->payload['form_id'] ?? null);
    }

    public function test_appointment_booking_creates_unified_lead(): void
    {
        $this->withoutVite();
        Mail::fake();

        $host = User::factory()->create([
            'name' => 'Host User',
            'username' => 'host-user',
            'email' => 'host@example.com',
        ]);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Strategy Call',
            'slug' => 'strategy-call',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => $tomorrow->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'is_active' => true,
        ]);

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'strategy-call',
        ]), [
            'guest_name' => 'Grace Hopper',
            'guest_email' => 'grace@example.com',
            'guest_phone' => '+919123456789',
            'guest_notes' => 'Discuss launch plan.',
            'guest_timezone' => 'Asia/Calcutta',
            'starts_at' => $tomorrow->copy()->setTime(9, 0)->toIso8601String(),
        ])->assertSessionHasNoErrors();

        $booking = Booking::query()->latest('id')->firstOrFail();
        $lead = Lead::query()->firstOrFail();

        $this->assertSame($host->id, $lead->user_id);
        $this->assertSame(Lead::SOURCE_APPOINTMENT_BOOKING, $lead->source_type);
        $this->assertSame($booking->id, $lead->source_id);
        $this->assertSame('Strategy Call', $lead->source_label);
        $this->assertSame('Grace Hopper', $lead->name);
        $this->assertSame('grace@example.com', $lead->email);
        $this->assertSame('+919123456789', $lead->phone);
        $this->assertSame(Lead::STATUS_BOOKED, $lead->status);
        $this->assertSame(Booking::STATUS_CONFIRMED, $lead->payload['booking_status'] ?? null);

        Mail::assertQueued(BookingGuestConfirmationMail::class);
        Mail::assertQueued(BookingHostNotificationMail::class);
    }

    public function test_backfill_creates_expected_leads_without_duplicates(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $leadForm = LeadForm::factory()->for($owner)->create([
            'title' => 'Audit Request',
        ]);
        LeadFormSubmission::factory()->for($leadForm)->create([
            'data' => [
                'name' => 'Form Lead',
                'email' => 'form@example.com',
            ],
        ]);

        $eventType = BookingEventType::factory()->for($owner, 'host')->create([
            'name' => 'Discovery Call',
        ]);
        Booking::factory()->for($eventType, 'eventType')->create([
            'host_user_id' => $owner->id,
            'guest_name' => 'Booking Lead',
            'guest_email' => 'booking@example.com',
        ]);

        $this->artisan('leads:backfill')->assertSuccessful();
        $this->artisan('leads:backfill')->assertSuccessful();

        $this->assertSame(2, Lead::query()->count());
        $this->assertDatabaseHas('leads', [
            'source_type' => Lead::SOURCE_FORM_SUBMISSION,
            'source_label' => 'Audit Request',
            'email' => 'form@example.com',
        ]);
        $this->assertDatabaseHas('leads', [
            'source_type' => Lead::SOURCE_APPOINTMENT_BOOKING,
            'source_label' => 'Discovery Call',
            'email' => 'booking@example.com',
        ]);
    }

    public function test_cancelling_appointment_updates_lead_status(): void
    {
        $this->withoutVite();
        $host = User::factory()->create();
        $eventType = BookingEventType::factory()->for($host, 'host')->create();
        $booking = Booking::factory()->for($eventType, 'eventType')->create([
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        app(LeadCaptureService::class)->fromBooking($booking);

        $this->actingAs($host)
            ->patch(route('appointments.cancel', $booking))
            ->assertRedirect();

        $lead = Lead::query()
            ->where('source_type', Lead::SOURCE_APPOINTMENT_BOOKING)
            ->where('source_id', $booking->id)
            ->firstOrFail();

        $this->assertSame(Lead::STATUS_CANCELLED, $lead->status);
        $this->assertSame(Booking::STATUS_CANCELLED, $lead->payload['booking_status'] ?? null);
    }

    public function test_user_only_sees_their_own_leads(): void
    {
        $this->withoutVite();
        $owner = User::factory()->create();
        $otherUser = User::factory()->create();

        $ownerForm = LeadForm::factory()->for($owner)->create(['title' => 'Owner Form']);
        $otherForm = LeadForm::factory()->for($otherUser)->create(['title' => 'Other Form']);

        app(LeadCaptureService::class)->fromLeadFormSubmission(
            LeadFormSubmission::factory()->for($ownerForm)->create([
                'data' => [
                    'name' => 'Visible Lead',
                    'email' => 'visible@example.com',
                ],
            ])
        );
        app(LeadCaptureService::class)->fromLeadFormSubmission(
            LeadFormSubmission::factory()->for($otherForm)->create([
                'data' => [
                    'name' => 'Hidden Lead',
                    'email' => 'hidden@example.com',
                ],
            ])
        );

        $this->actingAs($owner)
            ->get(route('crm.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Leads/Index')
                ->has('leads.data', 1)
                ->where('leads.data.0.name', 'Visible Lead')
                ->where('leads.data.0.email', 'visible@example.com')
            );
    }
}
