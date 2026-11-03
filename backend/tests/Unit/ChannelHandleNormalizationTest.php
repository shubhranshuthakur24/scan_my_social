<?php

namespace Tests\Unit;

use App\Services\ChannelService;
use PHPUnit\Framework\TestCase;

class ChannelHandleNormalizationTest extends TestCase
{
    private ChannelService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new ChannelService;
    }

    public function test_it_normalizes_handles_with_at_prefix(): void
    {
        $result = $this->service->normalizeAndValidate('@mrbeast', 'instagram');
        $this->assertTrue($result['valid']);
        $this->assertEquals('mrbeast', $result['handle']);
    }

    public function test_it_normalizes_handles_without_at_prefix(): void
    {
        $result = $this->service->normalizeAndValidate('mrbeast', 'instagram');
        $this->assertTrue($result['valid']);
        $this->assertEquals('mrbeast', $result['handle']);
    }

    public function test_it_normalizes_urls_to_handles(): void
    {
        $result = $this->service->normalizeAndValidate('https://www.instagram.com/mrbeast/', 'instagram');
        $this->assertTrue($result['valid']);
        $this->assertEquals('mrbeast', $result['handle']);
    }

    public function test_it_rejects_invalid_platforms(): void
    {
        $result = $this->service->normalizeAndValidate('@mrbeast', 'tiktok');
        $this->assertFalse($result['valid']);
        $this->assertEquals('invalid_platform', $result['reason']);
    }

    public function test_it_rejects_empty_input(): void
    {
        $result = $this->service->normalizeAndValidate('', 'instagram');
        $this->assertFalse($result['valid']);
        $this->assertEquals('invalid_format', $result['reason']);
    }

    public function test_it_rejects_invalid_handle_characters(): void
    {
        $result = $this->service->normalizeAndValidate('@mr beast', 'instagram');
        $this->assertFalse($result['valid']);
        $this->assertEquals('invalid_format', $result['reason']);
    }
}
