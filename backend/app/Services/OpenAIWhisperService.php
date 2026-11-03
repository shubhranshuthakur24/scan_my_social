<?php

namespace App\Services;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class OpenAIWhisperService
{
    protected ?string $apiKey;

    protected string $baseUrl = 'https://api.openai.com/v1';

    public function __construct()
    {
        $this->apiKey = config('services.openai.api_key');
    }

    /**
     * Transcribe audio from URL using OpenAI Whisper
     */
    public function transcribe(string $audioUrl): string
    {
        if (! $this->apiKey) {
            throw new \Exception('OpenAI API Key is missing. Please add OPENAI_API_KEY to your .env file.');
        }

        Log::info("Transcribing audio via OpenAI Whisper: {$audioUrl}");

        // OpenAI requires a file upload, so we must download the URL first
        $tempFile = tempnam(sys_get_temp_dir(), 'whisper_');
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

            // Fallback: If 403, try with minimal headers
            if ($audioContent->status() === 403) {
                Log::warning("403 Forbidden with robust headers (Whisper), retrying with minimal headers for: {$audioUrl}");
                $audioContent = Http::withoutVerifying()
                    ->timeout(30)
                    ->connectTimeout(10)
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                    ])
                    ->get($audioUrl);
            }

            if (! $audioContent->successful()) {
                throw new \Exception('Failed to download audio for transcription: '.$audioContent->status());
            }

            File::put($tempFileWithExt, $audioContent->body());

            $response = Http::withoutVerifying()
                ->timeout(60)
                ->connectTimeout(30)
                ->retry(3, fn ($attempt) => pow(2, $attempt) * 500)
                ->withToken($this->apiKey)
                ->attach('file', File::get($tempFileWithExt), basename($tempFileWithExt))
                ->post("{$this->baseUrl}/audio/transcriptions", [
                    'model' => config('services.openai.model', 'whisper-1'),
                    'response_format' => 'json',
                ]);

            if (! $response->successful()) {
                Log::error('OpenAI Whisper transcription error', [
                    'status' => $response->status(),
                    'body' => $response->json(),
                ]);
                throw new \Exception('OpenAI Whisper Error: '.($response->json('error.message') ?? $response->body()));
            }

            return $response->json('text', '');

        } finally {
            // Cleanup temp files
            if (File::exists($tempFile)) {
                File::delete($tempFile);
            }
            if (File::exists($tempFileWithExt)) {
                File::delete($tempFileWithExt);
            }
        }
    }

    /**
     * Synthesize text to speech using OpenAI TTS
     */
    public function synthesize(string $text, ?string $voice = null, float $speed = 1.0): string
    {
        if (! $this->apiKey) {
            throw new \Exception('OpenAI API Key is missing. Please add OPENAI_API_KEY to your .env file.');
        }

        Log::info('Synthesizing audio via OpenAI TTS');

        $response = Http::withoutVerifying()
            ->timeout(60)
            ->connectTimeout(30)
            ->retry(3, fn ($attempt) => pow(2, $attempt) * 500)
            ->withToken($this->apiKey)
            ->post("{$this->baseUrl}/audio/speech", [
                'model' => config('services.openai.tts_model', 'tts-1'),
                'input' => $text,
                'voice' => $voice ?? config('services.openai.voice', 'alloy'),
                'speed' => $speed,
                'response_format' => 'mp3',
            ]);

        if (! $response->successful()) {
            Log::error('OpenAI TTS error', [
                'status' => $response->status(),
                'body' => $response->json(),
            ]);
            throw new \Exception('OpenAI TTS Error: '.($response->json('error.message') ?? $response->body()));
        }

        // Save audio file to configured upload disk (path-first persistence)
        $filename = 'generated_audio/'.uniqid().'.mp3';
        $uploadDisk = (string) config('filesystems.upload_disk', 'public');
        Storage::disk($uploadDisk)->put($filename, $response->body());

        return $filename;
    }
}
