import React, { useState } from 'react';

/* Feature Blueprint categories */
export const FEATURE_CATEGORIES = [
    {
        label: 'Core Discovery',
        features: [
            { name: 'Outlier Discovery', values: [true, true, true] },
            { name: 'Platform Access', values: ['1 Platform', 'All Platforms', 'All Platforms'] },
            { name: 'Creators Tracked', values: ['Max 5', 'Max 50', 'Unlimited*'] },
            { name: 'Videos per Creator', values: ['Top 10', 'Top 50', 'All Relevant'] },
            { name: 'Advanced Filters', values: [false, true, true] },
        ],
    },
    {
        label: 'Intelligence & Insights',
        features: [
            { name: 'Why This Is an Outlier', values: ['Basic', 'Detailed', 'Detailed'] },
            { name: 'Outlier Comparison', values: [true, true, true] },
            { name: 'Advanced Outlier Scoring', values: [false, true, true] },
            { name: 'Save Outliers', values: ['Temporary', 'Limited Vault', 'Unlimited Vaults'] },
            { name: 'Idea Vaults / Projects', values: [false, 'Limited', 'Unlimited'] },
        ],
    },
    {
        label: 'Content Creation & AI',
        features: [
            { name: 'Hook & Angle Library', values: [false, 'Read-only', 'Full Access'] },
            { name: 'Auto Transcription', values: [false, true, true] },
            { name: 'Script Breakdown', values: [false, true, true] },
            { name: 'AI Script Recreation', values: [false, true, true] },
            { name: 'Multiple Hook Variations', values: [false, true, true] },
            { name: 'Script Success Prediction', values: [false, false, true] },
            { name: 'Caption & Title Generation', values: [false, true, true] },
        ],
    },
    {
        label: 'Creative Production',
        features: [
            { name: 'AI Voice (ElevenLabs)', values: [false, false, true] },
            { name: 'Voice Cloning', values: [false, false, true] },
            { name: 'AI Avatar Video (HeyGen)', values: [false, false, true] },
            { name: 'Vertical Video Output (9:16)', values: [false, false, true] },
            { name: 'B-roll & Meme Suggestions', values: [false, false, true] },
        ],
    },
    {
        label: 'Distribution & Automation',
        features: [
            { name: 'Auto Scheduling', values: [false, false, true] },
            { name: 'Queue-Based Posting', values: [false, false, true] },
            { name: 'Auto DM / DM Flow Builder', values: [false, false, true] },
            { name: 'Analytics Dashboard', values: [false, false, true] },
            { name: 'Priority Processing', values: [false, false, true] },
        ],
    },
];

export default function FeatureBlueprint() {
    const [activeCategory, setActiveCategory] = useState(0);
    const currentCategory = FEATURE_CATEGORIES[activeCategory];
    const planHeaders = ['Starter', 'Pro', 'Creator'];

    return (
        <div className="mb-12">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                    Feature Blueprint
                </h2>
                <p className="text-gray-500">Deep-dive into the capabilities of each tier.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Category sidebar */}
                <div className="md:col-span-3 space-y-2">
                    {FEATURE_CATEGORIES.map((cat, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveCategory(i)}
                            className={`w-full text-left px-4 py-3 rounded-lg font-medium border-l-2 transition-all text-sm ${activeCategory === i
                                ? 'bg-white text-primary-600 border-primary-500 shadow-sm'
                                : 'hover:bg-gray-50 text-gray-500 hover:text-gray-900 border-transparent'
                                }`}
                        >
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* Feature grid */}
                <div className="md:col-span-9 bg-white rounded-xl border border-gray-200 relative overflow-hidden shadow-sm">
                    <div
                        className="absolute inset-0 pointer-events-none opacity-5"
                        style={{
                            backgroundImage:
                                "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23000000' fill-opacity='0.03' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
                        }}
                    />
                    <div className="p-8 overflow-x-auto relative z-10 w-full">
                        <div className="min-w-[550px] md:min-w-0">
                            <div className="grid grid-cols-4 gap-4 mb-6 text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100 pb-4 relative z-10">
                                <div>Feature</div>
                                {planHeaders.map((name) => (
                                    <div
                                        key={name}
                                        className={`text-center ${name === 'Pro'
                                            ? 'text-primary-600'
                                            : name === 'Creator'
                                                ? 'text-accent-600'
                                                : ''
                                            }`}
                                    >
                                        {name}
                                    </div>
                                ))}
                            </div>

                            <div className="space-y-6 relative z-10">
                                {currentCategory.features.map((feature, i) => (
                                    <div key={i} className="grid grid-cols-4 gap-4 items-center group">
                                        <div className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors">
                                            {feature.name}
                                        </div>
                                        {feature.values.map((val, j) => (
                                            <div key={j} className="flex justify-center">
                                                {typeof val === 'boolean' ? (
                                                    val ? (
                                                        <span className="material-icons text-green-500 text-sm">
                                                            check
                                                        </span>
                                                    ) : (
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                                                    )
                                                ) : (
                                                    <span
                                                        className={`text-xs text-center ${j === 0
                                                            ? 'text-gray-500'
                                                            : j === 2
                                                                ? 'text-accent-600 font-bold'
                                                                : 'text-gray-900'
                                                            }`}
                                                    >
                                                        {val}
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <p className="text-center text-xs text-gray-600 mt-8 italic">
                *Unlimited tracked creators subject to fair-usage policy to ensure system integrity.
            </p>
        </div>
    );
}
