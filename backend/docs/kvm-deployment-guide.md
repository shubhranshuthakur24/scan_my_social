# KVM Deployment Guide

This guide explains how to deploy Scan My Social from Hostinger shared hosting to a Hostinger KVM server. It covers both KVM 1 for testing/staging and KVM 4 for production.

Docker path: if you want the app deployed with Docker, use `docs/docker-kvm-deployment-guide.md` as the primary runbook. The Docker production launch uses `https://scanmysocial.com`, Cloudflare R2 uploads, Redis queues, Horizon, and mandatory SSL. The guide below is the traditional host-installed Nginx/PHP/MySQL/Redis/Supervisor path.

## Deployment Targets

Use KVM 1 for:

- Staging and migration rehearsal.
- Verifying Nginx, PHP, MySQL, Redis, Horizon, cron, storage links, and SSL.
- Low-volume QA with a small database copy.

Use KVM 4 for:

- Production traffic.
- Redis-backed queues through Laravel Horizon.
- AI/script generation, media downloads, analytics sync, AutoDM, scheduled publishing, and email queues running together.

Recommended sizing:

| Environment | Plan | Use | Notes |
| --- | --- | --- | --- |
| Staging | KVM 1 | Testing only | Keep Horizon process counts low and add swap. |
| Production | KVM 4 | Live app | Better headroom for MySQL, Redis, PHP-FPM, Nginx, Horizon, and Node build work. |

## Assumptions

- OS: Ubuntu 24.04 LTS or Ubuntu 22.04 LTS.
- Web server: Nginx.
- Database: MySQL.
- Queue/cache: Redis.
- Queue manager: Laravel Horizon.
- Process monitor: Supervisor.
- PHP: 8.2 or newer. PHP 8.3 is a good KVM default; confirm package compatibility before using PHP 8.4.
- App path examples use `/var/www/scanmysocial`.
- Web user examples use `www-data`.

Replace these placeholders:

- `example.com`
- `deploy`
- `/var/www/scanmysocial`
- database names, users, passwords, and all API keys.

## 1. Initial Server Access

SSH into the KVM server as `root`:

```bash
ssh root@SERVER_IP
```

Update the server:

```bash
apt update
apt upgrade -y
reboot
```

After reboot:

```bash
ssh root@SERVER_IP
```

Create a deploy user:

```bash
adduser deploy
usermod -aG sudo deploy
```

Copy your SSH key to the deploy user:

```bash
mkdir -p /home/deploy/.ssh
cp ~/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Switch to the deploy user:

```bash
su - deploy
```

## 2. Basic Security

Enable firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

Install fail2ban:

```bash
sudo apt install -y fail2ban
sudo systemctl enable --now fail2ban
```

For production, consider disabling root SSH login after verifying deploy-user SSH works:

```bash
sudo nano /etc/ssh/sshd_config
```

Set:

```text
PermitRootLogin no
PasswordAuthentication no
```

Restart SSH:

```bash
sudo systemctl restart ssh
```

Keep your current SSH session open while testing a new login.

## 3. Add Swap

KVM 1 should have swap. KVM 4 can also use swap as a safety net.

For KVM 1:

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

For KVM 4, use 2G-4G swap if desired.

## 4. Install System Packages

```bash
sudo apt install -y software-properties-common curl git unzip nginx mysql-server redis-server supervisor ca-certificates gnupg
```

Enable services:

```bash
sudo systemctl enable --now nginx
sudo systemctl enable --now mysql
sudo systemctl enable --now redis-server
sudo systemctl enable --now supervisor
```

Verify:

```bash
systemctl status nginx --no-pager
systemctl status mysql --no-pager
systemctl status redis-server --no-pager
systemctl status supervisor --no-pager
```

## 5. Install PHP

Install PHP and required extensions:

```bash
sudo apt install -y php php-cli php-fpm php-mysql php-xml php-mbstring php-curl php-zip php-bcmath php-gd php-intl php-readline php-tokenizer php-fileinfo php-redis php-pcntl
```

Check PHP:

```bash
php -v
php -m | grep -E 'pcntl|posix|redis|pdo_mysql|curl|mbstring|xml|zip'
```

Horizon requires the CLI environment to support `pcntl` and `posix`. If `posix` is missing, install the relevant package for your PHP version or verify it is compiled into CLI PHP.

Find PHP-FPM version:

```bash
systemctl list-units --type=service | grep php
```

Examples in this guide use `php8.3-fpm`. Replace it with your actual service/socket name if different.

## 6. Install Composer

```bash
cd /tmp
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
php composer-setup.php
sudo mv composer.phar /usr/local/bin/composer
composer --version
```

## 7. Install Node.js

Use Node 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

## 8. Create Database

Secure MySQL:

```bash
sudo mysql_secure_installation
```

Create database and user:

```bash
sudo mysql
```

Inside MySQL:

```sql
CREATE DATABASE scanmysocial CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'scanmysocial'@'localhost' IDENTIFIED BY 'CHANGE_THIS_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON scanmysocial.* TO 'scanmysocial'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Test login:

