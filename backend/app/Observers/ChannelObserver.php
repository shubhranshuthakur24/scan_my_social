<?php

namespace App\Observers;

use App\Models\Channel;

class ChannelObserver
{
    public function __construct() {}

    public function updated(Channel $channel): void
    {
        if (! $channel->wasChanged(['apify_profile_run_status', 'apify_post_run_status'])) {
            return;
        }

        // Cache invalidation removed because channel indexing cache is no longer used.
    }
}
