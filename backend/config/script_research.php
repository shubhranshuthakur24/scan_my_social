<?php

return [
    'version' => (int) env('SCRIPT_RESEARCH_VERSION', 1),
    'provider' => 'openai',
    'provider_version' => 'responses-web-search-v1',
    'model' => env('OPENAI_MODEL_SCRIPT_RESEARCH', env('OPENAI_MODEL_CONTENT_ANALYSIS', 'gpt-5.4-mini')),
    'deep_enabled' => (bool) env('SCRIPT_RESEARCH_DEEP_ENABLED', false),
    'rewrite_threshold' => (float) env('SCRIPT_REWRITE_THRESHOLD', 8),
    'retention_days' => (int) env('SCRIPT_RESEARCH_RETENTION_DAYS', 90),
    'lock_ttl_seconds' => (int) env('SCRIPT_RESEARCH_LOCK_TTL_SECONDS', 120),
    'lock_retry_seconds' => (int) env('SCRIPT_RESEARCH_LOCK_RETRY_SECONDS', 10),
    'lock_max_attempts' => (int) env('SCRIPT_RESEARCH_LOCK_MAX_ATTEMPTS', 3),
    'max_supplemental_queries' => (int) env('SCRIPT_RESEARCH_MAX_SUPPLEMENTAL_QUERIES', 1),
    'max_supplemental_sources' => (int) env('SCRIPT_RESEARCH_MAX_SUPPLEMENTAL_SOURCES', 5),
    'generation_cost' => 50,
    'intents' => [
        'educational' => ['label' => 'Educational', 'hours' => 168],
        'news' => ['label' => 'News', 'hours' => 6],
        'trend' => ['label' => 'Trend', 'hours' => 24],
        'opinion' => ['label' => 'Opinion', 'hours' => 72],
        'investigative' => ['label' => 'Investigative', 'hours' => 24],
    ],
    'tiers' => [
        'lite' => ['live_cost' => 20, 'cache_cost' => 10, 'max_sources' => 6],
        'deep' => ['live_cost' => 50, 'cache_cost' => 25, 'max_sources' => 12],
    ],
];
