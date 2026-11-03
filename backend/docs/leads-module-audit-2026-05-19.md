# Leads Module Audit Report - 2026-05-19

## Scope

Audited the authenticated Leads entry from the sidebar, focused on `http://localhost:8000/lead-forms` and the pages/routes directly reachable from the Lead Forms module:

- `GET /lead-forms`
- `POST /lead-forms`
- `GET /lead-forms/{leadForm}`
- `PATCH /lead-forms/{leadForm}`
- `PATCH /lead-forms/{leadForm}/publish`
- `DELETE /lead-forms/{leadForm}`
- `GET /lead-forms/{leadForm}/submissions`
- `GET /lead-forms/{leadForm}/submissions/export`
- `POST /lead-forms/{leadForm}/upload-cover`
- `DELETE /lead-forms/{leadForm}/remove-cover`
- Public form surface used by the module: `GET /f/{publicId}` and `POST /f/{publicId}/submit`

Appointments were reviewed only as they relate to the sidebar Leads navigation, because `resources/js/Components/Sidebar.jsx` marks both `lead-forms.*` and `appointments.*` as active under the single "Leads" sidebar item.

Laravel Boost MCP tools were not exposed in this session, so version-specific `search-docs` and Boost browser/database helpers could not be used. The audit used local source inspection, Artisan route listing, and focused feature tests.

## Executive Summary

The Lead Forms module has a solid foundation: authenticated routes, explicit owner checks, public-only published form access, server-side validation, CSV export, uploaded cover image handling, and focused feature tests. The highest-priority risks are product/navigation drift and data quality issues rather than an obvious critical auth bypass.

The biggest user-facing gap is that the sidebar presents "Leads" as a combined area for lead forms and appointments, but `/lead-forms` does not expose appointment navigation or consume the `leads_tab=lead_forms` query parameter. The module also has a dead `submissions` tab path in the controller, duplicate field keys are not prevented, and public submissions can include extra fields not configured on the form.

## Findings

### P1 - Sidebar "Leads" Groups Appointments, But `/lead-forms` Has No Appointment Entry Point

**Files**

- `resources/js/Components/Sidebar.jsx:37`
- `resources/js/Components/Sidebar.jsx:45`
- `resources/js/Components/Sidebar.jsx:52`
- `resources/js/Components/Sidebar.jsx:64`
- `resources/js/Pages/LeadForms/Index.jsx`

The sidebar sends users to `route('lead-forms.index', { leads_tab: 'lead_forms' })`, and marks both `lead-forms.*` and `appointments.*` as active for the same "Leads" item. However, `LeadForms/Index.jsx` does not read `leads_tab`, and there is no visible tab or link to appointments from `/lead-forms`.

This creates a navigation mismatch: users can see appointments are part of the Leads sidebar group only after visiting `/appointments` some other way, but the Leads landing page itself only shows Lead Forms.

**Recommendation**

Either split Appointments into its own sidebar item, or turn the Leads landing page into a real Leads hub with visible tabs/links for Lead Forms and Appointments. If keeping a query tab model, make `/lead-forms?leads_tab=lead_forms` meaningful and add an appointments tab/link that routes to `appointments.index`.

### P1 - `tab=submissions` Is Allowed By Backend But Not Rendered In The Editor

**Files**

- `app/Http/Controllers/LeadFormController.php:233`
- `app/Http/Controllers/LeadFormController.php:235`
- `resources/js/Pages/LeadForms/Partials/InternalNav.jsx:9`
- `resources/js/Pages/LeadForms/Show.jsx:274`
- `resources/js/Pages/LeadForms/Show.jsx:336`
- `resources/js/Pages/LeadForms/Show.jsx:547`

`LeadFormController::resolveTab()` allows `submissions`, but `InternalNav` only renders Summary, Builder, and Settings. `Show.jsx` also only renders `summary`, `editor`, and `settings`. A direct visit to `/lead-forms/{id}?tab=submissions` results in the shell/header rendering with an empty main content area.

There is a separate `LeadForms/Submissions.jsx` page at `/lead-forms/{leadForm}/submissions`, so the route model is split between a tab that no longer exists and a dedicated submissions page.

**Recommendation**

