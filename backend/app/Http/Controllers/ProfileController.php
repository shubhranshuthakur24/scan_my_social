<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        return Redirect::route('settings');
    }

    public function uploadAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ]);

        $user = $request->user();
        $disk = (string) config('filesystems.upload_disk', 'public');
        $avatar = $request->file('avatar');

        Log::info('Profile avatar upload starting.', [
            'user_id' => $user->id,
            'disk' => $disk,
            'original_name' => $avatar?->getClientOriginalName(),
            'mime_type' => $avatar?->getClientMimeType(),
            'size' => $avatar?->getSize(),
        ]);

        try {
            $this->deleteManagedImage($user->avatar_url);

            $path = $avatar->store("profile-avatars/{$user->id}", $disk);
            $url = Storage::disk($disk)->url($path);

            $user->update([
                'avatar_url' => $url,
            ]);

            Log::info('Profile avatar upload completed.', [
                'user_id' => $user->id,
                'disk' => $disk,
                'path' => $path,
                'url' => $url,
            ]);
        } catch (\Throwable $exception) {
            Log::error('Profile avatar upload failed.', [
                'user_id' => $user->id,
                'disk' => $disk,
                'error' => $exception->getMessage(),
                'exception' => $exception::class,
            ]);

            throw $exception;
        }

        return back()->with('success', 'Avatar uploaded.');
    }

    public function removeAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();
        $this->deleteManagedImage($user->avatar_url);

        $user->update(['avatar_url' => null]);

        return back()->with('success', 'Avatar removed.');
    }

    /**
     * Update the user's communication and product preferences.
     */
    public function updatePreferences(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'notif_product' => ['sometimes', 'boolean'],
            'notif_digest' => ['sometimes', 'boolean'],
            'notif_inapp' => ['sometimes', 'boolean'],
        ]);

        $preferences = (array) ($request->user()->preferences ?? []);

        foreach (['notif_product', 'notif_digest', 'notif_inapp'] as $key) {
            if (array_key_exists($key, $validated)) {
                $preferences[$key] = (bool) $validated[$key];
            }
        }

        $request->user()->update([
            'preferences' => $preferences,
        ]);

        return back()->with('status', 'preferences-updated');
    }

    /**
     * Delete the user's account.
     */
    public function destroy(Request $request): RedirectResponse
    {
        if (! is_null($request->user()->password)) {
            $request->validate([
                'password' => ['required', 'current_password'],
            ]);
        } else {
            $request->validate([
                'confirm_text' => ['required', 'in:CONFIRM'],
            ]);
        }

        $user = $request->user();

        Auth::logout();

        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        // Force GET follow-up after DELETE to avoid method carry-over on redirects.
        return Redirect::route('login', [], 303);
    }

    private function deleteManagedImage(?string $imageUrl): void
    {
        if (! $imageUrl) {
            return;
        }

        foreach ($this->imageDeletableDisks() as $disk) {
            $resolvedPath = $this->resolveDiskPath($imageUrl, $disk);

            if ($resolvedPath !== null) {
                Storage::disk($disk)->delete($resolvedPath);

                return;
            }
        }
    }

    /**
     * @return array<int, string>
     */
    private function imageDeletableDisks(): array
    {
        return array_values(array_unique([
            (string) config('filesystems.upload_disk', 'public'),
            'r2',
            'public',
        ]));
    }

    private function resolveDiskPath(string $fileUrl, string $disk): ?string
    {
        if ($disk === 'public') {
            $publicPath = '/storage/';
            if (str_starts_with($fileUrl, $publicPath)) {
                return ltrim(Str::after($fileUrl, $publicPath), '/');
            }
        }

        if (! filter_var($fileUrl, FILTER_VALIDATE_URL)) {
            return null;
        }

        $diskBaseUrl = rtrim((string) Storage::disk($disk)->url(''), '/');
        if ($diskBaseUrl === '' || ! str_starts_with($fileUrl, $diskBaseUrl)) {
            return null;
        }

        $relativePath = ltrim(Str::after($fileUrl, $diskBaseUrl), '/');

        return $relativePath === '' ? null : $relativePath;
    }
}
