# Docker KVM Deployment Guide

This guide deploys ScanMySocial on Hostinger KVM with Docker. Use it for both KVM 1 testing and KVM 4 production.

App production domain for this cutover: https://app.scanmysocial.com.

Landing domain https://scanmysocial.com remains on existing hosting until a later landing migration.

Repository: `https://github.com/gyaanesh/Viralyzer.git`.

Uploads are stored on Cloudflare R2 through the app's `UPLOAD_DISK=r2` setting.

## Recommended Target

Use KVM 1 for a staging rehearsal. It is sufficient for testing if you keep Horizon process counts low and avoid heavy AI/media workloads.

Use KVM 4 for production. Production needs more headroom because the app runs Nginx, PHP-FPM, MySQL, Redis, Horizon workers, and the scheduler together.

## Container Layout

| Service | Purpose |
| --- | --- |
| `web` | Nginx public HTTP entrypoint. |
| `app` | PHP-FPM Laravel application runtime. |
| `horizon` | Laravel Horizon queue worker manager. |
| `scheduler` | Runs `php artisan schedule:run` every minute. |
| `mysql` | MySQL database with persistent volume. |
| `redis` | Redis cache, queue, and Horizon backend with persistent volume. |

## 1. Server Setup

SSH into the KVM:

```bash
ssh root@SERVER_IP
```

Update Ubuntu:

```bash
apt update
apt upgrade -y
reboot
```

Reconnect and create a deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
```

Copy the SSH key from root to deploy:

```bash
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Log in as deploy:

```bash
ssh deploy@SERVER_IP
```

## 2. Docker

If Hostinger Docker Manager already installed Docker, verify it:

```bash
docker --version
docker compose version
```

If Docker is not installed:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
```

Log out and back in after adding the deploy user to the Docker group.

## 3. Application Code

Create the app directory:

```bash
sudo mkdir -p /var/www/scanmysocial
sudo chown deploy:deploy /var/www/scanmysocial
cd /var/www/scanmysocial
```

Clone the repository:

```bash
git clone https://github.com/gyaanesh/Viralyzer.git .
```

Create the Docker environment file:

```bash
cp .env.docker.example .env.docker
nano .env.docker
```

Set at least these values:

```dotenv
APP_ENV=production
APP_DEBUG=false
APP_URL=https://app.scanmysocial.com
ASSET_URL=https://app.scanmysocial.com
HTTP_PORT=127.0.0.1:8080
TRUSTED_PROXIES=*
DB_DATABASE=scanmysocial
DB_USERNAME=scanmysocial
DB_PASSWORD=use-a-long-random-password
MYSQL_ROOT_PASSWORD=use-a-different-long-random-password
QUEUE_CONNECTION=redis
CACHE_STORE=redis
SESSION_DRIVER=database
REDIS_HOST=redis
UPLOAD_DISK=r2
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET=scanmysocial
R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
R2_PUBLIC_URL=https://cdn.scanmysocial.com
R2_USE_PATH_STYLE_ENDPOINT=true
```


For staging on the KVM subdomain, use:

```dotenv
APP_URL=https://kvm.scanmysocial.com
ASSET_URL=https://kvm.scanmysocial.com
SESSION_DOMAIN=.scanmysocial.com
SESSION_SECURE_COOKIE=true
GOOGLE_REDIRECT_URI=https://kvm.scanmysocial.com/auth/google/callback
META_REDIRECT_URI=https://kvm.scanmysocial.com/social-integrations/instagram/callback
```

Copy the shared-hosting integration values into `.env.docker` using the placeholders in `.env.docker.example`. Keep the Docker service values pointed at the containers:

```dotenv
DB_HOST=mysql
REDIS_HOST=redis
QUEUE_CONNECTION=redis
CACHE_STORE=redis
```

Do not copy the shared-hosting database host, database username, or external Redis host unless the KVM is intentionally connecting to those old services.

Use `RESEND_KEY` for Resend mail. The application reads `RESEND_KEY`, not `RESEND_API_KEY`.

The public frontend values below are baked into the compiled Vite assets during `docker compose build`, so update them before rebuilding images:

```dotenv
VITE_PUSHER_APP_KEY=your-public-pusher-key
VITE_PUSHER_APP_CLUSTER=ap2
VITE_RAZORPAY_KEY_ID=your-public-razorpay-key-id
```
Generate an app key:

```bash
docker compose --env-file .env.docker run --rm app php artisan key:generate --show
```

Copy the returned key into `.env.docker` as `APP_KEY=base64:...`.

## 4. First Build

Build the app and web images:

```bash
docker compose --env-file .env.docker build
```

Start MySQL and Redis first:

```bash
docker compose --env-file .env.docker up -d mysql redis
```

Run migrations:

```bash
docker compose --env-file .env.docker run --rm app php artisan migrate --force
```

Optimize Laravel:

```bash
docker compose --env-file .env.docker run --rm app php artisan optimize
```

Start everything:

```bash
docker compose --env-file .env.docker up -d
```

## 5. Verification

Check containers:

```bash
docker compose --env-file .env.docker ps
```

Check Laravel:

```bash
docker compose --env-file .env.docker exec app php artisan about
docker compose --env-file .env.docker exec app php artisan route:list --path=horizon
```

Check Horizon:

```bash
docker compose --env-file .env.docker exec horizon php artisan horizon:status
docker compose --env-file .env.docker logs -f horizon
```

Check the scheduler:

```bash
docker compose --env-file .env.docker logs -f scheduler
```

Check HTTP:

```bash
curl -I http://127.0.0.1
```

## 6. Mandatory HTTPS

The app subdomain must launch on HTTPS with `APP_URL=https://app.scanmysocial.com`. Do not launch public traffic on plain HTTP.