```bash
mysql -u scanmysocial -p scanmysocial
```

## 9. Deploy Code

Create app directory:

```bash
sudo mkdir -p /var/www/scanmysocial
sudo chown -R deploy:www-data /var/www/scanmysocial
sudo chmod -R 775 /var/www/scanmysocial
```

Clone the repository:

```bash
cd /var/www
git clone REPOSITORY_URL scanmysocial
cd /var/www/scanmysocial
```

Install PHP dependencies:

```bash
composer install --no-dev --optimize-autoloader
```

Install frontend dependencies and build:

```bash
npm ci
npm run build
```

Create environment file:

```bash
cp .env.example .env
php artisan key:generate
```

## 10. Configure Environment

Edit `.env`:

```bash
nano .env
```

Core production values:

```env
APP_NAME="Scan My Social"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://example.com
APP_TIMEZONE=Asia/Kolkata

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=scanmysocial
DB_USERNAME=scanmysocial
DB_PASSWORD=CHANGE_THIS_STRONG_PASSWORD

SESSION_DRIVER=database
CACHE_STORE=redis
QUEUE_CONNECTION=redis

REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
REDIS_QUEUE_CONNECTION=default
REDIS_QUEUE_RETRY_AFTER=390

HORIZON_NAME="${APP_NAME}"
HORIZON_PATH=horizon
```

Set all app-specific secrets:

```env
RESEND_KEY=
OPENROUTER_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
APIFY_TOKEN=
ELEVENLABS_API_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"
META_CLIENT_ID=
META_CLIENT_SECRET=
META_REDIRECT_URI="${APP_URL}/social-integrations/instagram/callback"
META_APP_SECRET=
META_WEBHOOK_VERIFY_TOKEN=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

For staging on KVM 1:

```env
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://staging.example.com
QUEUE_CONNECTION=redis
CACHE_STORE=redis
```

Use separate API callback URLs for staging when providers allow it.

## 11. File Permissions

```bash
sudo chown -R deploy:www-data /var/www/scanmysocial
sudo find /var/www/scanmysocial -type f -exec chmod 664 {} \;
sudo find /var/www/scanmysocial -type d -exec chmod 775 {} \;
sudo chmod -R ug+rwx storage bootstrap/cache
```

Create storage link:

```bash
php artisan storage:link
```

## 12. Run Migrations And Cache Laravel

```bash
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

Seed or create a super admin if needed:

```bash
php artisan db:seed --class=SuperAdminSeeder --force
```

Or update a user role:

```bash
php artisan user:set-role user@example.com super_admin
```

## 13. Configure Nginx

Create site config:

```bash
sudo nano /etc/nginx/sites-available/scanmysocial
```

