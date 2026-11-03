# Docker KVM Deployment TODO

## Goal

Deploy ScanMySocial on Hostinger KVM using Docker with Laravel, Inertia assets, Nginx, PHP-FPM, MySQL, Redis, Horizon, and the scheduler running as managed containers.

## Current Status

- [x] Confirmed Docker deployment direction.
- [x] Confirmed Horizon and Redis are required for queued jobs.
- [x] Confirmed production domain: `https://scanmysocial.com`.
- [x] Confirmed repository: `https://github.com/gyaanesh/Viralyzer.git`.
- [x] Confirmed uploads are stored on Cloudflare R2.
- [x] Confirmed SSL is mandatory for production launch.
- [x] Added production Docker scaffolding to the repository.
- [x] Added a Docker-specific environment template.
- [x] Added shared-hosting parity placeholders to the Docker environment template.
- [x] Added shared-hosting runtime compatibility keys to the Docker environment template.
- [x] Passed Vite frontend environment values into Docker build args.
- [x] Run a full image build on the target KVM.
- [x] Configure the production `.env.docker` values on the KVM.
- [x] Run production migrations on the KVM.
- [x] Verify Horizon, scheduler, Redis, MySQL, and internal public HTTP response on the KVM.
- [x] Point staging DNS and enable HTTPS for `kvm.scanmysocial.com`.
- [x] Confirmed app-only cutover target: `app.scanmysocial.com` to KVM Docker.
- [x] Confirmed `scanmysocial.com` landing remains on current hosting for now.
- [x] Updated local Docker env values for `app.scanmysocial.com` without changing secrets.
- [x] Created local `.env.docker` deploy artifact from shared-hosting app secrets and Docker-only service values.
- [ ] Copy the generated `.env.docker` to the KVM and back up the current server env first.
- [ ] Rebuild app and web images after Vite build-arg patch.
- [ ] Verify login, Google OAuth, Meta callback, R2 uploads, Pusher broadcasts, Razorpay checkout, Horizon, and scheduler on staging.
- [ ] Copy the app-domain `.env.docker` to the KVM and back up the current server env first.
- [ ] Add `app.scanmysocial.com` to Caddy and reload Caddy.
- [ ] Change Cloudflare `app.scanmysocial.com` A record to `187.127.189.144` with proxy status `DNS only`.
- [ ] Verify `https://app.scanmysocial.com/login`, browser login, dashboard/admin access, callbacks, R2 uploads, Horizon, and scheduler after DNS cutover.

## Implementation Plan

1. Build one production PHP image for the Laravel app and queue processes.
2. Build a separate Nginx image that serves the compiled public assets and forwards PHP requests to PHP-FPM.
3. Run MySQL and Redis as persistent Docker services with named volumes.
4. Run Horizon and the Laravel scheduler as separate containers from the same app image.
5. Keep secrets outside git in `.env.docker`.
6. Pass only public `VITE_*` values into Docker builds; keep private keys runtime-only in `.env.docker`.
7. Put Caddy in front of Docker and launch production only through HTTPS.
8. Use the Docker KVM guide as the operational checklist for first deploys and later redeploys.

## Open Questions For Production

- Should MySQL backups be handled through Hostinger snapshots only, or through scheduled SQL dumps as well?

## KVM Docker Hardening CI/CD Implementation

- [x] Review `docs/plans/kvm-docker-hardening-cicd-plan.md` against current repo files.
- [x] Confirm production deploy should stay fully automatic on pushes to `main`.
- [x] Use immutable commit SHA image tags during KVM deployment.
- [x] Keep `latest` only as a convenience tag, not the runtime deploy selector.
- [x] Require a real Redis password in `.env.docker.example`.
- [x] Update the hardening plan with current implementation status.
- [x] Run config and diff verification.
- [x] Fix CI PHPUnit failure where script migration tests leak a legacy `generated_scripts` schema into later tests.
- [x] Verify the isolated script migration tests and the viral script engine tests.
- [x] Harden the remaining full-suite CI failures by isolating OAuth callback tests from Redis-backed analytics jobs.
- [x] Align stale lead form, plan credit, Razorpay, referral payout, and home smoke test expectations with the current implementation.
- [x] Re-run the previously failing feature test files locally.
- [x] Re-run the full local PHPUnit suite before pushing the CI hardening branch.
- [x] Fix CI web image build args so app and web images generate the same Vite manifest hashes.
