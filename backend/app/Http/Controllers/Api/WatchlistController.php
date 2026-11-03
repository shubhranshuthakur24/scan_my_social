<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WatchlistController extends Controller
{
    public function index(Request $request)
    {
        $watchlists = auth()->user()->watchlists()
            ->with([
                'channels' => function ($query) {
                    $query->select('channels.id', 'channels.profile_image_url', 'channels.platform');
                },
            ])
            ->withCount('channels')
            ->when($request->search, function ($q, $search) {
                $escaped = str_replace(['%', '_'], ['\\%', '\\_'], $search);
                $q->where('name', 'like', "%{$escaped}%");
            })
            ->latest()
            ->get();

        return response()->json($watchlists);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('watchlists')->where(function ($query) {
                    return $query->where('user_id', auth()->id());
                }),
            ],
            'description' => 'nullable|string',
        ]);

        $watchlist = auth()->user()->watchlists()->create([
            'name' => $request->name,
            'description' => $request->description,
        ]);

        if ($request->header('X-Inertia')) {
            return redirect()->back()->with([
                'message' => 'Watchlist created successfully.',
                'watchlist' => $watchlist,
            ]);
        }

        return response()->json($watchlist, 201);
    }

    public function show($watchlistId)
    {
        $watchlist = auth()->user()->watchlists()->findOrFail($watchlistId);
        $watchlist->load('channels');
        $watchlist->loadCount('channels');

        return response()->json($watchlist);
    }

    public function update(Request $request, $watchlistId)
    {
        $watchlist = auth()->user()->watchlists()->findOrFail($watchlistId);

        $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('watchlists')->where(function ($query) {
                    return $query->where('user_id', auth()->id());
                })->ignore($watchlist->id),
            ],
            'description' => 'nullable|string',
        ]);

        $watchlist->update($request->only(['name', 'description']));

        if ($request->header('X-Inertia')) {
            return redirect()->back()->with('message', 'Watchlist updated successfully.');
        }

        return response()->json($watchlist);
    }

    public function destroy($watchlistId)
    {
        $watchlist = auth()->user()->watchlists()->findOrFail($watchlistId);
        $watchlist->delete();

        if (request()->header('X-Inertia')) {
            return redirect()->back()->with('message', 'Watchlist deleted successfully.');
        }

        return response()->json(['message' => 'Watchlist deleted']);
    }

    public function addChannel(Request $request, $watchlistId)
    {
        $watchlist = auth()->user()->watchlists()->findOrFail($watchlistId);
        $request->validate(['channel_id' => 'required|integer|exists:channels,id']);

        $channelId = (int) $request->channel_id;
        $isTrackedByUser = auth()->user()
            ->channels()
            ->where('channels.id', $channelId)
            ->exists();

        if (! $isTrackedByUser) {
            $message = 'You can only add channels to watchlists after tracking them.';

            if ($request->header('X-Inertia')) {
                return redirect()->back()->withErrors(['channel_id' => $message]);
            }

            return response()->json([
                'error' => 'forbidden_channel_attach',
                'message' => $message,
            ], 403);
        }

        $watchlist->channels()->syncWithoutDetaching([$channelId]);

        if ($request->header('X-Inertia')) {
            return redirect()->back()->with('message', 'Channel added to watchlist.');
        }

        return response()->json(['message' => 'Channel added to watchlist']);
    }

    public function removeChannel(Request $request, $watchlistId, $channelId)
    {
        $watchlist = auth()->user()->watchlists()->findOrFail($watchlistId);
        $watchlist->channels()->detach($channelId);

        if (request()->header('X-Inertia')) {
            return redirect()->back()->with('message', 'Channel removed from watchlist.');
        }

        return response()->json(['message' => 'Channel removed from watchlist']);
    }

    public function toggleFavorite($watchlistId)
    {
        $watchlist = auth()->user()->watchlists()->findOrFail($watchlistId);
        $watchlist->update(['is_favorite' => ! $watchlist->is_favorite]);

        if (request()->header('X-Inertia')) {
            return redirect()->back()->with('message', 'Watchlist favorite status updated.');
        }

        return response()->json([
            'message' => 'Favorite status toggled',
            'is_favorite' => $watchlist->is_favorite,
        ]);
    }
}
