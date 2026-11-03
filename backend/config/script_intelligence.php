<?php

return [
    'analysis_version' => 'v2',

    'minimum_confidence' => (float) env('SCRIPT_MIN_CONFIDENCE', 0.60),

    'script_types' => [
        'Tool',
        'Framework',
        'Emotional',
        'Experiential',
        'Utility',
    ],

    'psychological_drivers' => [
        'Loss Avoidance',
        'Authority',
        'Belonging',
        'Status',
        'Curiosity',
        'Efficiency',
    ],

    'cta_types' => [
        'Comment CTA',
        'Follow CTA',
        'DM CTA',
        'External Action CTA',
        'Save/Share CTA',
        'Soft CTA',
        'No CTA',
    ],

    'closure_types' => [
        'Direct instruction',
        'Emotional punch',
        'Authority reinforcement',
        'Scarcity push',
        'Identity uplift',
        'Open loop',
        'No clear closure',
    ],

    'script_flows' => [
        'Tool' => [
            'Disruption Demo CTA',
            'Question Demo CTA',
            'Comparison Demo CTA',
            'Announcement Demo CTA',
        ],
        'Framework' => [
            'Numbered Steps',
            'Problem Model Explanation',
            'Myth Reframe Model',
            'QA Authority',
        ],
        'Emotional' => [
            'Repetition Escalation',
            'Story Moral',
            'Identity Reflection',
            'Contrast Realization',
        ],
        'Experiential' => [
            'Immersion Detail Layering',
            'Reveal Experience',
            'Status Signal Closure',
        ],
        'Utility' => [
            'Problem Steps Reinforcement',
            'Situation Action Plan',
            'Problem Outcome',
        ],
    ],

    'recreation_modes' => [
        'close_match',
        'balanced',
        'fresh_version',
    ],

    'keywords' => [
        'cta' => [
            'comment',
            'follow',
            'dm',
            'message me',
            'link in bio',
            'click',
            'register',
            'subscribe',
            'join',
            'save this',
            'share this',
        ],
        'authority' => [
            'google',
            'meta',
            'expert',
            'client',
            'founder',
            'experience',
            'data',
            'research',
            'tested',
            'case study',
        ],
        'contrast' => [
            'but',
            'however',
            'instead',
            'actually',
            'lekin',
            'par',
            'magar',
            'balki',
        ],
    ],
];
