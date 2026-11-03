<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenRouterService
{
    protected string $apiKey;

    protected string $defaultModel;

    protected string $baseUrl = 'https://openrouter.ai/api/v1';

    public function __construct()
    {
        $this->apiKey = config('services.openrouter.api_key');
        $this->defaultModel = config('services.openrouter.default_model');
    }

    /**
     * Send chat completion request to OpenRouter
     */
    public function chat(array $messages, ?string $model = null, ?array $responseFormat = null): array
    {
        $payload = [
            'model' => $model ?? $this->defaultModel,
            'messages' => $messages,
        ];

        if ($responseFormat) {
            $payload['response_format'] = $responseFormat;
        }

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$this->apiKey}",
            'HTTP-Referer' => config('app.url'),
            'X-Title' => config('app.name'),
        ])->post("{$this->baseUrl}/chat/completions", $payload);

        if (! $response->successful()) {
            Log::error('OpenRouter API Error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \Exception('OpenRouter API Error: '.$response->body());
        }

        return $response->json();
    }

    /**
     * Analyze Instagram Reel content structure
     */
    public function analyzeContent(string $transcript, ?string $model = null): array
    {
        $messages = [
            [
                'role' => 'system',
                'content' => 'You are an expert social media content analyst specializing in Instagram Reels and short-form video. You understand viral content mechanics, audience psychology, and creator strategies. Output ONLY valid JSON with no markdown, no explanation, and no backticks.',
            ],
            [
                'role' => 'user',
                'content' => "Analyze the following Instagram Reel transcript and determine its content structure.

For each field, provide detailed analysis (not single words):
- topic: The core subject matter and specific angle
- contentType: Format type (tutorial, storytelling, listicle, motivational, educational, product review, etc.)
- intent: What the creator wants the viewer to DO after watching (follow, comment, buy, share, save, etc.)
- tone: Conversational style (casual, authoritative, urgent, humorous, inspirational, etc.) with specific descriptors
- audience: Who this is specifically made for (demographics, interests, pain points)
- styleNotes: Specific linguistic patterns, hook style, pacing cues, language mixing (e.g. Hinglish), CTA patterns

Transcript:
{$transcript}

Create a detailed reproduction blueprint based on the analysis:

- contentAngle: A template for the angle (e.g. 'Expose a hidden tool that solves [pain point] for [audience]')
- openingPattern: Exact hook formula with placeholders
- flowStructure: Beat-by-beat structure with timing (e.g. '0-3s: Pattern interrupt, 3-10s: Problem setup')
- retentionTriggers: Specific techniques used to keep viewers watching (open loops, curiosity gaps, tonal shifts)
- emotionalArc: The emotional journey (e.g. frustration > curiosity > excitement > urgency)
- ctaFormula: The call-to-action template with placeholders
- doNotChange: Elements critical to the format's success that must be preserved
- languageStyle: Language mixing pattern (e.g. 'Hinglish with technical terms in English')
- languageUsed: Primary language used in transcript

Return ONLY this JSON:
{
  \"contentAngle\": \"\",
  \"openingPattern\": \"\",
  \"flowStructure\": \"\",
  \"retentionTriggers\": \"\",
  \"emotionalArc\": \"\",
  \"ctaFormula\": \"\",
  \"doNotChange\": \"\",
  \"languageStyle\": \"\",
  \"languageUsed\": \"\"
}",
            ],
        ];

        $response = $this->chat($messages, $model, ['type' => 'json_object']);

        return json_decode($response['choices'][0]['message']['content'], true);
    }

    /**
     * Perform deep strategic analysis of content for the Video Details page
     */
    public function analyzeStrategy(string $transcript): array
    {
        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a master content strategist for high-growth short-form video. You analyze content through the lens of psychology, structure, and viral mechanics. Output ONLY valid JSON.',
            ],
            [
                'role' => 'user',
                'content' => "Analyze the following transcript to extract its strategic DNA. 
                
                Transcript:
                {$transcript}

                Return ONLY this JSON structure with detailed strategic insights:
                {
                    \"hook\": \"Detailed analysis of the opening hook strategy used\",
                    \"content_angle\": \"The unique perspective or conceptual frame of the video\",
                    \"psychological_driver\": \"The core human desire or bias triggered (e.g., status seeking, loss aversion, curiosity gap)\",
                    \"structure_model\": \"The rhythmic or logical model used (e.g., Problem-Agitate-Solution, Listicle, Reveal)\",
                    \"mechanism_type\": \"The way the value is delivered (e.g., Screencast, Talking Head, B-roll with VO)\",
                    \"insight_shift\": \"The specific 'aha' moment or shift in viewer perspective provided\",
                    \"rhythm_profile\": \"Description of the pacing, beat structure, and flow transitions\",
                    \"cta_type\": \"The strategic approach to the closing (e.g., Direct, Curiosity-based, Subtle)\",
                    \"closure_type\": \"How the video ends to maximize memorability or loops\",
                    \"archetype\": \"The creator persona being used (e.g., The Expert, The Rebel, The Curated Researcher, The Everyday Hero)\"
                }",
            ],
        ];

        // Explicitly use Gemini as requested
        $response = $this->chat($messages, 'openrouter/google/gemini-2.5-flash', ['type' => 'json_object']);

        return json_decode($response['choices'][0]['message']['content'], true);
    }

    /**
     * Generate new script based on blueprint
     */
    public function generateScript(array $blueprint, ?string $model = null): array
    {
        $blueprintJson = json_encode($blueprint, JSON_PRETTY_PRINT);

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a viral Instagram Reels scriptwriter who specializes in Hinglish content for the Indian tech/business audience. You write scripts that feel natural when spoken aloud and are optimized for short-form video retention. Output ONLY valid JSON with no markdown, no explanation, and no backticks.',
            ],
            [
                'role' => 'user',
                'content' => "Using the blueprint below, write a COMPLETELY NEW Instagram Reel script on a FRESH topic within the same niche.

RULES:
1. Follow the blueprint's structure, timing, and emotional arc EXACTLY
2. Match the language style (Hinglish/English mix) from the blueprint
3. Include a strong hook in the first 3 seconds
4. Include a clear CTA following the blueprint's CTA formula
5. Keep the script length appropriate for a 30-60 second Reel
6. Write it as spoken word with natural speech patterns
7. Add [PAUSE], [EMPHASIS], and [VISUAL CUE] markers where appropriate
8. Use the language for script used in languageUsed

Blueprint:
{$blueprintJson}

Return ONLY this JSON:
{
  \"script\": \"\",
  \"suggestedTopic\": \"\",
  \"estimatedDuration\": \"\",
  \"hookType\": \"\"
}",
            ],
        ];

        $response = $this->chat($messages, $model, ['type' => 'json_object']);

        return json_decode($response['choices'][0]['message']['content'], true);
    }

    /**
     * Review and improve generated script
     */
    public function reviewScript(string $script, ?string $model = null): array
    {
        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a senior content quality reviewer for Instagram Reels. You evaluate scripts for viral potential, audience engagement, and production readiness. Be critical but constructive. Output ONLY valid JSON with no markdown, no explanation, and no backticks.',
            ],
            [
                'role' => 'user',
                'content' => "Review and rate the following Instagram Reel script.

Script:
{$script}

STRICT RULES:
- Output ONLY valid JSON
- No markdown, no explanations, no extra text
- No emojis
- No timestamps
- No audio or time keys
- revisedScript must be natural spoken language suitable for ElevenLabs voice generation
- If any score would be below 9, rewrite the script to improve it and then rescore
- Rate each dimension HONESTLY from 1 to 10. Do NOT inflate scores.

Rate each dimension from 1 to 10:
- hookStrength
- retention
- clarity
- authenticity
- ctaEffectiveness
- viralPotential

Return EXACTLY this JSON structure and nothing else:

{
  \"overallScore\": 7.5,
  \"scores\": {
    \"hookStrength\": 9,
    \"retention\": 9,
    \"clarity\": 9,
    \"authenticity\": 9,
    \"ctaEffectiveness\": 9,
    \"viralPotential\": 9
  },
  \"strengths\": [],
  \"improvements\": [],
  \"revisedScript\": \"\"
}",
            ],
        ];

        $response = $this->chat($messages, $model, ['type' => 'json_object']);

        return json_decode($response['choices'][0]['message']['content'], true);
    }

    /**
     * Switch AI provider (backend only)
     */
    public function switchModel(string $provider): void
    {
        $models = config('services.openrouter.models');

        if (! isset($models[$provider])) {
            throw new \Exception("Invalid AI provider: {$provider}");
        }

        $this->defaultModel = $models[$provider];
    }
}
