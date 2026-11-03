<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class WatchlistWebController extends Controller
{
    public function index(Request $request)
    {
        $watchlists = $request->user()
            ->watchlists()
            ->withCount('channels')
            ->latest()
            ->get([
                'id',
                'name',
                'description',
                'is_favorite',
                'updated_at',
            ]);

        return Inertia::render('Watchlists/Index', [
            'watchlists' => $watchlists,
        ]);
    }

    public function show($id)
    {
        // Verify ownership   will 404 if watchlist doesn't belong to user
        auth()->user()->watchlists()->findOrFail($id);

        return Inertia::render('Watchlists/Show', ['id' => $id]);
    }
}
