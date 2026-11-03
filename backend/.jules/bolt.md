# Bolt's Journal ⚡

**Agent Directives for this File:**
- This file contains critically important, codebase-specific performance learnings. 
- You MUST read this file before beginning any optimization run.
- You MUST NOT log routine, expected optimizations here.
- ONLY log surprising edge cases, failed optimizations, rejected PRs, and unique architectural bottlenecks specific to this repository.

---

*(No critical learnings recorded yet. Codebase profiling is fresh.)*

## 2026-03-10 - High-Density Object Prop Memoization
**Learning:** `ContentCard` and similar list-rendered components in this application receive massive payload objects (`post`) containing nested data (`channel`, `projects`, computed metrics) and multiple function callbacks (`onSelectToggle`, `onRemove`). Due to Inertia/React rendering patterns, these heavy cards previously bypassed default shallow equality and re-rendered constantly on any parent state change.
**Action:** When optimizing list views or data-heavy grids in this app, aggressively target the lowest-level card components (`ContentCard`, `ChannelCard`, etc.) with `React.memo()`. Also, observe if custom comparator functions become necessary if parent callback identities change too frequently.

## 2026-03-10 - Unindexed Custom Metric Sorting
**Learning:** The application's core value proposition (Viralzr V1 spec) relies on sorting and range-filtering by custom metrics like `breakout_multiplier`, `video_view_count`, and `engagement_rate`. However, these were initially implemented without DB indexes on the `posts` table, forcing MySQL to perform full table scans and filesorts for every paginated content request.
**Action:** Always verify that any new computed metric added to content models that will be used for filtering or sorting (via columns like `breakout_label`, etc.) includes a corresponding database index in the initial migration.

## 2026-03-10 - Zero useMemo Footprint & Inline Filter Costs
**Learning:** The frontend codebase was found to have zero usage of `useMemo`, leading to frequent O(N) array filtering and string manipulation (e.g., `.toLowerCase().includes()`) running inline within the render paths of major pages. This is particularly wasteful on pages like `Channels.jsx` which utilize 10-second polling intervals.
**Action:** Aggressively memoize filtered or transformed lists in page components. If a component uses background polling, any non-trivial data preparation MUST be wrapped in `useMemo` to prevent CPU overhead on every rerender tick.

## 2026-03-10 - Un-memoized Global Context Providers (Re-render Avalanche)
**Learning:** `ToastContext` was passing a raw object literal `{{ addToast, removeToast }}` directly into its `<Provider value={...}>`. Because this Provider wraps the root `app.jsx` layout, every time a single toast was added or removed, the Provider generated a new object reference. This forced *every single component* in the entire application that called `useToast()` to re-render simultaneously, even though the actual functions hadn't changed.
**Action:** Always wrap Context Provider payloads in `useMemo` when they deal with global scope (e.g., Layout wrappers) to break the implicit context re-render chain.

## 2026-03-10 - O(N) Inline Mapped Components Render Penalty
**Learning:** Arrays mapped into complex inline JSX (e.g., `{scripts.map(s => <div />)}`) inside main page components (`Scripts.jsx`) suffer from O(N) full re-renders whenever the parent page updates its state. For example, typing a single character in the `SearchInput` triggered a state update, causing React to natively re-render all 50+ script cards simultaneously because the mapped items weren't extracted into `<ScriptCard />` components wrapped with `React.memo`.
**Action:** Always extract mapped list items (table rows, cards) into their own standalone component files. Wrap the default export in `React.memo` so they only re-render when their specific instance props change, thus isolating them from their parent container's state churn (like local search inputs).

## 2026-03-11 - Filter Selection Includes Explosion
**Learning:** The `Videos.jsx` filter popovers and card grid rely on repeated `Array.includes()` checks inside mapped JSX (`watchlists`, `labels`, `selectedVideos`). In this codebase, these lists re-render often due dropdown toggles and filter state changes, multiplying linear membership checks across many nodes.
**Action:** For any mapped filter/list UI in this app, memoize `Set` views of selection arrays (`useMemo(() => new Set(...))`) and use `.has()` in render paths instead of repeated `.includes()`.
