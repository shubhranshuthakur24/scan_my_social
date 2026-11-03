<?php

namespace Tests\Feature;

use App\Services\AutodmDeeplinkService;
use Tests\TestCase;

class AutodmDeeplinkServiceTest extends TestCase
{
    public function test_rewrite_links_always_replaces_plain_urls_with_deeplink(): void
    {
        config()->set('services.autodm.deeplink_base_url', 'https://tracking.example.com');

        $service = app(AutodmDeeplinkService::class);
        $originalUrl = 'https://example.com/very/long/path?utm_source=test&utm_medium=dm&utm_campaign=spring';
        $rewritten = $service->rewriteLinksInText(
            'Read this: '.$originalUrl,
            12,
            34
        );

        $this->assertStringContainsString('https://tracking.example.com/r/', $rewritten);
        $this->assertStringNotContainsString($originalUrl, $rewritten);
    }

    public function test_rewrite_links_does_not_double_wrap_existing_deeplink(): void
    {
        config()->set('services.autodm.deeplink_base_url', 'https://tracking.example.com');

        $service = app(AutodmDeeplinkService::class);
        $deeplink = $service->build(12, 34, 'https://example.com/resource');
        $text = 'Existing link: '.$deeplink;
        $rewritten = $service->rewriteLinksInText($text, 12, 34);

        $this->assertSame($text, $rewritten);
    }
}
