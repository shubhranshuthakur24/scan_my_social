import React from 'react';
import { Coins } from 'lucide-react';
import PricingCard from '@/Components/PricingCard';

export const TIERS = [
    {
        name: 'Starter',
        planCode: 'starter',
        price: {
            monthly: { offer: '₹1,099/mo', regular: '₹1,499/mo' },
            yearly: { offer: '₹9,588/yr', regular: '₹14,400/yr', monthlyEquivalent: '₹799/mo' },
        },
        credits: {
            monthly: 0,
            yearly: 0,
        },
        description: 'Perfect for getting your first repeatable growth system live.',
        features: [
            '1 Instagram Account',
            'Track up to 5 Competitors',
            'Custom Feed of Viral Videos in Your Niche',
            'Outlier Detection & Scoring',
            'Unlimited Automations',
            'Comment-to-DM Automation',
            'Ask To Follow Before Dm',
            'AutoDm Template Library',
            'Multiple Random Replies',
            'Unlimited Project To Organize Competitor\'s Posts',
            'Unlimited Watchlist Creation',

        ],
        cta: 'Start 14-Day Trial',
    },
    {
        name: 'Pro',
        planCode: 'pro',
        price: {
            monthly: { offer: '₹3,499/mo', regular: '₹4,999/mo' },
            yearly: { offer: '₹29,999/yr', regular: '₹49,998/yr', monthlyEquivalent: '₹2,499/mo' },
        },
        credits: {
            monthly: 20000,
            yearly: 22000,
        },
        description: 'For teams and creators ready to scale across platforms.',
        features: [
            'Everything in Starter',
            '2 Instagram Accounts',
            'Track up to 25 Competitors',

            'Story Comment Automation',
            'Unlimited Greeting DMs',
            'Competitor Post Transcription',
            'Competitor Content Analysis',
            'Custom Lead Forms',
            'Lead Capture & Email Collection',
            'Re-create Competitor\'s Post',
            'Custom Viral Script Generation ',
        ],
        cta: 'Choose Pro',
        popular: true,
        highlighted: true,
    },
    {
        name: 'Creator',
        planCode: 'creator',
        price: {
            monthly: { offer: '₹6,999/mo', regular: '₹9,999/mo' },
            yearly: { offer: '₹59,988/yr', regular: '₹99,980/yr', monthlyEquivalent: '₹4,999/mo' },
        },
        credits: {
            monthly: 50000,
            yearly: 55000,
        },
        description: 'For high-volume creators and operators who want full control.',
        features: [
            'Everything in Pro',
            '5 Instagram Accounts',
            'Track up to 100 competitors',
            'AI hook / script copilot',
            'Outlier detection & scoring',
            'Campaign attribution (DM to Lead)',
            'A/B testing for automation',
        ],
        cta: 'Scale with Creator',
        highlighted: true,
    },
    {
        name: 'Business',
        planCode: 'enterprise',
        price: {
            monthly: '₹19,999+/mo',
            yearly: 'Custom',
        },
        credits: {
            monthly: 'Custom',
            yearly: 'Custom',
        },
        description: 'For agencies and businesses running large-scale automation.',
        features: [
            'Custom / enterprise setup',
            'Custom tracking limits',
            'Up to 5 team seats',
            'Dedicated success manager',
            'White-glove onboarding',
            'Security & compliance',
        ],
        cta: 'Book a Strategy Call',
        contactOnly: true,
        // highlighted: true,
    },
];

export default function PricingTiers({
    tiers = TIERS,
    selectedFrequency,
    hasClaimedFree,
    isTierActive,
    onSubscribe,
    theme = 'light',
    className = 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-24',
    cardWrapperClassName = '',
    isCheckoutBusy = false,
    loadingTierCode = null,
    loadingText = 'Processing...',
}) {
    const billableActions = [
        { label: 'Competitor Post Transcription', credits: 50 },
        { label: 'Competitor Content Analysis', credits: 50 },
        { label: 'Custom Viral Script Generation', credits: 50 },
        { label: 'Re-create Competitor\'s Post', credits: 50 },
    ];

    return (
        <>
            <div className={className}>
                {tiers.map((tier) => {
                    const tierCode = String(tier.planCode || tier.name).toLowerCase();
                    const isCurrentPlan = isTierActive(tier);
                    const isTierLoading = loadingTierCode === tierCode;
                    const renderedTier = tier.planCode === 'starter'
                        ? {
                            ...tier,
                            cta: hasClaimedFree ? 'Choose Starter' : 'Start 14-Day Trial',
                        }
                        : tier;

                    const pricingCard = (
                        <PricingCard
                            tier={renderedTier}
                            paymentFrequency={selectedFrequency}
                            onSubscribe={() => onSubscribe(tier)}
                            disabled={isCurrentPlan || (isCheckoutBusy && !isTierLoading)}
                            isLoading={isTierLoading}
                            loadingText={loadingText}
                            isCurrentPlan={isCurrentPlan}
                            theme={theme}
                        />
                    );

                    if (!cardWrapperClassName) {
                        return <React.Fragment key={tier.name}>{pricingCard}</React.Fragment>;
                    }

                    return (
                        <div key={tier.name} className={cardWrapperClassName}>
                            {pricingCard}
                        </div>
                    );
                })}
            </div>

            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-5 py-4">
                <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-amber-600" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-800">
                        Actions Charged Credits
                    </h4>
                </div>
                <p className="mt-2 text-xs font-medium leading-relaxed text-amber-900/90">
                    Coin icon means this action consumes AI credits.
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-amber-900/90">
                    {billableActions.map((action) => (
                        <span key={action.label} className="font-medium">
                            {action.label}: <span className="font-black">{action.credits} credits/action</span>
                        </span>
                    ))}
                </div>
            </section>
        </>
    );
}
