<?php

use App\Http\Controllers\Admin\AdminAffiliateController;
use App\Http\Controllers\Admin\AdminChannelController;
use App\Http\Controllers\Admin\AdminNotificationController;
use App\Http\Controllers\Admin\AdminPayoutController;
use App\Http\Controllers\Admin\AdminScriptIntelligenceController;
use App\Http\Controllers\Admin\ViralImagePromptController;
use App\Http\Controllers\AffiliateController;
use App\Http\Controllers\Api\ChannelController;
use App\Http\Controllers\Api\MetaPlatformController;
use App\Http\Controllers\Api\MetaWebhookController;
use App\Http\Controllers\Api\PostController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\SavedVideoFilterController;
use App\Http\Controllers\Api\ScriptController;
use App\Http\Controllers\Api\WaitlistController as ApiWaitlistController;
use App\Http\Controllers\Api\WatchlistController;
use App\Http\Controllers\Appointments\AppointmentSettingsController;
use App\Http\Controllers\Appointments\PublicAppointmentController;
use App\Http\Controllers\AutoDmController;
use App\Http\Controllers\AutodmDeeplinkController;
use App\Http\Controllers\AutoDmTemplateController;
use App\Http\Controllers\ChannelWebController;
use App\Http\Controllers\ContentSchedulerController;
use App\Http\Controllers\GenericPagesController;
use App\Http\Controllers\LeadController;
use App\Http\Controllers\LeadFormController;
use App\Http\Controllers\LeadFormPublicController;
use App\Http\Controllers\LinkPage\LinkPageController;
use App\Http\Controllers\LinkPage\PublicLinkPageController;
use App\Http\Controllers\LinkPage\PublicWebPageController;
use App\Http\Controllers\LinkPage\ShortLinkController;
use App\Http\Controllers\LinkPage\WebPageController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PayoutWebhookController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\ProjectWebController;
use App\Http\Controllers\ReferralController;
use App\Http\Controllers\ScriptWebController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\SocialIntegrationController;
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\VideoController;
use App\Http\Controllers\WatchlistWebController;
use App\Http\Controllers\WebhookController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    $host = strtolower(request()->getHost());
    $isLocalHost = in_array($host, ['localhost', '127.0.0.1', '::1'], true);

    // 👉 Landing page only for root domain
    if ($isLocalHost || in_array($host, ['scanmysocial.com', 'www.scanmysocial.com', 'viralyzer.foxxydigitaltools.com'], true)) {
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

Route::get('/privacy-policy', [GenericPagesController::class, 'privacyPolicy'])->name('privacy-policy');
Route::get('/autodm/terms', [GenericPagesController::class, 'autodmTerms'])->name('autodm.terms');
Route::get('/data-deletion', [GenericPagesController::class, 'autodmDataDeletion'])->name('autodm.data-deletion');
Route::get('/data-deletion/status/{confirmationCode}', [MetaPlatformController::class, 'dataDeletionStatus'])->name('meta.data-deletion.status');
Route::get('/pricing', [GenericPagesController::class, 'pricing'])->name('pricing');
Route::get('/viral-image-prompts', [ViralImagePromptController::class, 'index'])->name('viral-image-prompts.index');
Route::get('/waitlist', [GenericPagesController::class, 'waitlist'])->name('waitlist');
Route::post('/api/waitlist', [ApiWaitlistController::class, 'store'])->middleware('throttle:30,1')->name('waitlist.store');

// Public Affiliate Page
Route::get('/affiliate', [AffiliateController::class, 'index'])->name('affiliate');
Route::post('/affiliate/apply', [AffiliateController::class, 'apply'])->middleware('throttle:5,10')->name('affiliate.apply');
Route::post('/affiliate/claim-link', [AffiliateController::class, 'requestClaimLink'])->middleware('throttle:affiliate-claim-link')->name('affiliate.claim-link');

Route::get('/dashboard', [GenericPagesController::class, 'dashboard'])
    ->middleware(['auth', 'verified'])
    ->name('dashboard');

Route::get('/Library', [VideoController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('videos');

Route::get('/Library/{id}', [VideoController::class, 'show'])->middleware(['auth', 'verified'])->name('videos.show');

Route::get('/Library/{id}/refine', [VideoController::class, 'refine'])
    ->middleware(['auth', 'verified'])
    ->name('videos.refine');

Route::redirect('/videos', '/Library');

Route::get('/competitors', [ChannelWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('channels');

Route::redirect('/channels', '/competitors');

Route::get('/projects', [ProjectWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('projects');

Route::get('/recent-activity', [GenericPagesController::class, 'recentActivity'])
    ->middleware(['auth', 'verified'])
    ->name('recent-activity');

Route::get('/projects/{id}', [ProjectWebController::class, 'show'])
    ->middleware(['auth', 'verified'])
    ->name('projects.show');

Route::get('/competitors/create', [ChannelWebController::class, 'create'])
    ->middleware(['auth', 'verified'])
    ->name('channels.create');

Route::redirect('/channels/create', '/competitors/create');

Route::get('/watchlists', [WatchlistWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('watchlists.index');

Route::get('/watchlists/{id}', [WatchlistWebController::class, 'show'])
    ->middleware(['auth', 'verified'])
    ->name('watchlists.show');

Route::get('/scripts', [ScriptWebController::class, 'index'])
    ->middleware(['auth', 'verified'])
    ->name('scripts');

Route::get('/scripts/create', [ScriptWebController::class, 'create'])
    ->middleware(['auth', 'verified', 'active.plan'])
    ->name('scripts.create');

Route::get('/scripts/build/{batch}', [ScriptWebController::class, 'build'])
    ->middleware(['auth', 'verified', 'active.plan'])
    ->name('scripts.build');

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
    Route::post('/flows/{flow}/retrigger', [AutoDmController::class, 'retrigger'])->name('autodm.flows.retrigger');
    Route::get('/fetch-media/{instagramAccount}', [AutoDmController::class, 'fetchMedia'])->name('autodm.fetch-media');
    Route::post('/templates', [AutoDmTemplateController::class, 'store'])->name('autodm.templates.store');
    Route::patch('/templates/{template}', [AutoDmTemplateController::class, 'update'])->name('autodm.templates.update');
    Route::delete('/templates/{template}', [AutoDmTemplateController::class, 'destroy'])->name('autodm.templates.destroy');
});

// Public OAuth Callback (State parameter validates identity via state cache lookup)
Route::get('/social-integrations/instagram/callback', [SocialIntegrationController::class, 'instagramCallback'])->name('social-integrations.instagram.callback');

Route::prefix('social-integrations')->middleware(['auth', 'verified'])->group(function () {
    Route::get('/instagram/connect', [SocialIntegrationController::class, 'connectInstagram'])->name('social-integrations.instagram.connect');
    Route::get('/instagram/select-account', [SocialIntegrationController::class, 'showInstagramAccountSelection'])->name('social-integrations.instagram.select.show');
    Route::post('/instagram/select-account', [SocialIntegrationController::class, 'completeInstagramAccountSelection'])->name('social-integrations.instagram.select.store');
    Route::patch('/instagram/accounts/{instagramAccount}/disconnect', [SocialIntegrationController::class, 'disconnectInstagram'])->name('social-integrations.instagram.disconnect');
});

Route::get('/settings', [SettingsController::class, 'index'])->middleware(['auth', 'verified'])->name('settings');
Route::patch('/settings/integrations/{instagramAccount}/welcome-dm', [SettingsController::class, 'updateWelcomeDm'])
    ->middleware(['auth', 'verified'])
    ->name('settings.integrations.welcome-dm.update');
Route::patch('/settings/bookings/working-hours', [SettingsController::class, 'updateBookingWorkingHours'])
    ->middleware(['auth', 'verified'])
    ->name('settings.bookings.working-hours.update');
Route::patch('/settings/bookings/date-overrides', [SettingsController::class, 'updateBookingDateOverrides'])
    ->middleware(['auth', 'verified'])
    ->name('settings.bookings.date-overrides.update');

Route::get('/settings/billing', [SettingsController::class, 'billing'])->middleware(['auth', 'verified'])->name('settings.billing');
Route::get('/settings/billing/invoices/{invoice}/download', [SettingsController::class, 'downloadInvoice'])->middleware(['auth', 'verified'])->name('settings.billing.invoices.download');

Route::middleware('auth')->group(function () {
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar'])->name('profile.avatar.store');
    Route::delete('/profile/avatar', [ProfileController::class, 'removeAvatar'])->name('profile.avatar.destroy');
    Route::patch('/profile/preferences', [ProfileController::class, 'updatePreferences'])->name('profile.preferences.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');

    // Referrals & Wallet
    Route::get('/referrals', [ReferralController::class, 'index'])->name('referrals');
    Route::post('/referrals/redeem-credits', [ReferralController::class, 'redeemCredits'])->name('referrals.redeem_credits');
    Route::post('/referrals/request-payout', [ReferralController::class, 'requestPayout'])->name('referrals.request_payout');

    Route::get('/affiliate/claim/{application}/{token}', [AffiliateController::class, 'verifyClaim'])->name('affiliate.claim.verify');

    // Affiliate Wallet
    Route::middleware('affiliate.approved')->group(function () {
        Route::post('/affiliate/wallet/bank-details', [AffiliateController::class, 'updateBankDetails'])->name('affiliate.wallet.bank-details');
        Route::post('/affiliate/wallet/request-payout', [AffiliateController::class, 'requestPayout'])->name('affiliate.wallet.payout');
    });
    // Upgrade / Pricing inside dashboard
    Route::get('/settings/upgrade', function () {
        return Inertia::render('Settings/Upgrade', [
            'hasClaimedFree' => auth()->user()->has_claimed_free,
            'razorpayKey' => config('services.razorpay.key'),
        ]);
    })->name('settings.upgrade');

    Route::get('/crm', [LeadController::class, 'index'])->name('crm.index');

    Route::redirect('/instagram', '/instagram/my-profile');

    Route::prefix('instagram')->name('instagram.')->group(function () {
        Route::get('/my-profile', [ContentSchedulerController::class, 'myInsta'])->name('my-profile');
        Route::get('/calendar', [ContentSchedulerController::class, 'calendar'])->name('calendar');
        Route::get('/library', [ContentSchedulerController::class, 'library'])->name('library');
        Route::post('/library/media', [ContentSchedulerController::class, 'storeMedia'])->name('media.store');
        Route::delete('/library/media/{media}', [ContentSchedulerController::class, 'destroyMedia'])->name('media.destroy');
        Route::get('/schedule', [ContentSchedulerController::class, 'schedule'])->name('schedule');
        Route::post('/schedule', [ContentSchedulerController::class, 'storeScheduledPost'])->name('posts.store');
        Route::patch('/posts/{scheduledPost}/reschedule', [ContentSchedulerController::class, 'reschedule'])->name('posts.reschedule');
        Route::patch('/posts/{scheduledPost}/cancel', [ContentSchedulerController::class, 'cancel'])->name('posts.cancel');
        Route::post('/posts/{scheduledPost}/retry', [ContentSchedulerController::class, 'retryPublish'])->name('posts.retry');
        Route::post('/notes', [ContentSchedulerController::class, 'storeNote'])->name('notes.store');
        Route::patch('/notes/{schedulerNote}', [ContentSchedulerController::class, 'updateNote'])->name('notes.update');
        Route::delete('/notes/{schedulerNote}', [ContentSchedulerController::class, 'destroyNote'])->name('notes.destroy');
        Route::get('/analytics', [ContentSchedulerController::class, 'analytics'])->name('analytics');
        Route::post('/analytics/sync', [ContentSchedulerController::class, 'syncAnalytics'])->name('analytics.sync');
        Route::get('/posts/{instagram_media_id}/details', [ContentSchedulerController::class, 'postDetails'])->name('posts.details');
    });

    // Super Admin Home
    Route::get('/admin/home', [GenericPagesController::class, 'adminHome'])
        ->middleware('super.admin')
        ->name('admin.home');

    // Viral Image Prompts Management
    Route::middleware('super.admin')->prefix('viral-image-prompts')->group(function () {
        Route::get('/manage', [ViralImagePromptController::class, 'manage'])->name('viral-image-prompts.manage');
        Route::get('/create', [ViralImagePromptController::class, 'create'])->name('viral-image-prompts.create');
        Route::post('/', [ViralImagePromptController::class, 'store'])->name('viral-image-prompts.store');
        Route::get('/{viralImagePrompt}/edit', [ViralImagePromptController::class, 'edit'])->name('viral-image-prompts.edit');
        Route::post('/{viralImagePrompt}', [ViralImagePromptController::class, 'update'])->name('viral-image-prompts.update');
        Route::delete('/{viralImagePrompt}', [ViralImagePromptController::class, 'destroy'])->name('viral-image-prompts.destroy');
    });

    // Admin Push Notifications
    Route::middleware('super.admin')->prefix('admin/notifications')->group(function () {
        Route::get('/', [AdminNotificationController::class, 'index'])->name('admin.notifications.index');
        Route::post('/send', [AdminNotificationController::class, 'send'])->name('admin.notifications.send');
    });

    // Admin Payout Management
    Route::middleware('super.admin')->prefix('admin/payouts')->group(function () {
        Route::get('/', [AdminPayoutController::class, 'index'])->name('admin.payouts.index');
        Route::patch('/{payout}/status', [AdminPayoutController::class, 'updateStatus'])->name('admin.payouts.update-status');
    });

    // Admin Affiliate Management
    Route::middleware('super.admin')->prefix('admin/affiliates')->group(function () {
        Route::get('/', [AdminAffiliateController::class, 'index'])->name('admin.affiliates.index');
        Route::patch('/{application}/status', [AdminAffiliateController::class, 'updateStatus'])->name('admin.affiliates.update-status');
    });

    // Admin Channel Management
    Route::middleware('super.admin')->prefix('admin/channels')->group(function () {
        Route::get('/', [AdminChannelController::class, 'index'])->name('admin.channels.index');
        Route::post('/{channel}/retry-profile', [AdminChannelController::class, 'retryProfile'])->name('admin.channels.retry-profile');
        Route::post('/{channel}/retry-post', [AdminChannelController::class, 'retryPost'])->name('admin.channels.retry-post');
    });

    // Admin Script Intelligence Management
    Route::middleware('super.admin')->prefix('admin/script-intelligence')->group(function () {
        Route::get('/', [AdminScriptIntelligenceController::class, 'index'])->name('admin.script-intelligence.index');

        // Hooks
        Route::post('/hooks', [AdminScriptIntelligenceController::class, 'storeHook'])->name('admin.script-intelligence.hooks.store');
        Route::patch('/hooks/{hook}', [AdminScriptIntelligenceController::class, 'updateHook'])->name('admin.script-intelligence.hooks.update');
        Route::delete('/hooks/{hook}', [AdminScriptIntelligenceController::class, 'destroyHook'])->name('admin.script-intelligence.hooks.destroy');

        // CTAs
        Route::post('/ctas', [AdminScriptIntelligenceController::class, 'storeCta'])->name('admin.script-intelligence.ctas.store');
        Route::patch('/ctas/{cta}', [AdminScriptIntelligenceController::class, 'updateCta'])->name('admin.script-intelligence.ctas.update');
        Route::delete('/ctas/{cta}', [AdminScriptIntelligenceController::class, 'destroyCta'])->name('admin.script-intelligence.ctas.destroy');

        // Objectives
        Route::post('/objectives', [AdminScriptIntelligenceController::class, 'storeObjective'])->name('admin.script-intelligence.objectives.store');
        Route::patch('/objectives/{objective}', [AdminScriptIntelligenceController::class, 'updateObjective'])->name('admin.script-intelligence.objectives.update');
        Route::delete('/objectives/{objective}', [AdminScriptIntelligenceController::class, 'destroyObjective'])->name('admin.script-intelligence.objectives.destroy');
    });

    Route::prefix('lead-forms')->group(function () {
        Route::get('/', [LeadFormController::class, 'index'])->name('lead-forms.index');
        Route::post('/', [LeadFormController::class, 'store'])->name('lead-forms.store');
        Route::get('/{leadForm}', [LeadFormController::class, 'show'])->name('lead-forms.show');
        Route::patch('/{leadForm}', [LeadFormController::class, 'update'])->name('lead-forms.update');
        Route::patch('/{leadForm}/publish', [LeadFormController::class, 'togglePublish'])->name('lead-forms.publish');
        Route::delete('/{leadForm}', [LeadFormController::class, 'destroy'])->name('lead-forms.destroy');
        Route::get('/{leadForm}/submissions/export', [LeadFormController::class, 'exportSubmissions'])->name('lead-forms.submissions.export');
        Route::post('/{leadForm}/upload-cover', [LeadFormController::class, 'uploadCoverImage'])->name('lead-forms.upload-cover');
        Route::delete('/{leadForm}/remove-cover', [LeadFormController::class, 'removeCoverImage'])->name('lead-forms.remove-cover');
        Route::get('/{leadForm}/submissions', [LeadFormController::class, 'submissions'])->name('lead-forms.submissions');
    });

    Route::prefix('social-bio-links')->group(function () {
        Route::get('/', [LinkPageController::class, 'notFound']);
        Route::get('/link-in-bio', [LinkPageController::class, 'index'])->defaults('active_tab', 'link_in_bio')->name('social-bio-links.index');
        Route::get('/linkshort', [LinkPageController::class, 'index'])->defaults('active_tab', 'linkshort')->name('social-bio-links.linkshort');
        Route::get('/web-pages', [LinkPageController::class, 'index'])->defaults('active_tab', 'web_pages')->name('social-bio-links.web-pages.index');
        Route::get('/cards/create', [LinkPageController::class, 'create'])->name('social-bio-links.cards.create');
        Route::get('/cards/{linkPage}/edit', [LinkPageController::class, 'edit'])->name('social-bio-links.cards.edit');
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
        Route::post('/short-links', [ShortLinkController::class, 'store'])->name('social-bio-links.short-links.store');
        Route::get('/short-links/{shortLink}', [ShortLinkController::class, 'show'])->name('social-bio-links.short-links.show');
        Route::put('/short-links/{shortLink}', [ShortLinkController::class, 'update'])->name('social-bio-links.short-links.update');
        Route::patch('/short-links/{shortLink}/toggle', [ShortLinkController::class, 'toggle'])->name('social-bio-links.short-links.toggle');
        Route::delete('/short-links/{shortLink}', [ShortLinkController::class, 'destroy'])->name('social-bio-links.short-links.destroy');
        Route::get('/web-pages/create', [WebPageController::class, 'create'])->name('social-bio-links.web-pages.create');
        Route::post('/web-pages', [WebPageController::class, 'store'])->name('social-bio-links.web-pages.store');
        Route::get('/web-pages/{webPage}/edit', [WebPageController::class, 'edit'])->name('social-bio-links.web-pages.edit');
        Route::put('/web-pages/{webPage}', [WebPageController::class, 'update'])->name('social-bio-links.web-pages.update');
        Route::patch('/web-pages/{webPage}/publish', [WebPageController::class, 'togglePublish'])->name('social-bio-links.web-pages.publish');
        Route::get('/web-pages/{webPage}/preview', [WebPageController::class, 'preview'])->name('social-bio-links.web-pages.preview');
        Route::delete('/web-pages/{webPage}', [WebPageController::class, 'destroy'])->name('social-bio-links.web-pages.destroy');
    });

    Route::prefix('appointments')->group(function () {
        Route::get('/', [AppointmentSettingsController::class, 'index'])->name('appointments.index');
        Route::get('/calendar', [AppointmentSettingsController::class, 'calendar'])->name('appointments.calendar');
        Route::get('/create', [AppointmentSettingsController::class, 'create'])->name('appointments.create');
        Route::get('/event-types/{eventType}/edit', [AppointmentSettingsController::class, 'edit'])->name('appointments.event-types.edit');
        Route::post('/event-types', [AppointmentSettingsController::class, 'store'])->name('appointments.event-types.store');
        Route::put('/event-types/{eventType}', [AppointmentSettingsController::class, 'update'])->name('appointments.event-types.update');
        Route::delete('/event-types/{eventType}', [AppointmentSettingsController::class, 'destroy'])->name('appointments.event-types.destroy');
        Route::get('/{booking}/reschedule-availability', [AppointmentSettingsController::class, 'rescheduleAvailability'])->name('appointments.reschedule-availability');
        Route::patch('/{booking}/reschedule', [AppointmentSettingsController::class, 'rescheduleBooking'])->name('appointments.reschedule');
        Route::patch('/{booking}/cancel', [AppointmentSettingsController::class, 'cancelBooking'])->name('appointments.cancel');
        Route::get('/settings', [AppointmentSettingsController::class, 'settings'])->name('appointments.settings');
        Route::patch('/settings/general', [AppointmentSettingsController::class, 'updateGeneralSettings'])->name('appointments.settings.general.update');
    });
    Route::get('/appointments/upcoming/export', [AppointmentSettingsController::class, 'exportUpcoming'])->name('appointments.upcoming.export');
    Route::get('/appointments/upcoming', [AppointmentSettingsController::class, 'upcoming'])->name('appointments.upcoming');

    // API-like routes for frontend components (Stateful)
    Route::prefix('api')->group(function () {
        // Notifications
        Route::prefix('notifications')->middleware('throttle:120,1')->group(function () {
            Route::get('/', [NotificationController::class, 'index'])->name('notifications.index');
            Route::post('/{id}/read', [NotificationController::class, 'markAsRead'])->whereUuid('id')->name('notifications.read');
            Route::post('/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
            Route::delete('/{id}', [NotificationController::class, 'destroy'])->whereUuid('id')->name('notifications.destroy');
        });

        // Scripts
        Route::get('scripts', [ScriptController::class, 'index'])->name('api.scripts.index');
        Route::post('scripts/generate', [ScriptController::class, 'generateFreshScript'])->middleware(['active.plan', 'throttle:generate-script'])->name('api.scripts.generate');
        Route::get('script-batches/{batch}', [ScriptController::class, 'batchStatus'])->name('api.script-batches.show');
        Route::post('script-batches/{batch}/angles/{angle}/select', [ScriptController::class, 'selectAngle'])->middleware(['active.plan', 'throttle:5,1'])->name('api.script-batches.angles.select');
        Route::post('script-batches/{batch}/resume', [ScriptController::class, 'resumeResearch'])->middleware(['active.plan', 'throttle:5,1'])->name('api.script-batches.resume');
        Route::post('script-batches/{batch}/retry', [ScriptController::class, 'retryGeneration'])->middleware(['active.plan', 'throttle:5,1'])->name('api.script-batches.retry');
        Route::post('scripts/{script}/refine', [ScriptController::class, 'refine'])->middleware('active.plan');
        Route::post('scripts/{script}/auto-refine', [ScriptController::class, 'autoRefine'])->middleware(['active.plan', 'throttle:5,1']);
        Route::get('scripts/{script}/status', [ScriptController::class, 'status']);
        Route::delete('scripts/{script}', [ScriptController::class, 'destroy']);

        // Channels
        Route::get('channels/search', [ChannelController::class, 'search'])->middleware('throttle:30,1');
        Route::get('channels', [ChannelController::class, 'index']);
        Route::post('channels', [ChannelController::class, 'store'])->middleware(['active.plan', 'throttle:10,1']);
        Route::delete('channels/{channel}', [ChannelController::class, 'destroy'])->middleware(['active.plan', 'throttle:20,1']);

        // Posts
        Route::prefix('posts')->group(function () {
            Route::get('/', [PostController::class, 'index']);

            Route::post('{post}/transcribe', [PostController::class, 'transcribe'])->middleware(['active.plan', 'throttle:transcribe-post']);
            Route::get('{post}/transcription-status', [PostController::class, 'transcriptionStatus'])->middleware('active.plan');
            Route::post('{post}/analyze', [PostController::class, 'analyze'])->middleware(['active.plan', 'throttle:analyze-post']);
            Route::get('{post}/analysis-status', [PostController::class, 'analysisStatus'])->middleware('active.plan');
            Route::post('{post}/process', [PostController::class, 'process'])->middleware(['active.plan', 'throttle:60,1']);
            Route::post('{post}/generate-audio', [PostController::class, 'generateAudio'])->middleware(['active.plan', 'throttle:60,1']);
        });

        // Projects
        Route::prefix('projects')->middleware('verified')->group(function () {
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

        // Saved video filters
        Route::prefix('saved-video-filters')->group(function () {
            Route::get('/', [SavedVideoFilterController::class, 'index']);
            Route::post('/', [SavedVideoFilterController::class, 'store']);
            Route::patch('{savedVideoFilter}', [SavedVideoFilterController::class, 'update']);
            Route::delete('{savedVideoFilter}', [SavedVideoFilterController::class, 'destroy']);
        });

        // Subscriptions
        Route::prefix('subscriptions')->group(function () {
            Route::post('create', [SubscriptionController::class, 'createSession'])->middleware('throttle:10,1');
            Route::post('verify', [SubscriptionController::class, 'verifyPayment'])->middleware('throttle:20,1');
            Route::post('cancel', [SubscriptionController::class, 'cancel'])->middleware('throttle:10,1');
        });
    });
});

Route::get('/viral-image-prompts/{viralImagePrompt:slug}', [ViralImagePromptController::class, 'show'])
    ->where('viralImagePrompt', '^(?!manage$|create$).+')
    ->name('viral-image-prompts.show');

Route::get('/blogs', function () {
    return redirect()->away('https://blog.scanmysocial.com');
});

Route::middleware('throttle:200,1')
    ->get('/r/{payload}', [AutodmDeeplinkController::class, 'redirect'])
    ->name('autodm.deeplink.redirect')
    ->where('payload', '.*');

Route::get('/s/{shortLink:code}', [ShortLinkController::class, 'redirect'])
    ->middleware('throttle:240,1')
    ->where('shortLink', '[A-Za-z0-9-]+')
    ->name('short-links.redirect');

Route::get('/f/{publicId}', [LeadFormPublicController::class, 'show'])
    ->middleware('throttle:100,1')
    ->name('lead-forms.public.show');
Route::post('/f/{publicId}/submit', [LeadFormPublicController::class, 'submit'])
    ->middleware('throttle:40,1')
    ->name('lead-forms.public.submit');

Route::get('/@{username}/pages/{slug}', [PublicWebPageController::class, 'show'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->where('slug', '[A-Za-z0-9-]+')
    ->name('web-pages.public.show');
Route::get('/@{username}/pages/{slug}/click/{blockId}', [PublicWebPageController::class, 'click'])
    ->middleware('throttle:240,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->where('slug', '[A-Za-z0-9-]+')
    ->where('blockId', '[A-Za-z0-9-]+')
    ->name('web-pages.public.click');
Route::post('/@{username}/pages/{slug}/submit/{blockId}', [PublicWebPageController::class, 'submit'])
    ->middleware('throttle:40,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->where('slug', '[A-Za-z0-9-]+')
    ->where('blockId', '[A-Za-z0-9-]+')
    ->name('web-pages.public.submit');

Route::get('/@{username}', [PublicLinkPageController::class, 'show'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('social-bio-links.public.show');
Route::get('/@{username}/{slug}', [PublicLinkPageController::class, 'show'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->where('slug', '[A-Za-z0-9-]+')
    ->name('social-bio-links.public.card.show');
Route::get('/cal/@{username}', [PublicAppointmentController::class, 'index'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('bookings.public.index');
Route::get('/cal/@{username}/{eventType}/thanks/{booking}', [PublicAppointmentController::class, 'thanks'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('bookings.public.thanks');
Route::get('/cal/@{username}/{eventType}', [PublicAppointmentController::class, 'show'])
    ->middleware('throttle:120,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('bookings.public.show');
Route::post('/cal/@{username}/{eventType}', [PublicAppointmentController::class, 'store'])
    ->middleware('throttle:40,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('bookings.public.store');
Route::get('/@{username}/links/{link}', [PublicLinkPageController::class, 'redirect'])
    ->middleware('throttle:240,1')
    ->where('username', '[A-Za-z0-9-]+')
    ->name('social-bio-links.public.redirect');

Route::get('/blogs/{any}', function ($any) {
    return redirect()->away('https://blog.scanmysocial.com/'.$any);
})->where('any', '.*');
// Webhooks
Route::post('api/webhooks/razorpay', [WebhookController::class, 'handle']);
Route::post('api/webhooks/razorpay/payouts', [PayoutWebhookController::class, 'handle']);
Route::get('api/webhooks/meta', [MetaWebhookController::class, 'verify']);
Route::post('api/webhooks/meta', [MetaWebhookController::class, 'handle']);

require __DIR__.'/auth.php';
