<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OpenAIService
{
    protected string $apiKey;

    protected string $model;

    protected string $baseUrl = 'https://api.openai.com/v1';

    public function __construct()
    {
        $this->apiKey = (string) config('services.openai.api_key', env('OPENAI_API_KEY', ''));
        $this->model = (string) config('services.openai.content_model', env('OPENAI_MODEL_CONTENT_ANALYSIS', 'gpt-5.4-mini'));
    }

    /**
     * Generate content using OpenAI Responses API.
     */
    public function generateContent(string $prompt, bool $jsonMode = false, float $temperature = 0.7): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('OpenAI API key is missing. Set services.openai.api_key / OPENAI_API_KEY.');
        }

        $url = "{$this->baseUrl}/responses";
        $payload = [
            'model' => $this->model,
            'temperature' => $temperature,
            'input' => [
                [
                    'role' => 'user',
                    'content' => [
                        [
                            'type' => 'input_text',
                            'text' => $prompt,
                        ],
                    ],
                ],
            ],
        ];

        if ($jsonMode) {
            $payload['text'] = [
                'format' => [
                    'type' => 'json_object',
                ],
            ];
        }

        Log::info('OpenAI API Request Payload', [
            'model' => $this->model,
            'json_mode' => $jsonMode,
        ]);

        $response = Http::withOptions([
            'verify' => app()->environment('local') ? false : true,
        ])
            ->acceptJson()
            ->asJson()
            ->withToken($this->apiKey)
            ->timeout(60)
            ->connectTimeout(60)
            ->retry(3, fn ($attempt) => pow(2, $attempt) * 1000)
            ->post($url, $payload);

        Log::info('OpenAI API Response Status: '.$response->status());

        if (! $response->successful()) {
            Log::error('OpenAI API Error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);

            $message = $response->json()['error']['message'] ?? $response->body();
            throw new \Exception('OpenAI API Error: '.$message);
        }

        $result = $response->json();
        if (! is_array($result)) {
            throw new \RuntimeException('OpenAI API Error: Invalid response payload.');
        }

        if ($jsonMode) {
            $content = $this->extractTextContent($result);
            $decoded = json_decode($content, true);

            if (! is_array($decoded)) {
                throw new \RuntimeException('OpenAI API Error: Invalid JSON content returned.');
            }

            return $decoded;
        }

        return $result;
    }

    /**
     * Run live web research and return normalized model data plus provider metadata.
     *
     * @return array{
     *   data: array<string, mixed>,
     *   sources: array<int, array<string, mixed>>,
     *   response_id: ?string,
     *   usage: array<string, mixed>,
     *   model: string
     * }
     */
    public function researchTopic(string $prompt): array
    {
        if ($this->apiKey === '') {
            throw new \RuntimeException('OpenAI API key is missing.');
        }

        $model = (string) config('script_research.model');
        $payload = [
            'model' => $model,
            'tools' => [
                ['type' => 'web_search'],
            ],
            'include' => ['web_search_call.action.sources'],
            'input' => $prompt,
        ];

        $response = Http::withOptions([
            'verify' => app()->environment('local') ? false : true,
        ])
            ->acceptJson()
            ->asJson()
            ->withToken($this->apiKey)
            ->connectTimeout(15)
            ->timeout(100)
            ->retry(2, fn (int $attempt): int => $attempt * 1000)
            ->post("{$this->baseUrl}/responses", $payload);

        if (! $response->successful()) {
            $message = $response->json('error.message') ?? $response->body();
            throw new \RuntimeException('OpenAI web research failed: '.$message);
        }

        $result = $response->json();
        if (! is_array($result)) {
            throw new \RuntimeException('OpenAI web research returned an invalid payload.');
        }

        $decoded = $this->decodeJsonText($this->extractTextContent($result));
        if (! is_array($decoded)) {
            throw new \RuntimeException('OpenAI web research did not return valid JSON.');
        }

        $usage = is_array($result['usage'] ?? null) ? $result['usage'] : [];
        $usage['web_search_calls'] = collect($result['output'] ?? [])
            ->filter(fn (mixed $item): bool => is_array($item) && ($item['type'] ?? null) === 'web_search_call')
            ->count();

        return [
            'data' => $decoded,
            'sources' => $this->extractWebSources($result),
            'response_id' => isset($result['id']) ? (string) $result['id'] : null,
            'usage' => $usage,
            'model' => isset($result['model']) ? (string) $result['model'] : $model,
        ];
    }

    /**
     * Perform deep strategic analysis of content.
     */
    private function normalizeAnalysisLanguage(?string $language): string
    {
        $normalized = strtolower(trim((string) $language));

        return match ($normalized) {
            'hindi' => 'Hindi',
            'hinglish' => 'Hinglish',
            default => 'English',
        };
    }

    public function analyzeStrategy(string $transcript, ?string $language = null): array
    {
        $language = $this->normalizeAnalysisLanguage(
            $language ?? request()->input('analysis_language', request()->header('X-Analysis-Language'))
        );

        $prompt = "Analyze the following transcript to extract its strategic DNA in compact card-friendly language.

        Output language: {$language}

        Compact style rules:
        - Keep every string concise and high-signal, suitable for a small UI card.
        - Target 90-180 characters for explanatory fields; script_flow may be up to 260 characters.
        - hook_text must be ONLY the exact opening hook line copied from the transcript in its original language. Do not translate, summarize, or add explanation to hook_text.
        - hook must be the compact explanation of why the opening hook works, written in {$language}.
        - cta_text must include the CTA and a short explanation of why it works.
        - Do not write long paragraphs.
        - Do not duplicate insight_shift_text into key_shift.
        - key_shift must be a short transformation line using this style: old belief -> new belief.
        - insight_shift_position must be one of: opening, middle, end, none.
        - authority_signals must be an array of 2-4 concrete proof/credibility signals found in the script.
        - Keep cta_text in {$language}; do not append a translation in another language.
        - If the transcript uses Hindi/Hinglish but output language is English, translate explanatory fields compactly into English, except hook_text must remain copied from the transcript.
        - If output language is Hindi or Hinglish, keep explanations in that selected language.
        
        Transcript:
        {$transcript}

        Return ONLY this JSON structure with compact strategic insights and a strength score (integer from 1-10) for each:
        {
            \"title\": \"A short, catchy title representing the analyzed video strategy (max 60 chars)\",
            \"hook\": \"Compact hook explanation in {$language}\",
            \"hook_text\": \"Exact opening hook line copied from the transcript in the original language only\",
            \"hook_type\": \"Specific hook label\",
            \"hook_score\": 1-10,
            \"content_angle\": \"Compact unique perspective or conceptual frame\",
            \"topic_angle\": \"Compact topic angle\",
            \"content_angle_score\": 1-10,
            \"psychological_driver\": \"Compact human desire or bias triggered\",
            \"psychological_driver_score\": 1-10,
            \"structure_model\": \"Compact structure model label\",
            \"script_type\": \"Specific script format label\",
            \"script_flow\": \"Compact beat chain using arrows\",
            \"structure_model_score\": 1-10,
            \"mechanism_type\": \"Compact value delivery mechanism\",
            \"mechanism_type_score\": 1-10,
            \"insight_shift\": \"Compact aha moment or perspective shift\",
            \"insight_shift_text\": \"Compact aha moment or perspective shift\",
            \"insight_shift_position\": \"opening|middle|end|none\",
            \"key_shift\": \"old belief -> new belief\",
            \"insight_shift_score\": 1-10,
            \"rhythm_profile\": \"Compact pacing and beat structure\",
            \"rhythm_profile_score\": 1-10,
            \"cta_type\": \"The strategic approach to the closing (e.g., Direct, Curiosity-based, Subtle)\",
            \"cta_text\": \"The CTA plus one compact explanation\",
            \"cta_type_score\": 1-10,
            \"closure_type\": \"Compact close/ending strategy\",
            \"closure_type_score\": 1-10,
            \"archetype\": \"The creator persona being used (e.g., The Expert, The Rebel, The Curated Researcher, The Everyday Hero)\",
            \"authority_signals\": [\"Concrete authority/proof signal\"],
            \"archetype_score\": 1-10
        }";

        return $this->generateContent($prompt, true);
    }

    /**
     * Analyze Instagram Reel content structure for blueprinting.
     */
    public function analyzeContent(string $transcript, ?string $language = null): array
    {
        $language = $this->normalizeAnalysisLanguage(
            $language ?? request()->input('analysis_language', request()->header('X-Analysis-Language'))
        );

        $prompt = "Analyze the following Instagram Reel transcript and determine its content structure.

        Output language: {$language}

        Compact style rules:
        - Keep each field concise and UI-card friendly.
        - Target 90-180 characters for explanatory fields.
        - Prefer one compact sentence unless a beat-chain is requested.
        - Keep CTA explanations in {$language}; do not append translations in another language.

        For each field, provide compact analysis (not single words, not long paragraphs):
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

        Return ONLY this JSON structure:
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
        }";

        return $this->generateContent($prompt, true);
    }

    /**
     * Generate new script based on blueprint.
     *
     * @param  array<string, mixed>  $blueprint
     */
    public function generateScript(array $blueprint): array
    {
        $blueprintJson = json_encode($blueprint, JSON_PRETTY_PRINT);
        $prompt = "Using the blueprint below, write a COMPLETELY NEW Instagram Reel script on a FRESH topic within the same niche.

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

        Return ONLY this JSON structure:
        {
            \"title\": \"A short, catchy title representing the concept (max 60 chars)\",
            \"script\": \"\",
            \"suggestedTopic\": \"\",
            \"estimatedDuration\": \"\",
            \"hookType\": \"\"
        }";

        return $this->generateContent($prompt, true);
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function generateScriptAngles(array $context): array
    {
        $contextJson = json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $count = (int) config('script_engine.angle_count', 5);
        $language = (string) ($context['language'] ?? 'English');

        $prompt = <<<PROMPT
You are a viral content strategist. Generate exactly {$count} genuinely distinct content angles from this brief:
{$contextJson}

Rules:
- Write every user-visible angle field in {$language}: title, explanation, and expected_outcome.
- English means natural English only.
- Hindi means natural Hindi in Devanagari, while retaining unavoidable brand names and technical terms.
- Hinglish means a natural conversational Hindi-English mix written in Roman script. Do not use Devanagari and do not return English-only prose.
- Do not include translations or duplicate any field in another language.
- Every angle must solve the stated audience problem and support the objective.
- Reflect the requested educate, entertain, and emotion percentages.
- Use research evidence only within its confidence and category boundaries.
- Do not repeat the same premise with different wording.
- Do not write hooks or scripts yet.

Return only JSON:
{
  "angles": [
    {
      "title": "Concise angle title",
      "explanation": "How this angle frames the topic and develops the idea",
      "expected_outcome": "The viewer response this angle is designed to create"
    }
  ]
}
PROMPT;

        return $this->generateContent($prompt, true, 0.8);
    }

    /**
     * @param  array<string, mixed>  $context
     * @return array<string, mixed>
     */
    public function generateViralScript(array $context): array
    {
        $contextJson = json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $prompt = <<<PROMPT
You are a research-aware viral content strategist. Write one production-ready script from this complete context:
{$contextJson}

Requirements:
- Follow the selected angle exactly.
- Choose hook, CTA, tone, retention structure, open loops, emotional triggers, and story flow when their mode is "ai".
- Follow the supplied manual instruction exactly when a mode is "manual".
- For single_viewer communication, speak to one person using direct language.
- For industry_commentary, sound like a clear, informed practitioner rather than a generic narrator.
- Match the requested platform format, language, and length.
- Reflect the content-mix percentages naturally.
- Use only usable verified evidence for objective factual claims.
- Treat trend signals as signals, controversies as disputed, uncertainties as uncertain, and user facts as user-provided.
- Do not expose research URLs, confidence scores, headings, markdown, or production notes in the main script.

Return only JSON:
{
  "title": "Short publishable title",
  "script": "Final spoken script or LinkedIn post copy",
  "suggested_hook": "The exact opening hook",
  "suggested_cta": "The exact CTA",
  "why_angle_works": "A concise explanation of why this angle fits the audience, problem, and objective"
}
PROMPT;

        return $this->generateContent($prompt, true, 0.75);
    }

    /**
     * Step 1: Generate a structural outline for a fresh script.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function generateScriptOutline(array $data): array
    {
        $topic = $data['topic'];
        $platform = $data['platform'];
        $audience = $data['audience'] ?? 'General';
        $tone = $data['tone'];
        $length = $data['length'];
        $language = $data['language'] ?? 'English';
        $hookInstruction = $data['hook_instruction'] ?? 'Hook the viewer in the first 3 seconds.';
        $ctaInstruction = $data['cta_instruction'] ?? 'Include a strong call to action.';
        $objectiveInstruction = $data['objective_instruction'] ?? 'Make the script engaging.';
        $comparisonInstruction = ! empty($data['comparison_topic'])
            ? 'This is a comparison topic. Use balanced criteria, make like-for-like comparisons, and avoid declaring a winner without evidence.'
            : 'This is not necessarily a comparison. Choose the clearest narrative structure for the intent.';
        $researchBrief = json_encode(
            $data['research_brief'] ?? [],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        $prompt = "You are a short-form video strategist. Create a structural outline for a {$length} {$platform} script.

        Topic: {$topic}
        Audience: {$audience}
        Tone: {$tone}
        Language: {$language}

        HOOK STRATEGY:
        {$hookInstruction}

        CTA STRATEGY:
        {$ctaInstruction}

        OBJECTIVE:
        {$objectiveInstruction}

        STRUCTURE:
        {$comparisonInstruction}

        RESEARCH AND CREATIVE BRIEF:
        {$researchBrief}

        Evidence rules:
        - Use only usable verified facts from the research brief for factual claims.
        - Trend signals describe discussion or popularity, not objective truth.
        - User-provided facts must be framed as provided by the user, brand, or their own data.
        - Respect prohibited claims and unresolved questions.
        - Allocate beat timing inside the requested {$length}; never output an inverted or impossible range.

        Return ONLY this JSON structure:
        {
            \"hook_line\": \"The exact opening line following the hook strategy above (in {$language})\",
            \"hook_type\": \"The name of the hook strategy used\",
            \"beats\": [
                { \"timing\": \"0-3s\", \"purpose\": \"Hook\", \"content_note\": \"...\" },
                { \"timing\": \"next valid range\", \"purpose\": \"Problem/Setup\", \"content_note\": \"...\" },
                { \"timing\": \"next valid range\", \"purpose\": \"Value Delivery\", \"content_note\": \"...\" },
                { \"timing\": \"next valid range\", \"purpose\": \"Key Shift\", \"content_note\": \"...\" },
                { \"timing\": \"final valid range ending at {$length}\", \"purpose\": \"CTA\", \"content_note\": \"...\" }
            ],
            \"key_shift_moment\": \"The 'aha' moment that shifts perspective\",
            \"cta_approach\": \"Specific CTA plan following the CTA strategy above\",
            \"psychological_driver\": \"Core motivation leveraged\"
        }";

        return $this->generateContent($prompt, true);
    }

    /**
     * Step 2: Write the full script draft based on the outline.
     *
     * @param  array<string, mixed>  $outline
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function generateScriptDraft(array $outline, array $data, float $temperature = 0.7): array
    {
        $outlineJson = json_encode($outline, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $language = $data['language'] ?? 'English';
        $length = $data['length'];
        $tone = $data['tone'];
        $topic = $data['topic'];
        $audience = $data['audience'] ?? 'General';
        $researchBrief = json_encode(
            $data['research_brief'] ?? [],
            JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );

        $prompt = "Write a complete spoken {$language} script following this outline EXACTLY.

        Outline:
        {$outlineJson}

        Topic: {$topic}
        Audience: {$audience}
        Research brief:
        {$researchBrief}

        Rules:
        - Natural spoken language (not written prose)
        - Match beat timing precisely
        - The hook line MUST be used verbatim from the outline
        - The CTA MUST follow the approach specified in the outline
        - Include [PAUSE] and [EMPHASIS] markers where effective
        - Total length: {$length}
        - Tone: {$tone}
        - Written strictly in {$language}
        - Do not invent facts, statistics, studies, dates, quotes, capabilities, or testimonials
        - Do not expose source URLs or confidence scores in the spoken copy
        - Clearly attribute user-provided facts instead of presenting them as independently verified
        - Keep the final output natural and ready to record; do not include headings, beat labels, or markdown

        Return ONLY this JSON structure:
        {
            \"title\": \"A short, punchy title for this script (max 60 chars)\",
            \"script\": \"The full script text here...\"
        }";

        return $this->generateContent($prompt, true, $temperature);
    }

    /**
     * Step 3: Critique and polish the draft.
     *
     * @param  array<string, mixed>  $outline
     * @return array<string, mixed>
     */
    public function critiqueAndPolish(array $outline, string $draftScript, array $data = []): array
    {
        $outlineJson = json_encode($outline, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        $constraints = json_encode([
            'topic' => $data['topic'] ?? null,
            'language' => $data['language'] ?? null,
            'length' => $data['length'] ?? null,
            'platform' => $data['platform'] ?? null,
            'content_mix' => $data['content_mix'] ?? null,
            'selected_angle' => $data['selected_angle'] ?? null,
            'cta_type' => $data['cta_type'] ?? null,
            'objective' => $data['objective'] ?? null,
            'research_brief' => $data['research_brief'] ?? [],
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $prompt = "You are a precise short-form script editor. Review this script against its outline and constraints.

        Outline:
        {$outlineJson}

        Script:
        {$draftScript}

        Constraints:
        {$constraints}

        Rate HONESTLY from 1-10 (do NOT inflate scores):
        hookStrength, retention, clarity, authenticity, ctaEffectiveness, viralPotential

        Evaluate these critical checks: supportedFacts, correctLanguage, validDuration, allowedFormatting, safeContent, ctaPresent, platformCompliant, contentMixAligned.
        Write exactly one corrective version that fixes any failed check and meaningful weakness while preserving the topic, evidence boundaries, named entities, hook strategy, and CTA intent.

        Return ONLY this JSON structure:
        {
            \"overallScore\": 8.5,
            \"scores\": {
                \"hookStrength\": 8,
                \"retention\": 8,
                \"clarity\": 8,
                \"authenticity\": 8,
                \"ctaEffectiveness\": 8,
                \"viralPotential\": 8
            },
            \"criticalChecks\": {
                \"supportedFacts\": true,
                \"correctLanguage\": true,
                \"validDuration\": true,
                \"allowedFormatting\": true,
                \"safeContent\": true,
                \"ctaPresent\": true,
                \"platformCompliant\": true,
                \"contentMixAligned\": true
            },
            \"strengths\": [\"...\"],
            \"improvements\": [\"...\"],
            \"revisedScript\": \"The polished script text here...\"
        }";

        return $this->generateContent($prompt, true);
    }

    /**
     * Recreate a script from an analyzed blueprint while adapting objective/topic.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function generateRecreatedScript(array $payload): array
    {
        $blueprint = json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        $prompt = "You are a short-form script strategist. Recreate a NEW script using the blueprint below.\n\n"
            ."Core rules:\n"
            ."- Preserve structure, not wording\n"
            ."- Preserve persuasion logic, not original surface text\n"
            ."- Adapt CTA objective and lead-in lines to the new objective\n"
            ."- Do not copy source lines verbatim\n"
            ."- Keep strategic skeleton from the source\n"
            ."- Output spoken script only in the requested language\n\n"
            ."Recreation blueprint:\n{$blueprint}\n\n"
            ."Return ONLY valid JSON with this schema:\n"
            ."{\n"
            ."  \"title\": \"\",\n"
            ."  \"script\": \"\",\n"
            ."  \"suggestedTopic\": \"\",\n"
            ."  \"estimatedDuration\": \"\",\n"
            ."  \"hookType\": \"\"\n"
            .'}';

        return $this->generateContent($prompt, true);
    }

    /**
     * Review and improve generated script.
     *
     * @param  array<string, mixed>  $options
     */
    public function reviewScript(string $script, array $options = []): array
    {
        $constraints = '';
        if (! empty($options['similarity'])) {
            $targetSimilarity = (int) $options['similarity'];
            $minSimilarity = max(10, $targetSimilarity - 10);
            $constraints .= "- Similarity target: approximately {$targetSimilarity}% with the original script, and never below {$minSimilarity}%.\n";
            $constraints .= "- Rephrase for quality, but preserve topic, named entities, concrete facts, and CTA intent.\n";
        }
        if (! empty($options['language'])) {
            $constraints .= '- Language: The new script MUST be in '.$options['language'].".\n";
        }
        if (! empty($options['duration'])) {
            $constraints .= '- Target Duration: '.$options['duration'].". Ensure the pacing matches this length.\n";
        }
        if (! empty($options['platform'])) {
            $constraints .= '- Platform: '.$options['platform'].". Use platform-specific hooks and engagement patterns.\n";
        }
        if (! empty($options['audience'])) {
            $constraints .= '- Target Audience: '.$options['audience'].". Tailor the vocabulary and tone for this demographic.\n";
        }

        $prompt = "Review and improve the following Instagram Reel script based on the provided constraints.

        Constraints:
        {$constraints}

        Original Script:
        {$script}

        STRICT RULES:
        - Output ONLY valid JSON
        - No markdown, no explanations, no extra text
        - No emojis
        - No timestamps
        - No audio or time keys
        - Do NOT change the main topic/domain of the script
        - Do NOT replace or invent brand/tool/product/person names
        - If a named entity exists in Original Script, keep the same name and spelling
        - Preserve all concrete claims/facts unless a tiny wording fix is required for clarity
        - Preserve CTA intent and trigger keyword (if present)
        - revisedScript must be natural spoken language suitable for ElevenLabs voice generation
        - Ensure the revised script strictly follows the Language, Duration, and Platform constraints.
        - Improve quality by tightening hook, reducing filler, and improving flow/transitions without changing topic.
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
        }";

        return $this->generateContent($prompt, true);
    }

    /**
     * @param  array<string, mixed>  $result
     */
    private function extractTextContent(array $result): string
    {
        if (isset($result['output_text']) && is_string($result['output_text']) && trim($result['output_text']) !== '') {
            return $result['output_text'];
        }

        $output = $result['output'] ?? [];
        if (! is_array($output)) {
            return '{}';
        }

        foreach ($output as $item) {
            if (! is_array($item)) {
                continue;
            }

            $contentItems = $item['content'] ?? [];
            if (! is_array($contentItems)) {
                continue;
            }

            foreach ($contentItems as $content) {
                if (! is_array($content)) {
                    continue;
                }

                if (isset($content['text']) && is_string($content['text']) && trim($content['text']) !== '') {
                    return $content['text'];
                }
            }
        }

        return '{}';
    }

    /**
     * Decode JSON requested through prompt instructions without enabling the
     * Responses API JSON mode, which is incompatible with web search.
     *
     * @return array<string, mixed>|null
     */
    private function decodeJsonText(string $content): ?array
    {
        $content = trim($content);
        $content = preg_replace('/^```(?:json)?\s*|\s*```$/i', '', $content) ?? $content;
        $decoded = json_decode(trim($content), true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * @param  array<string, mixed>  $result
     * @return array<int, array<string, mixed>>
     */
    private function extractWebSources(array $result): array
    {
        $sources = [];

        foreach (($result['output'] ?? []) as $item) {
            if (! is_array($item)) {
                continue;
            }

            if (($item['type'] ?? null) === 'web_search_call') {
                foreach (($item['action']['sources'] ?? []) as $source) {
                    if (is_array($source) && filter_var($source['url'] ?? null, FILTER_VALIDATE_URL)) {
                        $sources[] = $source;
                    }
                }
            }

            foreach (($item['content'] ?? []) as $content) {
                if (! is_array($content)) {
                    continue;
                }

                foreach (($content['annotations'] ?? []) as $annotation) {
                    $citation = $annotation['url_citation'] ?? $annotation;
                    if (is_array($citation) && filter_var($citation['url'] ?? null, FILTER_VALIDATE_URL)) {
                        $sources[] = $citation;
                    }
                }
            }
        }

        return collect($sources)
            ->unique(fn (array $source): string => (string) $source['url'])
            ->values()
            ->all();
    }
}
