<?php

namespace App\Services\Validation\FormatValidators;

use Illuminate\Support\Collection;

class StoryValidator implements FormatValidatorInterface
{
    public const CANONICAL_STORY_RATIO = 0.5625; // 9:16 Fullscreen vertical

    public function validate(Collection $mediaAssets, array $options = []): ValidationResult
    {
        if ($mediaAssets->count() !== 1) {
            return ValidationResult::fail(
                'Story posts require exactly one media asset.',
                'INVALID_MEDIA_COUNT'
            );
        }

        $asset = $mediaAssets->first();
        if (!in_array($asset->media_type, ['image', 'video'], true)) {
            return ValidationResult::fail(
                'Story posts require an image or video asset.',
                'INVALID_MEDIA_TYPE'
            );
        }

        // Instagram Stories support fullscreen vertical (9:16 = 0.5625) and media up to 1.91:1
        return ValidationResult::pass();
    }
}
