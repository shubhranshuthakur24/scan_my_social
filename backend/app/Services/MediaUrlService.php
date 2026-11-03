<?php

namespace App\Services;

use DateTimeInterface;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class MediaUrlService
{
    public function isAbsoluteUrl(string $value): bool
    {
        return preg_match('/^https?:\/\//i', trim($value)) === 1;
    }

    public function normalizeStoredValue(?string $value): string
    {
        $normalized = trim((string) $value);
        if ($normalized === '') {
            return '';
        }

        if (! $this->isAbsoluteUrl($normalized)) {
            return ltrim($normalized, '/');
        }

        $uploadDisk = $this->uploadDisk();
        $uploadDiskUrl = trim((string) config("filesystems.disks.{$uploadDisk}.url", ''));
        if ($uploadDiskUrl !== '' && Str::startsWith($normalized, $uploadDiskUrl)) {
            $storedPath = ltrim((string) (parse_url($normalized, PHP_URL_PATH) ?? ''), '/');
            $diskUrlPathPrefix = ltrim((string) (parse_url($uploadDiskUrl, PHP_URL_PATH) ?? ''), '/');
            if ($diskUrlPathPrefix !== '' && Str::startsWith($storedPath, $diskUrlPathPrefix)) {
                $storedPath = ltrim(Str::after($storedPath, $diskUrlPathPrefix), '/');
            }

            return $storedPath;
        }

        return $normalized;
    }

    public function previewUrl(?string $pathOrUrl): string
    {
        return $this->resolveWithTtl($pathOrUrl, now()->addMinutes(15));
    }

    public function deliveryUrl(?string $pathOrUrl): string
    {
        return $this->resolveWithTtl($pathOrUrl, now()->addDays(7));
    }

    private function resolveWithTtl(?string $pathOrUrl, DateTimeInterface $expiresAt): string
    {
        $normalized = trim((string) $pathOrUrl);
        if ($normalized === '') {
            return '';
        }

        if ($this->isAbsoluteUrl($normalized)) {
            return $normalized;
        }

        $disk = Storage::disk($this->uploadDisk());
        $path = ltrim($normalized, '/');

        try {
            return $disk->temporaryUrl($path, $expiresAt);
        } catch (Throwable) {
            return $disk->url($path);
        }
    }

    private function uploadDisk(): string
    {
        return (string) config('filesystems.upload_disk', 'public');
    }
}
