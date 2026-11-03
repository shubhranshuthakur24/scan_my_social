<?php

namespace App\Services\ScriptIntelligence;

use App\Services\GeminiService;
use Illuminate\Support\Facades\Log;

class OpenAIClient
{
    public function __construct(private readonly GeminiService $gemini) {}

    /**
     * @return array<string, mixed>
     */
    public function strictJson(string $prompt): array
    {
        try {
            $response = $this->gemini->generateContent($prompt, true);

            return is_array($response) ? $response : [];
        } catch (\Throwable $exception) {
            Log::warning('script_intelligence.llm_call_failed', [
                'message' => $exception->getMessage(),
            ]);

            return [];
        }
    }
}
