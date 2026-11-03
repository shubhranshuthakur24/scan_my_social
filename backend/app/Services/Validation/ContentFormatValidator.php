<?php

namespace App\Services\Validation;

use App\Services\Validation\FormatValidators\CarouselValidator;
use App\Services\Validation\FormatValidators\FeedImageValidator;
use App\Services\Validation\FormatValidators\FormatValidatorInterface;
use App\Services\Validation\FormatValidators\ReelValidator;
use App\Services\Validation\FormatValidators\StoryValidator;
use App\Services\Validation\FormatValidators\ValidationResult;
use Illuminate\Support\Collection;

class ContentFormatValidator
{
    /**
     * @var array<string, FormatValidatorInterface>
     */
    protected array $validators;

    public function __construct(
        FeedImageValidator $feedImageValidator,
        CarouselValidator $carouselValidator,
        StoryValidator $storyValidator,
        ReelValidator $reelValidator
    ) {
        $this->validators = [
            'image' => $feedImageValidator,
            'photo' => $feedImageValidator,
            'carousel' => $carouselValidator,
            'story' => $storyValidator,
            'reel' => $reelValidator,
            'video' => $reelValidator,
        ];
    }

    /**
     * Validate media assets for the given Instagram publishing format.
     *
     * @param string $format
     * @param Collection<int, \App\Models\ContentSchedulerMedia> $mediaAssets
     * @param array $options
     * @return ValidationResult
     */
    public function validate(string $format, Collection $mediaAssets, array $options = []): ValidationResult
    {
        $normalizedFormat = strtolower(trim($format));

        $validator = $this->validators[$normalizedFormat] ?? null;
        if (!$validator) {
            return ValidationResult::fail(
                "Unsupported Instagram publishing format: {$format}.",
                'UNSUPPORTED_FORMAT'
            );
        }

        return $validator->validate($mediaAssets, $options);
    }
}
