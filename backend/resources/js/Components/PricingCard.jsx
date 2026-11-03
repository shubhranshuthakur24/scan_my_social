import React, { useEffect, useRef, useState } from 'react';
import { Check, Coins } from 'lucide-react';
import Button from '@/Components/Button';

const resolvePricing = (price, frequency) => {
    if (!price || typeof price !== 'object') {
        return {
            offer: price ? String(price) : '',
            regular: null,
            monthlyEquivalent: null,
        };
    }

    const selectedPrice = price[frequency] ?? price.monthly ?? price.yearly ?? '';

    if (selectedPrice && typeof selectedPrice === 'object') {
        return {
            offer: selectedPrice.offer ? String(selectedPrice.offer) : '',
            regular: selectedPrice.regular ? String(selectedPrice.regular) : null,
            monthlyEquivalent: selectedPrice.monthlyEquivalent ? String(selectedPrice.monthlyEquivalent) : null,
        };
    }

    return {
        offer: selectedPrice ? String(selectedPrice) : '',
        regular: null,
        monthlyEquivalent: null,
    };
};

const extractNumericPrice = (priceStr) => {
    if (!priceStr) return 0;
    const numeric = String(priceStr).replace(/[^0-9]/g, '');
    return parseInt(numeric, 10) || 0;
};

const buildDisplayPricing = (tierPrice, frequency) => {
    const frequencyPricing = resolvePricing(tierPrice, frequency);
    const monthlyPricing = resolvePricing(tierPrice, 'monthly');
    const yearlyPricing = resolvePricing(tierPrice, 'yearly');
    const yearlySelected = frequency === 'yearly';

    return {
        offer: yearlySelected
            ? (yearlyPricing.monthlyEquivalent || monthlyPricing.offer || frequencyPricing.offer)
            : frequencyPricing.offer,
        regular: yearlySelected
            ? (monthlyPricing.regular || frequencyPricing.regular || null)
            : frequencyPricing.regular,
        billedYearly: yearlySelected ? (yearlyPricing.offer || frequencyPricing.offer || null) : null,
    };
};

const splitOfferValue = (offerValue) => {
    const text = String(offerValue ?? '');
    const match = text.match(/^(.*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);

    if (!match) {
        return {
            prefix: '',
            numeric: text,
            suffix: '',
            hasNumeric: false,
        };
    }

    return {
        prefix: match[1],
        numeric: match[2],
        suffix: match[3],
        hasNumeric: true,
    };
};

const getDecimalPlaces = (numericText) => {
    const decimalPart = String(numericText).split('.')[1];
    return decimalPart ? decimalPart.length : 0;
};

const formatCounterValue = (value, decimalPlaces) => {
    const roundedValue = decimalPlaces > 0
        ? Number(value.toFixed(decimalPlaces))
        : Math.round(value);

    return roundedValue.toLocaleString('en-IN', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    });
};

const resolveTierCredits = (credits, frequency) => {
    if (credits === null || credits === undefined) {
        return null;
    }

    if (typeof credits === 'object' && !Array.isArray(credits)) {
        return credits[frequency] ?? credits.monthly ?? credits.yearly ?? null;
    }

    return credits;
};

const formatCredits = (credits) => {
    if (credits === null || credits === undefined) {
        return null;
    }

    if (typeof credits === 'number') {
        return `${credits.toLocaleString('en-IN')} credits/mo`;
    }

    const normalized = String(credits).trim();
    if (normalized === '') {
        return null;
    }

    return normalized.toLowerCase() === 'custom'
        ? 'Custom credits'
        : normalized;
};

const BILLABLE_FEATURE_LABELS = new Set([
    'Competitor Post Transcription',
    'Competitor Content Analysis',
    'Custom Viral Script Generation',
    'Re-create Competitor\'s Post',
]);

const BILLABLE_FEATURE_CREDIT_COSTS = new Map([
    ['Competitor Post Transcription', 50],
    ['Competitor Content Analysis', 50],
    ['Custom Viral Script Generation', 50],
    ['Re-create Competitor\'s Post', 50],
]);

