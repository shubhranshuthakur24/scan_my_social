<?php

namespace Tests\Feature;

use App\Models\AutomationFlow;
use App\Models\AutomationFlowMessage;
use App\Models\InstagramAccount;
use App\Models\User;
use App\Services\AutodmDeeplinkService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AutodmDeeplinkRedirectTest extends TestCase
{
    use RefreshDatabase;

    public function test_valid_signed_deeplink_redirects_and_tracks_click(): void
    {
        $user = User::factory()->create();
        $account = InstagramAccount::create([
            'user_id' => $user->id,
            'ig_account_id' => 'ig_123',
            'fb_page_id' => 'page_123',
            'username' => 'creator',
            'access_token' => 'token',
            'status' => 'active',
        ]);

        $flow = AutomationFlow::create([
            'user_id' => $user->id,
            'instagram_account_id' => $account->id,
            'name' => 'Test Flow',
            'trigger_type' => 'post',
            'trigger_value' => '123',
            'trigger_media_url' => null,
            'keywords' => ['test'],
            'opening_message_enabled' => false,
            'status' => 'active',
        ]);

        $message = AutomationFlowMessage::create([
            'automation_flow_id' => $flow->id,
            'message_type' => 'reply',
            'message_text' => 'Check this',
            'is_active' => true,
        ]);

        $service = app(AutodmDeeplinkService::class);
        $url = $service->build($flow->id, $message->id, 'https://example.com/resource');

        $response = $this->get($url, [
            'REMOTE_ADDR' => '203.0.113.10',
            'HTTP_USER_AGENT' => 'PHPUnit Test Agent',
        ]);

        $response->assertRedirect('https://example.com/resource');
        $response->assertHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
        $response->assertHeaderContains('Cache-Control', 'no-store');

        $this->assertDatabaseHas('autodm_link_clicks', [
            'automation_flow_id' => $flow->id,
            'automation_flow_message_id' => $message->id,
            'target_url' => 'https://example.com/resource',
            'ip' => '203.0.113.10',
            'user_agent' => 'PHPUnit Test Agent',
        ]);
    }

    public function test_tampered_signature_is_rejected(): void
    {
        $payload = Crypt::encryptString(json_encode([
            'url' => 'https://example.com/resource',
            'flow_id' => 1,
            'message_id' => 1,
            'created_at' => time(),
        ], JSON_UNESCAPED_SLASHES));

        $url = URL::signedRoute('autodm.deeplink.redirect', ['payload' => $payload]);
        $tampered = $url.'tamper';

        $response = $this->get($tampered);

        $response->assertForbidden();
    }
}
