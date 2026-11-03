<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class ElevenLabsService
{
    protected string $apiKey;

    protected string $baseUrl = 'https://api.elevenlabs.io/v1';

    public function __construct()
    {
        $this->apiKey = config('services.elevenlabs.api_key');
    }

    /**
     * Transcribe audio from URL using ElevenLabs Speech-to-Text
     * Only called when user clicks transcribe
     */
    public function transcribe(string $audioUrl): string
    {
        Log::info("Transcribing audio via ElevenLabs: {$audioUrl}");

        // ElevenLabs occasionally fails to reach external URLs (e.g. Instagram/Hostinger)
        // So we download locally and upload the file bits.
        $tempFile = tempnam(sys_get_temp_dir(), 'eleven_');
        $urlPath = parse_url($audioUrl, PHP_URL_PATH);
        $extension = pathinfo($urlPath, PATHINFO_EXTENSION) ?: 'mp3';
        $tempFileWithExt = $tempFile.'.'.$extension;

        try {
            $audioContent = Http::withoutVerifying()
                ->timeout(30)
                ->connectTimeout(10)
                ->withHeaders([
                    'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    'Accept' => '*/*',
                    'Accept-Language' => 'en-US,en;q=0.9',
                    'Referer' => 'https://www.instagram.com/',
                    'Sec-Fetch-Dest' => 'empty',
                    'Sec-Fetch-Mode' => 'cors',
                    'Sec-Fetch-Site' => 'cross-site',
                ])
                ->get($audioUrl);

            // Fallback: If 403, try with minimal headers (Instagram CDN occasionally blocks robust headers)
            if ($audioContent->status() === 403) {
                Log::warning("403 Forbidden with robust headers (ElevenLabs), retrying with minimal headers for: {$audioUrl}");
                $audioContent = Http::withoutVerifying()
                    ->timeout(30)
                    ->connectTimeout(10)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    ])
                    ->get($audioUrl);
            }

            if (! $audioContent->successful()) {
                throw new \Exception('Failed to download audio for ElevenLabs transcription: '.$audioContent->status());
            }

            file_put_contents($tempFileWithExt, $audioContent->body());

            $response = Http::withoutVerifying()
                ->timeout(60)
                ->connectTimeout(30)
                ->retry(3, fn ($attempt) => pow(2, $attempt) * 500)
                ->withHeaders([
                    'xi-api-key' => $this->apiKey,
                ])->asMultipart()->post("{$this->baseUrl}/speech-to-text", [
                    ['name' => 'model_id', 'contents' => 'scribe_v1'],
                    ['name' => 'file', 'contents' => fopen($tempFileWithExt, 'r'), 'filename' => basename($tempFileWithExt)],
                ]);

            if (! $response->successful()) {
                Log::error('ElevenLabs Transcription Error', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);
                throw new \Exception('ElevenLabs Transcription Error: '.$response->body());
            }

            return $response->json('text', '');
        } finally {
            // Cleanup temp files
            if (file_exists($tempFile)) {
                @unlink($tempFile);
            }
            if (file_exists($tempFileWithExt)) {
                @unlink($tempFileWithExt);
            }
        }
    }

    /**
     * Synthesize text to speech using ElevenLabs TTS
     * Only called when user clicks generate audio
     */
    public function synthesize(string $text, ?string $voiceId = null, float $speed = 1.2): string
    {
        $voiceId = $voiceId ?? config('services.elevenlabs.voice_id');
        $model = config('services.elevenlabs.model');

        $response = Http::withoutVerifying()
            ->timeout(60)
            ->connectTimeout(30)
            ->retry(3, fn ($attempt) => pow(2, $attempt) * 500)
            ->withHeaders([
                'xi-api-key' => $this->apiKey,
            ])->post("{$this->baseUrl}/text-to-speech/{$voiceId}", [
                'model_id' => $model,
                'text' => $text,
                'voice_settings' => [
                    'stability' => 0.5,
                    'similarity_boost' => 0.75,
                ],
            ]);

        if (! $response->successful()) {
            Log::error('ElevenLabs TTS Error', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            throw new \Exception('ElevenLabs TTS Error: '.$response->body());
        }

        // Save audio file to configured upload disk (path-first persistence)
        $filename = 'generated_audio/'.uniqid().'.mp3';
        $uploadDisk = (string) config('filesystems.upload_disk', 'public');
        Storage::disk($uploadDisk)->put($filename, $response->body());

        return $filename;
    }
}