Remove `submissions` from the allowed editor tabs, or add a visible "Leads" / "Submissions" internal nav item that renders a proper section or redirects to `lead-forms.submissions`.

### P1 - Public Submissions Can Store Extra Unconfigured Fields

**Files**

- `app/Http/Requests/LeadFormSubmissionRequest.php:18`
- `app/Http/Controllers/LeadFormPublicController.php:45`
- `app/Http/Controllers/LeadFormPublicController.php:55`
- `app/Http/Controllers/LeadFormPublicController.php:59`
- `app/Http/Controllers/LeadFormPublicController.php:86`

The public submission request only validates that `data` is an array with up to 100 keys. `LeadFormPublicController::buildSubmissionRules()` adds rules for configured fields, but it does not reject keys that are not in the form schema. Those extra values are included in `$validator->validated()['data']` and stored.

This creates data quality and privacy risk: arbitrary user-supplied keys can be persisted and later exported/displayed as lead data.

**Recommendation**

After validation, whitelist the payload to configured field keys before storing files and creating `LeadFormSubmission`. Add a feature test that posts a valid required field plus an unconfigured `data.unexpected` key and asserts the unexpected key is not stored.

### P1 - Duplicate Field Keys Are Allowed, Causing Ambiguous Capture And CSV Export

**Files**

- `app/Http/Requests/LeadFormRequest.php:40`
- `resources/js/Pages/LeadForms/Partials/FieldCard.jsx`
- `app/Http/Controllers/LeadFormController.php:180`
- `resources/js/Pages/LeadForms/PublicShow.jsx`

Field keys are validated for format, but not uniqueness. A user can create two fields with the same `key`. On the public form, both inputs will write to the same `data[key]`, so one answer can overwrite the other. CSV export de-duplicates field keys, hiding the problem further.

**Recommendation**

Add `distinct` to `fields.*.key` validation, surface the validation error in the builder, and consider client-side duplicate-key detection before saving.

### P2 - Focused Lead Form Test File Is Currently Failing

**Files**

- `tests/Feature/LeadFormModuleTest.php:32`
- `tests/Feature/LeadFormModuleTest.php:146`
- `tests/Feature/LeadFormModuleTest.php:265`
- `app/Http/Controllers/LeadFormController.php:34`
- `app/Http/Controllers/LeadFormPublicController.php:76`

Command run:

```powershell
& 'C:\xampp\php\php.exe' artisan test --compact tests\Feature\LeadFormModuleTest.php
```

Result: 7 passed, 3 failed.

Failures:

- `test_authenticated_user_can_create_and_view_own_form` posts no `title`, but `LeadFormController::store()` requires `title`.
- `test_public_submission_redirects_when_completion_redirect_is_enabled` expects an immediate external redirect to `https://example.com/thanks`, but the controller redirects back to `/f/{publicId}` with a flash `redirect_url`, and the React page performs delayed client-side redirect.
- `test_owner_can_upload_and_remove_cover_image` cannot run in this local PHP because GD is not installed, so `UploadedFile::fake()->image()` throws `GD extension is not installed.`

**Recommendation**

Update test expectations to match current behavior or adjust the controller if the tests represent desired behavior. For the upload test, either enable GD in the PHP runtime used for tests or use a fake uploaded file approach that does not require generated image dimensions, while still satisfying Laravel's image validation.

### P2 - Public Completion Redirect Is Client-Side Only And Needs Product/Security Decision

**Files**

- `app/Http/Requests/LeadFormRequest.php:64`
- `app/Http/Controllers/LeadFormPublicController.php:76`
- `resources/js/Pages/LeadForms/PublicShow.jsx:69`
- `resources/js/Pages/LeadForms/PublicShow.jsx:76`
- `resources/js/Pages/LeadForms/PublicShow.jsx:141`

The backend validates redirect URLs as generic URLs, stores them in settings, and flashes `redirect_url` after submission. The frontend then redirects with `window.location.href` after a countdown or button click.

This is not necessarily wrong, but it is a product/security decision: public lead forms can redirect submitters to any valid URL configured by the form owner. The current behavior also differs from the feature test that expects an immediate backend redirect.

**Recommendation**

Decide whether arbitrary external redirect URLs are acceptable. If yes, update tests to assert flash-driven redirect behavior. If not, restrict redirect hosts or add a warning/confirmation UX in settings.

