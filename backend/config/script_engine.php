<?php

return [
    'workflow_version' => 'viral-engine-v1',
    'angle_count' => 5,

    'platforms' => [
        'instagram_reel' => [
            'label' => 'Instagram Reel',
            'format' => 'video',
            'communication_style' => 'single_viewer',
            'lengths' => ['30s', '45s', '60s', '90s'],
        ],
        'linkedin_post' => [
            'label' => 'LinkedIn Post',
            'format' => 'post',
            'communication_style' => 'industry_commentary',
            'lengths' => ['short_post', 'standard_post', 'long_post'],
        ],
        'linkedin_video' => [
            'label' => 'LinkedIn Video',
            'format' => 'video',
            'communication_style' => 'industry_commentary',
            'lengths' => ['30s', '45s', '60s', '90s'],
        ],
        'youtube_short' => [
            'label' => 'YouTube Short',
            'format' => 'video',
            'communication_style' => 'single_viewer',
            'lengths' => ['30s', '45s', '60s', '90s'],
        ],
        'tiktok' => [
            'label' => 'TikTok',
            'format' => 'video',
            'communication_style' => 'single_viewer',
            'lengths' => ['30s', '45s', '60s', '90s'],
        ],
    ],

    'lengths' => [
        '30s' => '30 Seconds',
        '45s' => '45 Seconds',
        '60s' => '60 Seconds',
        '90s' => '90 Seconds',
        'short_post' => 'Short Post (up to 150 words)',
        'standard_post' => 'Standard Post (up to 300 words)',
        'long_post' => 'Long Post (up to 500 words)',
    ],

    'objectives' => [
        'go_viral' => [
            'label' => 'Go Viral',
            'instruction' => 'Maximize stopping power, retention, and shareability without sacrificing credibility.',
        ],
        'build_authority' => [
            'label' => 'Build Authority',
            'instruction' => 'Demonstrate clear expertise, useful judgment, and trustworthy insight.',
        ],
        'generate_leads' => [
            'label' => 'Generate Leads',
            'instruction' => 'Move qualified viewers toward a specific lead-generating next step.',
        ],
        'generate_dms' => [
            'label' => 'Generate DMs',
            'instruction' => 'Create curiosity and a clear reason to start a direct-message conversation.',
        ],
        'increase_engagement' => [
            'label' => 'Increase Engagement',
            'instruction' => 'Encourage meaningful comments, saves, and shares around the topic.',
        ],
        'sell_product' => [
            'label' => 'Sell Product',
            'instruction' => 'Connect the audience problem to the offer with a persuasive but credible transition.',
        ],
    ],

    'problem_suggestions' => [
        'Lost Leads',
        'Poor Follow-Up',
        'Low Conversions',
        'Hiring Issues',
        'Low Engagement',
    ],

    'audience_suggestions' => [
        'Creators',
        'Coaches',
        'Consultants',
        'Founders',
        'Marketing Teams',
        'Small Business Owners',
    ],

    'tones' => [
        'Savage',
        'Informative',
        'Calm',
        'Exposing',
        'Authoritative',
        'Conversational',
        'Energetic',
        'Storytelling',
    ],

    'content_mix_presets' => [
        'authority_builder' => [
            'label' => 'Authority Builder',
            'educate' => 80,
            'entertain' => 10,
            'emotion' => 10,
        ],
        'viral_growth' => [
            'label' => 'Viral Growth',
            'educate' => 40,
            'entertain' => 30,
            'emotion' => 30,
        ],
        'lead_generator' => [
            'label' => 'Lead Generator',
            'educate' => 60,
            'entertain' => 10,
            'emotion' => 30,
        ],
        'story_driven' => [
            'label' => 'Story Driven',
            'educate' => 20,
            'entertain' => 30,
            'emotion' => 50,
        ],
        'debate_starter' => [
            'label' => 'Debate Starter',
            'educate' => 30,
            'entertain' => 10,
            'emotion' => 60,
        ],
    ],
];
