<?php

namespace App\Http\Controllers;

use App\Services\PlanService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ChannelWebController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        $untrackLimit = PlanService::channelUntrackLimit();
        $usedUntracks = (int) $user->channel_untrack_count;

        return Inertia::render('Channels/Channels', [
            'channels' => Inertia::defer(fn () => $user->channels()
                ->select([
                    'channels.id',
                    'channels.handle',
                    'channels.name',
                    'channels.platform',
                    'channels.bio',
                    'channels.profile_image_url',
                    'channels.followers_count',
                    'channels.posts_count',
                    'channels.follows_count',
                    'channels.is_private',
                    'channels.is_verified',
                    'channels.is_business',
                    'channels.apify_profile_run_status',
                    'channels.apify_post_run_status',
                ])
                ->latest('channel_users.created_at')
                ->simplePaginate(50)
                ->toArray()),

            'untrackPolicy' => [
                'limit' => $untrackLimit,
                'used' => $usedUntracks,
                'remaining' => max(0, $untrackLimit - $usedUntracks),
            ],

            'watchlists' => $user->watchlists()
                ->with([
                    'channels' => function ($query) {
                        $query->select('channels.id', 'channels.profile_image_url', 'channels.platform');
                    },
                ])
                ->withCount('channels')
                ->latest()
                ->get(),
        ]);
    }

    public function create()
    {
        return Inertia::render('Channels/Create');
    }
}
