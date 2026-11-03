<?php

namespace Tests\Unit\Services\ScriptResearch;

use App\Services\ScriptResearch\TopicNormalizer;
use PHPUnit\Framework\TestCase;

class TopicNormalizerTest extends TestCase
{
    public function test_comparison_phrasings_share_a_canonical_subject_set(): void
    {
        $normalizer = new TopicNormalizer;

        $versus = $normalizer->normalize('ChatGPT vs Gemini');
        $difference = $normalizer->normalize('Difference between Gemini and ChatGPT');
        $comparison = $normalizer->normalize('Gemini ChatGPT comparison');

        $this->assertTrue($versus['comparison_topic']);
        $this->assertSame('chatgpt | gemini', $versus['normalized_topic']);
        $this->assertSame($versus['normalized_topic'], $difference['normalized_topic']);
        $this->assertSame($versus['normalized_topic'], $comparison['normalized_topic']);
    }

    public function test_intent_suggestion_is_predictable(): void
    {
        $normalizer = new TopicNormalizer;

        $this->assertSame('news', $normalizer->suggestIntent('Latest AI announcement today'));
        $this->assertSame('trend', $normalizer->suggestIntent('Why this editing trend is viral'));
        $this->assertSame('investigative', $normalizer->suggestIntent('Investigate the truth about exports'));
        $this->assertSame('opinion', $normalizer->suggestIntent('Why I think founders should wait'));
        $this->assertSame('educational', $normalizer->suggestIntent('How neural networks work'));
    }

    public function test_intent_suggestion_uses_the_complete_brief(): void
    {
        $normalizer = new TopicNormalizer;

        $this->assertSame('investigative', $normalizer->suggestIntent('AI coaching tools', [
            'primary_problem' => 'Unverified performance claims',
            'proof_points' => 'Fact check the evidence behind the claim.',
            'objective' => 'build_authority',
        ]));
        $this->assertSame('trend', $normalizer->suggestIntent('Creator workflows', [
            'objective' => 'go_viral',
            'supporting_information' => 'Cover the growing viral editing trend.',
        ]));
        $this->assertSame('educational', $normalizer->suggestIntent('Lead follow-up systems', [
            'objective' => 'build_authority',
            'key_points' => 'Explain a practical step-by-step framework.',
        ]));
    }
}
