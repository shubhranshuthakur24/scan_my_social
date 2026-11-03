<?php

namespace Tests\Unit\Services\ScriptIntelligence;

use App\Services\ScriptIntelligence\TranscriptPreprocessor;
use Tests\TestCase;

class TranscriptPreprocessorTest extends TestCase
{
    public function test_it_preprocesses_transcript_and_extracts_markers(): void
    {
        $service = new TranscriptPreprocessor;
        $result = $service->preprocess('First, stop doing this. But if you want growth, comment below! Google tested this.');

        $this->assertSame('First, stop doing this. But if you want growth, comment below! Google tested this.', $result['transcript_cleaned']);
        $this->assertCount(3, $result['sentence_list']);
        $this->assertSame(3, $result['sentence_metrics']['sentence_count']);
        $this->assertNotEmpty($result['markers']['numbered_structure']);
        $this->assertContains('comment', $result['markers']['cta_keywords']);
        $this->assertContains('google', $result['markers']['authority_keywords']);
        $this->assertContains('but', $result['markers']['contrast_keywords']);
    }
}
