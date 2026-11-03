# KVM Docker Hardening — Handover & TODO

This document tracks what has been implemented in code versus what must be
completed manually on the KVM or in GitHub before the hardened deployment
is fully active.

---

## What Was Implemented in This Session

### Code Changes (committed to the repo)

| File | Change |
| --- | --- |
| [Dockerfile](file:///d:/Projects/Viralyzer/Dockerfile) | Pinned all base images to exact patch versions. Added `USER www-data` to app stage. Added `USER nginx` to web stage. |
| [docker/nginx/default.conf](file:///d:/Projects/Viralyzer/docker/nginx/default.conf) | Changed `listen 80` → `listen 8080` so Nginx runs as non-root after `cap_drop: ALL`. |
| [docker/entrypoint.sh](file:///d:/Projects/Viralyzer/docker/entrypoint.sh) | Removed `ln -snf` (symlink now lives in Dockerfile image layer). Removed root-only `chown` block (container runs as www-data). |
| [docker-compose.yml](file:///d:/Projects/Viralyzer/docker-compose.yml) | Full hardening rewrite. See details below. |
| [.github/workflows/deploy.yml](file:///d:/Projects/Viralyzer/.github/workflows/deploy.yml) | Replaced the old "build and commit Vite assets" workflow with a full CI/CD pipeline. |

### docker-compose.yml Hardening Summary

| Control | Services Applied To |
| --- | --- |
| `security_opt: no-new-privileges:true` | All (app, web, horizon, scheduler, mysql, redis) |
| `cap_drop: ALL` | app, web, horizon, scheduler only (see caveat below) |
| `read_only: true` | app, web, horizon, scheduler |
| `tmpfs: [/tmp, /var/run]` | app, web, horizon, scheduler |
| `tmpfs: [/var/cache/nginx]` | web only |
| `init: true` (tini PID 1) | app, web, horizon, scheduler |
| `restart: unless-stopped` | All |
| `mem_limit` / `cpus` | All |
| Health checks | app, web, horizon |
| GHCR image refs (`ghcr.io/gyaanesh/...`) | All services |
| Redis password auth (`--requirepass`) | redis |
| Internal-only (no host port mapping) | mysql, redis |
| Host port bound to `127.0.0.1` | web (port 8080 only) |
| Pinned image versions | mysql:8.4.5, redis:7.4-alpine |

> **cap_drop caveat:** `mysql` and `redis` do NOT have `cap_drop: ALL`. Both
> images start as root and use `gosu`/`su-exec` to become their runtime user.
> That startup path requires `CAP_SETUID` which would be stripped by
> `cap_drop: ALL`, causing both containers to fail to start.

### CI/CD Pipeline Summary

The new [deploy.yml](file:///d:/Projects/Viralyzer/.github/workflows/deploy.yml) pipeline replaces the old "build and commit Vite assets" workflow entirely. Vite assets are now baked into the Docker image — they no longer need to be committed to git.

Pipeline stages:
1. **Quality** — Pint style check + PHPUnit tests (SQLite in-memory)
2. **Build** — Both `app` and `web` images built locally (`load: true, push: false`)
3. **Scan** — Trivy scans both images; fails on HIGH or CRITICAL
4. **Push** — Images tagged and pushed to GHCR only after a clean scan
5. **Sign** — Cosign keyless signing via GitHub OIDC
6. **Deploy** — SSH deploy with health check gate

---

## TODO: Manual Steps Required

These items cannot be done from the codebase. Complete them in order.

### Phase 1 — GitHub Repository Setup

- [ ] **Add `REDIS_PASSWORD` to `.env.docker` on the KVM.**
  The new `docker-compose.yml` passes `REDIS_PASSWORD` to Redis and to the app. The old `.env.docker` does not have this key. Add it before restarting the stack:
  ```bash
  echo "REDIS_PASSWORD=your-strong-redis-password" >> /var/www/scanmysocial/.env.docker
  ```

- [ ] **Configure GitHub Repository Secrets.**
  Go to: **GitHub → Settings → Secrets and variables → Actions → New repository secret**

  | Secret Name | Value |
  | --- | --- |
  | `KVM_HOST` | `187.127.189.144` |
  | `KVM_USER` | `deploy` |
  | `KVM_SSH_KEY` | Contents of the deploy private key (see Phase 2) |
  | `GHCR_TOKEN` | PAT with `read:packages` + `write:packages` (see Phase 2) |
  | `VITE_PUSHER_APP_KEY` | Your Pusher public app key |
  | `VITE_PUSHER_APP_CLUSTER` | `ap2` |
  | `VITE_PUSHER_SCHEME` | `https` |
  | `VITE_RAZORPAY_KEY_ID` | Your Razorpay public key ID |

- [ ] **Generate a dedicated SSH deploy key** (do not reuse your personal key):
  ```bash
  ssh-keygen -t ed25519 -C "github-actions-deploy@scanmysocial" -f ~/.ssh/scanmysocial-deploy
  ```
  - Add the **public key** (`scanmysocial-deploy.pub`) to `/home/deploy/.ssh/authorized_keys` on the KVM.
  - Add the **private key** contents as `KVM_SSH_KEY` in GitHub Secrets.

- [ ] **Generate a GHCR Personal Access Token** (PAT):
  Go to: **GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens**
  Scopes required: `read:packages`, `write:packages`
  Save as `GHCR_TOKEN` in GitHub Secrets.

### Phase 2 — KVM Server Hardening

- [ ] **SSH Hardening.** Edit `/etc/ssh/sshd_config` on the KVM:
  ```text
  PasswordAuthentication no
  PubkeyAuthentication yes
  PermitRootLogin no
  ```
  > **Critical:** Verify the `deploy` user can SSH with a key AND has working `sudo` before disabling root login. Use Hostinger's browser console as a fallback.

  ```bash
  sudo systemctl restart ssh
  ```

- [ ] **Install and configure Fail2ban:**
  ```bash
  sudo apt install -y fail2ban
  sudo systemctl enable --now fail2ban
  sudo fail2ban-client status sshd
  ```

- [ ] **Enable UFW with correct rules:**
  ```bash
  sudo ufw default deny incoming
  sudo ufw default allow outgoing
  sudo ufw allow 22/tcp
  sudo ufw allow 80/tcp
  sudo ufw allow 443/tcp
  sudo ufw enable
  sudo ufw status verbose
  ```

- [ ] **Enable unattended security updates:**
  ```bash
  sudo apt install -y unattended-upgrades
  sudo dpkg-reconfigure --priority=low unattended-upgrades
  ```

### Phase 3 — First Deployment with Hardened Stack

- [ ] **Backup the current running stack** before switching to the hardened images:
  ```bash
  cd /var/www/scanmysocial
  docker compose --env-file .env.docker exec mysql \
    sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' \
    > ~/backups/pre-hardening-$(date +%F-%H%M).sql
  ```

- [ ] **Fix volume ownership for non-root containers.**
  The existing named volumes may have files owned by root from the old (root-running) containers. The new `app` container runs as `www-data` (UID 33) and cannot write to root-owned files.

  Run this once before starting the hardened stack:
  ```bash
  docker run --rm \
    -v scanmysocial_app_storage:/storage \
    -v scanmysocial_app_bootstrap_cache:/cache \
    alpine sh -c "chown -R 33:33 /storage /cache"
  ```
  UID 33 = `www-data` on Debian/Bookworm.

- [ ] **Update `.env.docker` for new Redis password auth.**
  Set `REDIS_PASSWORD` to match the password now required by the Redis container command. Without this, Redis connections from the app will fail with `NOAUTH Authentication required`.

- [ ] **Pull and restart the hardened stack:**
  ```bash
  cd /var/www/scanmysocial
  git pull origin main
  docker compose --env-file .env.docker pull
  docker compose --env-file .env.docker run --rm app php artisan migrate --force
  docker compose --env-file .env.docker run --rm app php artisan optimize
  docker compose --env-file .env.docker up -d
  ```

- [ ] **Verify all containers pass their health checks:**
  ```bash
  docker compose --env-file .env.docker ps
  # All services should show "healthy" within 60 seconds
  ```

- [ ] **Verify the application is responding:**
  ```bash
  curl -I http://127.0.0.1:8080/up
  curl -I https://app.scanmysocial.com/up
  ```

### Phase 4 — Verify CI/CD Pipeline

- [ ] **Push a test commit to `main`** and watch the GitHub Actions run.
  All five stages should complete: Quality → Build → Scan → Push → Deploy.

- [ ] **Confirm images appear in GHCR:**
  Go to: `https://github.com/gyaanesh?tab=packages`
  You should see `viralyzer-app` and `viralyzer-web` with `latest`, `main`, and SHA tags.

- [ ] **Verify Cosign signatures on GHCR images:**
  ```bash
  cosign verify \
    --certificate-identity-regexp="https://github.com/gyaanesh/Viralyzer" \
    --certificate-oidc-issuer="https://token.actions.githubusercontent.com" \
    ghcr.io/gyaanesh/viralyzer-app:latest
  ```

- [ ] **Test a rollback to a specific commit SHA:**
  ```bash
  export APP_TAG=<a previous commit sha>
  docker pull ghcr.io/gyaanesh/viralyzer-app:${APP_TAG}
  docker pull ghcr.io/gyaanesh/viralyzer-web:${APP_TAG}
  # Update image tags in compose then:
  docker compose --env-file .env.docker up -d --no-deps app web horizon scheduler
  ```

### Phase 5 — Backup Automation

- [ ] **Add a database backup cron job** on the `deploy` user:
  ```bash
  crontab -e
  ```
  Add:
  ```cron
  0 3 * * * cd /var/www/scanmysocial && docker compose --env-file .env.docker exec -T mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > ~/backups/scanmysocial-$(date +\%F-\%H\%M).sql 2>&1
  ```

- [ ] **Create the backups directory:**
  ```bash
  mkdir -p ~/backups
  ```

- [ ] **Take a first manual backup and verify it restores correctly** (on a test DB) before relying on the cron.

---

## Known Limitations & Watch Points

| Topic | Note |
| --- | --- |
| `read_only: true` on scheduler | The scheduler runs `php artisan schedule:run` in a loop. If any scheduled command writes to the container filesystem (outside volumes/tmpfs), it will fail silently or crash. Monitor scheduler logs for the first week: `docker compose --env-file .env.docker logs -f scheduler` |
| `cap_drop: ALL` on mysql/redis | Intentionally not applied. If you want to add it in future, test on staging with a replica of the production volume to ensure startup works. |
| Image version pinning (Node, PHP, Nginx) | The versions pinned in `Dockerfile` (Node 20.19.2, PHP 8.4.8, Nginx 1.27.4) should be verified as valid tags on Docker Hub before the next build. Update deliberately — review changelogs before bumping. |
| Old git-committed Vite assets | The old workflow committed compiled assets to `public/build/` in git. These are now baked into the Docker image. The committed files in git are harmless but can be removed from the repo history if desired. |
| `REDIS_PASSWORD` in `.env.docker` | The old `.env.docker` has `REDIS_PASSWORD=null`. The new Redis startup command now passes this as `--requirepass`. If the value is `null` (literal string), Redis auth will behave unexpectedly. Ensure it is a real password before deploying. |
