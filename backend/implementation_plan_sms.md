# Instagram AutoDM App — Implementation Plan

## 1. Product goal

Build a focused Instagram AutoDM application that lets a creator connect an Instagram Business account, select a post or reel, define comment triggers, and automatically send a compliant DM. The product should make the first screen operational: users can see active flows, recent delivery status, and create or pause a campaign immediately.

The plan reuses the existing ScanMySocial AutoDM behavior and conventions rather than creating a second automation model. Existing capabilities to preserve are:

- Instagram OAuth/account selection and disconnected-account handling.
- Post/reel media selection and content-linked flows.
- Comment keyword triggers, public replies, DM variants, image replies, and ask-to-follow gating.
- Queued webhook processing and Meta API delivery.
- Idempotency logs, retries, status toggling, duplication, retriggering, and delivery history.
- Signed AutoDM deeplinks for external URLs.

## 2. Scope and MVP workflow

### Primary user journey

1. User connects an Instagram Business account.
2. User opens AutoDM and sees active, paused, and recently executed flows.
3. User selects a post or reel, enters one or more keywords, and creates a reply flow.
4. Meta sends a comment webhook.
5. The webhook is verified, accepted quickly, and queued.
6. A worker scopes the event to the correct account and flow, matches keywords, and prevents duplicate execution.
7. The worker sends the configured public reply and/or DM through the Meta Graph API.
8. The dashboard records queued, sent, failed, and skipped outcomes.

### MVP boundaries

- Support Instagram Business/Creator accounts that satisfy Meta API requirements.
- Support comment-triggered automation for posts and reels first.
- Keep story replies, follow gating, media attachments, public replies, templates, and deeplinks behind the existing flow model so they can be enabled without a schema rewrite.
- Exclude visual campaign analytics, team collaboration, and arbitrary multi-step branching from the first release.

## 3. Application architecture

### Clean architecture rules

- Domain behavior must not depend on Next.js, HTTP controllers, or database request objects.
- Laravel controllers are adapters only: authenticate, read validated input, call an application service, and serialize the response.
- Application services/actions own use cases such as listing flows, creating flows, matching triggers, and executing deliveries.
- Eloquent models remain persistence adapters; API payload shaping belongs in dedicated resources/transformers or application services.
- Next.js route files remain composition points. Feature components own UI state, API clients own transport, and shared types define the frontend contract.
- Meta Graph API calls must be isolated behind a gateway/service so jobs and use cases can be tested with fakes.
- Dependencies point inward: UI → API client → Laravel endpoint → application service → domain/persistence adapters.

### Backend/API

- Laravel 13 controllers remain thin: authorize, validate, query, transform, render, or redirect.
- Expose a versioned JSON API for the Next.js client; keep account ownership and authorization enforced server-side.
- Services/actions own Meta API calls, flow validation, matching, deeplink generation, and execution decisions.
- Webhook controllers verify Meta signatures and dispatch jobs; they must not perform slow API work in the request.
- Redis/Horizon handles webhook and delivery queues, retries, rate limits, and locks.
- Database records are the source of truth for accounts, flows, variants, and execution logs.

### Next.js frontend

- Build a standalone Next.js app with the existing product design language and AutoDM route concepts.
- Use typed API clients and a shared auth/session strategy; never trust account IDs, flow IDs, or plan limits supplied by the browser.
- Keep the dashboard as a quiet operational workbench: summary metrics, filters, flow rows/cards, status, recent activity, and a clear “Create flow” action.
- Keep the builder step-based and split into local sections for content, triggers, replies, follow gating, and advanced options.
- Recreate or share the existing account selectors, empty states, dialogs, form controls, and toast patterns as Next.js components.
- Include loading, empty, filtered-empty, validation-error, API-error, and success states.

## 4. Data model and constraints

Reuse existing `instagram_accounts`, `automation_flows`, `automation_message_variants`, and `automation_logs` structures where possible. Confirm the current schema before implementation and add only missing fields.

Required invariants:

- Every flow belongs to an application user and Instagram account owned by that user.
- Queries always scope by authenticated user and account ownership.
- `trigger_source_id` deduplication must match the runtime scope. Prefer a composite unique constraint on `(automation_flow_id, trigger_source_id)`; if product policy requires account-wide dedupe, use `(instagram_account_id, trigger_source_id)` consistently in code and tests.
- Webhook dedupe keys must include the Instagram account ID.
- Pending CTA/follow/button state must include flow ID (and trigger source where needed) to prevent cross-flow collisions.
- Tokens/access credentials must remain encrypted and never be returned to API responses or logs.
- Deeplinks should have an explicit expiry window and tamper protection.

## 5. Backend implementation phases

### Phase 1 — Foundation and account readiness

- Confirm existing Instagram account OAuth, callback, account selection, disconnect, token refresh, and permission checks.
- Move OAuth URL construction fully to `config/services.php`; remove hardcoded client IDs and redirect URIs.
- Add/confirm policies and authorization tests for account and flow ownership.
- Add a health/readiness state for expired, disconnected, or missing-permission accounts.

### Phase 2 — Flow management API

- Define the canonical flow input contract: account, media ID/type, name, keywords, public reply, DM variants, attachments, status, and optional gating settings.
- Centralize validation in a request/action/service shared by create and update.
- Provide authenticated API endpoints for list, detail, create, update, toggle, duplicate, retrigger, media fetch, and templates.
- Add plan-limit checks before creating or activating flows.
- Paginate the dashboard flow list and lazy-load heavy flow details/media where appropriate.