Use this template. Replace `example.com` and PHP-FPM socket:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name example.com www.example.com;
    root /var/www/scanmysocial/public;

    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";

    index index.php;
    charset utf-8;

    client_max_body_size 64M;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location = /favicon.ico { access_log off; log_not_found off; }
    location = /robots.txt { access_log off; log_not_found off; }

    error_page 404 /index.php;

    location ~ ^/index\.php(/|$) {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
        fastcgi_hide_header X-Powered-By;
        fastcgi_read_timeout 300;
    }

    location ~ /\.(?!well-known).* {
        deny all;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/scanmysocial /etc/nginx/sites-enabled/scanmysocial
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 14. Configure SSL

Point DNS first:

- `A` record for `example.com` to the KVM IP.
- Optional `A` record for `www.example.com`.
- For staging, `A` record for `staging.example.com`.

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Issue certificate:

```bash
sudo certbot --nginx -d example.com -d www.example.com
```

Verify renewal:

```bash
sudo certbot renew --dry-run
```

## 15. Configure Horizon

This repo already includes Horizon config. Production uses these queue groups:

- `general`: `default`, `emails`
- `content-ai`: `analysis`, `transcription`
- `media`: `media-downloads`
- `automation`: `autodm`
- `analytics`: `instagram-analytics`

Check Horizon config:

```bash
php artisan config:show horizon.defaults
php artisan config:show queue.connections.redis.retry_after
```

Start Horizon manually for a smoke test:

```bash
php artisan horizon
```

Stop it with `Ctrl+C` after confirming it starts. In production, Supervisor will run Horizon.

## 16. Configure Supervisor For Horizon

Create config:

```bash
sudo nano /etc/supervisor/conf.d/scanmysocial-horizon.conf
```

Use:

```ini
[program:scanmysocial-horizon]
process_name=%(program_name)s
command=php /var/www/scanmysocial/artisan horizon
directory=/var/www/scanmysocial
autostart=true
autorestart=true
user=deploy
redirect_stderr=true
stdout_logfile=/var/www/scanmysocial/storage/logs/horizon.log
stopwaitsecs=3600
```

Load Supervisor config:

```bash
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start scanmysocial-horizon
sudo supervisorctl status
```

Verify Horizon:

```bash
php artisan horizon:status
php artisan horizon:supervisors
```

Open the dashboard:

```text
https://example.com/horizon
```

Only `super_admin` users should access it.

## 17. Configure Laravel Scheduler

Edit deploy user's crontab:

```bash
crontab -e
```

Add:

```cron
* * * * * cd /var/www/scanmysocial && php artisan schedule:run >> /dev/null 2>&1
```

Verify scheduled commands:

```bash
php artisan schedule:list
```

This app schedules jobs and commands for Instagram scraping, Apify polling, credit resets, due post publishing, analytics sync, pruning, and script research cleanup.

## 18. KVM 1 Staging Settings

KVM 1 is enough for testing, but keep it conservative.

Use a staging `.env`:

```env
APP_ENV=staging
APP_DEBUG=false
APP_URL=https://staging.example.com
QUEUE_CONNECTION=redis
CACHE_STORE=redis
```

Recommended staging Horizon changes if memory pressure appears:

- Set each local/staging supervisor to `maxProcesses=1`.
- Avoid bulk importing production queues.
- Use a smaller database copy.
- Do not run heavy script generation load tests and media scraping at the same time.

Helpful checks:

```bash
free -h
htop
redis-cli ping
php artisan horizon:status
php artisan queue:monitor default,emails,analysis,transcription,media-downloads,autodm,instagram-analytics --max=10
```

## 19. KVM 4 Production Settings

KVM 4 is the recommended production target.

Use:

```env
APP_ENV=production
APP_DEBUG=false
QUEUE_CONNECTION=redis
CACHE_STORE=redis
SESSION_DRIVER=database
REDIS_QUEUE_RETRY_AFTER=390
```

Keep Horizon running through Supervisor. Do not also run separate `queue:work` processes for the same queues.

Use deploy restart:

```bash
php artisan horizon:terminate
```

Supervisor restarts Horizon with fresh code.

## 20. Shared Hosting To KVM Migration

### Before Cutover

1. Lower DNS TTL to 300 seconds at least a few hours before migration.
2. Put the shared-hosting app into maintenance mode if possible:

```bash
php artisan down --secret="temporary-access-token"
```

3. Export the shared-hosting database.
4. Copy uploads/storage files from shared hosting.
5. Deploy the code to KVM.
6. Import database and storage onto KVM.
7. Run migrations and caches.
8. Verify with a staging domain or hosts-file override.

### Database Export And Import

On old hosting, export from phpMyAdmin or CLI:

```bash
mysqldump -u OLD_USER -p OLD_DATABASE > scanmysocial.sql
```

Copy to KVM:

```bash
scp scanmysocial.sql deploy@SERVER_IP:/home/deploy/
```

Import on KVM:

```bash
mysql -u scanmysocial -p scanmysocial < /home/deploy/scanmysocial.sql
```

### Storage Copy

Copy public storage and uploaded files from shared hosting to:

```text
/var/www/scanmysocial/storage/app/public
/var/www/scanmysocial/public/storage
```

Then run:

```bash
php artisan storage:link
sudo chown -R deploy:www-data storage public/storage
sudo chmod -R ug+rwx storage bootstrap/cache
```

### Cutover

1. Confirm KVM app works.
2. Point DNS `A` records to KVM IP.
3. Issue SSL after DNS resolves.
4. Bring app up:

```bash
php artisan up
```

5. Watch logs:

```bash
tail -f storage/logs/laravel.log
tail -f storage/logs/horizon.log
```

## 21. Deploy Updates After Initial Setup

Use this deployment sequence:

```bash
cd /var/www/scanmysocial
git pull
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan down --render="errors::503" || true
php artisan migrate --force
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan horizon:terminate
php artisan up
```

If the app is already down due to failure, run `php artisan up` after fixing.

## 22. Verification Checklist

Run:

```bash
php artisan about
php artisan migrate:status
php artisan route:list --path=horizon
php artisan horizon:status
php artisan queue:monitor default,emails,analysis,transcription,media-downloads,autodm,instagram-analytics --max=100
php artisan schedule:list
curl -I https://example.com/up
```

Check in browser:

- Home page loads.
- Login works.
- Super admin can open `/horizon`.
- Regular users cannot open `/horizon`.
- Instagram OAuth callback URL matches `.env`.
- Meta webhook URL points to the KVM domain.
- Razorpay webhook URL points to the KVM domain.
- Email provider sends a test email.
- File uploads display correctly.

## 23. Troubleshooting

### 500 Error

```bash
tail -n 100 storage/logs/laravel.log
php artisan optimize:clear
php artisan config:cache
```

Check file permissions:

```bash
sudo chown -R deploy:www-data storage bootstrap/cache
sudo chmod -R ug+rwx storage bootstrap/cache
```

### Horizon Cannot Connect To Redis

```bash
redis-cli ping
php artisan config:show database.redis
php artisan config:show queue.default
php artisan config:show queue.connections.redis
```

Expected:

```text
PONG
queue.default = redis
retry_after = 390
```

### Jobs Are Not Processing

```bash
sudo supervisorctl status
php artisan horizon:status
php artisan horizon:supervisors
php artisan queue:monitor default,emails,analysis,transcription,media-downloads,autodm,instagram-analytics --max=100
```

Restart:

```bash
php artisan horizon:terminate
sudo supervisorctl restart scanmysocial-horizon
```

### Permission Denied

```bash
sudo chown -R deploy:www-data /var/www/scanmysocial
sudo find /var/www/scanmysocial -type f -exec chmod 664 {} \;
sudo find /var/www/scanmysocial -type d -exec chmod 775 {} \;
sudo chmod -R ug+rwx storage bootstrap/cache
```

### Nginx Bad Gateway

```bash
sudo nginx -t
sudo systemctl status php8.3-fpm --no-pager
sudo systemctl restart php8.3-fpm
sudo systemctl reload nginx
```

Make sure the Nginx `fastcgi_pass` socket matches the installed PHP-FPM service.

### Queue Duplicate Processing

Verify timeout values:

```bash
php artisan config:show queue.connections.redis.retry_after
php artisan config:show horizon.defaults
```

`retry_after` must stay higher than worker `timeout`. This repo uses `390` retry seconds and Horizon worker timeouts up to `330`.

## 24. Rollback Plan

Before every production deploy:

```bash
mysqldump -u scanmysocial -p scanmysocial > backup-$(date +%F-%H%M).sql
tar -czf storage-backup-$(date +%F-%H%M).tar.gz storage/app/public
git rev-parse HEAD > release-before-deploy.txt
```

If code rollback is needed:

```bash
git checkout PREVIOUS_COMMIT
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan horizon:terminate
```

Database rollback depends on the migration. Prefer forward-fix migrations unless data loss is confirmed and a tested backup restore is available.

## 25. Reference Docs

- Laravel deployment: https://laravel.com/docs/12.x/deployment
- Laravel Horizon: https://laravel.com/docs/12.x/horizon
- Laravel queues: https://laravel.com/docs/12.x/queues
