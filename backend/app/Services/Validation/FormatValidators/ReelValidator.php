<?php

namespace App\Services\Validation\FormatValidators;

use Illuminate\Support\Collection;

class ReelValidator implements FormatValidatorInterface
{
    public const CANONICAL_REEL_RATIO = 0.5625; // 9:16 Fullscreen vertical

    public function validate(Collection $mediaAssets, array $options = []): ValidationResult
    {
        if ($mediaAssets->count() !== 1) {
            return ValidationResult::fail(
                'Reel posts require exactly one video asset.',
                'INVALID_MEDIA_COUNT'
            );
        }

        $asset = $mediaAssets->first();
        if ($asset->media_type !== 'video') {
            return ValidationResult::fail(
                'Reel posts require a video asset.',
                'INVALID_MEDIA_TYPE'
            );
        }

        return ValidationResult::pass();
    }
}
