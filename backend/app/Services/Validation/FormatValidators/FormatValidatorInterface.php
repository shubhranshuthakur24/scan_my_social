<?php

namespace App\Services\Validation\FormatValidators;

use Illuminate\Support\Collection;

interface FormatValidatorInterface
{
    /**
     * Validate media assets and options for the given format.
     *
     * @param Collection<int, \App\Models\ContentSchedulerMedia> $mediaAssets
     * @param array $options
     * @return ValidationResult
     */
    public function validate(Collection $mediaAssets, array $options = []): ValidationResult;
}
