# Laravel Queue Audit TODO

## Scope

Audit how Laravel queues and queued jobs are configured, where queued payloads are stored, which app workflows dispatch jobs, how workers process them, and how failures/retries are recorded.

## Current Status

- Status: Instagram module Redis queue hardening in progress
- Started: 2026-07-02
- Last updated: 2026-07-03
- Mode: Implementation approved for KVM Redis/Horizon queue alignment

## Checklist

- [x] Create audit tracker in `docs`.
- [x] Inspect queue configuration and environment defaults.
- [x] Inspect queue storage migrations and database tables.
- [x] Inventory queued job classes and their queue names.
- [x] Trace dispatch points from controllers, commands, schedules, mails, and services.
- [x] Review worker commands and local/runtime process setup.
- [x] Review failure, retry, timeout, and backoff behavior.
- [x] Check focused queue-related tests and verification commands.
- [x] Summarize findings, risks, and recommended fixes.

## Notes

- No production code changes are approved yet.
- Any fixes found during the audit require explicit approval before implementation.
- Stale pending queue rows were deleted on 2026-07-02 with explicit user approval.
- User confirmed current hosting is Hostinger shared hosting and the target migration is Hostinger KVM 4.
- User approved Laravel Horizon for the KVM queue runtime.
- User selected Docker deployment for the KVM path; see `docs/docker-kvm-deployment-guide.md`.
- 2026-07-03: KVM audit found `SyncInstagramAccountAnalyticsJob` still forced the `database` queue connection while Horizon supervises `instagram-analytics` on Redis.

## Findings

1. Queues are saved in the database.
   - Active `.env`: `QUEUE_CONNECTION=database`.
   - Queue rows are stored in `jobs`.
   - Failed jobs are stored in `failed_jobs`.
   - Batch metadata is stored in `job_batches`.

2. Current pending queue state from local `viralyzer` database:
   - `default`: 40 pending jobs, oldest from 2026-05-24 02:24:53.
   - `instagram-analytics`: 10 pending jobs, oldest from 2026-05-24 16:48:12.
   - `emails`: 1 pending job, oldest from 2026-06-23 23:19:42.
   - `failed_jobs`: 0 rows.
   - `job_batches`: 0 rows.

3. Pending payload types:
   - `default`: booking guest/host mail jobs, `SyncScheduledPostAnalyticsJob`, `ScrapeChannelMetadataJob`, and `ResearchScriptBatchJob`.
   - `instagram-analytics`: `SyncInstagramAccountAnalyticsJob`.
   - `emails`: `QueuedVerifyEmail`.

4. Worker coverage gap:
   - Documented local workers listen to `default,analysis,transcription` and `media-downloads`.
   - Jobs also dispatch to `autodm`, `instagram-analytics`, and `emails`.
   - No current local `php` queue worker process was visible from this session.

5. Retry timeout risk:
   - `config/queue.php` defaults `DB_QUEUE_RETRY_AFTER` to 90 seconds.
   - Several jobs have timeouts above 90 seconds, including `AnalyzePostJob` at 240 seconds, `TranscribePostJob` at 180 seconds, `SyncInstagramAccountAnalyticsJob` at 300 seconds, and script jobs around 110-120 seconds.
   - If multiple workers are running, a job can be made available again before its first execution has actually timed out.

## Verification

- `php artisan list queue`: passed.
- `php artisan db:table jobs`: passed.
- `php artisan db:table failed_jobs`: passed.
- `php artisan queue:failed`: passed, no failed jobs found.
- `php artisan queue:monitor default,analysis,transcription,media-downloads,autodm,instagram-analytics,emails --max=1`: passed and showed pending alerts.
- `php artisan test --compact tests/Feature/PublishScheduledPostJobTest.php`: passed.
- `php artisan test --compact tests/Feature/InstagramAnalyticsAutoSyncCommandTest.php`: passed.
- `php artisan test --compact tests/Feature/ScriptResearchGenerationTest.php`: passed.
- `php artisan test --compact tests/Feature/BookingModuleTest.php --filter=guest_can_book_available_slot_and_emails_are_queued`: passed.

## Recommended Next Fixes

1. Add documented worker commands for all used queues: `default`, `analysis`, `transcription`, `media-downloads`, `autodm`, `instagram-analytics`, and `emails`.
2. Set `DB_QUEUE_RETRY_AFTER` above the longest job timeout, or split long-running queues onto connection-specific retry settings.
3. Add `failed()` handlers or explicit terminal-state handling for important jobs that currently rely only on retries/logs.
4. Decide whether queued mail should consistently use `emails` or default queue, then align mail classes and workers.
5. Decide how to handle the current stale pending rows before running workers against old payloads.

## Cleanup Log

- 2026-07-02: Deleted 51 unreserved pending rows from `jobs`.
  - `default`: 40 rows.
  - `emails`: 1 row.
  - `instagram-analytics`: 10 rows.
- `failed_jobs` remained at 0 rows.
- `job_batches` remained at 0 rows.

## Redis And Supervisor Plan

