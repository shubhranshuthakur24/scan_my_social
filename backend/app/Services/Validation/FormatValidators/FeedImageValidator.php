<?php

namespace App\Services\Validation\FormatValidators;

use Illuminate\Support\Collection;

class FeedImageValidator implements FormatValidatorInterface
{
    public const CANONICAL_MIN_RATIO = 0.80; // 4:5 Portrait
    public const CANONICAL_MAX_RATIO = 1.91; // 1.91:1 Landscape
    public const TOLERANCE = 0.01;

    public function validate(Collection $mediaAssets, array $options = []): ValidationResult
    {
        if ($mediaAssets->count() !== 1) {
            return ValidationResult::fail(
                'Photo posts require exactly one media asset.',
                'INVALID_MEDIA_COUNT'
            );
        }

        $asset = $mediaAssets->first();
        if ($asset->media_type !== 'image') {
            return ValidationResult::fail(
                'Photo posts require an image asset.',
                'INVALID_MEDIA_TYPE'
            );
        }

        $aspectRatio = data_get($asset->metadata, 'aspect_ratio');

        // Fallback calculation if not in metadata
        if ($aspectRatio === null) {
            $info = @getimagesize($asset->deliveryUrl());
            if ($info && !empty($info[0]) && !empty($info[1])) {
                $aspectRatio = round($info[0] / $info[1], 4);
                $asset->update([
                    'metadata' => array_merge($asset->metadata ?? [], [
                        'width' => (int) $info[0],
                        'height' => (int) $info[1],
                        'aspect_ratio' => $aspectRatio,
                    ]),
                ]);
            }
        }

        if ($aspectRatio === null) {
            return ValidationResult::fail(
                'Unable to inspect media dimensions.',
                'MEDIA_DIMENSIONS_UNAVAILABLE'
            );
        }

        $effectiveMin = self::CANONICAL_MIN_RATIO - self::TOLERANCE; // 0.79
        $effectiveMax = self::CANONICAL_MAX_RATIO + self::TOLERANCE; // 1.92

        if ($aspectRatio < $effectiveMin) {
            return ValidationResult::fail(
                sprintf('The image is too tall (%.2f) for Instagram Feed. Instagram requires an aspect ratio between 4:5 (0.80) and 1.91:1. Please crop to 4:5 or switch to Story.', $aspectRatio),
                'ASPECT_RATIO_TOO_TALL',
                [
                    [
                        'media_id' => $asset->id,
                        'aspect_ratio' => $aspectRatio,
                        'required' => '0.80–1.91 (4:5 to 1.91:1)',
                        'classification' => 'too_tall',
                        'code' => 'ASPECT_RATIO_TOO_TALL',
                    ]
                ]
            );
        }

        if ($aspectRatio > $effectiveMax) {
            return ValidationResult::fail(
                sprintf('The image is too wide (%.2f) for Instagram Feed. Instagram requires an aspect ratio between 4:5 (0.80) and 1.91:1. Please crop to 1.91:1.', $aspectRatio),
                'ASPECT_RATIO_TOO_WIDE',
                [
                    [
                        'media_id' => $asset->id,
                        'aspect_ratio' => $aspectRatio,
                        'required' => '0.80–1.91 (4:5 to 1.91:1)',
                        'classification' => 'too_wide',
                        'code' => 'ASPECT_RATIO_TOO_WIDE',
                    ]
                ]
            );
        }

        return ValidationResult::pass();
    }
}
