<?php

use App\Http\Controllers\Api\ChannelController;
use App\Http\Controllers\Api\MetaWebhookController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ScriptController;
use App\Http\Controllers\Api\WaitlistController as ApiWaitlistController;
use App\Http\Controllers\Api\WatchlistController;
use App\Http\Controllers\AutoDmController;
use App\Http\Controllers\ChannelWebController;
use App\Http\Controllers\GenericPagesController;
use App\Http\Controllers\LinkPage\LinkPageController;
use App\Http\Controllers\LinkPage\PublicLinkPageController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectWebController;
use App\Http\Controllers\ScriptWebController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SocialIntegrationController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\ViralImagePromptController;
use App\Http\Controllers\WatchlistWebController;
use App\Http\Controllers\WebhookController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {

    // 👉 Landing page only for root domain
    if (request()->getHost() === 'scanmysocial.com' || request()->getHost() === 'viralyzer.foxxydigitaltools.com' || request()->getHost() === 'localhost:8000' || request()->getHost() === 'localhost') {
        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'laravelVersion' => Application::VERSION,
            'phpVersion' => PHP_VERSION,
        ]);
    }

    // 👉 For panel/app subdomains → go dashboard
    return redirect()->route('login');
});

Route::get('/viral-image-prompts', [ViralImagePromptController::class, 'index'])->name('viral-image-prompts.index');
Route::get('/privacy-policy', [GenericPagesController::class, 'privacyPolicy'])->name('privacy-policy');
Route::get('/autodm/terms', [GenericPagesController::class, 'autodmTerms'])->name('autodm.terms');
Route::get('/data-deletion', [GenericPagesController::class, 'autodmDataDeletion'])->name('autodm.data-deletion');
Route::get('/pricing', [GenericPagesController::class, 'pricing'])->name('pricing');
Route::get('/waitlist', [GenericPagesController::class, 'waitlist'])->name('waitlist');
Route::post('/api/waitlist', [ApiWaitlistController::class, 'store'])->middleware('throttle:30,1')->name('waitlist.store');

