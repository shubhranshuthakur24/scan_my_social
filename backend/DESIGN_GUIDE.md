# ScanMySocial Module Design Guide

This guide defines the improved direction for all new and changed modules. It applies to backend structure, routes, tests, Inertia pages, navigation, UI states, copy, and verification.

For specific details on colors, typography, shapes, buttons, elevation, motion, spacing, and accessibility compliance, please refer to the [Scan My Social Design System Guidelines](file:///d:/Projects/Viralyzer/DESIGN_GUIDELINES.md).

Use the Content Library as the main reference for module grouping and workflow design:

- Sidebar group: `Content Library`
- Module tabs: `Library`, `Competitors`, `Watchlist`
- Reference files: `resources/js/Layouts/AuthenticatedLayout.jsx`, `resources/js/Components/ModuleTabs.jsx`, `resources/js/Pages/Videos/Index.jsx`, `resources/js/Pages/Channels/Channels.jsx`, `resources/js/Pages/Watchlists/Index.jsx`

The goal is not to copy every visual flourish. The goal is to build a calmer, more consistent ScanMySocial workbench: fast, useful, creator-aware, and professional.

## Product Direction

### Must

- Treat modules as real workflows, not landing pages.
- Make the first screen useful for the primary job: browsing, filtering, creating, reviewing, or acting.
- Preserve the app's Laravel, Inertia, React, Tailwind, and testing conventions.
- Keep backend source-of-truth models, routes, authorization, and tests as deliberate as the UI.
- Reuse existing components and patterns before creating new ones.

### Prefer

- Use a clean SaaS workbench feel with creator-tool warmth.
- Use the Content Library pattern for grouped modules: sidebar group plus top module tabs.
- Use neutral surfaces with primary color as emphasis, not as the whole page mood.
- Keep dense operational modules quieter than media/content modules.

## Module Architecture

### Must

- Put authenticated Inertia pages under `resources/js/Pages/{Module}`.
- Keep controllers thin: validate, authorize, query, transform, render or redirect.
- Extract repeated business logic into services or action-style classes when it is shared across controllers, commands, jobs, or tests.
- Use named routes and Ziggy route names for frontend navigation.
- Add or update tests for every behavior change.
- Keep ownership and visibility rules explicit in queries and tests.
- Use factories and existing model states in tests.

### Prefer

- Split large pages into local partials once a page has multiple workflows such as filters, grids, bulk actions, dialogs, or sidebars.
- Use a service for idempotent sync/backfill/import logic.
- Use paginated or deferred data for list-heavy modules.
- Use virtualization for very large visual lists.

## Navigation

### Must

- Use the sidebar for product-level modules.
- Use `ModuleTabs` for related sibling pages inside one module group.
- Keep active states route-based and predictable.
- Keep tab names short and task-based.
- Keep a module reachable from exactly one obvious top-level path unless there is a strong product reason.

### Prefer

- Model grouped modules after Content Library:
  - Sidebar item opens the most common tab.
  - Top tabs expose sibling workflows.
  - Query params may preserve tab state when useful.
- Avoid making sidebar labels too abstract. Users should know what they will get.

## Layout

### Must

- Use the authenticated shell for app modules.
- Keep page content within the existing layout container unless a module needs a full-bleed canvas or media surface.
- Use responsive constraints for grids, cards, tables, toolbars, and sidebars.
- Ensure text does not overflow buttons, cards, filters, tabs, or badges.
- Use `gap` utilities for spacing between sibling elements.

### Prefer

- Start with a compact module header, then controls, then records/content.
- Use Content Library's gradient header only for media-heavy or creator-facing modules.
- Use quieter white or neutral headers for CRM, settings, billing, admin, and data review modules.
- Use sticky toolbars only when the workflow benefits from repeated filtering or bulk action.

## Surfaces And Shape

### Must

- Use cards for individual repeated items, modals, and genuinely framed tools.
- Do not put UI cards inside other UI cards.
- Keep page sections as full-width bands or unframed layouts rather than stacked decorative cards.
- Use borders and subtle shadows to separate work areas.
- Support empty, loading, error, and filtered-empty states.

### Prefer

- Use `rounded-xl`   for common controls and panels.
- Reserve `rounded-3xl` for media cards, important empty states, or expressive creator surfaces.
- Avoid making every surface extra-rounded; CRM and admin modules should feel tighter.
- Avoid decorative blurred orbs and blobs in app modules.

## Records

### Must

- Match the record presentation to the data:
  - Visual/media records can use cards.
  - CRM, leads, bookings, billing, and admin records should use dense rows, tables, or responsive hybrids.
  - Mixed workflows may use cards on mobile and rows or tables on desktop.
- Show the most important identifiers first: name/title, source/status, contact/owner, timestamp, and next action.
- Provide useful filters and search for any list that can grow beyond one page.

### Prefer

- Use metrics or summary chips only when they help the user decide what to do.
- Keep row/card actions predictable: view, edit, duplicate, archive/delete, export, or sync.
- Use badges for status and source type, with restrained colors.

## Forms

### Must

- Use server-side validation and display field errors near the relevant field.
- Use labels or accessible names for every input.
- Disable or show loading state during submission.
- Preserve user input on validation errors.
- Use `ConfirmDialog` or an existing modal for destructive actions.

### Prefer

- Group long forms into sections with concise headings.
- Put primary actions at the end of the form or in a sticky footer only when the form is long.
- Keep helper text practical, not promotional.

## States

### Must

- Loading: show skeletons or meaningful progress, never a blank flash.
- Empty: explain what is missing and offer the next useful action.
- Filtered empty: tell the user filters/search may be hiding results.
- Error: show a recoverable message and keep controls available where possible.
- Success: use flash/toast patterns already present in the app.

### Prefer

- Model empty states after `EmptyState.jsx`.
- For deferred Inertia props, include a skeleton fallback.
- Keep animation subtle and functional.

## Copy

### Must

- Write short, direct UI copy.
- Use action verbs on buttons.
- Avoid in-app text that explains obvious UI mechanics.
- Keep destructive action copy explicit about consequence.

### Prefer

- Use an encouraging creator-tool tone for creator workflows.
- Use utilitarian copy for CRM, billing, admin, settings, and security.
- Avoid hype-heavy copy inside operational modules.

## Visual System

### Must

- Use Tailwind tokens and existing semantic classes instead of raw hex values.
- Use existing icon libraries/components before adding custom SVG.
- Keep focus states visible.
- Meet reasonable contrast for text and controls.

### Prefer

- Keep the page mostly neutral: white, slate, mist, and light borders.
- Use primary color for active nav, focus, key actions, and selected states.
- Use accent/success/warning/danger only for meaning.
- Avoid one-note pages dominated by purple, blue, beige, brown, or dark slate.

## Verification

### Must

- Run the narrowest relevant backend tests for changed behavior.
- Run Pint after PHP changes.
- Run a frontend build or targeted browser check after meaningful UI changes.
- Check mobile and desktop responsive behavior for new or substantially changed pages.
- Mention any test or environment limitation in the final response.

### Prefer

- Add tests at the feature boundary users rely on: page access, authorization, creation/update flows, filtering, and commands.
- Use screenshots/browser verification for visual layout changes when a local server is available.
