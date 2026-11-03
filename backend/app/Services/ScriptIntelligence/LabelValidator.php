<?php

namespace App\Services\ScriptIntelligence;

class LabelValidator
{
    public function validateScriptType(?string $label): string
    {
        $fallback = (string) (config('script_intelligence.script_types.0') ?? 'Utility');

        return $this->validateAgainstList(
            $label,
            config('script_intelligence.script_types', []),
            $fallback
        );
    }

    public function validateDriver(?string $label): string
    {
        $fallback = (string) (config('script_intelligence.psychological_drivers.0') ?? 'Curiosity');

        return $this->validateAgainstList(
            $label,
            config('script_intelligence.psychological_drivers', []),
            $fallback
        );
    }

    public function validateCtaType(?string $label): string
    {
        $fallback = (string) (config('script_intelligence.cta_types.6') ?? 'No CTA');

        return $this->validateAgainstList(
            $label,
            config('script_intelligence.cta_types', []),
            $fallback
        );
    }

    public function validateClosureType(?string $label): string
    {
        $fallback = (string) (config('script_intelligence.closure_types.6') ?? 'No clear closure');

        return $this->validateAgainstList(
            $label,
            config('script_intelligence.closure_types', []),
            $fallback
        );
    }

    public function validateScriptFlow(string $scriptType, ?string $flow): string
    {
        $flows = config("script_intelligence.script_flows.{$scriptType}", []);
        $fallback = (string) ($flows[0] ?? 'Problem Steps Reinforcement');

        return $this->validateAgainstList($flow, $flows, $fallback);
    }

    /**
     * @param  array<int, string>  $allowed
     */
    private function validateAgainstList(?string $label, array $allowed, string $fallback): string
    {
        if ($label === null || trim($label) === '') {
            return $fallback;
        }

        foreach ($allowed as $allowedLabel) {
            if (mb_strtolower(trim($allowedLabel)) === mb_strtolower(trim($label))) {
                return $allowedLabel;
            }
        }

        return $fallback;
    }
}
