<?php

namespace App\Providers;

use App\Models\Channel;
use App\Models\ContentSchedulerMedia;
use App\Models\ScheduledPost;
use App\Observers\ChannelObserver;
use App\Policies\ContentSchedulerMediaPolicy;
use App\Policies\ScheduledPostPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);
        Channel::observe(ChannelObserver::class);
        Gate::policy(ContentSchedulerMedia::class, ContentSchedulerMediaPolicy::class);
        Gate::policy(ScheduledPost::class, ScheduledPostPolicy::class);

        RateLimiter::for('transcribe-post', function (Request $request) {
            $userId = (string) ($request->user()?->getKey() ?? 'guest');
            $postParameter = $request->route('post');
            $postId = is_object($postParameter) && method_exists($postParameter, 'getKey')
                ? (string) $postParameter->getKey()
                : (string) ($postParameter ?? 'unknown');

            return Limit::perMinute(5)->by("transcribe-post:{$userId}:{$postId}");
        });

        RateLimiter::for('analyze-post', function (Request $request) {
            $userId = (string) ($request->user()?->getKey() ?? $request->ip());

            return Limit::perMinute(20)->by("analyze-post:{$userId}");
        });

        RateLimiter::for('affiliate-claim-link', function (Request $request) {
            $userKey = (string) ($request->user()?->getKey() ?? $request->ip());

            return Limit::perMinute(5)->by("affiliate-claim-link:{$userKey}");
        });

        RateLimiter::for('generate-script', function (Request $request) {
            $userId = (string) ($request->user()?->getKey() ?? $request->ip());

            return Limit::perMinute(60)->by("generate-script:{$userId}");
        });

        Password::defaults(fn () => Password::min(8)
            ->letters()
            ->mixedCase()
            ->numbers()
            ->symbols());
    }
}
