import React, { useCallback, useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, useForm, usePage, router } from '@inertiajs/react';
import { ArrowLeft, Check, PenBox, ScrollText, Sparkles, X } from 'lucide-react';
import axios from 'axios';
import Button from '@/Components/Button';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import ScriptRecreateModal from '@/Components/ScriptRecreateModal';
import { useToast } from '@/Contexts/ToastContext';

const ACTIVE_PLAN_CODES = new Set([
    'starter',
    'starter_yearly',
    'pro',
    'pro_yearly',
    'creator',
    'creator_yearly',
]);

export default function Refine({ post }) {
    const { auth } = usePage().props;
    const { addToast } = useToast();
    const hasActivePlan = ACTIVE_PLAN_CODES.has(String(auth?.plan || '').toLowerCase());

    const resolveLatestScript = (postData) => {
        const scripts = postData?.content_analysis?.generated_scripts || [];

        if (scripts.length > 0) {
            return [...scripts].sort((a, b) => (b.id || 0) - (a.id || 0))[0];
        }

        return postData?.content_analysis?.generated_script || null;
    };

    const initialScript = resolveLatestScript(post);
    const buildFormData = (scriptData, postData) => ({
        title: scriptData?.title || '',
        revised_script: scriptData?.revised_script || scriptData?.script || '',
        hook: scriptData?.hook || postData.content_analysis?.hook || '',
        content_angle: scriptData?.content_angle || postData.content_analysis?.content_angle || '',
        psychological_driver: scriptData?.psychological_driver || postData.content_analysis?.psychological_driver || '',
        structure_model: scriptData?.structure_model || postData.content_analysis?.structure_model || '',
        mechanism_type: scriptData?.mechanism_type || postData.content_analysis?.mechanism_type || '',
        insight_shift: scriptData?.insight_shift || postData.content_analysis?.insight_shift || '',
        rhythm_profile: scriptData?.rhythm_profile || postData.content_analysis?.rhythm_profile || '',
        cta_type: scriptData?.cta_type || postData.content_analysis?.cta_type || '',
        closure_type: scriptData?.closure_type || postData.content_analysis?.closure_type || '',
        archetype: scriptData?.archetype || postData.content_analysis?.archetype || '',
    });

    const [script, setScript] = useState(initialScript);
    const [isGenerating, setIsGenerating] = useState(false);
    const [generateError, setGenerateError] = useState(null);
    const [refineError, setRefineError] = useState(null);
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
    const statusPollRef = useRef(null);
    const hasAutoOpenedModalRef = useRef(false);

    const { data, setData, processing } = useForm(buildFormData(script, post));

    const [saveStatus, setSaveStatus] = useState(null);
    const lastSavedData = useRef(JSON.stringify(data));
    const [isRefining, setIsRefining] = useState(false);
    const [showRecreateModal, setShowRecreateModal] = useState(false);

    const stopStatusPolling = useCallback(() => {
        if (statusPollRef.current) {
            clearInterval(statusPollRef.current);
            statusPollRef.current = null;
        }
    }, []);

    const applyScriptPayload = useCallback((nextScript) => {
        if (!nextScript) {
            return;
        }

        setScript(nextScript);
        const nextData = buildFormData(nextScript, post);
        setData(nextData);
        lastSavedData.current = JSON.stringify(nextData);
    }, [post, setData]);

    const fetchScriptStatus = useCallback(async (scriptId) => {
        const response = await fetch(`/api/scripts/${scriptId}/status`, {
            headers: {
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Unable to fetch refinement status.');
        }

        const payload = await response.json();
        const nextStatus = payload?.status;
        if (payload?.script) {
            setScript(payload.script);
        }

        if (nextStatus === 'completed') {
            if (payload?.script) {
                applyScriptPayload(payload.script);
            }
            stopStatusPolling();
            setIsRefining(false);
            setRefineError(null);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus(null), 3000);
        } else if (nextStatus === 'failed') {
            stopStatusPolling();
            setIsRefining(false);
            setRefineError(payload?.error || 'Auto-refine failed. Please retry.');
            setSaveStatus('error');
        }
    }, [applyScriptPayload, stopStatusPolling]);

    const startStatusPolling = useCallback((scriptId) => {
        stopStatusPolling();
        fetchScriptStatus(scriptId).catch((error) => {
            console.error('Failed to fetch refine status:', error);
        });
        statusPollRef.current = setInterval(() => {
            fetchScriptStatus(scriptId).catch((error) => {
                console.error('Failed to fetch refine status:', error);
            });
        }, 2000);
    }, [fetchScriptStatus, stopStatusPolling]);

    const handleRecreate = async (payload) => {
        setShowRecreateModal(false);
        setIsRefining(true);
        setRefineError(null);
        setShowUpgradePrompt(false);

        if (!hasActivePlan) {
            const message = 'You need an active subscription to generate scripts.';
            setSaveStatus('error');
            setRefineError(message);
            setShowUpgradePrompt(true);
            addToast(`${message} Please upgrade to continue.`, 'error');
            setIsRefining(false);
            return;
        }

        try {
            const { data: result } = await axios.post(`/api/scripts/generate`, payload, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            if (result.success) {
                // For generate, it returns success, but the new script might be in result.scripts[0]
                // or we just trigger the poll on the video page. Actually, generation happens via a job.
                // We should just reload the post to pick up the new processing script.
                router.reload({ only: ['post'] });
            } else {
                setSaveStatus('error');
                setRefineError(result.message || 'Recreation failed. Please try again.');
                setIsRefining(false);
            }
        } catch (error) {
            console.error('Recreation failed:', error);
            setSaveStatus('error');
            const responseData = error?.response?.data || {};
            const isNoPlan = error?.response?.status === 403 && responseData?.error === 'no_active_plan';
            const message = responseData?.message
                || responseData?.error
                || 'Recreation failed. Please try again.';
            setRefineError(message);
            setShowUpgradePrompt(isNoPlan);
            if (isNoPlan) {
                addToast(`${message} Please upgrade to continue.`, 'error');
            }
            setIsRefining(false);
        }
    };



    useEffect(() => {
        const latestScript = resolveLatestScript(post);

        if (!latestScript?.id || latestScript.id === script?.id) return;

        applyScriptPayload(latestScript);
    }, [applyScriptPayload, post, script?.id]);



    useEffect(() => {
        return () => stopStatusPolling();
    }, [stopStatusPolling]);

    const handleSubmit = (e) => {
        if (e) e.preventDefault();
        if (!script?.id) return;
        if (script?.status === 'processing') return;

        // Skip if already saving or if data hasn't changed
        const currentData = JSON.stringify(data);
        if (saveStatus === 'saving' || currentData === lastSavedData.current) {
            return;
        }

        setSaveStatus('saving');

        axios.post(`/api/scripts/${script.id}/refine`, data)
            .then(({ data: result }) => {
                if (result.success) {
                    setSaveStatus('saved');
                    lastSavedData.current = currentData;
                    setTimeout(() => setSaveStatus(null), 3000);
                } else {
                    setSaveStatus('error');
                }
            })
            .catch(() => setSaveStatus('error'));
    };

    // Auto-save every 15 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            if (script?.status !== 'processing') {
                handleSubmit();
            }
        }, 15000);

        return () => clearInterval(timer);
    }, [data, script?.id, script?.status, saveStatus]);

    return (
        <AuthenticatedLayout>
            <Head title="Refine Script" />

            {/* Loading overlay when generating script */}
            {isGenerating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
                        <svg className="w-12 h-12 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <h3 className="text-lg font-bold text-slate-900">Generating Your Script</h3>
                        <p className="text-sm text-slate-500 text-center">Our AI is crafting a personalized script based on the content analysis. This may take up to a minute...</p>
                    </div>
                </div>
            )}

            {/* Error state for generation failure */}
            {generateError && !isGenerating && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4">
                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <X className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Script Generation Failed</h3>
                        <p className="text-sm text-slate-500 text-center">{generateError}</p>
                        <Button href={`/Library/${post.id}`} variant="primary" size="sm">
                            Back to Video Details
                        </Button>
                    </div>
                </div>
            )}

            <div className="mx-auto w-full max-w-[1400px] space-y-6 pb-16">
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-500">
                    <Link href="/Library" className="rounded-lg transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2">
                        Videos
                    </Link>
                    <span>/</span>
                    <Link href={`/Library/${post.id}`} className="rounded-lg transition-colors hover:text-primary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2">
                        Post Details
                    </Link>
                    <span>/</span>
                    <span className="text-slate-900">Refine Script</span>
                </div>

                <PageBanner
                    variant="soft"
                    title={`Refine Script${script?.id ? ` v${script.id}` : ''}`}
                    description="Edit the generated script against the original transcript. Autosave continues in the background."
                    actions={
                        <>
                            <PageBannerAction
                                type="button"
                                onClick={() => setShowRecreateModal(true)}
                                disabled={isRefining || processing}
                                variant="neutralSecondary"
                                className={isRefining ? 'animate-pulse' : ''}
                            >
                                {isRefining ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="h-4 w-4" />
                                        Recreate Script
                                    </>
                                )}
                            </PageBannerAction>
                            <PageBannerAction href={`/Library/${post.id}`} variant="neutralSecondary">
                                <ArrowLeft className="h-4 w-4" />
                                Back to post
                            </PageBannerAction>
                            <PageBannerAction
                                type="button"
                                onClick={handleSubmit}
                                disabled={processing || saveStatus === 'saving'}
                                variant="neutralPrimary"
                            >
                                {saveStatus === 'saving' ? (
                                    <>
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                        Saving...
                                    </>
                                ) : saveStatus === 'saved' ? (
                                    <>
                                        <Check className="h-4 w-4 text-success-300" />
                                        Saved
                                    </>
                                ) : (
                                    'Save Refinement'
                                )}
                            </PageBannerAction>
                        </>
                    }
                />

                <ScriptRecreateModal
                    show={showRecreateModal}
                    onClose={() => setShowRecreateModal(false)}
                    onConfirm={handleRecreate}
                    sourceScriptId={script?.id}
                />

                {refineError && (
                    <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm font-medium ${showUpgradePrompt ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                        <div className="flex flex-col gap-2">
                            <p>{refineError}</p>
                            {showUpgradePrompt ? (
                                <div>
                                    <Button href={route('settings.upgrade')} variant="primary" size="xs">
                                        Upgrade Now
                                    </Button>
                                </div>
                            ) : null}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-2">
                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                            <ScrollText className="h-5 w-5 text-slate-400" />
                            <div className="min-w-0">
                                <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Original Transcript</h2>
                                <p className="mt-0.5 text-xs font-medium text-slate-400">Read-only source context for the rewrite.</p>
                            </div>
                        </div>
                        <div className="h-[520px] overflow-y-auto p-5 custom-scrollbar xl:h-[750px]">
                            <p className="break-words text-[14px] font-medium leading-relaxed text-slate-600 whitespace-pre-wrap">
                                {post.content_analysis?.transcription}
                            </p>
                        </div>
                    </section>

                    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                        <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <PenBox className="h-5 w-5 text-primary-600" />
                                    <div>
                                        <h2 className="text-xs font-black uppercase tracking-widest text-primary-700">Refined Script</h2>
                                        <p className="mt-0.5 text-xs font-medium text-slate-500">Editable script draft for this video.</p>
                                    </div>
                                </div>
                                {data.revised_script.length > 0 && (
                                    <span className="rounded-full border border-primary-100 bg-primary-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-primary-700">
                                        {data.revised_script.split(/\s+/).length} words
                                    </span>
                                )}
                            </div>

                            <div className="mt-4 space-y-1.5">
                                <label className="px-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Script Title</label>
                                <input
                                    type="text"
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    placeholder="Enter a punchy title for this script..."
                                    className="w-full rounded-2xl border border-slate-200 bg-white p-3.5 text-sm font-bold text-slate-800 shadow-sm transition-all placeholder:text-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-50"
                                />
                            </div>
                        </div>

                        <div className="h-[520px] p-4 xl:h-[750px]">
                            <textarea
                                value={data.revised_script}
                                onChange={(e) => setData('revised_script', e.target.value)}
                                placeholder="Start refining your script here..."
                                className="h-full w-full resize-none rounded-2xl border border-primary-100 bg-white p-5 text-[15px] font-medium leading-relaxed text-slate-800 shadow-inner transition-all placeholder:text-slate-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-50 custom-scrollbar"
                            />
                        </div>
                    </section>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
