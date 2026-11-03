<?php

namespace Tests\Unit\Services\ScriptResearch;

use App\Services\ScriptResearch\ResearchConfidenceService;
use PHPUnit\Framework\TestCase;

class ResearchConfidenceServiceTest extends TestCase
{
    public function test_confidence_uses_the_configured_weighting_and_labels(): void
    {
        $service = new ResearchConfidenceService;
        $score = $service->score([
            ['authority_score' => 90, 'freshness_score' => 1],
            ['authority_score' => 80, 'freshness_score' => 0.8],
            ['authority_score' => 70, 'freshness_score' => 0.6],
        ], 0.8);

        $this->assertSame(82, $score);
        $this->assertSame('high', $service->label($score));
        $this->assertSame('medium', $service->label(60));
        $this->assertSame('low', $service->label(59));
        $this->assertSame(0, $service->score([]));
    }
}
