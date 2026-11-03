<?php

namespace App\Services\ScriptIntelligence;

class PromptTemplateService
{
    public function scriptTypeTieBreakerPrompt(string $transcript, array $candidateLabels): string
    {
        $labels = implode(', ', $candidateLabels);

        return "Classify the transcript into exactly one script type from: {$labels}.\n"
            ."Return strict JSON only: {\"script_type\":\"...\"}\n\n"
            ."Transcript:\n{$transcript}";
    }

    public function keyShiftValidationPrompt(array $candidateSentences): string
    {
        $payload = json_encode($candidateSentences, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        return "Given sentence candidates, return whether a key perspective shift exists.\n"
            ."Return strict JSON only: {\"has_key_shift\":true,\"best_candidate\":\"...\"}\n"
            ."Candidates: {$payload}";
    }
}
