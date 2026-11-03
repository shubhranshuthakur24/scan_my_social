<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'token' => env('POSTMARK_TOKEN'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'resend' => [
        'key' => env('RESEND_KEY'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'apify' => [
        'token' => env('APIFY_TOKEN'),
        'actor_id' => 'nH2AHrwxeTRJoN5hX', // Instagram scraper actor
        'actor_post_refresh' => 'shu8hvrXbJbY3Eb9W', // Instagram post refresh actor
        'profile_actor_id' => env('APIFY_PROFILE_ACTOR_ID', 'dSCLg0C3YEZ83HzYX'),
        'verify_ssl' => env('APIFY_VERIFY_SSL'),
    ],

    'elevenlabs' => [
        'api_key' => env('ELEVENLABS_API_KEY'),
        'voice_id' => 'zNtXDvcEQE4JuzoPfCYJ', // Default voice
        'model' => 'eleven_multilingual_v2',
    ],

    'openrouter' => [
        'api_key' => env('OPENROUTER_API_KEY'),
        'default_model' => env('AI_PROVIDER', 'openrouter/google/gemini-2.5-flash'),
        'models' => [
            'gemini' => 'openrouter/google/gemini-2.5-flash',
            'claude' => 'openrouter/anthropic/claude-3.5-sonnet',
            'openai' => 'openrouter/openai/gpt-4o',
        ],
    ],

    'gemini' => [
        'api_key' => env('GEMINI_API_KEY'),
        'model' => 'gemini-2.5-flash',
    ],

    'openai' => [
        'api_key' => env('OPENAI_API_KEY'),
        'model' => 'gpt-4o-transcribe',
        'content_model' => env('OPENAI_MODEL_CONTENT_ANALYSIS', 'gpt-5.4-mini'),
        'research_model' => env('OPENAI_MODEL_SCRIPT_RESEARCH', env('OPENAI_MODEL_CONTENT_ANALYSIS', 'gpt-5.4-mini')),
        'tts_model' => 'tts-1',
        'voice' => 'alloy',
    ],

    'google' => [
        'client_id' => env('GOOGLE_CLIENT_ID'),
        'client_secret' => env('GOOGLE_CLIENT_SECRET'),
        'redirect' => env('GOOGLE_REDIRECT_URI', env('APP_URL').'/auth/google/callback'),
    ],

    'meta' => [
        'client_id' => env('META_CLIENT_ID'),
        'client_secret' => env('META_CLIENT_SECRET'),
        'app_secret' => env('META_APP_SECRET'),
        'redirect' => env('META_REDIRECT_URI', env('APP_URL').'/social-integrations/instagram/callback'),
        'verify_token' => env('META_WEBHOOK_VERIFY_TOKEN'),
        'verify_ssl' => env('META_VERIFY_SSL'),
    ],
    'autodm' => [
        'daily_recipient_limit_enabled' => env('AUTODM_DAILY_RECIPIENT_LIMIT_ENABLED', true),
        'deeplink_base_url' => env('AUTODM_DEEPLINK_BASE_URL', 'https://scanmysocial.com'),
        'deeplink_ttl_hours' => env('AUTODM_DEEPLINK_TTL_HOURS', 24),
    ],
    'razorpay' => [
        'key' => env('RAZORPAY_KEY_ID'),
        'secret' => env('RAZORPAY_KEY_SECRET'),
        'webhook_secret' => env('RAZORPAY_WEBHOOK_SECRET'),
        'starter_plan_id' => env('RAZORPAY_STARTER_PLAN_ID'),
        'starter_yearly_plan_id' => env('RAZORPAY_STARTER_YEARLY_PLAN_ID'),

        'pro_plan_id' => env('RAZORPAY_PRO_PLAN_ID'),
        'pro_yearly_plan_id' => env('RAZORPAY_PRO_YEARLY_PLAN_ID'),
        'creator_plan_id' => env('RAZORPAY_CREATOR_MONTHLY_PLAN_ID'),
        'creator_yearly_plan_id' => env('RAZORPAY_CREATOR_YEARLY_PLAN_ID'),
        'payout_account_number' => env('RAZORPAYX_ACCOUNT_NUMBER'),
        'offers' => [
            'referral_monthly' => env('RAZORPAY_OFFER_MONTHLY_ID'),
            'referral_yearly' => env('RAZORPAY_OFFER_YEARLY_ID'),
        ],
        'referral_reward_monthly_percent' => env('REFERRAL_REWARD_MONTHLY_PERCENT', 15),
        'referral_reward_yearly_percent' => env('REFERRAL_REWARD_YEARLY_PERCENT', 10),
        'affiliate_reward_monthly_percent' => env('AFFILIATE_REWARD_MONTHLY_PERCENT', 20),
        'affiliate_reward_yearly_percent' => env('AFFILIATE_REWARD_YEARLY_PERCENT', 15),
    ],

];
