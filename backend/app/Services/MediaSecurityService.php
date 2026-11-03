<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;

class MediaSecurityService
{
    /**
     * Max allowable image dimensions to protect against excessive memory allocation.
     */
    public const MAX_IMAGE_WIDTH = 8192;
    public const MAX_IMAGE_HEIGHT = 8192;
    public const MAX_IMAGE_MEGAPIXELS = 36.0; // e.g. 6000x6000

    /**
     * Approximate memory limit in bytes required to safely decompress raster in memory.
     * Calculated as: width * height * channels * (bits / 8) * overhead.
     */
    public const MAX_UNCOMPRESSED_MEMORY_BYTES = 128 * 1024 * 1024; // 128 MB

    /**
     * Permitted MIME types and their validated extensions.
     */
    public const ALLOWED_IMAGE_MIMES = [
        'image/jpeg' => ['jpg', 'jpeg'],
        'image/png' => ['png'],
        'image/webp' => ['webp'],
    ];

    public const ALLOWED_VIDEO_MIMES = [
        'video/mp4' => ['mp4'],
        'video/quicktime' => ['mov'],
    ];

    /**
     * Inspect and validate an uploaded file for security, integrity, and decompression bomb risks.
     *
     * @return array{
     *     media_type: string,
     *     mime_type: string,
     *     width: int|null,
     *     height: int|null,
     *     aspect_ratio: float|null,
     *     size_bytes: int
     * }
     *
     * @throws ValidationException
     */
    public function inspectAndValidate(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        $sizeBytes = $file->getSize();

        // 1. Binary MIME Sniffing via finfo
        $finfo = new \finfo(FILEINFO_MIME_TYPE);
        $detectedMime = $finfo->file($path) ?: $file->getMimeType();

        $isImage = array_key_exists($detectedMime, self::ALLOWED_IMAGE_MIMES);
        $isVideo = array_key_exists($detectedMime, self::ALLOWED_VIDEO_MIMES);

        if (!$isImage && !$isVideo) {
            throw ValidationException::withMessages([
                'media' => ["The uploaded file type ({$detectedMime}) is not supported. Please upload a JPG, PNG, WEBP, or MP4/MOV file."],
            ]);
        }

        if ($isImage) {
            return $this->inspectImage($path, $detectedMime, $sizeBytes);
        }

        return $this->inspectVideo($path, $detectedMime, $sizeBytes);
    }

    /**
     * Inspect an image file with decompression bomb defense.
     *
     * @throws ValidationException
     */
    protected function inspectImage(string $path, string $mimeType, int $sizeBytes): array
    {
        // Max raw upload size for images is 20MB
        if ($sizeBytes > 20 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'media' => ['Image files must not exceed 20 MB.'],
            ]);
        }

        // Read image header only (does not decompress pixel array into memory)
        $info = @getimagesize($path);
        if ($info === false || empty($info[0]) || empty($info[1])) {
            throw ValidationException::withMessages([
                'media' => ['The uploaded image appears to be corrupted or invalid.'],
            ]);
        }

        $width = (int) $info[0];
        $height = (int) $info[1];
        $channels = isset($info['channels']) ? (int) $info['channels'] : 4;
        $bits = isset($info['bits']) ? (int) $info['bits'] : 8;

        // Check 1: Maximum dimensions
        if ($width > self::MAX_IMAGE_WIDTH || $height > self::MAX_IMAGE_HEIGHT) {
            throw ValidationException::withMessages([
                'media' => ["Image dimensions ({$width}x{$height}) exceed the maximum permitted limit of " . self::MAX_IMAGE_WIDTH . "x" . self::MAX_IMAGE_HEIGHT . " pixels."],
            ]);
        }

        // Check 2: Minimum dimensions (Instagram requires at least 320px width)
        if ($width < 320) {
            throw ValidationException::withMessages([
                'media' => ["Image width ({$width}px) is too low. Instagram requires a minimum width of 320px."],
            ]);
        }

        // Check 3: Megapixel cap
        $megapixels = ($width * $height) / 1000000;
        if ($megapixels > self::MAX_IMAGE_MEGAPIXELS) {
            throw ValidationException::withMessages([
                'media' => [sprintf('Image resolution (%.1f MP) exceeds the maximum allowed limit of %.1f MP.', $megapixels, self::MAX_IMAGE_MEGAPIXELS)],
            ]);
        }

        // Check 4: Decompression Bomb Protection (calculate uncompressed raster memory buffer)
        // Memory = width * height * channels * (bits / 8) * 1.8 overhead
        $estimatedMemory = (int) ($width * $height * max(1, $channels) * max(1, $bits / 8) * 1.8);
        if ($estimatedMemory > self::MAX_UNCOMPRESSED_MEMORY_BYTES) {
            throw ValidationException::withMessages([
                'media' => ['Image decompression memory profile is too high to process safely.'],
            ]);
        }

        $aspectRatio = round($width / $height, 4);

        return [
            'media_type' => 'image',
            'mime_type' => $mimeType,
            'width' => $width,
            'height' => $height,
            'aspect_ratio' => $aspectRatio,
            'size_bytes' => $sizeBytes,
        ];
    }

    /**
     * Inspect a video file.
     *
     * @throws ValidationException
     */
    protected function inspectVideo(string $path, string $mimeType, int $sizeBytes): array
    {
        // Max raw upload size for video is 200MB
        if ($sizeBytes > 200 * 1024 * 1024) {
            throw ValidationException::withMessages([
                'media' => ['Video files must not exceed 200 MB.'],
            ]);
        }

        return [
            'media_type' => 'video',
            'mime_type' => $mimeType,
            'width' => null,
            'height' => null,
            'aspect_ratio' => null,
            'size_bytes' => $sizeBytes,
        ];
    }
}
