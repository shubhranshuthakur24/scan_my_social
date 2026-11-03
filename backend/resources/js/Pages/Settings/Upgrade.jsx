import React, { useRef, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PricingTab from '@/Components/PricingTab';
import PricingTiers, { TIERS } from '@/Components/PricingTiers';
import PricingBanner from '@/Components/PricingBanner';
import { useToast } from '@/Contexts/ToastContext';

import FeatureBlueprint from '@/Components/FeatureBlueprint';

const PAYMENT_FREQUENCIES = ['monthly', 'yearly'];

export default function Upgrade({ auth, hasClaimedFree, razorpayKey }) {
    const [selectedFrequency, setSelectedFrequency] = useState(PAYMENT_FREQUENCIES[1]);
    const [checkoutState, setCheckoutState] = useState({ phase: 'idle', tierCode: null });
    const paymentCompletedRef = useRef(false);
    const { addToast } = useToast();
    const normalizedActivePlan = String(auth?.plan || '').toLowerCase();
    const checkoutKey = String(razorpayKey || import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();
    const isCheckoutBusy = checkoutState.phase !== 'idle';

    const isTierActive = (tier) => {
        const tierCode = String(tier.planCode || tier.name).toLowerCase();

        return normalizedActivePlan === tierCode || normalizedActivePlan === `${tierCode}_yearly`;
    };

    const resolveCheckoutPlanCode = (tierCode) => {
        if (tierCode === 'starter') {
            return selectedFrequency === 'yearly' ? 'starter_yearly' : 'starter';
        }

        if (tierCode === 'pro' || tierCode === 'creator') {
            return selectedFrequency === 'yearly' ? `${tierCode}_yearly` : tierCode;
        }

        return null;
    };

    const activeTierName = TIERS.find((tier) => isTierActive(tier))?.name || null;
    const checkoutStatusText = checkoutState.phase === 'creating'
        ? 'Preparing secure checkout...'
        : checkoutState.phase === 'verifying'
            ? 'Payment received. Verifying subscription...'
            : checkoutState.phase === 'redirecting'
                ? 'Subscription activated. Redirecting...'
                : null;
    const checkoutButtonText = checkoutState.phase === 'creating'
        ? 'Preparing...'
        : checkoutState.phase === 'verifying'
            ? 'Verifying...'
            : checkoutState.phase === 'redirecting'
                ? 'Redirecting...'
                : 'Processing...';

    const handleSubscribe = async (plan) => {
        const tierCode = String(plan.planCode || plan.name).toLowerCase();

        if (isCheckoutBusy) {
            return;
        }

        if (isTierActive(plan)) {
            addToast(`You are already on the ${plan.name} plan.`, 'info');
            return;
        }

        if (plan.contactOnly || tierCode === 'enterprise') {
            return (window.location.href = 'mailto:gchandra4727@gmail.com');
        }

        setCheckoutState({ phase: 'creating', tierCode });

        const checkoutPlanCode = resolveCheckoutPlanCode(tierCode);
        if (!checkoutPlanCode) {
            setCheckoutState({ phase: 'idle', tierCode: null });
            addToast('This plan is not available for checkout yet.', 'error');
            return;
        }

        if (!checkoutKey) {
            setCheckoutState({ phase: 'idle', tierCode: null });
            addToast('Payment is temporarily unavailable due to missing billing configuration. Please contact support.', 'error');
            return;
        }

        if (typeof window.Razorpay !== 'function') {
            setCheckoutState({ phase: 'idle', tierCode: null });
            addToast('Payment gateway failed to load. Please refresh and try again.', 'error');
            return;
        }

        try {
            const { data } = await axios.post('/api/subscriptions/create', { plan: checkoutPlanCode });

            if (!data.success) {
                setCheckoutState({ phase: 'idle', tierCode: null });
                addToast(data?.message || 'Failed to initialize checkout. Please try again.', 'error');
                return;
            }

            paymentCompletedRef.current = false;

            const options = {
                key: checkoutKey,
                subscription_id: data.subscription_id,
                name: 'ScanMySocial AI',
                description: `${plan.name} Subscription`,
                handler: async function (response) {
                    paymentCompletedRef.current = true;
                    setCheckoutState({ phase: 'verifying', tierCode });

                    try {
                        const verifyData = await axios.post('/api/subscriptions/verify', {
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_subscription_id: response.razorpay_subscription_id,
                            razorpay_signature: response.razorpay_signature,
                            plan_name: tierCode,
                        });

                        if (verifyData.data.success) {
                            setCheckoutState({ phase: 'redirecting', tierCode });
                            addToast(`Subscription activated successfully! Welcome to the ${plan.name} plan.`, 'success');
                            router.visit(route('dashboard'));
                            return;
                        }

                        setCheckoutState({ phase: 'idle', tierCode: null });
                        addToast('Payment verification failed. Please contact support.', 'error');
                    } catch (err) {
                        setCheckoutState({ phase: 'idle', tierCode: null });
                        addToast(
                            err?.response?.data?.message || 'Payment verification failed. Please contact support.',
                            'error'
                        );
                    }
                },
                prefill: {
                    name: auth.user.name,
                    email: auth.user.email,
                },
                theme: {
                    color: plan.name === 'Creator' ? '#F43F5E' : '#7C3AED',
                },
                modal: {
                    ondismiss: function () {
                        if (paymentCompletedRef.current) {
                            return;
                        }

                        setCheckoutState({ phase: 'idle', tierCode: null });
                        addToast('Checkout was cancelled.', 'info');
                    },
                },
            };

            const rzp = new window.Razorpay(options);
            rzp.open();
        } catch (error) {
            setCheckoutState({ phase: 'idle', tierCode: null });
            addToast(
                'Failed to initialize checkout. ' + (error.response?.data?.message || 'Please map Plan IDs correctly.'),
                'error'
            );
        }
    };


    return (
        <AuthenticatedLayout
            user={auth.user}
            headerZClass="z-30"

        >
            <Head title="Upgrade Plan">
                <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                <link
                    href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"
                    rel="stylesheet"
                />
                <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
            </Head>

            <div className=" bg-gray-50 min-h-screen pt-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <PricingBanner />
                    <div className="relative z-10">
                        {/* Header */}
                        <div className="text-center  mb-2 relative">
                            {/* Cyan radial glow */}

                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-200 shadow-sm relative">
                                <span className="w-2 h-2 rounded-full border border-primary-400" />
                                <span className="text-xs font-medium text-gray-500 tracking-wide">
                                    Cancel anytime. Billed automatically at end of cycle.
                                </span>
                            </div>

                        </div>

                        {/* Billing toggle */}
                        <div className="flex justify-center items-center mb-12">
                            <div className="bg-gray-100/50 p-1 rounded-full border border-gray-200 flex items-center relative shadow-inner">
                                {PAYMENT_FREQUENCIES.map((freq) => (
                                    <PricingTab
                                        key={freq}
                                        text={freq}
                                        selected={selectedFrequency === freq}
                                        setSelected={setSelectedFrequency}
                                        theme="light"
                                    />
                                ))}

                            </div>
                        </div>

                        {checkoutStatusText && (
                            <div className="mb-6 text-center">
                                <span className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-xs font-semibold text-primary-700">
                                    <span className="h-3 w-3 animate-spin rounded-full border border-primary-500 border-t-transparent" />
                                    {checkoutStatusText}
                                </span>
                            </div>
                        )}

                        {/* Plan Cards */}
                        <PricingTiers
                            selectedFrequency={selectedFrequency}
                            hasClaimedFree={hasClaimedFree}
                            isTierActive={isTierActive}
                            onSubscribe={handleSubscribe}
                            theme="light"
                            isCheckoutBusy={isCheckoutBusy}
                            loadingTierCode={checkoutState.tierCode}
                            loadingText={checkoutButtonText}
                        />

                        {/* Feature Blueprint (Tabbed) */}
                        <FeatureBlueprint />
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