Route::get('/dashboard', [GenericPagesController::class, 'dashboard'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::get('/videos', [VideoController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('videos');

Route::get('/videos/{id}', [VideoController::class, 'show'])->middleware(['auth', 'verified'])->name('videos.show');

Route::get('/videos/{id}/refine', [VideoController::class, 'refine'])
    ->middleware(['auth', 'verified'])
    ->name('videos.refine');

Route::get('/channels', [ChannelWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('channels');

Route::get('/projects', [ProjectWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('projects');

Route::get('/recent-activity', [GenericPagesController::class, 'recentActivity'])
    ->middleware(['auth', 'verified'])
    ->name('recent-activity');

Route::get('/projects/{id}', [ProjectWebController::class, 'show'])
    ->middleware(['auth', 'verified'])
    ->name('projects.show');

Route::get('/channels/create', [ChannelWebController::class, 'create'])
    ->middleware(['auth', 'verified'])
    ->name('channels.create');

Route::get('/watchlists', [WatchlistWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('watchlists.index');

Route::get('/watchlists/{id}', [WatchlistWebController::class, 'show'])
    ->middleware(['auth', 'verified'])
    ->name('watchlists.show');

Route::get('/scripts', [ScriptWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('scripts');

Route::get('/scripts/{script}', [ScriptWebController::class, 'show'])
    ->middleware(['auth', 'verified'])
    ->name('scripts.show');

// AutoDM routes are nested under Instagram.
Route::prefix('instagram/autodm')->middleware(['auth', 'verified'])->group(function () {
    Route::get('/', [AutoDmController::class, 'index'])->name('autodm.index');
    Route::get('/create', [AutoDmController::class, 'create'])->name('autodm.create');
    Route::get('/flows/{flow}/edit', [AutoDmController::class, 'edit'])->name('autodm.flows.edit');
    Route::post('/flows', [AutoDmController::class, 'store'])->name('autodm.flows.store');
    Route::patch('/flows/{flow}', [AutoDmController::class, 'update'])->name('autodm.flows.update');
    Route::patch('/flows/{flow}/toggle-status', [AutoDmController::class, 'toggleStatus'])->name('autodm.flows.toggle-status');
    Route::post('/flows/{flow}/duplicate', [AutoDmController::class, 'duplicate'])->name('autodm.flows.duplicate');
    Route::get('/fetch-media/{instagramAccount}', [AutoDmController::class, 'fetchMedia'])->name('autodm.fetch-media');
});

Route::prefix('social-integrations')->middleware(['auth', 'verified'])->group(function () {
    Route::get('/instagram/connect', [SocialIntegrationController::class, 'connectInstagram'])->name('social-integrations.instagram.connect');
    Route::get('/instagram/callback', [SocialIntegrationController::class, 'instagramCallback'])->name('social-integrations.instagram.callback');
    Route::get('/instagram/select-account', [SocialIntegrationController::class, 'showInstagramAccountSelection'])->name('social-integrations.instagram.select.show');
    Route::post('/instagram/select-account', [SocialIntegrationController::class, 'completeInstagramAccountSelection'])->name('social-integrations.instagram.select.store');
});

Route::get('/settings', [SettingsController::class, 'index'])->middleware(['auth', 'verified'])->name('settings');
Route::patch('/settings/bookings/working-hours', [SettingsController::class, 'updateBookingWorkingHours'])
    ->middleware(['auth', 'verified'])
    ->name('settings.bookings.working-hours.update');
Route::patch('/settings/bookings/date-overrides', [SettingsController::class, 'updateBookingDateOverrides'])
    ->middleware(['auth', 'verified'])
    ->name('settings.bookings.date-overrides.update');

Route::get('/settings/billing', [SettingsController::class, 'billing'])->middleware(['auth', 'verified'])->name('settings.billing');
Route::get('/settings/billing/invoices/{invoice}/download', [SettingsController::class, 'downloadInvoice'])->middleware(['auth', 'verified'])->name('settings.billing.invoices.download');

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::patch('/profile/preferences', [ProfileController::class, 'updatePreferences'])->name('profile.preferences.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Upgrade / Pricing inside dashboard
    Route::get('/settings/upgrade', function () {
        return Inertia::render('Settings/Upgrade', [
            'hasClaimedFree' => auth()->user()->has_claimed_free,
        ]);
    })->name('settings.upgrade');

    // Billing route we created previously
    Route::get('/settings/billing', [SettingsController::class, 'billing'])->name('settings.billing');

    Route::prefix('social-bio-links')->group(function () {
        Route::get('/', [LinkPageController::class, 'index'])->name('social-bio-links.index');
        Route::post('/cards', [LinkPageController::class, 'createCard'])->name('social-bio-links.cards.store');
        Route::patch('/cards/{linkPage}/primary', [LinkPageController::class, 'setPrimary'])->name('social-bio-links.cards.primary');
        Route::delete('/cards/{linkPage}', [LinkPageController::class, 'destroyCard'])->name('social-bio-links.cards.destroy');
        Route::put('/', [LinkPageController::class, 'update'])->name('social-bio-links.update');
        Route::post('/banner', [LinkPageController::class, 'uploadBanner'])->name('social-bio-links.banner.store');
        Route::delete('/banner', [LinkPageController::class, 'removeBanner'])->name('social-bio-links.banner.destroy');
        Route::post('/links', [LinkPageController::class, 'storeLink'])->name('social-bio-links.links.store');
        Route::put('/links/{link}', [LinkPageController::class, 'updateLink'])->name('social-bio-links.links.update');
        Route::delete('/links/{link}', [LinkPageController::class, 'destroyLink'])->name('social-bio-links.links.destroy');
        Route::patch('/links/reorder', [LinkPageController::class, 'reorderLinks'])->name('social-bio-links.links.reorder');
    });

    // API-like routes for frontend components (Stateful)
    Route::prefix('api')->group(function () {
        // Scripts
        Route::get('scripts', [ScriptController::class, 'index']);
        Route::post('scripts/generate', [ScriptController::class, 'generateFreshScript'])->middleware('active.plan');
        Route::post('scripts/{script}/refine', [ScriptController::class, 'refine'])->middleware('active.plan');
        Route::post('scripts/{script}/auto-refine', [ScriptController::class, 'autoRefine'])->middleware('active.plan');
        Route::get('scripts/{script}/status', [ScriptController::class, 'status']);

        // Channels
        Route::get('channels/search', [ChannelController::class, 'search']);
        Route::get('channels', [ChannelController::class, 'index']);
        Route::post('channels', [ChannelController::class, 'store'])->middleware('active.plan');
        Route::put('channels/{channel}', [ChannelController::class, 'update']);
        Route::delete('channels/{channel}', [ChannelController::class, 'destroy']);

        // Posts
        Route::prefix('posts')->group(function () {
            Route::get('/', [PostController::class, 'index']);

            Route::post('{post}/transcribe', [PostController::class, 'transcribe'])->middleware('active.plan');
            Route::get('{post}/transcription-status', [PostController::class, 'transcriptionStatus'])->middleware('active.plan');
            Route::post('{post}/analyze', [PostController::class, 'analyze'])->middleware('active.plan');
            Route::get('{post}/analysis-status', [PostController::class, 'analysisStatus'])->middleware('active.plan');
            Route::post('{post}/process', [PostController::class, 'process'])->middleware('active.plan');
            Route::post('{post}/generate-audio', [PostController::class, 'generateAudio'])->middleware('active.plan');
        });

        // Projects
        Route::prefix('projects')->group(function () {
            Route::get('/', [ProjectController::class, 'index']);
            Route::post('/', [ProjectController::class, 'store']);
            Route::get('{project}', [ProjectController::class, 'show']);
            Route::put('{project}', [ProjectController::class, 'update']);
            Route::delete('{project}', [ProjectController::class, 'destroy']);
            Route::post('{project}/posts', [ProjectController::class, 'addPost']);
            Route::delete('{project}/posts/{postId}', [ProjectController::class, 'removePost']);
        });

        // Watchlists
        Route::prefix('watchlists')->group(function () {
            Route::get('/', [WatchlistController::class, 'index']);
            Route::post('/', [WatchlistController::class, 'store']);
            Route::get('{watchlist}', [WatchlistController::class, 'show']);
            Route::put('{watchlist}', [WatchlistController::class, 'update']);
            Route::delete('{watchlist}', [WatchlistController::class, 'destroy']);
            Route::post('{watchlist}/favorite', [WatchlistController::class, 'toggleFavorite']);
            Route::post('{watchlist}/channels', [WatchlistController::class, 'addChannel']);
            Route::delete('{watchlist}/channels/{channelId}', [WatchlistController::class, 'removeChannel']);
        });
        // Subscriptions
        Route::prefix('subscriptions')->group(function () {
            Route::post('create', [SubscriptionController::class, 'createSession']);
            Route::post('verify', [SubscriptionController::class, 'verifyPayment']);
            Route::post('cancel', [SubscriptionController::class, 'cancel']);
        });
    });
});

Route::get('/@{username}', [PublicLinkPageController::class, 'show'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('social-bio-links.public.show');
Route::get('/@{username}/{slug}', [PublicLinkPageController::class, 'show'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->where('slug', '[A-Za-z0-9-]+')
    ->name('social-bio-links.public.card.show');
Route::get('/@{username}/links/{link}', [PublicLinkPageController::class, 'redirect'])
    ->middleware('throttle:240,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('social-bio-links.public.redirect');

// Webhooks
Route::post('api/webhooks/razorpay', [WebhookController::class, 'handle']);
Route::get('api/webhooks/meta', [MetaWebhookController::class, 'verify']);
Route::post('api/webhooks/meta', [MetaWebhookController::class, 'handle']);

require __DIR__.'/auth.php';
