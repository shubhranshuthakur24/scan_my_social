<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\InstagramAccount;
use App\Models\MetaDataDeletionRequest;
use App\Services\InstagramAccountDisconnectService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

class MetaPlatformController extends Controller
{
    public function deauthorize(Request $request, InstagramAccountDisconnectService $disconnectService): JsonResponse
    {
        $payload = $this->validatedSignedRequestPayload($request);
        $providerUserId = $this->providerUserId($payload);

        if ($providerUserId !== null) {
            $this->disconnectMatchingInstagramAccounts($providerUserId, $disconnectService);
        }

        return response()->json([
            'success' => true,
        ]);
    }

    public function dataDeletion(Request $request, InstagramAccountDisconnectService $disconnectService): JsonResponse
    {
        $payload = $this->validatedSignedRequestPayload($request);
        $providerUserId = $this->providerUserId($payload);

        if ($providerUserId !== null) {
            $this->disconnectMatchingInstagramAccounts($providerUserId, $disconnectService);
        }

        $deletionRequest = MetaDataDeletionRequest::query()->create([
            'confirmation_code' => $this->makeConfirmationCode(),
            'provider' => 'meta',
            'provider_user_id' => $providerUserId,
            'status' => 'processed',
            'payload' => $payload,
            'processed_at' => now(),
        ]);

        return response()->json([
            'url' => route('meta.data-deletion.status', $deletionRequest->confirmation_code),
            'confirmation_code' => $deletionRequest->confirmation_code,
        ]);
    }

    public function dataDeletionStatus(string $confirmationCode): JsonResponse
    {
        $deletionRequest = MetaDataDeletionRequest::query()
            ->where('confirmation_code', $confirmationCode)
            ->firstOrFail();

        return response()->json([
            'confirmation_code' => $deletionRequest->confirmation_code,
            'status' => $deletionRequest->status,
            'processed_at' => $deletionRequest->processed_at?->toIso8601String(),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function validatedSignedRequestPayload(Request $request): array
    {
        $signedRequest = trim((string) $request->input('signed_request', ''));
        if ($signedRequest === '' || ! str_contains($signedRequest, '.')) {
            abort(Response::HTTP_BAD_REQUEST, 'Missing signed request.');
        }

        $appSecret = (string) config('services.meta.app_secret', '');
        if ($appSecret === '') {
            abort(Response::HTTP_INTERNAL_SERVER_ERROR, 'Meta app secret is not configured.');
        }

        [$encodedSignature, $encodedPayload] = explode('.', $signedRequest, 2);
        $signature = $this->base64UrlDecode($encodedSignature);
        $payloadJson = $this->base64UrlDecode($encodedPayload);

        if ($signature === null || $payloadJson === null) {
            abort(Response::HTTP_BAD_REQUEST, 'Invalid signed request.');
        }

        $expectedSignature = hash_hmac('sha256', $encodedPayload, $appSecret, true);
        if (! hash_equals($expectedSignature, $signature)) {
            abort(Response::HTTP_BAD_REQUEST, 'Invalid signed request signature.');
        }

        $payload = json_decode($payloadJson, true);
        if (! is_array($payload)) {
            abort(Response::HTTP_BAD_REQUEST, 'Invalid signed request payload.');
        }

        $algorithm = strtoupper((string) ($payload['algorithm'] ?? ''));
        if ($algorithm !== '' && $algorithm !== 'HMAC-SHA256') {
            abort(Response::HTTP_BAD_REQUEST, 'Invalid signed request algorithm.');
        }

        return $payload;
    }

    private function base64UrlDecode(string $value): ?string
    {
        $remainder = strlen($value) % 4;
        if ($remainder > 0) {
            $value .= str_repeat('=', 4 - $remainder);
        }

        $decoded = base64_decode(strtr($value, '-_', '+/'), true);

        return $decoded === false ? null : $decoded;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function providerUserId(array $payload): ?string
    {
        $providerUserId = trim((string) ($payload['user_id'] ?? $payload['profile_id'] ?? ''));

        return $providerUserId !== '' ? $providerUserId : null;
    }

    private function disconnectMatchingInstagramAccounts(string $providerUserId, InstagramAccountDisconnectService $disconnectService): int
    {
        $accounts = InstagramAccount::query()
            ->where('ig_account_id', $providerUserId)
            ->orWhere('fb_page_id', $providerUserId)
            ->get();

        foreach ($accounts as $account) {
            $disconnectService->disconnect($account);
        }

        return $accounts->count();
    }

    private function makeConfirmationCode(): string
    {
        do {
            $confirmationCode = 'meta-del-'.Str::lower(Str::random(24));
        } while (MetaDataDeletionRequest::query()->where('confirmation_code', $confirmationCode)->exists());

        return $confirmationCode;
    }
}