### P2 - Public ID Generation Does Not Retry On Unique Collision

**Files**

- `app/Models/LeadForm.php:33`
- `app/Models/LeadForm.php:34`
- `database/migrations/2026_04_17_030000_create_lead_forms_table.php:20`

`LeadForm` generates an 8-character random public ID and the database enforces uniqueness. The chance of collision is low, but a collision would fail creation rather than retry.

**Recommendation**

Generate in a loop that checks uniqueness, or increase the ID length. This is a low-probability reliability issue now, but it becomes more relevant as form volume grows.

### P2 - Public Form File Upload Input Does Not Mirror Server MIME Rules

**Files**

- `app/Http/Controllers/LeadFormPublicController.php:166`
- `resources/js/Pages/LeadForms/PublicShow.jsx:267`

The backend permits upload fields with `jpg,jpeg,png,webp,pdf` and max 4 MB, but the public file input does not set an `accept` attribute. Users can select unsupported files and only learn after server validation.

**Recommendation**

Add `accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"` to upload fields and show helper text for max size/type. Keep backend validation as the source of truth.

### P2 - Submissions View Does Not Handle Arrays Or Uploaded URLs Well

**Files**

- `resources/js/Pages/LeadForms/Submissions.jsx:83`
- `resources/js/Pages/LeadForms/Submissions.jsx:87`
- `app/Http/Controllers/LeadFormPublicController.php:204`

Submission values are rendered using `String(value)`. Checkbox arrays become comma-joined plain strings, file upload URLs become truncated text, and object-like values would become `[object Object]`.

**Recommendation**

Render arrays as badges/list items, detect URL-looking upload values and display a safe link, and use field labels from the form schema instead of raw keys where possible.

### P3 - Unused Import And Minor Frontend Drift

**Files**

- `resources/js/Pages/LeadForms/Partials/InternalNav.jsx:4`
- `resources/js/Pages/LeadForms/Show.jsx:5`
- `resources/js/Pages/LeadForms/Show.jsx:32`

`Users` is imported in `InternalNav.jsx` but not used. `Show.jsx` imports `Download` and `Users`, and accepts a `submissions` prop, but the current editor page does not use them. These are small drift indicators from a previous tab/submissions implementation.

**Recommendation**

Clean up unused imports/props when fixing the submissions navigation.

## What Looks Good

- Authenticated Lead Forms routes are behind the authenticated route group.
- Lead form ownership is checked before show, update, publish/unpublish, delete, cover upload/removal, submissions listing, and CSV export.
- Public form pages only resolve published forms.
- Public submission field types have server-side validation for email, URL, phone, date, dropdown/radio options, checkbox options, rating ranges, and uploads.
- Cover upload validation limits type and size.
- `lead_form_submissions` has a useful compound index on `lead_form_id` and `submitted_at`.
- CSV export streams via cursor, which is appropriate for larger submission sets.
- There is focused feature coverage for auth, ownership, public visibility, required fields, radio validation, CSV export, and cover image handling.

## Verification Notes

Route listing succeeded:

```powershell
& 'C:\xampp\php\php.exe' artisan route:list --path=lead-forms --except-vendor
```

The route list showed 10 authenticated `lead-forms` routes.

Focused feature test command ran but failed:

```powershell
& 'C:\xampp\php\php.exe' artisan test --compact tests\Feature\LeadFormModuleTest.php
```

Result: 7 passed, 3 failed.

Local HTTP check:

```powershell
Invoke-WebRequest -Uri http://localhost:8000/lead-forms -UseBasicParsing -TimeoutSec 10
```

The unauthenticated request redirected to `http://localhost:8000/login`, which matches the authenticated route requirement.

## Recommended Fix Order

1. Decide whether Leads should be a combined hub for Lead Forms and Appointments, or split Appointments into its own sidebar entry.
2. Fix the dead `submissions` tab path and clean up unused imports/props.
3. Add unique field-key validation and tests.
4. Whitelist stored public submission data to configured field keys and tests.
5. Reconcile the redirect behavior with product expectations and update tests.
6. Improve submissions rendering for arrays/uploads.
7. Fix the local test environment or upload test strategy for GD-dependent fake images.