Accepted production direction:

1. Use Redis for queue storage and keep database queues only as local fallback.
2. Add or document `.env` values:
   - `QUEUE_CONNECTION=redis`
   - `REDIS_QUEUE_CONNECTION=default`
   - `REDIS_QUEUE_RETRY_AFTER=390`
3. Keep worker `--timeout` lower than `retry_after`; use `--timeout=330` because the longest current job timeout is 300 seconds.
4. Split workers by workload:
   - general: `default,emails`
   - AI/content: `analysis,transcription`
   - media: `media-downloads`
   - automation: `autodm`
   - analytics: `instagram-analytics`
5. Use Laravel Horizon to manage queue worker groups.
6. Use Supervisor or systemd in production to keep `php artisan horizon` alive.
7. Add `php artisan queue:monitor default,emails,analysis,transcription,media-downloads,autodm,instagram-analytics --max=100` to operations checks or scheduled monitoring.

## Instagram Module Redis Hardening

- [x] Audit Instagram queue dispatch points for database-backed jobs.
- [x] Confirm `SyncInstagramAccountAnalyticsJob` was the only production job forcing `onConnection('database')`.
- [x] Change Instagram account analytics sync to use Redis on the `instagram-analytics` queue.
- [x] Add regression coverage asserting the job targets Redis/Horizon.
- [ ] Redeploy to KVM and terminate Horizon so the updated worker code is loaded.
- [ ] Clear legacy database queue rows only after confirming they are stale/disposable.
- [ ] Run a fresh Instagram analytics sync and verify `instagram_account_media_analytics` receives rows.

## Content Scheduler Post Now Fix

- [x] Confirm `Post Now` was faking immediacy by submitting `scheduled_at` as two minutes in the future.
- [x] Add explicit `publish_now` request support.
- [x] Dispatch `PublishScheduledPostJob` immediately for `Post Now`.
- [x] Add regression coverage for immediate publish queueing.
- [x] Run Pint and focused scheduler tests.
## Horizon Implementation Status

- [x] Install `laravel/horizon`.
- [x] Publish Horizon provider/config.
- [x] Restrict Horizon dashboard access to `super_admin` users.
- [x] Configure Horizon supervisors for queue groups:
  - `general`: `default`, `emails`
  - `content-ai`: `analysis`, `transcription`
  - `media`: `media-downloads`
  - `automation`: `autodm`
  - `analytics`: `instagram-analytics`
- [x] Raise database and Redis queue `retry_after` defaults to 390 seconds.
- [x] Update `.env.example` with Redis/Horizon queue settings.
- [x] Update local queue worker commands to include all application queues.
- [x] Run Pint and focused tests.

## KVM Deployment Runbook

Use this after migrating off shared hosting:

Full server setup guide: [`docs/kvm-deployment-guide.md`](kvm-deployment-guide.md).

1. Install PHP CLI extensions required by Horizon: `pcntl`, `posix`, and Redis support or Predis.
2. Install and enable Redis on the KVM server.
3. Set production `.env`:
   - `QUEUE_CONNECTION=redis`
   - `REDIS_CLIENT=predis`
   - `REDIS_HOST=127.0.0.1`
   - `REDIS_QUEUE_RETRY_AFTER=390`
4. Run deploy commands:
   - `composer install --no-dev --optimize-autoloader`
   - `php artisan migrate --force`
   - `php artisan optimize:clear`
   - `php artisan config:cache`
   - `php artisan route:cache`
   - `php artisan view:cache`
5. Configure Supervisor or systemd to run exactly one Horizon master command:
   - `php /path/to/artisan horizon`
6. On each deploy, restart workers gracefully:
   - `php artisan horizon:terminate`
7. Confirm runtime:
   - `php artisan horizon:status`
   - Visit `/horizon` as a `super_admin` user.

## Implementation Verification

- `vendor/bin/pint --dirty --format agent`: passed and formatted changed PHP files.
- `composer validate --no-check-publish`: passed.
- `php artisan test --compact tests/Feature/HorizonAccessTest.php`: passed.
- `php artisan test --compact tests/Feature/PublishScheduledPostJobTest.php`: passed.
- `php artisan test --compact tests/Feature/InstagramAnalyticsAutoSyncCommandTest.php`: passed.
- `php artisan test --compact tests/Feature/ScriptResearchGenerationTest.php`: passed.
- `php artisan test --compact tests/Feature/BookingModuleTest.php --filter=guest_can_book_available_slot_and_emails_are_queued`: passed.
- `php artisan config:show queue.connections.database.retry_after`: resolved to `390`.
- `php artisan config:show queue.connections.redis.retry_after`: resolved to `390`.
- `php artisan config:show horizon.defaults`: showed all configured supervisor groups.
- `php artisan route:list --path=horizon`: showed Horizon routes.

Local limitation:

- `php artisan horizon:status` could not connect because Redis is not running/configured locally on this Windows environment. This should be re-run on the KVM after Redis is installed and `.env` is switched to `QUEUE_CONNECTION=redis`.
