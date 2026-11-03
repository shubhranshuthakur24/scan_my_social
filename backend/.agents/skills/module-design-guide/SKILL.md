---
name: module-design-guide
description: Apply the ScanMySocial module design guide whenever creating, editing, reviewing, or refactoring any module, including Laravel backend structure, Inertia React pages, navigation, forms, lists, cards, tests, copy, and verification.
---

# Module Design Guide

Use this skill before creating or editing any ScanMySocial module.

## Workflow

1. Read `DESIGN_GUIDE.md` at the repo root.
2. Inspect the closest existing sibling module before changing code.
3. For UI/navigation work, inspect the Content Library reference pattern:
   - `resources/js/Layouts/AuthenticatedLayout.jsx`
   - `resources/js/Components/ModuleTabs.jsx`
   - `resources/js/Pages/Videos/Index.jsx`
   - `resources/js/Pages/Channels/Channels.jsx`
   - `resources/js/Pages/Watchlists/Index.jsx`
4. Decide which guide rules are `must` constraints and which are `prefer` recommendations for the current task.
5. Implement using existing Laravel, Inertia, React, Tailwind, route, test, and component conventions.
6. Verify the changed behavior and UI using the narrowest relevant tests/build/browser checks.

## Defaults

- Treat Content Library as the reference for module grouping and workflow mechanics, not a visual style to copy everywhere.
- Use quieter layouts for CRM, admin, settings, billing, and data-review modules.
- Use expressive visual cards for media/content workflows.
- Split large pages into local partials when a module has filters, grids, bulk actions, dialogs, or sidebars.
- Include empty, loading, error, and filtered-empty states for every growable list or async surface.

## Final Check

Before finalizing, confirm:

- The module has predictable sidebar or tab navigation.
- The first screen supports the user's primary workflow.
- Authorization, ownership, validation, and tests match project conventions.
- Visual density, shape, color, and copy follow `DESIGN_GUIDE.md`.
