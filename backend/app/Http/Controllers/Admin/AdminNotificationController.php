<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\SendAdminNotificationRequest;
use App\Models\AdminNotificationLog;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\AppNotification;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;
use Inertia\Response;

class AdminNotificationController extends Controller
{
    /**
     * Display the admin notification dashboard.
     */
    public function index(): Response
    {
        $users = User::query()
            ->select('id', 'name', 'email')
            ->with(['subscriptions' => fn ($q) => $q->latest()->limit(1)])
            ->orderBy('name')
            ->get()
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'plan' => $user->subscriptions->first()?->name ?? 'none',
            ]);

        $plans = Subscription::query()
            ->select('name')
            ->distinct()
            ->pluck('name')
            ->values();

        $logs = AdminNotificationLog::query()
            ->with('admin:id,name')
            ->latest()
            ->limit(50)
            ->get();

        return Inertia::render('Admin/Notifications', [
            'users' => $users,
            'plans' => $plans,
            'logs' => $logs,
        ]);
    }

    /**
     * Send a notification to the selected target audience.
     */
    public function send(SendAdminNotificationRequest $request)
    {
        $validated = $request->validated();
        $targetType = $validated['target_type'];

        $recipients = match ($targetType) {
            'individual' => User::whereIn('id', $validated['user_ids'])->get(),
            'plan' => User::whereHas('subscriptions', fn ($q) => $q->where('name', $validated['plan_name']))->get(),
            'all' => User::all(),
        };

        if ($recipients->isEmpty()) {
            return back()->withErrors(['target_type' => 'No users matched the selected target.']);
        }

        Notification::send($recipients, new AppNotification(
            title: $validated['title'],
            message: $validated['message'],
            type: $validated['type'],
            actionUrl: $validated['action_url'] ?? null,
        ));

        $targetFilter = match ($targetType) {
            'individual' => implode(',', $validated['user_ids']),
            'plan' => $validated['plan_name'],
            'all' => null,
        };

        AdminNotificationLog::create([
            'admin_id' => $request->user()->id,
            'target_type' => $targetType,
            'target_filter' => $targetFilter,
            'recipient_count' => $recipients->count(),
            'title' => $validated['title'],
            'message' => $validated['message'],
            'type' => $validated['type'],
            'action_url' => $validated['action_url'] ?? null,
        ]);

        return back()->with('success', "Notification sent to {$recipients->count()} user(s).");
    }
}
