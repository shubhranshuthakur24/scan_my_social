<?php

namespace Tests\Unit\Services\ScriptIntelligence;

use App\Services\ScriptIntelligence\ScriptAnalysisOrchestrator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ScriptAnalysisOrchestratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_whitelisted_dashboard_and_analysis_output(): void
    {
        /** @var ScriptAnalysisOrchestrator $orchestrator */
        $orchestrator = $this->app->make(ScriptAnalysisOrchestrator::class);

        $result = $orchestrator->analyze(
            'Most people think posting daily works, but it does not. Try this 3-step framework instead. '
            .'Step 1 identify the retention leak. Step 2 fix your hook. Step 3 tighten the CTA. '
            .'Follow for part 2.'
        );

        $this->assertArrayHasKey('dashboard', $result);
        $this->assertArrayHasKey('analysis', $result);
        $this->assertArrayHasKey('pattern_dna', $result);

        $analysis = $result['analysis'];

        $this->assertContains($analysis['script_type'], config('script_intelligence.script_types'));
        $this->assertContains($analysis['psychological_driver'], config('script_intelligence.psychological_drivers'));
        $this->assertContains($analysis['cta_type'], config('script_intelligence.cta_types'));
        $this->assertContains($analysis['closure_type'], config('script_intelligence.closure_types'));
        $this->assertNotEmpty($analysis['transcript_hash']);
    }
}