### Phase 3 — Webhook ingestion

- Implement Meta verification and `X-Hub-Signature-256` validation.
- Normalize comment and story-reply payloads into an internal event DTO/value object.
- Return a fast success response after safely persisting or queueing the event.
- Ignore self-generated events and unsupported event types.
- Dedupe with an account-scoped cache key before dispatching the processing job.

### Phase 4 — Matching and execution

- Match active flows by account and media ID before keyword evaluation.
- Normalize keyword casing/whitespace and use explicit word-boundary matching.
- Make execution idempotent at both Redis and database layers.
- Queue delivery with bounded retries and progressive backoff; do not use unbounded sleeps in workers.
- Apply account-level rate limiting and Meta error classification. Retry transient failures; mark permanent failures clearly.
- Send public replies, DM text variants, image replies, follow prompts, and deeplinks through a single execution action.
- Store structured success/failure metadata without exposing access tokens.

### Phase 5 — Observability and operations

- Add structured logs and counters for received, matched, skipped, queued, sent, failed, rate-limited, and duplicate events.
- Surface recent execution status on the dashboard.
- Add an admin/support path to inspect failed logs and safely retrigger an eligible event.
- Add queue/Horizon alerts and a documented replay strategy for failed webhook deliveries.

## 6. Next.js frontend implementation phases

### Dashboard

- App shell: account selector, AutoDM navigation, flow count/status summary, and primary create action.
- Controls: search, account, trigger type, status, and delivery outcome filters.
- Records: flow name, content thumbnail/title, trigger keywords, status, last run, success/failure summary, and predictable actions.
- Empty states: no connected account, no flows, and no matching filters.

### Flow builder

1. Select Instagram account and content.
2. Configure trigger keywords and optional trigger type.
3. Configure public reply and DM message variants.
4. Configure optional image, follow gate, button, and deeplink behavior.
5. Review, validate, and activate or save paused.

Use the chosen Next.js data-fetching/form stack, preserve input on validation errors, disable submit while processing, and make destructive actions confirmable. Define typed request/response schemas for accounts, flows, variants, media, logs, pagination, and validation errors.

## 7. Testing plan

Use PHPUnit feature tests and existing factories/states. Minimum coverage:

- Authenticated access and unauthenticated redirect.
- User/account/flow ownership isolation.
- OAuth callback success and failure paths.
- Flow create, update, duplicate, pause/resume, retrigger, and plan-cap behavior.
- Media fetch authorization and Meta API failure handling.
- Webhook signature verification, verification challenge, unsupported payloads, and fast acknowledgement.
- Case-insensitive keyword matching, word boundaries, media scoping, and self-loop prevention.
- Account-scoped webhook dedupe.
- Concurrent-flow pending CTA/follow isolation.
- Idempotency for duplicate events and the corrected composite database constraint.
- Retry/backoff behavior and permanent versus transient Meta failures.
- Text-only, image, public-reply, follow-gated, and deeplink message delivery.
- Expired/tampered deeplink rejection and redirect response headers.
- Dashboard filtering, pagination, empty states, and recent-log loading without N+1 queries.

Verification commands after implementation:

```powershell
vendor/bin/pint --dirty --format agent
php artisan test --compact tests/Feature/AutoDm
npm run build
```

Run the Next.js build, lint, and type-check commands from the frontend directory, for example `npm run build`, `npm run lint`, and `npm run typecheck`.

Run the narrowest relevant test file/filter during development, then optionally run the complete suite before release.

## 8. Progress update

Completed in the first implementation slice:

- Added the initial versioned dashboard endpoint at `GET /api/v1/autodm` using Sanctum authentication.
- Added account/flow ownership scoping, pagination, status/account filters, sanitized account data, reply previews, metrics, and batched recent logs.
- Refactored the dashboard endpoint so the controller is an adapter and `AutoDmDashboardService` owns the query/transform use case.
- Added feature tests for authenticated access and cross-user data isolation.
- Added the standalone `next-autodm` Next.js App Router shell with typed API access, loading/error/empty states, and the first dashboard flow list.
- Split the Next.js route entry from the client dashboard feature component.

Pending environment setup:

- The repository currently has Laravel 12 dependencies and no `vendor` directory, so Artisan generation and PHPUnit execution could not run in this environment.
- Laravel 13 dependency upgrade and Sanctum cross-origin configuration remain required before production integration.
- The Next.js dependency lockfile and build verification remain pending until dependencies are installed.

## 9. Delivery sequence

1. Confirm schema, existing AutoDM contracts, and Meta permissions.
2. Fix audit P1 issues before adding new UX.
3. Extract shared validation/matching/execution services.
4. Add or update migrations and factories for idempotency and scoped state.
5. Implement webhook normalization and queued execution.
6. Refactor the dashboard and builder into maintainable sections.
7. Add feature-boundary tests and run Pint/build checks.
8. Test with a Meta development account and a secondary Instagram user.
9. Release behind a feature flag, monitor delivery/error metrics, then expand story replies and advanced actions.

## 10. Release acceptance criteria

- A creator can connect an eligible Instagram account and create an active post/reel keyword flow without leaving the app.
- A matching external comment produces at most one intended automation execution.
- Self-comments, duplicate webhooks, unauthorized accounts, expired tokens, and Meta failures are handled safely and visibly.
- The dashboard remains responsive with many flows and does not issue a query per flow for recent logs.
- All user-facing states and forms work on mobile and desktop.
- Automated tests cover the core happy paths, failure paths, ownership boundaries, and concurrency-sensitive behavior.
