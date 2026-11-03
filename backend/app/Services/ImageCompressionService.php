<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class ImageCompressionService
{
    private const MAX_BYTES = 2097152;

    private const QUALITY_STEPS = [85, 78, 70, 62, 54, 46];

    public function compressToAvifOrWebp(UploadedFile $upload): array
    {
        $binary = @file_get_contents($upload->getRealPath());
        if ($binary === false) {
            throw ValidationException::withMessages([
                'reply_images' => 'Unable to read the uploaded image.',
            ]);
        }

        $image = @imagecreatefromstring($binary);
        if ($image === false) {
            throw ValidationException::withMessages([
                'reply_images' => 'Invalid image file.',
            ]);
        }

        [$encoded, $extension] = $this->encodeJpeg($image);
        imagedestroy($image);

        if ($encoded === null || $extension === null) {
            throw ValidationException::withMessages([
                'reply_images' => 'Image must be 2MB or less after compression.',
            ]);
        }

        return [
            'bytes' => $encoded,
            'extension' => $extension,
        ];
    }

    private function encodeJpeg($image): array
    {
        if (! function_exists('imagejpeg')) {
            return [null, null];
        }

        foreach (self::QUALITY_STEPS as $quality) {
            ob_start();
            imagejpeg($image, null, $quality);
            $candidate = ob_get_clean();
            if ($candidate !== false && strlen($candidate) <= self::MAX_BYTES) {
                return [$candidate, 'jpg'];
            }
        }

        return [null, null];
    }
}
