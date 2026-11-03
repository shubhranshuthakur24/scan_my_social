<?php

return [
    /*
    |--------------------------------------------------------------------------
    | AI Providers Configuration
    |--------------------------------------------------------------------------
    |
    | This file defines the default providers for various AI tasks.
    |
    */

    'defaults' => [
        'transcription' => env('TRANSCRIPTION_PROVIDER', 'elevenlabs'), // 'elevenlabs' or 'openai'
        'tts' => env('TTS_PROVIDER', 'elevenlabs'), // 'elevenlabs' or 'openai'
    ],
];
