# Calendar Module Audit Report - June 2026

## Scope

Audited the calendar views and related backend logic accessible from the sidebar and authenticated layouts:

1. **Appointments Calendar Module (Sidebar "My Calendar")**
   - Route: `GET /appointments/calendar` (`appointments.calendar`)
   - Controller: [AppointmentSettingsController](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L71-L129)
   - Page Component: [Calendar.jsx (Appointments)](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Calendar.jsx)
   - Child Component: [AppointmentCalendar.jsx](file:///d:/Projects/Viralyzer/resources/js/Components/Appointments/AppointmentCalendar.jsx)
   - Shared Component: [WorkbenchCalendar.jsx](file:///d:/Projects/Viralyzer/resources/js/Components/common/WorkbenchCalendar.jsx)
   - Service: [BookingAvailabilityService](file:///d:/Projects/Viralyzer/app/Services/BookingAvailabilityService.php)

2. **Instagram Publishing Calendar Module (Sidebar "Instagram" -> "Calendar" Tab)**
   - Route: `GET /instagram/calendar` (`instagram.calendar`)
   - Controller: [ContentSchedulerController](file:///d:/Projects/Viralyzer/app/Http/Controllers/ContentSchedulerController.php#L49-L110)
   - Page Component: [Calendar.jsx (ContentScheduler)](file:///d:/Projects/Viralyzer/resources/js/Pages/ContentScheduler/Calendar.jsx)

Testing coverage was verified using local PHPUnit feature tests in [BookingModuleTest.php](file:///d:/Projects/Viralyzer/tests/Feature/BookingModuleTest.php#L835-L904).

---

## Executive Summary

The application implements two distinct calendar modules: the **Appointment Booking Calendar** (which displays daily appointment count badges and lets hosts view detailed bookings for a selected day) and the **Instagram Publishing Calendar** (which shows scheduled posts directly on a calendar grid). 

Both modules are built on top of a shared [WorkbenchCalendar](file:///d:/Projects/Viralyzer/resources/js/Components/common/WorkbenchCalendar.jsx) wrapper utilizing the `@fullcalendar` library. Backend logic is clean, utilizing eager loading to prevent N+1 queries, and the suite of 42 feature tests in `BookingModuleTest.php` passes successfully.

However, several architectural, user experience, and accessibility limitations exist:
- **Keyboard navigation traps** inside the appointment day cells that disrupt screen readers and standard tab flows.
- **Timezone mismatch bugs** when resolving fallback UTC timezones on the client versus the server.
- **Fragile height synchronization** relying on JS `ResizeObserver` which can be replaced with clean CSS grid matching.
- **Data integrity risks** where deleting a booking event type cascade-deletes all historical and upcoming bookings.

---

## Findings

### P1 - Focus Trap & Broken Keyboard Navigation in Day Grid (Accessibility)

#### Files
- [AppointmentCalendar.jsx:L118-139](file:///d:/Projects/Viralyzer/resources/js/Components/Appointments/AppointmentCalendar.jsx#L118-L139)

#### Description
Within the custom day cell renderer (`dayCellContent`), each date number is rendered inside an interactive HTML `<button>` that triggers month or date selection:
```javascript
return (
    <button
        type="button"
        className="appointment-calendar-day-content"
        aria-label={ariaLabel}
        aria-pressed={dateKey === selectedDate}
        aria-current={info.isToday ? 'date' : undefined}
        onClick={(event) => { ... }}
    >
        <span className="appointment-calendar-day-number">{dayNumberFormatter.format(info.date)}</span>
    </button>
);
```
Because these buttons do not define a `tabIndex`, they default to `0`. Consequently, a keyboard user must press the `Tab` key 35 to 42 times just to navigate past the calendar month view. Additionally, this nested button structure intercepts focus and breaks FullCalendar's native keyboard navigation (which expects focus to stay on the cell container `<td>` elements and react to arrow keys).

#### Recommendation
Set `tabIndex={-1}` on the inner `<button>` elements to remove them from the document tab order. Coordinate selection behavior on the cell containers using FullCalendar's native `dateClick` callback (which is already configured) to maintain a single focus stop for the entire grid.

---

### P1 - Timezone Mismatch Bug on Default UTC Fallback

#### Files
- [AppointmentSettingsController.php:L74](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L74)
- [Calendar.jsx (Appointments):L31-40](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Calendar.jsx#L31-L40)
- [AppointmentCalendar.jsx:L88-97](file:///d:/Projects/Viralyzer/resources/js/Components/Appointments/AppointmentCalendar.jsx#L88-L97)

#### Description
If a host has not configured a custom `booking_timezone` in their settings, the backend defaults to the system timezone:
```php
$timezone = (string) ($user->booking_timezone ?: config('app.timezone', 'UTC'));
```
However, on the client side, if `app_timezone` is UTC or empty, the frontend overrides it with the browser's local timezone:
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
This mismatch causes discrepancies in date calculations. For example, if a client is in `America/New_York` (UTC-4) and has a booking at `2026-05-01 01:00:00` UTC:
1. The backend groups the booking using UTC, returning it under `daily_counts['2026-05-01']`.
2. The frontend calendar is rendered in `America/New_York` where the booking occurred at `2026-04-30 21:00:00`.
3. The day cell for April 30th on the client queries `dailyCounts['2026-04-30']`, finding no bookings. Clicking May 1st on the client will also display 0 bookings.

#### Recommendation
Maintain strict timezone alignment between server and client. If `booking_timezone` is not set, use the application's configuration timezone consistently across both environments. Do not fallback to local browser timezones on the frontend unless the server is informed of the client's timezone during the request.

---

### P2 - Fragile Layout Height Synchronization via JS ResizeObserver

#### Files
- [Calendar.jsx (Appointments):L28-104](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Calendar.jsx#L28-L104)

#### Description
On desktop screens, the page displays a side-by-side grid containing the Calendar Card (left) and the Appointments list (right). To force both elements to match heights, the component sets up a JS `ResizeObserver` that watches the Calendar Card and updates React state (`appointmentsPanelHeight` in pixels). 

This is fragile and can lead to infinite layout recalculation loops (jitter) if rendering the appointments list changes the outer layout dimensions of the parent grid. It also forces unnecessary re-render cycles.

#### Recommendation
Remove the `ResizeObserver` listener entirely. Use standard CSS Grid flex alignment by changing the container styles from `lg:items-start` to `lg:items-stretch` (the default grid behavior):
```diff
- <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
+ <section className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-stretch">
```
Then, style the right-hand panel with `flex flex-col h-full` and configure its list wrapper with `flex-1 overflow-y-auto`. This achieves robust height matching purely in CSS.

---

### P2 - Cascade Deletion of Host Booking History (Data Integrity Risk)

#### Files
- [bookings migration](file:///d:/Projects/Viralyzer/database/migrations/2026_05_13_190200_create_bookings_table.php#L13)
- [AppointmentSettingsController.php:L410-416](file:///d:/Projects/Viralyzer/app/Http/Controllers/Appointments/AppointmentSettingsController.php#L410-L416)

#### Description
The `BookingEventType` model does not implement Laravel's `SoftDeletes` trait. In the migrations, the bookings relationship cascades on deletion:
```php
$table->foreignId('booking_event_type_id')->constrained()->cascadeOnDelete();
```
When a host deletes an event type via the dashboard, **every past and upcoming booking** associated with that event type is permanently purged from the database. This leads to silent data loss of historical booking logs, customer contact info, and analytics.

#### Recommendation
Enable the `SoftDeletes` trait on the `BookingEventType` model and add a `deleted_at` column in a new migration. When a host deletes an event type, soft-delete it so that past bookings remain intact in the database and display correctly in user records, while hiding the event type from the public booking index.

---

### P3 - Unreliable Date Formatting Hack (`en-CA` locale)

#### Files
- [Calendar.jsx (Appointments):L9-18](file:///d:/Projects/Viralyzer/resources/js/Pages/Appointments/Calendar.jsx#L9-L18)
- [AppointmentCalendar.jsx:L5-24](file:///d:/Projects/Viralyzer/resources/js/Components/Appointments/AppointmentCalendar.jsx#L5-L24)

#### Description
The date utility methods `formatDateKey` and `formatMonthKey` extract the local calendar date using the English-Canada (`en-CA`) locale:
```javascript
const formatDateKey = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    return formatter.format(date);
};
```
While `en-CA` traditionally formats dates as `YYYY-MM-DD`, this format is not explicitly mandated by the ECMAScript specification for all browser runtimes and OS localized configurations. If a device or browser engine formats `en-CA` differently (e.g., `DD/MM/YYYY`), the keys will not match the backend payload keys, causing booking indicators to disappear from the calendar view.

#### Recommendation
Format date strings explicitly by utilizing `Intl.DateTimeFormat` parts, which guarantees formatting patterns regardless of the locale fallback structure:
```javascript
const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
}).formatToParts(date);

const y = parts.find(p => p.type === 'year').value;
const m = parts.find(p => p.type === 'month').value;
const d = parts.find(p => p.type === 'day').value;
return `${y}-${m}-${d}`;
```

---

### P3 - UI Duplication & Icon Inconsistency between Sidebar Calendars

#### Files
- [Sidebar.jsx:L73](file:///d:/Projects/Viralyzer/resources/js/Components/Sidebar.jsx#L73)
- [AuthenticatedLayout.jsx:L230-284](file:///d:/Projects/Viralyzer/resources/js/Layouts/AuthenticatedLayout.jsx#L230-L284)

#### Description
The sidebar contains "My Calendar" (Appointment Calendar) as a top-level sidebar item, while "Instagram" has a secondary "Calendar" tab inside it.
1. They display different types of calendar events (Bookings vs. Scheduled Posts).
2. They use different visual systems: the Instagram Calendar draws blocks representing scheduled items directly inside the cells, while the Appointment Calendar uses a day-click split view with badge counts.
3. Both use the identical `CalendarDays` icon, which can confuse users navigating between booking schedules and social content plans.

#### Recommendation
Consider differentiating the names of the two calendar views (e.g., changing the Instagram calendar tab label to "Posting Schedule" or "Content Calendar"). Use distinct icons (e.g., `CalendarDays` for appointments, and a custom scheduling icon like `CalendarClock` or `Instagram` badge for content scheduling) to increase visual clarity.
