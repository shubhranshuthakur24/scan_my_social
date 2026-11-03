import { useMemo, useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import useScriptPolling from '@/Hooks/useScriptPolling';
import { useToast } from '@/Contexts/ToastContext';

const activeStatuses = ['researching', 'generating_angles', 'generating_script', 'validating'];

const steps = [
    { key: 'research', label: 'Research' },
    { key: 'angles', label: 'Angles' },
    { key: 'selection', label: 'Selection' },
    { key: 'script', label: 'Script' },
    { key: 'quality', label: 'Quality' },
];

function currentStep(batch) {
    if (['researching', 'needs_input', 'research_blocked'].includes(batch.status)) return 'research';
    if (batch.status === 'generating_angles') return 'angles';
    if (batch.status === 'awaiting_angle') return 'selection';
    if (batch.status === 'generating_script') return 'script';
    if (batch.status === 'validating') return 'quality';
    if (batch.status === 'completed') return 'quality';
    return 'research';
}

function Progress({ batch }) {
    const active = currentStep(batch);
    const activeIndex = steps.findIndex((step) => step.key === active);

    return (
        <ol className="grid grid-cols-5 gap-2" aria-label="Script generation progress">
            {steps.map((step, index) => {
                const complete = index < activeIndex || batch.status === 'completed';
                const selected = index === activeIndex && batch.status !== 'completed';

                return (
                    <li key={step.key} className="space-y-2">
                        <div className={`h-2 rounded-full ${
                            complete ? 'bg-success-500' : selected ? 'bg-primary-600' : 'bg-slate-200'
                        }`} />
                        <span className={`block truncate text-center text-[10px] font-bold uppercase tracking-wide ${
                            complete || selected ? 'text-slate-700' : 'text-slate-400'
                        }`}>
                            {step.label}
                        </span>
                    </li>
                );
            })}
        </ol>
    );
}

function WaitingState({ batch }) {
    const copy = {
        researching: ['Researching your topic', 'Gathering current evidence and checking confidence.'],
        generating_angles: ['Developing five distinct angles', 'Combining your brief, content mix, and available evidence.'],
        generating_script: ['Writing the selected angle', 'Building the hook, retention flow, CTA, and final copy.'],
        validating: ['Running the quality gate', 'Checking evidence, language, length, CTA, safety, and platform fit.'],
    };
    const [title, description] = copy[batch.status] || ['Preparing your script', 'This page will update automatically.'];

    return (
        <section className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-14 text-center shadow-sm">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50">
                <svg className="h-7 w-7 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
            <div>
                <h2 className="text-lg font-black text-slate-900">{title}</h2>
                <p className="mt-1 text-sm text-slate-500">{description}</p>
            </div>
        </section>
    );
}

function ResearchInput({ batch }) {
    const [facts, setFacts] = useState('');
    const [urls, setUrls] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const submit = async () => {
        setSubmitting(true);
        setError('');
        try {
            const response = await fetch(route('api.script-batches.resume', batch.id), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify({
                    user_facts: facts.split('\n').map((item) => item.trim()).filter(Boolean),
                    source_urls: urls.split('\n').map((item) => item.trim()).filter(Boolean),
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Unable to resume research.');
            router.reload({ only: ['batch'], preserveScroll: true });
        } catch (resumeError) {
            setError(resumeError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="space-y-4 rounded-2xl border border-warning-200 bg-warning-50 p-5">
            <div>
                <h2 className="text-lg font-black text-warning-900">More evidence is needed</h2>
                <ul className="mt-2 space-y-1 text-sm text-warning-800">
                    {(batch.unresolved_questions || []).map((question, index) => <li key={index}>{question}</li>)}
                </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <textarea value={facts} onChange={(event) => setFacts(event.target.value)} rows={4} placeholder="New user facts, one per line" className="resize-none rounded-xl border-warning-200 bg-white text-sm focus:border-primary-400 focus:ring-primary-200" />
                <textarea value={urls} onChange={(event) => setUrls(event.target.value)} rows={4} placeholder="New source URLs, one per line" className="resize-none rounded-xl border-warning-200 bg-white text-sm focus:border-primary-400 focus:ring-primary-200" />
            </div>
            {error ? <p className="text-xs font-semibold text-danger-600">{error}</p> : null}
            <Button onClick={submit} isLoading={submitting} size="sm">Resume Research</Button>
        </section>
    );
}

export default function Build({ batch }) {
    const { addToast } = useToast();
    const [selecting, setSelecting] = useState(null);
    const [retrying, setRetrying] = useState(false);
    const script = batch.scripts?.[0];
    const angles = useMemo(
        () => [...(batch.angles || [])].sort((a, b) => a.position - b.position),
        [batch.angles]
    );

    useScriptPolling({
        enabled: activeStatuses.includes(batch.status),
        onPoll: () => router.reload({ only: ['batch'], preserveScroll: true }),
        intervalMs: 3000,
    });

    const selectAngle = async (angle) => {
        if (selecting) return;
        setSelecting(angle.id);

        try {
            const response = await fetch(route('api.script-batches.angles.select', {
                batch: batch.id,
                angle: angle.id,
            }), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Unable to select this angle.');

            addToast('Angle selected. Your script is being written.', 'success');
            router.reload({ only: ['batch'], preserveScroll: true });
        } catch (error) {
            addToast(error.message || 'Unable to select this angle.', 'error');
            setSelecting(null);
        }
    };

    const handleRetry = async () => {
        if (retrying) return;
        setRetrying(true);

        try {
            const response = await fetch(route('api.script-batches.retry', batch.id), {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });

            const data = await response.json();
            if (!response.ok) {
                if (response.status === 402) {
                    addToast(data.message || 'Insufficient credits to retry.', 'error');
                } else {
                    throw new Error(data.message || 'Unable to retry generation.');
                }
                return;
            }

            addToast(data.message || 'Script generation restarted.', 'success');
            router.reload({ only: ['batch'], preserveScroll: true });
        } catch (error) {
            addToast(error.message || 'Unable to retry generation.', 'error');
        } finally {
            setRetrying(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Viral Script Workflow" />

            <div className="mx-auto max-w-5xl space-y-5">
                <PageBanner
                    title={batch.original_topic}
                    description={`${batch.audience} • ${batch.primary_problem}`}
                    variant="soft"
                >
                    <PageBannerAction href={route('scripts')} variant="neutralSecondary">
                        <Icon name="arrowLeft" size={16} />
                        Back to Scripts
                    </PageBannerAction>
                </PageBanner>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <Progress batch={batch} />
                </section>

                {activeStatuses.includes(batch.status) ? <WaitingState batch={batch} /> : null}

                {batch.status === 'needs_input' ? <ResearchInput batch={batch} /> : null}

                {batch.status === 'research_blocked' ? (
                    <section className="rounded-2xl border border-danger-200 bg-danger-50 p-5">
                        <h2 className="text-lg font-black text-danger-900">Research could not verify the required evidence</h2>
                        <p className="mt-1 text-sm text-danger-700">The reserved credits were refunded. Start a new brief with different evidence requirements.</p>
                    </section>
                ) : null}

                {batch.status === 'awaiting_angle' ? (
                    <section className="space-y-4">
                        <div>
                            <h2 className="text-xl font-black text-slate-900">Choose Your Angle</h2>
                            <p className="text-sm text-slate-500">Pick the framing you want the final script to follow. The other four remain available as alternatives.</p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            {angles.map((angle) => (
                                <article key={angle.id} className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary-200 hover:shadow-md">
                                    <div className="flex items-start gap-3">
                                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-xs font-black text-primary-700">
                                            {angle.position}
                                        </span>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-black text-slate-900">{angle.title}</h3>
                                            <p className="mt-2 text-sm leading-6 text-slate-600">{angle.explanation}</p>
                                        </div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 p-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected Outcome</span>
                                        <p className="mt-1 text-sm font-semibold text-slate-700">{angle.expected_outcome}</p>
                                    </div>
                                    <Button
                                        onClick={() => selectAngle(angle)}
                                        isLoading={selecting === angle.id}
                                        disabled={selecting !== null}
                                        className="mt-auto w-full"
                                    >
                                        Select This Angle
                                    </Button>
                                </article>
                            ))}
                        </div>
                    </section>
                ) : null}

                {batch.status === 'completed' && script ? (
                    <section className="flex flex-col gap-4 rounded-2xl border border-success-200 bg-success-50 p-5 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-success-900">Your script is ready</h2>
                            <p className="mt-1 text-sm text-success-700">The quality gate is complete and the final version has been saved.</p>
                        </div>
                        <Button href={route('scripts.show', script.id)}>
                            Review Final Script
                            <Icon name="chevronRight" size={16} />
                        </Button>
                    </section>
                ) : null}

                {batch.status === 'failed' ? (
                    <section className="rounded-2xl border border-danger-200 bg-danger-50 p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                            <h2 className="text-lg font-black text-danger-900">Generation failed</h2>
                            <p className="text-sm text-danger-700">{batch.error_message || 'The workflow could not be completed. Reserved generation credits were refunded.'}</p>
                        </div>
                        <Button
                            onClick={handleRetry}
                            isLoading={retrying}
                            variant="primary"
                            className="bg-danger-600 hover:bg-danger-700 text-white shrink-0 sm:w-auto w-full"
                        >
                            <Icon name="refresh" size={16} />
                            Retry Generation
                        </Button>
                    </section>
                ) : null}

                {batch.research_enabled && batch.research ? (
                    <section className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Intent</span>
                            <p className="mt-1 text-sm font-black capitalize text-slate-800">
                                {batch.research_intent}
                                {batch.research_intent_mode === 'auto' ? ' (Auto-selected)' : ''}
                            </p>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Research</span>
                            <p className="mt-1 text-sm font-black text-slate-800">{batch.cache_hit_at ? 'Cached evidence' : 'Fresh evidence'}</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Confidence</span>
                            <p className="mt-1 text-sm font-black capitalize text-slate-800">{batch.research.confidence_label} • {batch.research.confidence_score}/100</p>
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Evidence Items</span>
                            <p className="mt-1 text-sm font-black text-slate-800">{batch.research.claims?.length || 0}</p>
                        </div>
                    </section>
                ) : null}
            </div>
        </AuthenticatedLayout>
    );
}
