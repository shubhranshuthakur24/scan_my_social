<?php

namespace Tests\Feature;

use App\Mail\BookingGuestConfirmationMail;
use App\Mail\BookingHostNotificationMail;
use App\Models\Booking;
use App\Models\BookingAvailabilityOverride;
use App\Models\BookingAvailabilityRule;
use App\Models\BookingEventType;
use App\Models\BookingHostAvailabilityRule;
use App\Models\User;
use App\Services\BookingAvailabilityService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Mail;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class BookingModuleTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_booking_page_renders_for_active_event_type(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator',
        ]);
        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'name' => 'Consultation',
            'slug' => 'consultation',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => now('UTC')->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $this->get(route('bookings.public.show', [
            'username' => 'creator',
            'eventType' => 'consultation',
            'date' => now('UTC')->toDateString(),
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Public')
                ->where('host.username', 'creator')
                ->where('event_type.slug', 'consultation')
                ->has('slots')
            );
    }

    public function test_public_booking_index_lists_only_active_event_types_for_host(): void
    {
        $this->withoutVite();
        $user = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator',
        ]);

        BookingEventType::factory()->for($user, 'host')->create([
            'name' => 'Active Event',
            'slug' => 'active-event',
            'is_active' => true,
        ]);

        BookingEventType::factory()->for($user, 'host')->create([
            'name' => 'Inactive Event',
            'slug' => 'inactive-event',
            'is_active' => false,
        ]);

        $this->get(route('bookings.public.index', [
            'username' => 'creator',
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/PublicIndex')
                ->where('host.username', 'creator')
                ->has('event_types', 1)
                ->where('event_types.0.slug', 'active-event')
            );
    }

    public function test_expired_one_time_event_is_hidden_from_public_booking_pages(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-06-25 13:00:00');

        $user = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator',
        ]);

        BookingEventType::factory()->for($user, 'host')->oneTime()->create([
            'name' => 'Past One-Time Event',
            'slug' => 'past-one-time-event',
            'timezone' => 'UTC',
            'one_time_date' => '2026-06-22',
            'one_time_start_time' => '10:00:00',
            'one_time_end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $this->get(route('bookings.public.index', [
            'username' => 'creator',
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/PublicIndex')
                ->where('host.username', 'creator')
                ->has('event_types', 0)
            );

        $this->get(route('bookings.public.show', [
            'username' => 'creator',
            'eventType' => 'past-one-time-event',
        ]))->assertNotFound();

        Carbon::setTestNow();
    }

    public function test_guest_can_book_available_slot_and_emails_are_queued(): void
    {
        $this->withoutVite();
        Mail::fake();

        $user = User::factory()->create([
            'name' => 'Host User',
            'username' => 'host-user',
            'email' => 'host@example.com',
        ]);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'name' => '30 Minute Consultation',
            'slug' => 'consult-30',
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

        $startsAt = $tomorrow->copy()->setTime(9, 0)->toIso8601String();

        $response = $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'consult-30',
        ]), [
            'guest_name' => 'Guest Person',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+919876543210',
            'guest_notes' => 'Please share prep notes.',
            'guest_timezone' => 'Asia/Calcutta',
            'starts_at' => $startsAt,
        ])->assertSessionHasNoErrors();

        $booking = Booking::query()->latest('id')->firstOrFail();
        $response->assertRedirect(route('bookings.public.thanks', [
            'username' => 'host-user',
            'eventType' => 'consult-30',
            'booking' => $booking->id,
        ]));

        $this->assertDatabaseHas('bookings', [
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $user->id,
            'guest_name' => 'Guest Person',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+919876543210',
            'guest_timezone' => 'Asia/Kolkata',
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        Mail::assertQueued(BookingGuestConfirmationMail::class);
        Mail::assertQueued(BookingHostNotificationMail::class);
    }

    public function test_public_booking_thanks_page_renders_with_booking_details(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'name' => 'Host User',
            'username' => 'host-user',
        ]);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Weekly Update Meet',
            'slug' => 'weekly-update-meet',
            'timezone' => 'Asia/Kolkata',
            'is_active' => true,
            'location_type' => 'custom',
            'location_label' => 'Zoom Call',
            'location_value' => 'https://career.foxxydigitaltools.com/',
        ]);

        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'guest_name' => 'Guest Person',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+919876543210',
            'guest_notes' => 'Please share prep notes.',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now('UTC')->addDay()->setTime(9, 0),
            'ends_at' => now('UTC')->addDay()->setTime(9, 30),
        ]);

        $this->get(route('bookings.public.thanks', [
            'username' => 'host-user',
            'eventType' => 'weekly-update-meet',
            'booking' => $booking->id,
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/PublicThanks')
                ->where('host.username', 'host-user')
                ->where('event_type.slug', 'weekly-update-meet')
                ->where('booking.guest_name', 'Guest Person')
                ->where('booking.guest_email', 'guest@example.com')
                ->where('booking.guest_phone', '+919876543210')
            );
    }

    public function test_double_booking_same_slot_is_rejected(): void
    {
        $this->withoutVite();
        Mail::fake();

        $user = User::factory()->create([
            'username' => 'booker',
            'email' => 'booker@example.com',
        ]);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'slug' => 'intro',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => $tomorrow->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $startsAt = $tomorrow->copy()->setTime(9, 0)->toIso8601String();
        $endsAt = $tomorrow->copy()->setTime(9, 30)->toIso8601String();

        Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $user->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
        ]);

        $this->post(route('bookings.public.store', [
            'username' => 'booker',
            'eventType' => 'intro',
        ]), [
            'guest_name' => 'Another Guest',
            'guest_email' => 'another@example.com',
            'guest_phone' => '+919812345678',
            'starts_at' => $startsAt,
        ])->assertSessionHasErrors(['starts_at']);
    }

    public function test_public_booking_requires_contact_number(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'booker',
        ]);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'slug' => 'intro',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => $tomorrow->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $startsAt = $tomorrow->copy()->setTime(9, 0)->toIso8601String();

        $this->post(route('bookings.public.store', [
            'username' => 'booker',
            'eventType' => 'intro',
        ]), [
            'guest_name' => 'Another Guest',
            'guest_email' => 'another@example.com',
            'guest_phone' => '',
            'starts_at' => $startsAt,
        ])->assertSessionHasErrors(['guest_phone']);
    }

    public function test_guest_cannot_create_multiple_upcoming_bookings_for_same_event_type(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'weekly-update',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => $tomorrow->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'weekly-update',
        ]), [
            'guest_name' => 'Guest Person',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+919876543210',
            'starts_at' => $tomorrow->copy()->setTime(9, 0)->toIso8601String(),
        ])->assertSessionHasNoErrors();

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'weekly-update',
        ]), [
            'guest_name' => 'Guest Person',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+919876543210',
            'starts_at' => $tomorrow->copy()->setTime(9, 30)->toIso8601String(),
        ])->assertSessionHasErrors(['guest_email']);
    }

    public function test_event_type_creation_accepts_duration_up_to_480_minutes(): void
    {
        $this->withoutVite();
        config()->set('app.timezone', 'Asia/Kolkata');

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('appointments.event-types.store'), [
            'name' => 'Deep Workshop',
            'description' => 'Long session',
            'timezone' => 'UTC',
            'duration_minutes' => 480,
            'buffer_minutes' => 10,
            'location_type' => 'google_meet',
            'location_value' => 'https://meet.google.com/example-room',
            'location_label' => 'Google Meet',
            'allows_multi_seat_booking' => false,
            'is_active' => true,
            'availability_rules' => [
                [
                    'day_of_week' => 1,
                    'start_time' => '09:00',
                    'end_time' => '17:00',
                    'is_active' => true,
                ],
            ],
            'global_availability_rules' => $this->defaultGlobalAvailabilityRules(),
            'availability_overrides' => [],
        ])->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('booking_event_types', [
            'host_user_id' => $user->id,
            'name' => 'Deep Workshop',
            'duration_minutes' => 480,
        ]);
    }

    public function test_host_can_create_one_time_event_type_without_weekly_rules(): void
    {
        $this->withoutVite();
        config()->set('app.timezone', 'UTC');

        $user = User::factory()->create([
            'username' => 'creator',
        ]);

        $this->actingAs($user)
            ->post(route('appointments.event-types.store'), [
                'name' => 'June Launch Session',
                'description' => 'Single-session launch event.',
                'schedule_type' => BookingEventType::SCHEDULE_TYPE_ONE_TIME,
                'one_time_date' => '2026-06-22',
                'one_time_start_time' => '10:00',
                'one_time_end_time' => '12:00',
                'duration_minutes' => 30,
                'buffer_minutes' => 0,
                'location_type' => 'google_meet',
                'location_value' => 'https://meet.google.com/example-room',
                'location_label' => 'Google Meet',
                'allows_multi_seat_booking' => false,
                'is_active' => true,
                'availability_rules' => [],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $eventType = BookingEventType::query()
            ->where('host_user_id', $user->id)
            ->where('slug', 'june-launch-session')
            ->firstOrFail();

        $this->assertSame(BookingEventType::SCHEDULE_TYPE_ONE_TIME, $eventType->schedule_type);
        $this->assertSame('2026-06-22', $eventType->one_time_date?->toDateString());
        $this->assertSame('10:00', substr((string) $eventType->one_time_start_time, 0, 5));
        $this->assertSame('12:00', substr((string) $eventType->one_time_end_time, 0, 5));
        $this->assertDatabaseCount('booking_availability_rules', 0);
    }

    public function test_guest_can_book_one_time_event_slot_from_its_exact_window(): void
    {
        $this->withoutVite();
        Mail::fake();
        Carbon::setTestNow('2026-06-20 08:00:00');

        $host = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator',
            'email' => 'creator@example.com',
        ]);
        $eventType = BookingEventType::factory()->for($host, 'host')->oneTime()->create([
            'name' => 'June Launch Session',
            'slug' => 'june-launch-session',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'one_time_date' => '2026-06-22',
            'one_time_start_time' => '10:00:00',
            'one_time_end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $this->get(route('bookings.public.show', [
            'username' => 'creator',
            'eventType' => 'june-launch-session',
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Public')
                ->where('selected_date', '2026-06-22')
                ->where('calendar_month', '2026-06')
                ->has('slots', 4)
                ->where('slots.0.label', '10:00 AM')
                ->where('slots.3.label', '11:30 AM')
            );

        $this->post(route('bookings.public.store', [
            'username' => 'creator',
            'eventType' => 'june-launch-session',
        ]), [
            'guest_name' => 'Guest Person',
            'guest_email' => 'guest@example.com',
            'guest_phone' => '+919876543210',
            'starts_at' => '2026-06-22T10:00:00Z',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('bookings', [
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'guest_email' => 'guest@example.com',
            'starts_at' => '2026-06-22 10:00:00',
            'ends_at' => '2026-06-22 10:30:00',
            'status' => Booking::STATUS_CONFIRMED,
        ]);

        Mail::assertQueued(BookingGuestConfirmationMail::class);
        Mail::assertQueued(BookingHostNotificationMail::class);

        Carbon::setTestNow();
    }

    public function test_limited_seat_capacity_allows_booking_until_capacity_then_blocks_slot(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'group-session',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'allows_multi_seat_booking' => true,
            'seat_capacity' => 2,
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => $tomorrow->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $slot = $tomorrow->copy()->setTime(9, 0)->toIso8601String();

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'group-session',
        ]), [
            'guest_name' => 'Guest One',
            'guest_email' => 'guest1@example.com',
            'guest_phone' => '+919111111111',
            'starts_at' => $slot,
        ])->assertSessionHasNoErrors();

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'group-session',
        ]), [
            'guest_name' => 'Guest Two',
            'guest_email' => 'guest2@example.com',
            'guest_phone' => '+919222222222',
            'starts_at' => $slot,
        ])->assertSessionHasNoErrors();

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'group-session',
        ]), [
            'guest_name' => 'Guest Three',
            'guest_email' => 'guest3@example.com',
            'guest_phone' => '+919333333333',
            'starts_at' => $slot,
        ])->assertSessionHasErrors(['starts_at']);
    }

    public function test_unlimited_seat_capacity_allows_multiple_guests_for_same_slot(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'webinar-session',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'allows_multi_seat_booking' => true,
            'seat_capacity' => null,
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => $tomorrow->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $slot = $tomorrow->copy()->setTime(9, 0)->toIso8601String();

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'webinar-session',
        ]), [
            'guest_name' => 'Guest One',
            'guest_email' => 'guest1@example.com',
            'guest_phone' => '+919111111111',
            'starts_at' => $slot,
        ])->assertSessionHasNoErrors();

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'webinar-session',
        ]), [
            'guest_name' => 'Guest Two',
            'guest_email' => 'guest2@example.com',
            'guest_phone' => '+919222222222',
            'starts_at' => $slot,
        ])->assertSessionHasNoErrors();

        $this->post(route('bookings.public.store', [
            'username' => 'host-user',
            'eventType' => 'webinar-session',
        ]), [
            'guest_name' => 'Guest Three',
            'guest_email' => 'guest3@example.com',
            'guest_phone' => '+919333333333',
            'starts_at' => $slot,
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseCount('bookings', 3);
    }

    public function test_global_slot_lock_blocks_overlapping_slots_across_event_types_when_enabled(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-05-20 08:00:00');

        $host = User::factory()->create([
            'username' => 'host-user',
            'lock_time_slots_across_event_types' => true,
        ]);
        $eventA = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'event-a',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);
        $eventB = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'event-b',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        foreach ([$eventA, $eventB] as $eventType) {
            BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
                'day_of_week' => 4,
                'start_time' => '09:00:00',
                'end_time' => '12:00:00',
                'is_active' => true,
            ]);
        }

        Booking::factory()->create([
            'booking_event_type_id' => $eventA->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => '2026-05-21 10:00:00',
            'ends_at' => '2026-05-21 10:30:00',
        ]);

        $service = app(BookingAvailabilityService::class);
        $targetDate = Carbon::create(2026, 5, 21, 0, 0, 0, 'UTC')->toImmutable();
        $slots = $service->generateDailySlots($eventB, $targetDate);
        $labels = collect($slots)->pluck('label')->all();

        $this->assertNotContains('10:00 AM', $labels);
        $this->assertFalse(
            $service->isSlotStillAvailable(
                $eventB,
                Carbon::create(2026, 5, 21, 10, 0, 0, 'UTC')->toImmutable(),
                Carbon::create(2026, 5, 21, 10, 30, 0, 'UTC')->toImmutable()
            )
        );

        Carbon::setTestNow();
    }

    public function test_excluded_event_type_is_ignored_by_global_slot_lock_in_both_directions(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-05-20 08:00:00');

        $host = User::factory()->create([
            'username' => 'host-user',
            'lock_time_slots_across_event_types' => true,
        ]);
        $excludedEvent = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'excluded-event',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'exclude_from_global_slot_lock' => true,
            'is_active' => true,
        ]);
        $normalEvent = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'normal-event',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'exclude_from_global_slot_lock' => false,
            'is_active' => true,
        ]);

        foreach ([$excludedEvent, $normalEvent] as $eventType) {
            BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
                'day_of_week' => 4,
                'start_time' => '09:00:00',
                'end_time' => '12:00:00',
                'is_active' => true,
            ]);
        }

        Booking::factory()->create([
            'booking_event_type_id' => $excludedEvent->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => '2026-05-21 10:00:00',
            'ends_at' => '2026-05-21 10:30:00',
        ]);

        $service = app(BookingAvailabilityService::class);
        $targetDate = Carbon::create(2026, 5, 21, 0, 0, 0, 'UTC')->toImmutable();

        $normalSlots = $service->generateDailySlots($normalEvent, $targetDate);
        $this->assertContains('10:00 AM', collect($normalSlots)->pluck('label')->all());

        Booking::factory()->create([
            'booking_event_type_id' => $normalEvent->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => '2026-05-21 11:00:00',
            'ends_at' => '2026-05-21 11:30:00',
        ]);

        $excludedSlots = $service->generateDailySlots($excludedEvent, $targetDate);
        $this->assertContains('11:00 AM', collect($excludedSlots)->pluck('label')->all());

        Carbon::setTestNow();
    }

    public function test_event_type_creation_normalizes_application_timezone_alias_and_uses_it_even_when_input_differs(): void
    {
        $this->withoutVite();
        config()->set('app.timezone', 'Asia/Calcutta');

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('appointments.event-types.store'), [
            'name' => 'Timezone Locked Event',
            'description' => 'Timezone should be forced from app config.',
            'timezone' => 'UTC',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google_meet',
            'location_value' => 'https://meet.google.com/example-room',
            'location_label' => 'Google Meet',
            'is_active' => true,
            'availability_rules' => [
                [
                    'day_of_week' => 1,
                    'start_time' => '09:00',
                    'end_time' => '17:00',
                    'is_active' => true,
                ],
            ],
            'global_availability_rules' => $this->defaultGlobalAvailabilityRules(),
            'availability_overrides' => [],
        ])->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Booking type created.')
            ->assertRedirect();

        $this->assertDatabaseHas('booking_event_types', [
            'host_user_id' => $user->id,
            'name' => 'Timezone Locked Event',
            'timezone' => 'Asia/Kolkata',
        ]);
    }

    public function test_event_type_creation_ignores_time_order_validation_for_closed_days(): void
    {
        $this->withoutVite();
        config()->set('app.timezone', 'Asia/Kolkata');

        $user = User::factory()->create();
        $this->actingAs($user);

        $this->post(route('appointments.event-types.store'), [
            'name' => 'Closed Day Validation Test',
            'description' => 'Closed day should not require end time after start time.',
            'timezone' => 'UTC',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'location_type' => 'google_meet',
            'location_value' => 'https://meet.google.com/example-room',
            'location_label' => 'Google Meet',
            'is_active' => true,
            'availability_rules' => [
                [
                    'day_of_week' => 0,
                    'start_time' => '11:23',
                    'end_time' => '01:35',
                    'is_active' => false,
                ],
            ],
            'global_availability_rules' => $this->defaultGlobalAvailabilityRules(),
            'availability_overrides' => [],
        ])->assertSessionHasNoErrors()
            ->assertSessionHas('success', 'Booking type created.')
            ->assertRedirect();

        $this->assertDatabaseHas('booking_event_types', [
            'host_user_id' => $user->id,
            'name' => 'Closed Day Validation Test',
        ]);
    }

    public function test_authenticated_user_can_view_booking_event_create_page(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
        ]);

        $this->actingAs($user)
            ->get(route('appointments.create'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Create')
                ->where('host.username', 'creator')
            );
    }

    public function test_authenticated_user_can_view_appointment_calendar_page(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'calendar-host',
        ]);

        $this->actingAs($user)
            ->get(route('appointments.calendar'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Calendar')
                ->where('host.username', 'calendar-host')
                ->where('calendar_month', now(config('app.timezone', 'UTC'))->format('Y-m'))
                ->has('daily_counts')
                ->has('selected_day_bookings')
            );
    }

    public function test_appointment_calendar_route_is_available_to_app_ziggy_group(): void
    {
        $this->assertContains('appointments.calendar', config('ziggy.groups.app'));
    }

    public function test_appointment_calendar_shows_daily_counts_for_selected_month(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'calendar-host',
        ]);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Review Session',
            'slug' => 'review-session',
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => Carbon::parse('2026-05-21 10:00:00', 'UTC'),
            'ends_at' => Carbon::parse('2026-05-21 10:30:00', 'UTC'),
            'guest_name' => 'Alice',
            'guest_email' => 'alice@example.com',
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => Carbon::parse('2026-05-21 12:00:00', 'UTC'),
            'ends_at' => Carbon::parse('2026-05-21 12:30:00', 'UTC'),
            'guest_name' => 'Bob',
            'guest_email' => 'bob@example.com',
        ]);

        $this->actingAs($host)
            ->get(route('appointments.calendar', [
                'month' => '2026-05',
                'date' => '2026-05-21',
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Calendar')
                ->where('calendar_month', '2026-05')
                ->where('selected_date', '2026-05-21')
                ->where('daily_counts.2026-05-21', 2)
                ->has('selected_day_bookings', 2)
                ->where('selected_day_bookings.0.event_type_name', 'Review Session')
            );
    }

    public function test_authenticated_user_can_view_upcoming_appointments_page_with_filters(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);
        $otherHost = User::factory()->create([
            'username' => 'other-host',
        ]);

        $consulting = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Consulting Call',
            'slug' => 'consulting-call',
        ]);
        $demo = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Demo Session',
            'slug' => 'demo-session',
        ]);
        $externalEvent = BookingEventType::factory()->for($otherHost, 'host')->create([
            'name' => 'External Event',
            'slug' => 'external-event',
        ]);

        $targetBooking = Booking::factory()->create([
            'booking_event_type_id' => $consulting->id,
            'host_user_id' => $host->id,
            'guest_name' => 'Alice Example',
            'guest_email' => 'alice@example.com',
            'guest_phone' => '+910000111222',
            'guest_notes' => 'Needs kickoff review',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->setTime(9, 0),
            'ends_at' => now()->addDay()->setTime(9, 30),
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $demo->id,
            'host_user_id' => $host->id,
            'guest_name' => 'Bob Demo',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDays(2)->setTime(10, 0),
            'ends_at' => now()->addDays(2)->setTime(10, 30),
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $externalEvent->id,
            'host_user_id' => $otherHost->id,
            'guest_name' => 'Hidden Guest',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->setTime(11, 0),
            'ends_at' => now()->addDay()->setTime(11, 30),
        ]);

        $this->actingAs($host)
            ->get(route('appointments.upcoming', [
                'search' => 'Alice',
                'event_type' => $consulting->id,
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Upcoming')
                ->where('filters.search', 'Alice')
                ->where('filters.event_type', (string) $consulting->id)
                ->has('event_type_options', 2)
                ->has('bookings.data', 1)
                ->where('bookings.data.0.id', $targetBooking->id)
                ->where('bookings.data.0.guest_name', 'Alice Example')
                ->where('bookings.data.0.guest_phone', '+910000111222')
                ->where('bookings.data.0.event_type.slug', 'consulting-call')
                ->where('bookings.data.0.event_type.schedule_type', 'weekly')
                ->where('kpis.today_count', 0)
                ->where('kpis.unique_clients', 2)
                ->where('kpis.next_30_days', 2)
                ->has('kpis.popular_event')
            );
    }

    public function test_authenticated_user_can_sort_upcoming_appointments(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);

        $event = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Sort Event',
            'slug' => 'sort-event',
        ]);

        $bookingEarly = Booking::factory()->create([
            'booking_event_type_id' => $event->id,
            'host_user_id' => $host->id,
            'guest_name' => 'Early Guest',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDays(1)->setTime(10, 0),
            'ends_at' => now()->addDays(1)->setTime(10, 30),
        ]);

        $bookingLate = Booking::factory()->create([
            'booking_event_type_id' => $event->id,
            'host_user_id' => $host->id,
            'guest_name' => 'Late Guest',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDays(3)->setTime(10, 0),
            'ends_at' => now()->addDays(3)->setTime(10, 30),
        ]);

        // Ascending sort (default)
        $this->actingAs($host)
            ->get(route('appointments.upcoming', ['sort_by' => 'starts_at_asc']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Upcoming')
                ->where('filters.sort_by', 'starts_at_asc')
                ->where('bookings.data.0.id', $bookingEarly->id)
                ->where('bookings.data.1.id', $bookingLate->id)
            );

        // Descending sort
        $this->actingAs($host)
            ->get(route('appointments.upcoming', ['sort_by' => 'starts_at_desc']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Upcoming')
                ->where('filters.sort_by', 'starts_at_desc')
                ->where('bookings.data.0.id', $bookingLate->id)
                ->where('bookings.data.1.id', $bookingEarly->id)
            );
    }

    public function test_upcoming_appointments_page_displays_correct_kpis(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-06-11 10:00:00');

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);

        $eventA = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Event A',
            'slug' => 'event-a',
        ]);
        $eventB = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Event B',
            'slug' => 'event-b',
        ]);

        // Booking 1: Today, Event A, starts in 30 mins, confirmed, guest g1@example.com
        Booking::factory()->create([
            'booking_event_type_id' => $eventA->id,
            'host_user_id' => $host->id,
            'guest_email' => 'g1@example.com',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addMinutes(30),
            'ends_at' => now()->addMinutes(60),
        ]);

        // Booking 2: Today, Event B, starts in 2 hours, confirmed, guest g2@example.com
        Booking::factory()->create([
            'booking_event_type_id' => $eventB->id,
            'host_user_id' => $host->id,
            'guest_email' => 'g2@example.com',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addHours(2),
            'ends_at' => now()->addHours(3),
        ]);

        // Booking 3: Tomorrow, Event A, starts in 1 day, confirmed, guest g1@example.com (duplicate email)
        Booking::factory()->create([
            'booking_event_type_id' => $eventA->id,
            'host_user_id' => $host->id,
            'guest_email' => 'g1@example.com',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay(),
            'ends_at' => now()->addDay()->addMinutes(30),
        ]);

        // Booking 4: In 40 days, Event A, starts in 40 days, confirmed, guest g3@example.com (outside 30 days)
        Booking::factory()->create([
            'booking_event_type_id' => $eventA->id,
            'host_user_id' => $host->id,
            'guest_email' => 'g3@example.com',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDays(40),
            'ends_at' => now()->addDays(40)->addMinutes(30),
        ]);

        // Booking 5: Today, Event A, starts in 10 mins, CANCELLED, guest g4@example.com
        Booking::factory()->create([
            'booking_event_type_id' => $eventA->id,
            'host_user_id' => $host->id,
            'guest_email' => 'g4@example.com',
            'status' => Booking::STATUS_CANCELLED,
            'starts_at' => now()->addMinutes(10),
            'ends_at' => now()->addMinutes(40),
        ]);

        $this->actingAs($host)
            ->get(route('appointments.upcoming'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Upcoming')
                ->where('kpis.today_count', 2)
                ->where('kpis.unique_clients', 3)
                ->where('kpis.next_30_days', 3)
                ->where('kpis.popular_event.name', 'Event A')
                ->where('kpis.popular_event.count', 3)
            );

        Carbon::setTestNow();
    }

    public function test_authenticated_user_can_export_upcoming_appointments_as_csv(): void
    {
        Carbon::setTestNow('2026-06-11 10:00:00');

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);

        $event = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Event A',
            'slug' => 'event-a',
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $event->id,
            'host_user_id' => $host->id,
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
            'guest_phone' => '1234567890',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addHours(2),
            'ends_at' => now()->addHours(3),
            'guest_notes' => 'Looking forward to it',
        ]);

        $response = $this->actingAs($host)
            ->get(route('appointments.upcoming.export', [
                'search' => 'John',
            ]));

        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv; charset=UTF-8');
        $response->assertHeader('Content-Disposition', 'attachment; filename=upcoming_appointments_20260611_100000.csv');

        $content = $response->streamedContent();
        $this->assertStringContainsString('"Guest Name","Guest Email","Guest Phone","Event Type","Starts At (', $content);
        $this->assertStringContainsString(')","Duration (Min)",Status,"Guest Notes"', $content);
        $this->assertStringContainsString('"John Doe",john@example.com,1234567890,"Event A",', $content);
        $this->assertStringContainsString(',confirmed,"Looking forward to it"', $content);

        Carbon::setTestNow();
    }

    public function test_only_event_owner_can_view_booking_event_edit_page(): void
    {
        $this->withoutVite();

        $owner = User::factory()->create([
            'username' => 'owner',
        ]);
        $otherUser = User::factory()->create([
            'username' => 'other-user',
        ]);
        $eventType = BookingEventType::factory()->for($owner, 'host')->create([
            'slug' => 'owner-event',
        ]);
        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => 1,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $this->actingAs($owner)
            ->get(route('appointments.event-types.edit', $eventType->id))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Edit')
                ->where('event_type.id', $eventType->id)
                ->where('event_type.slug', 'owner-event')
            );

        $this->actingAs($otherUser)
            ->get(route('appointments.event-types.edit', $eventType->id))
            ->assertForbidden();
    }

    public function test_public_booking_page_selects_next_available_date_when_requested_date_has_no_slots(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-05-01 00:00:00');

        $user = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator',
        ]);
        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'name' => 'Sunday Only',
            'slug' => 'sunday-only',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'Asia/Kolkata',
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => 0,
            'start_time' => '09:00:00',
            'end_time' => '11:00:00',
            'is_active' => true,
        ]);

        $this->get(route('bookings.public.show', [
            'username' => 'creator',
            'eventType' => 'sunday-only',
            'date' => '2026-05-15',
            'month' => '2026-05',
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Public')
                ->where('selected_date', '2026-05-17')
                ->where('calendar_month', '2026-05')
                ->has('available_dates')
                ->has('slots')
            );

        Carbon::setTestNow();
    }

    public function test_booking_settings_index_shows_upcoming_summary_per_event_type(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'host-user',
        ]);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Weekly Planning',
            'slug' => 'weekly-planning',
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'guest_name' => 'First Guest',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->setTime(8, 0),
            'ends_at' => now()->addDay()->setTime(8, 30),
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'guest_name' => 'Second Guest',
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDays(2)->setTime(8, 0),
            'ends_at' => now()->addDays(2)->setTime(8, 30),
        ]);

        Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'guest_name' => 'Cancelled Guest',
            'status' => Booking::STATUS_CANCELLED,
            'starts_at' => now()->addDays(3)->setTime(8, 0),
            'ends_at' => now()->addDays(3)->setTime(8, 30),
        ]);

        $this->actingAs($host)
            ->get(route('appointments.index'))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Index')
                ->has('event_types', 1)
                ->where('event_types.0.slug', 'weekly-planning')
                ->where('event_types.0.upcoming_bookings_count', 2)
                ->where('event_types.0.next_booking.guest_name', 'First Guest')
            );
    }

    public function test_host_cannot_reschedule_booking_to_past_time(): void
    {
        $this->withoutVite();

        $host = User::factory()->create(['username' => 'host-user']);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'consulting',
            'duration_minutes' => 30,
            'timezone' => 'UTC',
        ]);
        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->setTime(10, 0),
            'ends_at' => now()->addDay()->setTime(10, 30),
        ]);

        $this->actingAs($host)
            ->patch(route('appointments.reschedule', $booking), [
                'starts_at' => now()->subHour()->toIso8601String(),
            ])
            ->assertSessionHasErrorsIn('bookingReschedule', ['starts_at']);
    }

    public function test_host_cannot_reschedule_booking_outside_configured_availability(): void
    {
        $this->withoutVite();

        $host = User::factory()->create(['username' => 'host-user']);
        $tomorrow = now('UTC')->addDay()->startOfDay();
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'consulting',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
        ]);
        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => $tomorrow->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'is_active' => true,
        ]);
        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => $tomorrow->copy()->setTime(9, 0),
            'ends_at' => $tomorrow->copy()->setTime(9, 30),
        ]);

        $this->actingAs($host)
            ->patch(route('appointments.reschedule', $booking), [
                'starts_at' => $tomorrow->copy()->setTime(11, 0)->toIso8601String(),
            ])
            ->assertSessionHasErrorsIn('bookingReschedule', ['starts_at']);
    }

    public function test_reschedule_availability_endpoint_returns_one_time_event_slots_for_exact_date(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-06-11 08:00:00');

        $host = User::factory()->create(['username' => 'host-user']);
        $eventType = BookingEventType::factory()->for($host, 'host')->oneTime()->create([
            'slug' => 'consulting',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'one_time_date' => '2026-06-22',
            'one_time_start_time' => '10:00:00',
            'one_time_end_time' => '12:00:00',
        ]);
        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => '2026-06-22 10:00:00',
            'ends_at' => '2026-06-22 10:30:00',
        ]);

        $this->actingAs($host)
            ->getJson(route('appointments.reschedule-availability', [
                'booking' => $booking,
                'date' => '2026-06-22',
                'month' => '2026-06',
            ]))
            ->assertOk()
            ->assertJsonPath('selected_date', '2026-06-22')
            ->assertJsonPath('calendar_month', '2026-06')
            ->assertJsonPath('schedule_type', BookingEventType::SCHEDULE_TYPE_ONE_TIME)
            ->assertJsonPath('one_time_date', '2026-06-22')
            ->assertJsonCount(1, 'available_dates')
            ->assertJsonPath('available_dates.0', '2026-06-22')
            ->assertJsonCount(4, 'slots')
            ->assertJsonPath('slots.0.label', '10:00 AM')
            ->assertJsonPath('slots.3.label', '11:30 AM');

        Carbon::setTestNow();
    }

    public function test_host_can_reschedule_one_time_booking_to_another_listed_slot(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-06-11 08:00:00');

        $host = User::factory()->create(['username' => 'host-user']);
        $eventType = BookingEventType::factory()->for($host, 'host')->oneTime()->create([
            'slug' => 'consulting',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'one_time_date' => '2026-06-22',
            'one_time_start_time' => '10:00:00',
            'one_time_end_time' => '12:00:00',
        ]);
        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => '2026-06-22 10:00:00',
            'ends_at' => '2026-06-22 10:30:00',
        ]);

        $this->actingAs($host)
            ->patch(route('appointments.reschedule', $booking), [
                'starts_at' => '2026-06-22T11:00:00Z',
            ])
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'starts_at' => '2026-06-22 11:00:00',
            'ends_at' => '2026-06-22 11:30:00',
        ]);

        Carbon::setTestNow();
    }

    public function test_public_booking_slots_exclude_elapsed_times_for_current_day(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-05-20 15:00:00');

        $host = User::factory()->create([
            'name' => 'Creator',
            'username' => 'creator',
        ]);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'name' => 'Consultation',
            'slug' => 'consultation',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);
        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => now('UTC')->dayOfWeek,
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'is_active' => true,
        ]);

        $slots = app(BookingAvailabilityService::class)->generateDailySlots(
            $eventType,
            now('UTC')->startOfDay()->toImmutable()
        );

        $this->assertSame([], $slots);

        Carbon::setTestNow();
    }

    public function test_full_day_host_override_blocks_all_slots_for_that_date(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-05-20 08:00:00');

        $host = User::factory()->create([
            'username' => 'creator',
        ]);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'consultation',
            'timezone' => 'UTC',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => 4,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        BookingHostAvailabilityRule::factory()->create([
            'host_user_id' => $host->id,
            'day_of_week' => 4,
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'is_active' => true,
        ]);

        BookingAvailabilityOverride::factory()->create([
            'host_user_id' => $host->id,
            'booking_event_type_id' => null,
            'override_date' => '2026-05-21',
            'start_time' => null,
            'end_time' => null,
            'is_available' => false,
        ]);

        $slots = app(BookingAvailabilityService::class)->generateDailySlots(
            $eventType,
            Carbon::create(2026, 5, 21, 0, 0, 0, 'UTC')->toImmutable()
        );

        $this->assertSame([], $slots);

        Carbon::setTestNow();
    }

    public function test_partial_day_host_override_blocks_overlapping_slots_only(): void
    {
        $this->withoutVite();
        Carbon::setTestNow('2026-05-20 08:00:00');

        $host = User::factory()->create([
            'username' => 'creator',
        ]);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'consultation',
            'timezone' => 'UTC',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => 4,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        BookingHostAvailabilityRule::factory()->create([
            'host_user_id' => $host->id,
            'day_of_week' => 4,
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'is_active' => true,
        ]);

        BookingAvailabilityOverride::factory()->create([
            'host_user_id' => $host->id,
            'booking_event_type_id' => null,
            'override_date' => '2026-05-21',
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'is_available' => false,
        ]);

        $slots = app(BookingAvailabilityService::class)->generateDailySlots(
            $eventType,
            Carbon::create(2026, 5, 21, 0, 0, 0, 'UTC')->toImmutable()
        );

        $labels = collect($slots)->pluck('label')->all();

        $this->assertContains('9:00 AM', $labels);
        $this->assertContains('9:30 AM', $labels);
        $this->assertContains('11:00 AM', $labels);
        $this->assertContains('11:30 AM', $labels);
        $this->assertNotContains('10:00 AM', $labels);
        $this->assertNotContains('10:30 AM', $labels);

        Carbon::setTestNow();
    }

    public function test_event_type_creation_persists_single_location_fields(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
        ]);

        $this->actingAs($user)
            ->post(route('appointments.event-types.store'), [
                'name' => 'Location Test Event',
                'description' => 'Testing location save.',
                'timezone' => 'UTC',
                'duration_minutes' => 30,
                'buffer_minutes' => 4,
                'location_type' => 'in_person',
                'location_value' => '221B Baker Street, London',
                'location_label' => 'Office Visit',
                'is_active' => true,
                'availability_rules' => [
                    [
                        'day_of_week' => 1,
                        'start_time' => '09:00',
                        'end_time' => '17:00',
                        'is_active' => true,
                    ],
                ],
                'global_availability_rules' => $this->defaultGlobalAvailabilityRules(),
                'availability_overrides' => [],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('booking_event_types', [
            'host_user_id' => $user->id,
            'name' => 'Location Test Event',
            'location_type' => 'in_person',
            'location_value' => '221B Baker Street, London',
            'location_label' => 'Office Visit',
        ]);
    }

    public function test_event_type_creation_accepts_zoom_call_location_type(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
        ]);

        $this->actingAs($user)
            ->post(route('appointments.event-types.store'), [
                'name' => 'Zoom Event',
                'description' => 'Testing zoom location save.',
                'timezone' => 'UTC',
                'duration_minutes' => 30,
                'buffer_minutes' => 0,
                'location_type' => 'zoom_call',
                'location_value' => 'https://zoom.us/j/123456789',
                'location_label' => 'Zoom Room',
                'is_active' => true,
                'availability_rules' => [
                    [
                        'day_of_week' => 1,
                        'start_time' => '09:00',
                        'end_time' => '17:00',
                        'is_active' => true,
                    ],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('booking_event_types', [
            'host_user_id' => $user->id,
            'name' => 'Zoom Event',
            'location_type' => 'zoom_call',
            'location_value' => 'https://zoom.us/j/123456789',
            'location_label' => 'Zoom Room',
        ]);
    }

    public function test_user_can_update_booking_working_hours_and_date_overrides_independently(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
            'email_verified_at' => now(),
        ]);

        BookingAvailabilityOverride::factory()->create([
            'host_user_id' => $user->id,
            'booking_event_type_id' => null,
            'override_date' => '2026-05-24',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'is_available' => false,
            'reason' => 'Existing hold',
        ]);

        $this->actingAs($user)
            ->patch(route('settings.bookings.working-hours.update'), [
                'global_availability_rules' => [
                    ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '12:00', 'is_active' => true],
                    ['day_of_week' => 1, 'start_time' => '15:00', 'end_time' => '18:00', 'is_active' => true],
                    ['day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                    ['day_of_week' => 4, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                ],
                'lock_time_slots_across_event_types' => true,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('booking_host_availability_rules', [
            'host_user_id' => $user->id,
            'day_of_week' => 1,
            'start_time' => '09:00:00',
            'end_time' => '12:00:00',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('booking_host_availability_rules', [
            'host_user_id' => $user->id,
            'day_of_week' => 1,
            'start_time' => '15:00:00',
            'end_time' => '18:00:00',
            'is_active' => true,
        ]);

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'lock_time_slots_across_event_types' => true,
        ]);

        $this->assertDatabaseHas('booking_availability_overrides', [
            'host_user_id' => $user->id,
            'booking_event_type_id' => null,
            'override_date' => '2026-05-24 00:00:00',
            'start_time' => '09:00:00',
            'end_time' => '10:00:00',
            'is_available' => false,
            'reason' => 'Existing hold',
        ]);

        $this->actingAs($user)
            ->patch(route('settings.bookings.date-overrides.update'), [
                'availability_overrides' => [
                    [
                        'override_date' => '2026-05-22',
                        'is_full_day' => false,
                        'start_time' => '10:00',
                        'end_time' => '11:00',
                        'reason' => 'Team offsite',
                    ],
                    [
                        'override_date' => '2026-05-22',
                        'is_full_day' => false,
                        'start_time' => '14:00',
                        'end_time' => '16:00',
                        'reason' => 'Afternoon block',
                    ],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('booking_availability_overrides', [
            'host_user_id' => $user->id,
            'booking_event_type_id' => null,
            'override_date' => '2026-05-22 00:00:00',
            'start_time' => '10:00:00',
            'end_time' => '11:00:00',
            'is_available' => false,
            'reason' => 'Team offsite',
        ]);

    }

    public function test_host_can_save_working_hours_with_inactive_days_and_maintain_times(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
            'email_verified_at' => now(),
        ]);

        // Save Sunday and Monday as inactive, but with custom hours (11:00 to 17:00).
        $this->actingAs($user)
            ->patch(route('settings.bookings.working-hours.update'), [
                'global_availability_rules' => [
                    ['day_of_week' => 0, 'start_time' => '11:00', 'end_time' => '17:00', 'is_active' => false],
                    ['day_of_week' => 1, 'start_time' => '11:00', 'end_time' => '17:00', 'is_active' => false],
                    ['day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                    ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                    ['day_of_week' => 4, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                    ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
                    ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => false],
                ],
                'lock_time_slots_across_event_types' => false,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        // 1. Assert that the rule for Monday was saved with is_active = false and custom time slot.
        $this->assertDatabaseHas('booking_host_availability_rules', [
            'host_user_id' => $user->id,
            'day_of_week' => 1,
            'start_time' => '11:00:00',
            'end_time' => '17:00:00',
            'is_active' => false,
        ]);

        // 2. Simulate hitting the settings page which triggers ensureHostAvailabilityRules.
        $this->actingAs($user)
            ->get(route('appointments.settings'))
            ->assertOk();

        // 3. Assert that the custom rule for Monday is NOT overwritten or reset to defaults.
        $this->assertDatabaseHas('booking_host_availability_rules', [
            'host_user_id' => $user->id,
            'day_of_week' => 1,
            'start_time' => '11:00:00',
            'end_time' => '17:00:00',
            'is_active' => false,
        ]);

        $this->assertDatabaseMissing('booking_host_availability_rules', [
            'host_user_id' => $user->id,
            'day_of_week' => 1,
            'is_active' => true,
        ]);
    }

    public function test_host_can_update_general_booking_settings(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->patch(route('appointments.settings.general.update'), [
                'booking_timezone' => 'Asia/Kolkata',
                'booking_welcome_message' => 'Welcome to my booking page!',
                'default_minimum_booking_notice_minutes' => 60,
                'default_booking_window_days' => 30,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'booking_timezone' => 'Asia/Kolkata',
            'booking_welcome_message' => 'Welcome to my booking page!',
            'default_minimum_booking_notice_minutes' => 60,
            'default_booking_window_days' => 30,
        ]);
    }

    public function test_custom_welcome_message_rendered_on_public_index(): void
    {
        $this->withoutVite();

        $host = User::factory()->create([
            'username' => 'creator-welcome',
            'booking_welcome_message' => 'Custom text welcome here.',
        ]);

        $this->get(route('bookings.public.index', ['username' => 'creator-welcome']))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/PublicIndex')
                ->where('host.welcome_message', 'Custom text welcome here.')
            );
    }

    public function test_minimum_booking_notice_minutes_limits_available_slots(): void
    {
        $this->withoutVite();
        config()->set('app.timezone', 'UTC');
        Carbon::setTestNow('2026-06-25 10:00:00 UTC');

        $host = User::factory()->create([
            'username' => 'creator',
            'default_minimum_booking_notice_minutes' => 120, // 2 hours
        ]);

        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'notice-test',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
            'day_of_week' => 4, // 2026-06-25 is Thursday (4)
            'start_time' => '09:00:00',
            'end_time' => '15:00:00',
            'is_active' => true,
        ]);

        $service = app(BookingAvailabilityService::class);
        $targetDate = Carbon::parse('2026-06-25 00:00:00', 'UTC')->toImmutable();

        // Host notice is 120 mins. Since now is 10:00:00, slots before 12:00:00 should be filtered out.
        $slots = $service->generateDailySlots($eventType, $targetDate);
        $labels = collect($slots)->pluck('label')->all();

        $this->assertNotContains('9:00 AM', $labels);
        $this->assertNotContains('10:00 AM', $labels);
        $this->assertNotContains('11:30 AM', $labels);
        $this->assertContains('12:00 PM', $labels);
        $this->assertContains('2:30 PM', $labels);

        // Event-type override notice to 180 mins. Slots before 13:00:00 should be filtered out.
        $eventType->update([
            'minimum_booking_notice_minutes' => 180,
        ]);

        $slots = $service->generateDailySlots($eventType, $targetDate);
        $labels = collect($slots)->pluck('label')->all();

        $this->assertNotContains('12:00 PM', $labels);
        $this->assertNotContains('12:30 PM', $labels);
        $this->assertContains('1:00 PM', $labels);

        Carbon::setTestNow();
    }

    public function test_booking_window_days_limits_available_dates(): void
    {
        $this->withoutVite();
        config()->set('app.timezone', 'UTC');
        Carbon::setTestNow('2026-06-25 10:00:00 UTC');

        $host = User::factory()->create([
            'username' => 'creator',
            'default_booking_window_days' => 5,
        ]);

        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'window-test',
            'duration_minutes' => 30,
            'buffer_minutes' => 0,
            'timezone' => 'UTC',
            'is_active' => true,
        ]);

        // Availability rule for every day of the week
        for ($day = 0; $day <= 6; $day++) {
            BookingAvailabilityRule::factory()->for($eventType, 'eventType')->create([
                'day_of_week' => $day,
                'start_time' => '09:00:00',
                'end_time' => '17:00:00',
                'is_active' => true,
            ]);
        }

        // Test with host default booking window = 5 days (allowed: 2026-06-25 to 2026-06-30)
        $this->get(route('bookings.public.show', [
            'username' => 'creator',
            'eventType' => 'window-test',
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Public')
                ->where('available_dates', fn ($dates) => $dates->contains('2026-06-30') && ! $dates->contains('2026-07-01')
                )
            );

        // Test with event-type level override of 2 days (allowed: 2026-06-25 to 2026-06-27)
        $eventType->update([
            'booking_window_days' => 2,
        ]);

        $this->get(route('bookings.public.show', [
            'username' => 'creator',
            'eventType' => 'window-test',
        ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Public')
                ->where('available_dates', fn ($dates) => $dates->contains('2026-06-27') && ! $dates->contains('2026-06-28')
                )
            );

        Carbon::setTestNow();
    }

    public function test_event_type_creation_accepts_and_saves_advanced_limits(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
        ]);

        $this->actingAs($user)
            ->post(route('appointments.event-types.store'), [
                'name' => 'Advanced Session',
                'description' => 'Advanced settings test.',
                'timezone' => 'UTC',
                'schedule_type' => BookingEventType::SCHEDULE_TYPE_WEEKLY,
                'duration_minutes' => 30,
                'buffer_minutes' => 0,
                'location_type' => 'google_meet',
                'location_value' => 'https://meet.google.com/test',
                'location_label' => 'Google Meet',
                'allows_multi_seat_booking' => false,
                'exclude_from_global_slot_lock' => false,
                'is_active' => true,
                'minimum_booking_notice_minutes' => 180,
                'booking_window_days' => 45,
                'availability_rules' => [
                    [
                        'day_of_week' => 1,
                        'start_time' => '09:00',
                        'end_time' => '17:00',
                        'is_active' => true,
                    ],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('booking_event_types', [
            'host_user_id' => $user->id,
            'name' => 'Advanced Session',
            'minimum_booking_notice_minutes' => 180,
            'booking_window_days' => 45,
        ]);
    }

    public function test_event_type_update_accepts_and_saves_advanced_limits(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'creator',
        ]);

        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'name' => 'Old Event',
            'slug' => 'old-event',
            'minimum_booking_notice_minutes' => 60,
            'booking_window_days' => 15,
        ]);

        $this->actingAs($user)
            ->put(route('appointments.event-types.update', $eventType), [
                'name' => 'Updated Event',
                'timezone' => 'UTC',
                'schedule_type' => BookingEventType::SCHEDULE_TYPE_WEEKLY,
                'duration_minutes' => 30,
                'buffer_minutes' => 0,
                'location_type' => 'google_meet',
                'location_value' => 'https://meet.google.com/test',
                'location_label' => 'Google Meet',
                'allows_multi_seat_booking' => false,
                'exclude_from_global_slot_lock' => false,
                'is_active' => true,
                'minimum_booking_notice_minutes' => 240,
                'booking_window_days' => 90,
                'availability_rules' => [
                    [
                        'day_of_week' => 1,
                        'start_time' => '09:00',
                        'end_time' => '17:00',
                        'is_active' => true,
                    ],
                ],
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect();

        $this->assertDatabaseHas('booking_event_types', [
            'id' => $eventType->id,
            'name' => 'Updated Event',
            'minimum_booking_notice_minutes' => 240,
            'booking_window_days' => 90,
        ]);
    }

    public function test_deleting_event_type_soft_deletes_and_preserves_bookings(): void
    {
        $this->withoutVite();

        $user = User::factory()->create([
            'username' => 'host-user',
        ]);
        $eventType = BookingEventType::factory()->for($user, 'host')->create([
            'name' => 'Soft Delete Test Event',
            'slug' => 'soft-delete-test-event',
        ]);
        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $user->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->startOfDay()->utc(),
            'ends_at' => now()->addDay()->startOfDay()->addMinutes(30)->utc(),
            'guest_name' => 'John Doe',
            'guest_email' => 'john@example.com',
        ]);

        $this->actingAs($user)
            ->delete(route('appointments.event-types.destroy', $eventType))
            ->assertRedirect();

        // Assert the event type is soft-deleted
        $this->assertSoftDeleted('booking_event_types', [
            'id' => $eventType->id,
        ]);

        // Assert the booking is preserved in the database
        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'booking_event_type_id' => $eventType->id,
        ]);

        // Assert calendar query eager loads the soft-deleted event type name
        $this->actingAs($user)
            ->get(route('appointments.calendar', [
                'month' => now()->format('Y-m'),
                'date' => now()->addDay()->toDateString(),
            ]))
            ->assertInertia(fn (Assert $page) => $page
                ->component('Appointments/Calendar')
                ->has('selected_day_bookings', 1)
                ->where('selected_day_bookings.0.event_type_name', 'Soft Delete Test Event')
            );
    }

    public function test_cannot_query_reschedule_availability_for_soft_deleted_event_type(): void
    {
        $this->withoutVite();

        $host = User::factory()->create(['username' => 'host-user']);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'consulting',
            'duration_minutes' => 30,
            'timezone' => 'UTC',
        ]);
        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->setTime(10, 0),
            'ends_at' => now()->addDay()->setTime(10, 30),
        ]);

        $eventType->delete(); // Soft delete

        $this->actingAs($host)
            ->getJson(route('appointments.reschedule-availability', $booking->id))
            ->assertStatus(422)
            ->assertJsonPath('message', 'Cannot reschedule bookings for deleted event types.');
    }

    public function test_cannot_reschedule_booking_for_soft_deleted_event_type(): void
    {
        $this->withoutVite();

        $host = User::factory()->create(['username' => 'host-user']);
        $eventType = BookingEventType::factory()->for($host, 'host')->create([
            'slug' => 'consulting',
            'duration_minutes' => 30,
            'timezone' => 'UTC',
        ]);
        $booking = Booking::factory()->create([
            'booking_event_type_id' => $eventType->id,
            'host_user_id' => $host->id,
            'status' => Booking::STATUS_CONFIRMED,
            'starts_at' => now()->addDay()->setTime(10, 0),
            'ends_at' => now()->addDay()->setTime(10, 30),
        ]);

        $eventType->delete(); // Soft delete

        $this->actingAs($host)
            ->patch(route('appointments.reschedule', $booking->id), [
                'starts_at' => now()->addDay()->setTime(11, 0)->toIso8601String(),
            ])
            ->assertSessionHasErrorsIn('bookingReschedule', ['starts_at']);
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function defaultGlobalAvailabilityRules(): array
    {
        return [
            ['day_of_week' => 0, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => false],
            ['day_of_week' => 1, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
            ['day_of_week' => 2, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
            ['day_of_week' => 3, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
            ['day_of_week' => 4, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
            ['day_of_week' => 5, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => true],
            ['day_of_week' => 6, 'start_time' => '09:00', 'end_time' => '17:00', 'is_active' => false],
        ];
    }
}
