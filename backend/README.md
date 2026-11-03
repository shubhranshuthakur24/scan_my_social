# Scan My Social

Scan My Social is a powerful Instagram scraping and media management tool built with Laravel, React (Inertia.js), and Apify.

## Features

- **Instagram Channel Scraping**: Automatically fetch profile metadata (bio, followers, etc.) and posts.
- **Media Download**: Localize remote Instagram images and videos to your own storage.
- **Background Processing**: Heavy tasks like scraping and media downloads are handled asynchronously via queues.
- **AI Integration**: (In development) Content analysis and script generation.

## Getting Started

### Prerequisites

- PHP 8.2+
- Node.js & NPM
- Redis (for queues and caching)
- MySQL/PostgreSQL

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd "Scan My Social"
   ```

2. Install dependencies:
   ```bash
   composer install
   npm install
   ```

3. Setup environment:
   ```bash
   cp .env.example .env
   php artisan key:generate
   ```

4. Run migrations:
   ```bash
   php artisan migrate
   ```

## Usage

### Development Servers

To run the application locally, you need to start both the Laravel dev server and the Vite dev server:

```bash
# Terminal 1
php artisan serve

# Terminal 2
npm run dev
```

### Running Queues

Scan My Social uses background jobs for scraping, media downloads, email, AutoDM, analytics, and AI/content processing.

For local database-backed queues, run:

```bash
# General jobs (API/background workflows, email, AutoDM, analytics)
php artisan queue:work --queue=default,emails,analysis,transcription,autodm,instagram-analytics --sleep=1 --tries=3 --timeout=330 --max-jobs=500 --max-time=3600

# Media download workers
php artisan queue:work --queue=media-downloads --sleep=1 --tries=3 --timeout=180 --max-jobs=500 --max-time=3600
```

For production KVM/VPS deployments, use Redis with Laravel Horizon instead of standalone `queue:work` processes:

```bash
QUEUE_CONNECTION=redis
php artisan horizon
```

### Docker KVM Deployment

This repository includes a production Docker setup for KVM deployment:

```bash
cp .env.docker.example .env.docker
nano .env.docker
docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

Use `docs/docker-kvm-deployment-guide.md` for the full first-deploy, Horizon, scheduler, mandatory HTTPS, R2 uploads, backup, and redeploy checklist.

### In-App Notifications

The app includes a real-time notification system powered by Pusher.

#### Send via CLI (Testing)
To send a test notification to a specific user, use the following Artisan command:
```bash
php artisan app:test-notification {user_id}
```

#### Send via PHP (Code)
To trigger a notification from anywhere in your backend:
```php
use App\Notifications\AppNotification;

$user->notify(new AppNotification(
    title: 'Success!',
    message: 'Task completed successfully.',
    type: 'success', // info, success, warning, error
    actionUrl: route('dashboard')
));
```

### User Roles

To assign or change a user's role (e.g. grant super admin access):
```bash
php artisan user:set-role user@example.com super_admin
```

To revert back to a regular user:
```bash
php artisan user:set-role user@example.com user
```

## Technologies Used

- **Backend**: [Laravel](https://laravel.com)
- **Frontend**: [React](https://reactjs.org) with [Inertia.js](https://inertiajs.com)
- **Styling**: Vanilla CSS / Tailwind CSS
- **Scraping**: [Apify](https://apify.com)
- **Database**: MySQL
- **Queue**: Redis

## License

The Scan My Social project is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
