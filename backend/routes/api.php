<?php

use App\Http\Controllers\Api\AuthApiController;
use App\Http\Controllers\Api\AutoDmApiController;
use App\Http\Controllers\Api\ContentSchedulerApiController;
use App\Http\Controllers\Api\InstagramAnalyticsApiController;
use App\Http\Controllers\Api\InstagramProfileApiController;
use App\Http\Controllers\Api\LeadFormApiController;
use App\Http\Controllers\Api\MediaApiController;
use App\Http\Controllers\Api\MetaPlatformController;
use App\Http\Controllers\Api\MetaWebhookController;
use App\Http\Controllers\Api\PublicFormApiController;
use App\Http\Controllers\Api\SettingsApiController;
use App\Http\Controllers\Api\SubscriptionApiController;
use App\Http\Controllers\Api\WebPageApiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Viralyzer Dedicated REST API V1 Routes (For Next.js Decoupled Frontend)
|--------------------------------------------------------------------------
*/

Route::prefix('v1')->group(function () {
    // 0. Public Auth API & OAuth Callback
    Route::post('/auth/register', [AuthApiController::class, 'register']);
    Route::post('/auth/login', [AuthApiController::class, 'login']);
    Route::get('/auth/instagram/callback', [InstagramProfileApiController::class, 'handleCallback'])->name('api.v1.auth.instagram.callback');
    // Public / Flexible Profile Endpoint (supports Sanctum bearer token or dev fallback)
    Route::get('/instagram/profile', [InstagramProfileApiController::class, 'show']);

    // Public / Flexible Web Pages Catalog & Dashboard List
    Route::get('/web-pages/catalog', [WebPageApiController::class, 'catalog']);
    Route::get('/web-pages', [WebPageApiController::class, 'index']);

    // 1. Protected Endpoints (Requires Sanctum Bearer Token)
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/auth/me', [AuthApiController::class, 'me']);
        Route::post('/auth/logout', [AuthApiController::class, 'logout']);

        // User Settings API
        Route::get('/user/settings', [SettingsApiController::class, 'show']);
        Route::patch('/user/profile', [SettingsApiController::class, 'updateProfile']);
        Route::post('/user/avatar', [SettingsApiController::class, 'uploadAvatar']);
        Route::delete('/user/avatar', [SettingsApiController::class, 'removeAvatar']);
        Route::patch('/user/password', [SettingsApiController::class, 'updatePassword']);
        Route::patch('/user/bank-details', [SettingsApiController::class, 'updateBankDetails']);
        Route::delete('/user/account', [SettingsApiController::class, 'destroy']);

        // Subscription & Invoices API
        Route::get('/user/subscription', [SubscriptionApiController::class, 'show']);
        Route::get('/user/invoices/{id}/download', [SubscriptionApiController::class, 'downloadInvoice']);

        // Profile & Integrations API
        Route::post('/instagram/profile/sync', [InstagramProfileApiController::class, 'sync']);
        Route::post('/instagram/profile/autodm', [InstagramProfileApiController::class, 'storeAutoDm']);
        Route::patch('/instagram/profile/autodm/{mediaId}/toggle-pause', [InstagramProfileApiController::class, 'toggleAutoDmPause']);
        Route::get('/user/integrations/instagram', [InstagramProfileApiController::class, 'integrations']);
        Route::get('/user/integrations/instagram/connect-url', [InstagramProfileApiController::class, 'getConnectUrl']);
        Route::patch('/user/integrations/instagram/{id}/welcome-dm', [InstagramProfileApiController::class, 'toggleWelcomeDm']);
        Route::patch('/user/integrations/instagram/{id}/welcome-dm-messages', [InstagramProfileApiController::class, 'updateWelcomeDmMessages']);
        Route::delete('/user/integrations/instagram/{id}', [InstagramProfileApiController::class, 'disconnectAccount']);

        // Publishing Calendar & Content Scheduler API
        Route::get('/instagram/media', [MediaApiController::class, 'index']);
        Route::post('/instagram/media', [MediaApiController::class, 'store']);
        Route::delete('/instagram/media/{id}', [MediaApiController::class, 'destroy']);
        Route::get('/instagram/calendar', [ContentSchedulerApiController::class, 'index']);
        Route::patch('/instagram/calendar/{id}', [ContentSchedulerApiController::class, 'update']);
        Route::get('/instagram/scheduler', [ContentSchedulerApiController::class, 'index']);
        Route::post('/instagram/scheduler', [ContentSchedulerApiController::class, 'store']);
        Route::delete('/instagram/scheduler/{id}', [ContentSchedulerApiController::class, 'destroy']);
        Route::post('/instagram/scheduler/{id}/retry', [ContentSchedulerApiController::class, 'retry']);
        Route::post('/instagram/notes', [ContentSchedulerApiController::class, 'storeNote']);
        Route::patch('/instagram/notes/{id}', [ContentSchedulerApiController::class, 'updateNote']);
        Route::delete('/instagram/notes/{id}', [ContentSchedulerApiController::class, 'destroyNote']);
        Route::get('/instagram/hashtags', [ContentSchedulerApiController::class, 'hashtags']);

        // AutoDM Engine API
        Route::get('/instagram/autodm', [AutoDmApiController::class, 'index']);
        Route::post('/instagram/autodm', [AutoDmApiController::class, 'store']);
        Route::get('/instagram/autodm/templates', [AutoDmApiController::class, 'templates']);
        Route::get('/instagram/autodm/media/{accountId}', [AutoDmApiController::class, 'fetchMedia']);
        Route::get('/instagram/autodm/{id}', [AutoDmApiController::class, 'show']);
        Route::patch('/instagram/autodm/{id}', [AutoDmApiController::class, 'update']);
        Route::put('/instagram/autodm/{id}', [AutoDmApiController::class, 'update']);
        Route::delete('/instagram/autodm/{id}', [AutoDmApiController::class, 'destroy']);
        Route::post('/instagram/autodm/{id}/duplicate', [AutoDmApiController::class, 'duplicate']);

        // Analytics API
        Route::get('/instagram/analytics', [InstagramAnalyticsApiController::class, 'index']);
        Route::post('/instagram/analytics/sync', [InstagramAnalyticsApiController::class, 'sync']);

        // Lead Capture Forms API
        Route::get('/lead-forms', [LeadFormApiController::class, 'index']);
        Route::post('/lead-forms', [LeadFormApiController::class, 'store']);
        Route::get('/lead-forms/{id}', [LeadFormApiController::class, 'show']);
        Route::put('/lead-forms/{id}', [LeadFormApiController::class, 'update']);
        Route::patch('/lead-forms/{id}', [LeadFormApiController::class, 'update']);
        Route::post('/lead-forms/{id}/publish', [LeadFormApiController::class, 'togglePublish']);
        Route::delete('/lead-forms/{id}', [LeadFormApiController::class, 'destroy']);
        Route::get('/lead-forms/{id}/submissions', [LeadFormApiController::class, 'submissions']);
        Route::get('/lead-forms/{id}/submissions/export', [LeadFormApiController::class, 'exportSubmissions']);
        Route::post('/lead-forms/{id}/cover', [LeadFormApiController::class, 'uploadCover']);
        Route::delete('/lead-forms/{id}/cover', [LeadFormApiController::class, 'removeCover']);

        // Web Pages & Templates Management API
        Route::post('/web-pages', [WebPageApiController::class, 'store']);
        Route::get('/web-pages/{id}', [WebPageApiController::class, 'show']);
        Route::put('/web-pages/{id}', [WebPageApiController::class, 'update']);
        Route::patch('/web-pages/{id}/publish', [WebPageApiController::class, 'togglePublish']);
        Route::delete('/web-pages/{id}', [WebPageApiController::class, 'destroy']);
    });

    // 2. Public Lead Forms (Unauthenticated, Throttled)
    Route::get('/public/forms/{publicId}', [PublicFormApiController::class, 'show'])->middleware('throttle:100,1');
    Route::post('/public/forms/{publicId}/submit', [PublicFormApiController::class, 'submit'])->middleware('throttle:40,1');

    // 3. Public Web Pages (Unauthenticated, Throttled)
    Route::get('/public/web-pages/{username}/{slug}', [WebPageApiController::class, 'publicShow'])->middleware('throttle:120,1');
    Route::get('/public/web-pages/{username}/{slug}/click/{blockId}', [WebPageApiController::class, 'publicClick'])->middleware('throttle:120,1');
    Route::post('/public/web-pages/{username}/{slug}/submit/{blockId}', [WebPageApiController::class, 'publicSubmit'])->middleware('throttle:40,1');

    // 3. Meta Webhook Verification & Listener
    Route::get('/webhooks/instagram', [MetaWebhookController::class, 'verify']);
    Route::post('/webhooks/instagram', [MetaWebhookController::class, 'handle']);
});

// Meta Platform Compliance Endpoints
Route::post('/meta/deauthorize', [MetaPlatformController::class, 'deauthorize'])->name('meta.deauthorize');
Route::post('/meta/data-deletion', [MetaPlatformController::class, 'dataDeletion'])->name('meta.data-deletion');
