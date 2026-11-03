# Upcoming Appointments Module Audit Report - June 2026

## Scope

Audited the upcoming appointments list view and related backend logic accessible from the sidebar and authenticated layouts:

1. **Upcoming Appointments Page (Route: `GET /appointments/upcoming`)**
   - Route: `appointments.upcoming`
   - Controller: [AppointmentSettingsController@upcoming](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L131-L261)
   - Page Component: [Upcoming.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx)
   - Date Filter Component: [AnalyticsFilters.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/ContentScheduler/Analytics/AnalyticsFilters.jsx)

Testing coverage was verified using local PHPUnit feature tests in [BookingModuleTest.php](file:///d:/Projects/Viralyzer/tests/Feature/BookingModuleTest.php).

---

## Executive Summary

The **Upcoming Appointments** module provides hosts with a consolidated, search-enabled feed of all upcoming bookings across their scheduled event types, including visual KPIs, date range filtering, and interactive in-line rescheduling and cancellation flows.

The backend implementation handles pagination, searches guest details/notes, and performs eager loading correctly. However, several critical issues were identified:
- **Broken Date Range Presets**: The date picker includes historical analytics presets ("Last 7 days") that return 0 results due to a hardcoded future-only query.
- **Date Hydration Mismatches**: Local formatting of slot times on the client side causes timezone and hydration errors in the browser console.
- **Card-in-Card UI Violations**: The interface nests card components inside larger cards, violating the workbench design system.
- **Reschedule 404 Failures**: Soft-deleted event types leave bookings visible but cause rescheduling requests to crash with 404 responses.
- **KPI and Listing Discrepancies**: "Today's Meetings" KPI counts past events from today, but the booking feed hides them.

---

## Findings

### P1 - Broken Date Range Presets (Functional Bug)

#### Files
- [Upcoming.jsx:L474-481](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx#L474-L481)
- [AnalyticsFilters.jsx:L11-16](file:///d:/Projects/Viralyzer/resources/js/Pages/ContentScheduler/Analytics/AnalyticsFilters.jsx#L11-L16)
- [AppointmentSettingsController.php:L160-163](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L160-L163)

#### Description
The date range picker on the upcoming appointments page imports and uses `AnalyticsFilters` from the `ContentScheduler` module. This component includes historical presets meant for analytics:
- `"Last 7 days"`
- `"Last 30 days"`
- `"This month"` (which includes past days of the month)

However, the backend upcoming query enforces a hardcoded future-only boundary:
```php
$bookings = Booking::query()
    ->where('host_user_id', $user->id)
    ->where('status', Booking::STATUS_CONFIRMED)
    ->where('starts_at', '>=', now()->utc())
```
Because of this constraint, if a host selects `"Last 7 days"` or `"Last 30 days"`, the database query returns empty lists. This renders the presets useless and confusing to hosts trying to navigate their schedule.

#### Recommendation
Do not reuse historical analytics filters for an upcoming schedule. Create or adapt the date picker to offer future-facing presets:
- `"Today & Tomorrow"`
- `"Next 7 days"`
- `"Next 30 days"`
- `"All upcoming"`

---

### P1 - Client-Side Date Formatting & Timezone Hydration Mismatch

#### Files
- [Upcoming.jsx:L66-109](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx#L66-L109)
- [Upcoming.jsx:L263-275](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx#L263-L275)

#### Description
The page formats booking start and end times on the client side using the browser's local timezone:
```javascript
const resolvedTimezone = useMemo(() => {
    if (!app_timezone || app_timezone === 'UTC') {
        try {
            return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
        } catch (e) {
            return 'UTC';
        }
    }
    return app_timezone;
}, [app_timezone]);
```
During Server-Side Rendering (SSR), the server evaluates this React page using the fallback `UTC` timezone. In the client browser, the resolved timezone shifts to the user's local timezone (e.g., `Asia/Kolkata` or `America/New_York`). 

This difference causes the server-rendered HTML and client-rendered HTML text to mismatch (e.g., displaying `10:00 AM` on the server vs `3:30 PM` on the client), triggering React hydration mismatch warnings in the browser console.

#### Recommendation
Format date keys and slot labels entirely on the backend in the host's configured timezone and pass them as pre-formatted strings (`starts_at_formatted` / `slot_time_label`), matching the pattern recently implemented for the `AppointmentCard`.

---

### P2 - Reschedule Action Crashes on Soft-Deleted Event Types (UX & Backend Bug)

#### Files
- [AppointmentSettingsController.php:L448](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L448)
- [AppointmentSettingsController.php:L505](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L505)
- [Upcoming.jsx:L620-644](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx#L620-L644)

#### Description
When an event type is soft-deleted, bookings associated with it are preserved and still render in the upcoming list. However, if a host clicks the "Reschedule" button on one of these bookings, the backend methods `rescheduleAvailability` and `rescheduleBooking` query:
```php
$eventType = $booking->eventType()->firstOrFail();
```
Because the query does not include `withTrashed()`, soft-deleted event types are excluded, causing the request to fail with a `ModelNotFoundException` (resulting in a HTTP 404/500 error). In the UI, the reschedule modal fails to load slots, displaying a generic error message ("Unable to load available slots right now.").

#### Recommendation
1. Update the eager-loading query in the `upcoming` listing method to include the `deleted_at` column:
   ```php
   'eventType' => fn ($query) => $query->withTrashed()->select(['id', 'name', 'slug', 'host_user_id', 'deleted_at']),
   ```
2. In [Upcoming.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx), disable or hide the "Reschedule" button if `booking.eventType.deleted_at` is present.
3. On the backend, return a clean validation error (e.g., "Cannot reschedule bookings for deleted event types.") instead of throwing a 404 exception.

---

### P2 - Double Card Nesting ("Cards inside Cards") (UI Violation)

#### Files
- [Upcoming.jsx:L524](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx#L524)
- [Upcoming.jsx:L567](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx#L567)

#### Description
The main appointments list is wrapped inside a card container panel:
```jsx
<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:p-4">
```
Inside this section, each individual booking item is rendered as another nested gray card:
```jsx
<article className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
```
This violates the design guide constraints:
- *Surfaces & Shape*: "Do not put UI cards inside other UI cards."
- *Records*: "CRM, leads, bookings, billing, and admin records should use dense rows, tables, or responsive hybrids."

#### Recommendation
Refactor the booking list items to render as clean list rows separated by subtle dividers (`border-t border-slate-100`) rather than nested cards, improving the information density and alignment of the page.

---

### P3 - KPI Count Mismatch (UX Mismatch)

#### Files
- [AppointmentSettingsController.php:L191-197](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L191-L197)
- [AppointmentSettingsController.php:L160](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L160)

#### Description
The "Today's Meetings" KPI card counts all confirmed meetings scheduled for today (both past and future meetings of the current day):
```php
$todayStartUtc = now($hostTimezone)->startOfDay()->utc();
$todayEndUtc = now($hostTimezone)->endOfDay()->utc();
```
However, the bookings feed query filters out any meetings that started earlier today:
```php
->where('starts_at', '>=', now()->utc())
```
If a meeting was scheduled for 9:00 AM today and the host views the page at 11:00 AM, the KPI card will show `1` meeting, but the bookings list below will show "No upcoming appointments found." This discrepancy is confusing.

#### Recommendation
Align the listing logic with the KPI bounds. Query list bookings from the start of the day:
```php
->where('starts_at', '>=', now($hostTimezone)->startOfDay()->utc())
```
This ensures all today's appointments remain visible on the dashboard and listings, matching the KPI counts.

---

### P3 - Design Tokens Violation (Typography and Radii)

#### Files
- [Upcoming.jsx](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Upcoming.jsx)

#### Description
The component utilizes non-standard design tokens:
- **Radii**: Uses arbitrary `rounded-2xl` and `rounded-xl` classes (lines 384, 524, 536, 567, 611, 627, 639, 656) instead of `--rounded-brand` (`rounded-brand` = 18px) for containers/panels and `--rounded-brand-sm` (`rounded-brand-sm` = 14px) for controls, inputs, and action buttons.
- **Typography**: Header text `<h2>Appointments</h2>` (line 526) and `"Reschedule appointment"` (line 706) do not specify `font-heading` (Sora), using generic weights/sans family instead.

#### Recommendation
Standardize all radius classes to `rounded-brand` and `rounded-brand-sm` according to the Design Guidelines. Add the `font-heading` class to all page headers and modal headings.