Use the Docker `web` service only on localhost and put Caddy on the host as the public TLS reverse proxy.

1. Confirm `.env.docker`:

```dotenv
HTTP_PORT=127.0.0.1:8080
APP_URL=https://app.scanmysocial.com
```

2. Recreate the web container:

```bash
docker compose --env-file .env.docker up -d web
```

3. Install Caddy on the host and configure:

```caddyfile
app.scanmysocial.com {
    reverse_proxy 127.0.0.1:8080 {
        header_up X-Forwarded-Proto https
        header_up X-Forwarded-Host {host}
        header_up X-Forwarded-Port 443
    }
}
```

4. Reload Caddy:

```bash
sudo systemctl reload caddy
```

5. Verify HTTPS:

```bash
curl -I https://app.scanmysocial.com/login
```

## 7. Cloudflare App Subdomain Cutover

Cloudflare remains the DNS manager. For the app-only cutover, change only this record:

| Name | Type | From | To | Proxy status |
| --- | --- | --- | --- | --- |
| `app.scanmysocial.com` | `A` | `89.117.157.31` | `187.127.189.144` | `DNS only` |

Do not change `scanmysocial.com`, `www.scanmysocial.com`, `cdn.scanmysocial.com`, mail, autodiscover, or autoconfig records during this app-only phase.

After DNS is changed, verify:

```bash
dig app.scanmysocial.com
curl -I https://app.scanmysocial.com/login
```

Keep `kvm.scanmysocial.com` available as the staging hostname until `app.scanmysocial.com` is verified.

## 8. Queue Migration Notes

This Docker setup uses Redis queues and Horizon:

```dotenv
QUEUE_CONNECTION=redis
REDIS_HOST=redis
```

Old database queue rows in the `jobs` table are legacy leftovers only; Redis/Horizon is the runtime queue source. Redis workers will not process old database rows. If legacy rows are stale and intentionally disposable, clear them only after a database backup:

```bash
docker compose --env-file .env.docker exec app php artisan queue:clear database --queue=default
docker compose --env-file .env.docker exec app php artisan queue:clear database --queue=instagram-analytics
```

Do not run database queue workers on KVM. After deploys, restart Horizon so Redis workers load the latest code:

```bash
docker compose --env-file .env.docker exec horizon php artisan horizon:terminate
```

## 9. Redeploy

Pull the latest code:

```bash
cd /var/www/scanmysocial
git pull
```

Rebuild and restart:

```bash
docker compose --env-file .env.docker build
docker compose --env-file .env.docker run --rm app php artisan migrate --force
docker compose --env-file .env.docker run --rm app php artisan optimize
docker compose --env-file .env.docker up -d
```

Restart Horizon gracefully after deploy:

```bash
docker compose --env-file .env.docker exec horizon php artisan horizon:terminate
docker compose --env-file .env.docker up -d horizon
```

## 10. Backups

Create a database dump:

```bash
mkdir -p ~/backups
docker compose --env-file .env.docker exec mysql sh -c 'mysqldump -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > ~/backups/scanmysocial-$(date +%F-%H%M).sql
```

Back up uploaded files:

```bash
docker run --rm -v scanmysocial_app_storage:/data -v "$HOME/backups:/backup" alpine tar -czf /backup/scanmysocial-storage-$(date +%F-%H%M).tar.gz -C /data .
```

Use Hostinger snapshots as an additional safety layer, not the only backup.

## 11. Troubleshooting

If the site returns 500:

```bash
docker compose --env-file .env.docker logs -f app
docker compose --env-file .env.docker exec app php artisan optimize:clear
```

If Horizon is not processing jobs:

```bash
docker compose --env-file .env.docker exec horizon php artisan horizon:status
docker compose --env-file .env.docker exec app php artisan config:show queue.default
docker compose --env-file .env.docker exec redis redis-cli ping
```

If assets are missing:

```bash
docker compose --env-file .env.docker build --no-cache web
docker compose --env-file .env.docker up -d web
```