export default function PricingCard({
    tier,
    paymentFrequency = 'monthly',
    onSubscribe,
    disabled = false,
    isLoading = false,
    loadingText = 'Processing...',
    isCurrentPlan = false,
    theme = 'dark',
}) {
    const isYearlySelected = paymentFrequency === 'yearly';
    const initialDisplayPricing = buildDisplayPricing(tier?.price, paymentFrequency);
    const initialOffer = splitOfferValue(initialDisplayPricing.offer);

    const [displayPricing, setDisplayPricing] = useState(initialDisplayPricing);
    const [animatedOffer, setAnimatedOffer] = useState(() => {
        if (!initialOffer.hasNumeric) {
            return { hasNumeric: false, text: initialDisplayPricing.offer };
        }

        return {
            hasNumeric: true,
            prefix: initialOffer.prefix,
            numeric: '0',
            suffix: initialOffer.suffix,
        };
    });
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
    const animationFrameRef = useRef(null);

    useEffect(() => {
        if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
            return;
        }

        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        const handleMotionPreferenceChange = () => {
            setPrefersReducedMotion(mediaQuery.matches);
        };

        handleMotionPreferenceChange();

        if (typeof mediaQuery.addEventListener === 'function') {
            mediaQuery.addEventListener('change', handleMotionPreferenceChange);
            return () => {
                mediaQuery.removeEventListener('change', handleMotionPreferenceChange);
            };
        }

        mediaQuery.addListener(handleMotionPreferenceChange);
        return () => {
            mediaQuery.removeListener(handleMotionPreferenceChange);
        };
    }, []);

    useEffect(() => {
        const nextDisplayPricing = buildDisplayPricing(tier?.price, paymentFrequency);
        const nextOffer = splitOfferValue(nextDisplayPricing.offer);

        setDisplayPricing(nextDisplayPricing);

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (!nextOffer.hasNumeric) {
            setAnimatedOffer({ hasNumeric: false, text: nextDisplayPricing.offer });
            return;
        }

        const targetNumber = Number(nextOffer.numeric.replace(/,/g, ''));
        if (!Number.isFinite(targetNumber)) {
            setAnimatedOffer({ hasNumeric: false, text: nextDisplayPricing.offer });
            return;
        }

        if (prefersReducedMotion) {
            setAnimatedOffer({
                hasNumeric: true,
                prefix: nextOffer.prefix,
                numeric: nextOffer.numeric,
                suffix: nextOffer.suffix,
            });
            return;
        }

        const decimalPlaces = getDecimalPlaces(nextOffer.numeric);
        const durationMs = 900;
        const startTime = performance.now();

        setAnimatedOffer({
            hasNumeric: true,
            prefix: nextOffer.prefix,
            numeric: formatCounterValue(0, decimalPlaces),
            suffix: nextOffer.suffix,
        });

        const animate = (currentTime) => {
            const progress = Math.min((currentTime - startTime) / durationMs, 1);
            const easedProgress = 1 - Math.pow(1 - progress, 4);
            const currentValue = targetNumber * easedProgress;

            setAnimatedOffer({
                hasNumeric: true,
                prefix: nextOffer.prefix,
                numeric: progress >= 1 ? nextOffer.numeric : formatCounterValue(currentValue, decimalPlaces),
                suffix: nextOffer.suffix,
            });

            if (progress < 1) {
                animationFrameRef.current = requestAnimationFrame(animate);
                return;
            }

            animationFrameRef.current = null;
        };

        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
        };
    }, [paymentFrequency, tier?.price, prefersReducedMotion]);

    const isLightTheme = theme === 'light';
    const creditsText = formatCredits(resolveTierCredits(tier?.credits, paymentFrequency));
    const cardClass = isLightTheme
        ? 'bg-white border border-slate-200 text-slate-900'
        : 'bg-slate-900 border border-slate-700 text-white';
    const mutedClass = isLightTheme ? 'text-slate-500' : 'text-slate-300';
    const strongMutedClass = isLightTheme ? 'text-slate-600' : 'text-slate-200';
    const buttonClass = isCurrentPlan
        ? 'bg-slate-100 text-slate-700 border border-slate-200 cursor-not-allowed'
        : isLoading
            ? 'bg-slate-300 text-slate-600 cursor-wait'
            : 'bg-slate-900 text-white hover:bg-primary-600';

    return (
        <div className={`relative h-full rounded-2xl p-6 shadow-sm flex flex-col font-montserrat ${cardClass} ${tier?.planCode === 'creator' ? 'ring-2 ring-amber-400' : tier?.highlighted ? 'ring-2 ring-primary-300' : ''}`}>
            {tier?.popular ? (
                <span className="absolute -top-3 right-4 inline-flex rounded-full bg-primary-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most Popular
                </span>
            ) : null}

            {tier?.planCode === 'creator' ? (
                <span className="absolute -top-3 right-4 inline-flex rounded-full bg-amber-500 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    Most Value For Money
                </span>
            ) : null}

            <div className="mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold">{tier?.name}</h3>
                    {(() => {
                        const regularVal = extractNumericPrice(displayPricing.regular);
                        const offerVal = extractNumericPrice(displayPricing.offer);

                        if (regularVal > 0 && offerVal > 0 && regularVal > offerVal) {
                            const discount = Math.round(((regularVal - offerVal) / regularVal) * 100);
                            return (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-accent-100 text-accent-700 border border-accent-200 uppercase tracking-tight">
                                    {discount}% OFF
                                </span>
                            );
                        }
                        return null;
                    })()}
                </div>
                <p className={`mt-2 text-sm leading-relaxed ${mutedClass}`}>{tier?.description}</p>
            </div>

            <div className="mb-5">
                <div className="flex min-w-0 flex-wrap items-end gap-x-2 gap-y-1">
                    <p className="text-3xl font-black leading-none tabular-nums">
                        {animatedOffer.hasNumeric ? (
                            <>
                                <span>{animatedOffer.prefix}</span>
                                <span>{animatedOffer.numeric}</span>
                                <span>{animatedOffer.suffix}</span>
                            </>
                        ) : (
                            animatedOffer.text
                        )}
                    </p>
                    {displayPricing.regular ? (
                        <p className={`min-w-0 break-all text-xs leading-tight line-through sm:text-sm ${mutedClass}`}>
                            {displayPricing.regular}
                        </p>
                    ) : null}
                </div>
                {isYearlySelected && displayPricing.billedYearly && (() => {
                    const monthlyRegular = extractNumericPrice(tier?.price?.monthly?.regular || tier?.price?.monthly?.offer);
                    const yearlyTotal = extractNumericPrice(tier?.price?.yearly?.offer);
                    const annualizedRegular = monthlyRegular * 12;
                    const savings = annualizedRegular - yearlyTotal;

                    return savings > 0 ? (
                        <div className="mt-2 flex items-center gap-2 animate-fade-in">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold border ${isLightTheme ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                Billed Yearly
                            </span>
                            <span className="text-[10px] font-black text-accent-600 uppercase tracking-tight">
                                Save ₹{savings.toLocaleString('en-IN')}/yr
                            </span>
                        </div>
                    ) : null;
                })()}
            </div>

            {creditsText ? (
                <div className={`mb-5 rounded-xl border px-3.5 py-3 ${isLightTheme ? 'border-slate-200 bg-slate-50' : 'border-slate-700 bg-slate-800/70'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest ${mutedClass}`}>Credits Included</p>
                    <p className="mt-1 text-sm font-black">{creditsText}</p>
                </div>
            ) : null}

            <ul className="space-y-2.5 mb-6 flex-1">
                {(tier?.features || []).map((feature) => {
                    const featureLabel = String(feature ?? '');
                    const isBillableAction = BILLABLE_FEATURE_LABELS.has(featureLabel.trim());
                    const billableCredits = BILLABLE_FEATURE_CREDIT_COSTS.get(featureLabel.trim());

                    return (
                    <li key={featureLabel} className="flex items-start gap-2.5">
                        <span className={`mt-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full ${tier?.planCode === 'creator' ? 'bg-amber-100 text-amber-600' : 'bg-primary-100 text-primary-600'}`}>
                            <Check className="h-3 w-3" />
                        </span>
                        <span className={`text-sm ${strongMutedClass}`}>
                            <span>{featureLabel}</span>
                            {isBillableAction ? (
                                <Coins
                                    className={`ml-1.5 inline h-3.5 w-3.5 align-[-1px] ${isLightTheme ? 'text-amber-500' : 'text-amber-300'}`}
                                    title={typeof billableCredits === 'number' ? `${billableCredits} credits per action` : 'Credits charged per action'}
                                />
                            ) : null}
                        </span>
                    </li>
                    );
                })}
            </ul>

            <Button
                type="button"
                variant={isCurrentPlan ? 'secondary' : 'primary'}
                onClick={onSubscribe}
                disabled={disabled || isLoading}
                className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition-colors ${buttonClass}`}
            >
                {isCurrentPlan ? (
                    'Current Plan'
                ) : isLoading ? (
                    <span className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-500 border-t-transparent" />
                        {loadingText}
                    </span>
                ) : (
                    tier?.cta || 'Choose Plan'
                )}
            </Button>
        </div>
    );
}
