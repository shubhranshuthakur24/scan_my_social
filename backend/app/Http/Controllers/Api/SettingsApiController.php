<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules;

class SettingsApiController extends Controller
{
    /**
     * Get user profile & bank details settings.
     */
    public function show(Request $request): JsonResponse
    {
        $user = Auth::user();

        return response()->json([
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'bio' => $user->bio ?? '',
                'avatar' => $user->avatar_url ?? '',
                'role' => $user->role ?? 'user',
            ],
            'bankDetails' => [
                'bank_name' => $user->bank_name ?? '',
                'account_holder_name' => $user->account_holder_name ?? $user->name,
                'account_number' => $user->account_number ?? '',
                'ifsc_code' => $user->ifsc_code ?? '',
            ],
            'preferences' => $user->preferences ?? [],
        ]);
    }

    /**
     * Upload user avatar to R2 storage with automatic 400x400 center-crop resizing.
     */
    public function uploadAvatar(Request $request): JsonResponse
    {
        $request->validate([
            'avatar' => ['required', 'file', 'mimes:jpg,jpeg,png,webp', 'mimetypes:image/jpeg,image/png,image/webp,image/x-png', 'max:10240'],
        ]);

        $user = Auth::user();
        $disk = (string) config('filesystems.upload_disk', 'r2');
        $avatar = $request->file('avatar');

        // Resize image to 400x400 square before sending to cloud storage
        $resizedBinary = $this->resizeAvatarImage($avatar, 400);

        $ext = strtolower($avatar->getClientOriginalExtension()) ?: 'jpg';
        $filename = Str::random(40) . '.' . $ext;
        $path = "profile-avatars/{$user->id}/{$filename}";

        $stored = Storage::disk($disk)->put($path, $resizedBinary, 'public');
        if (!$stored) {
            return response()->json([
                'message' => 'Failed to write file to cloud storage disk.',
                'errors' => ['avatar' => ['File storage write failed. Check Cloudflare R2 credentials in .env.']],
            ], 500);
        }

        $url = Storage::disk($disk)->url($path);

        $user->update([
            'avatar_url' => $url,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Avatar uploaded successfully',
            'avatar_url' => $url,
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'bio' => $user->bio ?? '',
                'avatar' => $user->avatar_url,
                'role' => $user->role ?? 'user',
            ],
        ]);
    }

    /**
     * Center-crop and resize uploaded image to 1:1 square (400x400).
     */
    private function resizeAvatarImage(UploadedFile $file, int $targetSize = 400): string
    {
        $imageContent = file_get_contents($file->getRealPath());
        $sourceImage = @imagecreatefromstring($imageContent);

        if (!$sourceImage) {
            return $imageContent;
        }

        $width = imagesx($sourceImage);
        $height = imagesy($sourceImage);

        // Center 1:1 square crop
        $cropSize = min($width, $height);
        $cropX = (int) round(($width - $cropSize) / 2);
        $cropY = (int) round(($height - $cropSize) / 2);

        $resizedImage = imagecreatetruecolor($targetSize, $targetSize);

        // Preserve alpha channel transparency for PNG / WebP
        imagealphablending($resizedImage, false);
        imagesavealpha($resizedImage, true);
        $transparent = imagecolorallocatealpha($resizedImage, 255, 255, 255, 127);
        imagefilledrectangle($resizedImage, 0, 0, $targetSize, $targetSize, $transparent);

        imagecopyresampled(
            $resizedImage,
            $sourceImage,
            0, 0,
            $cropX, $cropY,
            $targetSize, $targetSize,
            $cropSize, $cropSize
        );

        ob_start();
        $mime = $file->getClientMimeType();
        $ext = strtolower($file->getClientOriginalExtension());

        if ($ext === 'png' || $mime === 'image/png' || $mime === 'image/x-png') {
            imagepng($resizedImage, null, 8);
        } elseif ($ext === 'webp' || $mime === 'image/webp') {
            imagewebp($resizedImage, null, 85);
        } else {
            imagejpeg($resizedImage, null, 85);
        }

        $resizedBinary = ob_get_clean();

        imagedestroy($sourceImage);
        imagedestroy($resizedImage);

        return $resizedBinary ?: $imageContent;
    }

    /**
     * Remove user avatar.
     */
    public function removeAvatar(Request $request): JsonResponse
    {
        $user = Auth::user();
        $user->update(['avatar_url' => null]);

        return response()->json([
            'success' => true,
            'message' => 'Avatar removed successfully',
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'bio' => $user->bio ?? '',
                'avatar' => '',
                'role' => $user->role ?? 'user',
            ],
        ]);
    }

    /**
     * Update user profile details.
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email,'.$user->id],
            'bio' => ['nullable', 'string', 'max:1000'],
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->bio = $validated['bio'] ?? null;
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => (string) $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'bio' => $user->bio ?? '',
                'avatar' => $user->avatar_url ?? '',
                'role' => $user->role ?? 'user',
            ],
        ]);
    }

    /**
     * Update user password.
     */
    public function updatePassword(Request $request): JsonResponse
    {
        $user = Auth::user();

        $request->validate([
            'current_password' => ['required', 'string'],
            'new_password' => ['required', 'string'],
        ]);

        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                'message' => 'The current password you entered is incorrect.',
                'errors' => ['current_password' => ['The current password you entered is incorrect.']],
            ], 422);
        }

        $request->validate([
            'new_password' => ['required', Rules\Password::defaults()],
        ]);

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json([
            'success' => true,
            'message' => 'Password updated successfully',
        ]);
    }

    /**
     * Update affiliate payout bank details.
     */
    public function updateBankDetails(Request $request): JsonResponse
    {
        $user = Auth::user();

        $validated = $request->validate([
            'bank_name' => ['required', 'string', 'max:255'],
            'account_holder_name' => ['required', 'string', 'max:255'],
            'account_number' => ['required', 'string', 'max:255'],
            'ifsc_code' => ['required', 'string', 'max:255'],
        ]);

        $user->update([
            'bank_name' => $validated['bank_name'],
            'account_holder_name' => $validated['account_holder_name'],
            'account_number' => $validated['account_number'],
            'ifsc_code' => $validated['ifsc_code'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Bank payout details updated successfully',
            'bankDetails' => [
                'bank_name' => $user->bank_name,
                'account_holder_name' => $user->account_holder_name,
                'account_number' => $user->account_number,
                'ifsc_code' => $user->ifsc_code,
            ],
        ]);
    }

    /**
     * Delete user account permanently.
     */
    public function destroy(Request $request): JsonResponse
    {
        $user = Auth::user();
        if ($user) {
            $user->tokens()->delete();
            $user->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Account deleted successfully',
        ]);
    }
}
