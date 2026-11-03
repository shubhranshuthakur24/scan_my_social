<?php

namespace App\Services\Validation\FormatValidators;

use Illuminate\Support\Collection;

class CarouselValidator implements FormatValidatorInterface
{
    public const CANONICAL_MIN_RATIO = 0.80; // 4:5 Portrait
    public const CANONICAL_MAX_RATIO = 1.91; // 1.91:1 Landscape
    public const TOLERANCE = 0.01;
    public const CAROUSEL_CONSISTENCY_TOLERANCE = 0.02;

    public function validate(Collection $mediaAssets, array $options = []): ValidationResult
    {
        $count = $mediaAssets->count();

        if ($count < 2) {
            return ValidationResult::fail(
                'Carousel posts require at least 2 slides.',
                'INVALID_CAROUSEL_COUNT'
            );
        }

        if ($count > 10) {
            return ValidationResult::fail(
                'Carousel posts can include up to 10 slides.',
                'INVALID_CAROUSEL_COUNT'
            );
        }

        $effectiveMin = self::CANONICAL_MIN_RATIO - self::TOLERANCE;
        $effectiveMax = self::CANONICAL_MAX_RATIO + self::TOLERANCE;

        $ratios = [];
        $invalidChildren = [];

        $index = 0;
        foreach ($mediaAssets as $asset) {
            $index++;
            $aspectRatio = data_get($asset->metadata, 'aspect_ratio');

            if ($aspectRatio === null && $asset->media_type === 'image') {
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

            if ($aspectRatio !== null) {
                $ratios[$asset->id] = [
                    'index' => $index,
                    'ratio' => (float) $aspectRatio,
                    'media_id' => $asset->id,
                ];

                if ($aspectRatio < $effectiveMin || $aspectRatio > $effectiveMax) {
                    $invalidChildren[] = [
                        'media_id' => $asset->id,
                        'slide_index' => $index,
                        'aspect_ratio' => (float) $aspectRatio,
                        'required' => '0.80–1.91 (4:5 to 1.91:1)',
                        'classification' => $aspectRatio < $effectiveMin ? 'too_tall' : 'too_wide',
                        'code' => $aspectRatio < $effectiveMin ? 'ASPECT_RATIO_TOO_TALL' : 'ASPECT_RATIO_TOO_WIDE',
                    ];
                }
            }
        }

        // Check 1: Individual child compliance
        if (!empty($invalidChildren)) {
            $firstInvalid = $invalidChildren[0];
            return ValidationResult::fail(
                sprintf('Slide #%d has an unsupported aspect ratio (%.2f). Feed carousel slides must be between 4:5 (0.80) and 1.91:1.', $firstInvalid['slide_index'], $firstInvalid['aspect_ratio']),
                'CAROUSEL_CHILD_RATIO_INVALID',
                $invalidChildren
            );
        }

        // Check 2: Carousel Consistency across slides
        // Meta Graph API requires all carousel slides to match the aspect ratio of the first slide
        if (count($ratios) >= 2) {
            $ratioValues = array_values($ratios);
            $primarySlide = $ratioValues[0];
            $primaryRatio = $primarySlide['ratio'];

            $mismatchedSlides = [];
            for ($i = 1; $i < count($ratioValues); $i++) {
                $slide = $ratioValues[$i];
                if (abs($slide['ratio'] - $primaryRatio) > self::CAROUSEL_CONSISTENCY_TOLERANCE) {
                    $mismatchedSlides[] = [
                        'media_id' => $slide['media_id'],
                        'slide_index' => $slide['index'],
                        'aspect_ratio' => $slide['ratio'],
                        'expected_ratio' => $primaryRatio,
                        'difference' => round(abs($slide['ratio'] - $primaryRatio), 4),
                    ];
                }
            }

            if (!empty($mismatchedSlides)) {
                return ValidationResult::fail(
                    sprintf('Carousel slides have mixed aspect ratios. Meta requires all slides to match the first slide (%.2f). Slide #%d is %.2f.', $primaryRatio, $mismatchedSlides[0]['slide_index'], $mismatchedSlides[0]['aspect_ratio']),
                    'CAROUSEL_ASPECT_RATIO_MISMATCH',
                    $mismatchedSlides,
                    [
                        'first_slide_ratio' => $primaryRatio,
                        'mismatched_slides' => $mismatchedSlides,
                    ]
                );
            }
        }

        return ValidationResult::pass();
    }
}
