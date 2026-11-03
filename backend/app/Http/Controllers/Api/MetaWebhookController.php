<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\ProcessMetaWebhookJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MetaWebhookController extends Controller
{
    /**
     * ✅ Meta Webhook Verification (GET)
     */
    public function verify(Request $request)
    {
        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === config('services.meta.verify_token')) {
            Log::info('Meta Webhook: Verification success');

            return response($challenge, 200);
        }

        Log::warning('Meta Webhook: Verification failed', [
            'mode' => $mode,
            'token_present' => $token !== null && $token !== '',
        ]);

        return response('Forbidden', 403);
    }

    /**
     * ✅ Receive Webhook Events (POST)
     */
    public function handle(Request $request)
    {
        $jsonPayload = $request->getContent();
        $signature = (string) $request->header('X-Hub-Signature-256', '');
        $appSecret = (string) config('services.meta.app_secret', '');

        if ($appSecret === '') {
            Log::error('Meta Webhook: Missing app secret configuration');

            return response('Server misconfigured', 500);
        }

        if ($signature === '') {
            Log::warning('Meta Webhook: Missing signature header');

            return response('Invalid signature', 403);
        }

        $expectedSignature = 'sha256='.hash_hmac('sha256', $jsonPayload, $appSecret);

        if (! hash_equals($expectedSignature, $signature)) {
            Log::warning('Meta Webhook: Signature mismatch');

            return response('Invalid signature', 403);
        }

        $payload = json_decode($jsonPayload, true);

        if (! $payload || ($payload['object'] ?? null) !== 'instagram') {
            Log::warning('Meta Webhook: Invalid payload', [
                'object' => $payload['object'] ?? null,
                'entry_count' => is_array($payload['entry'] ?? null) ? count($payload['entry']) : 0,
            ]);

            return response('EVENT_RECEIVED', 200);
        }

        $entries = $payload['entry'] ?? [];

        Log::info('Meta Webhook: Received raw event payload from Meta', [
            'object' => $payload['object'],
            'entry_count' => count($entries),
            'payload' => $payload,
        ]);

        foreach ($entries as $entry) {

            $entryId = $entry['id'] ?? 'unknown';

            foreach ($entry['changes'] ?? [] as $change) {
                $field = $change['field'] ?? 'unknown';
                $value = $change['value'] ?? [];
                $commentId = $field === 'comments'
                    ? ($value['comment_id'] ?? $value['id'] ?? null)
                    : null;
                $eventId = $value['event_id']
                    ?? $value['message']['mid']
                    ?? $value['id']
                    ?? null;

                Log::info('Meta Webhook: Dispatching change event', [
                    'entry_id' => $entryId,
                    'field' => $field,
                    'event_id' => $eventId,
                    'comment_id' => $commentId,
                    'value_id' => $value['id'] ?? null,
                    'text' => $value['text'] ?? null,
                    'from' => $value['from'] ?? null,
                    'media' => $value['media'] ?? null,
                    'postback_payload' => $value['postback']['payload'] ?? null,
                    'quick_reply_payload' => $value['message']['quick_reply']['payload'] ?? null,
                    'change_raw' => $change,
                ]);

                ProcessMetaWebhookJob::dispatch($change, $entryId);
            }

            foreach ($entry['messaging'] ?? [] as $message) {
                $eventId = $message['postback']['mid']
                    ?? $message['message']['mid']
                    ?? $message['message_edit']['mid']
                    ?? null;

                Log::info('Meta Webhook: Dispatching messaging event', [
                    'entry_id' => $entryId,
                    'event_id' => $eventId,
                    'has_postback' => isset($message['postback']),
                    'sender' => $message['sender'] ?? null,
                    'recipient' => $message['recipient'] ?? null,
                    'message' => $message['message'] ?? null,
                    'postback_payload' => $message['postback']['payload'] ?? null,
                    'quick_reply_payload' => $message['message']['quick_reply']['payload'] ?? null,
                    'messaging_raw' => $message,
                ]);

                ProcessMetaWebhookJob::dispatch(['messaging' => $message], $entryId);
            }
        }

        return response('EVENT_RECEIVED', 200);
    }
}
