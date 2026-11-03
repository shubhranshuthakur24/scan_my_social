import { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import useScriptPolling from '@/Hooks/useScriptPolling';
import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { useToast } from '@/Contexts/ToastContext';

const panelTones = {
    primary: {
        icon: 'bg-primary-50 text-primary-600',
        header: 'bg-slate-50/70',
    },
    success: {
        icon: 'bg-success-50 text-success-600',
        header: 'bg-success-50/40',
    },
    warning: {
        icon: 'bg-warning-50 text-warning-600',
        header: 'bg-warning-50/30',
    },
};

function ScriptPanel({ action = null, bodyClassName = '', children, icon, title, tone = 'primary' }) {
    const toneClasses = panelTones[tone] || panelTones.primary;

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className={`flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${toneClasses.header}`}>
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneClasses.icon}`}>
                        <Icon name={icon} size={14} />
                    </span>
                    <h2 className="min-w-0 break-words text-base font-black text-slate-900">{title}</h2>
                </div>
                {action ? (
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        {action}
                    </div>
                ) : null}
            </div>
            <div className={`p-4 sm:p-5 ${bodyClassName}`}>
                {children}
            </div>
        </section>
    );
}

function CopyButton({ text, label = 'Copy Script', disabled }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <Button
            onClick={handleCopy}
            disabled={disabled}
            variant={copied ? 'success' : 'primary'}
            size="sm"
            className="rounded-xl"
            aria-label={copied ? 'Script copied' : label}
        >
            <Icon name={copied ? 'check' : 'copy'} size={13} />
            {copied ? 'Copied!' : label}
        </Button>
    );
}

function ScoreBar({ label, score }) {
    const percentage = Math.min(100, Math.max(0, (score / 10) * 100));
    const color = score >= 8 ? 'bg-success-500' : score >= 5 ? 'bg-warning-500' : 'bg-danger-400';

    return (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="w-36 shrink-0 text-xs font-semibold capitalize text-slate-500">{label.replace(/_/g, ' ')}</span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${percentage}%` }} />
            </div>
            <span className="w-8 text-left text-xs font-bold text-slate-700 sm:text-right">{score}/10</span>
        </div>
    );
}

const evidenceLabels = {
    verified_facts: 'Verified Facts',
    trend_signals: 'Trend Signals',
    controversies: 'Controversies',
    uncertainties: 'Uncertainties',
};

function ResearchPanel({ batch, onResumed }) {
    const research = batch?.research;
    const [facts, setFacts] = useState('');
    const [urls, setUrls] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    if (!batch?.research_enabled) {
        return null;
    }

    const claims = research?.claims || [];
    const sources = [...(research?.sources || []), ...(batch?.supplemental_sources || [])]
        .filter((source, index, all) => all.findIndex((candidate) => candidate.url === source.url) === index);
    const sourceLabel = batch.cache_hit_at ? 'Cached Research' : 'Fresh Research';
    const researchedAt = research?.researched_at ? new Date(research.researched_at) : null;
    const freshUntil = research?.fresh_until ? new Date(research.fresh_until) : null;
    const age = researchedAt
        ? `${Math.max(0, Math.round((Date.now() - researchedAt.getTime()) / 3600000))} hours ago`
        : 'Pending';
    const confidenceLabel = research?.confidence_label
        ? `${research.confidence_label.charAt(0).toUpperCase()}${research.confidence_label.slice(1)} Confidence`
        : 'Confidence Pending';

    const handleResume = async () => {
        setSubmitting(true);
        setError('');
        try {
            const response = await fetch(`/api/script-batches/${batch.id}/resume`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify({
                    user_facts: facts.split('\n').map((value) => value.trim()).filter(Boolean),
                    source_urls: urls.split('\n').map((value) => value.trim()).filter(Boolean),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.message || 'Unable to resume research.');
            }
            setFacts('');
            setUrls('');
            onResumed();
        } catch (resumeError) {
            setError(resumeError.message);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ScriptPanel icon="search" title="Research Evidence" tone="primary">
            <div className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Research Intent</div>
                        <div className="mt-1 text-sm font-black capitalize text-slate-900">{batch.research_intent}</div>
                        <div className="text-[11px] text-slate-500">
                            {batch.research_intent_mode === 'auto' ? 'Auto-selected' : 'Manually selected'}
                        </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Research Source</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{sourceLabel}</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Research Age</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{age}</div>
                        {freshUntil ? <div className="text-[11px] text-slate-500">Fresh until {freshUntil.toLocaleString()}</div> : null}
                    </div>
                    <div className="rounded-xl border border-success-100 bg-success-50/50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-success-600">Research Quality</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{confidenceLabel}</div>
                        <div className="text-[11px] text-slate-500">{research?.confidence_score ?? 0}/100</div>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Settled Credits</div>
                        <div className="mt-1 text-sm font-black text-slate-900">{batch.research_settled_cost ?? 0} credits</div>
                        <div className="text-[11px] text-slate-500">
                            Reserved {batch.research_reserved_cost ?? 0}
                        </div>
                    </div>
                </div>

                {batch.status === 'needs_input' ? (
                    <div className="rounded-xl border border-warning-200 bg-warning-50 p-4">
                        <h3 className="text-sm font-black text-warning-900">More evidence is needed</h3>
                        <ul className="mt-2 space-y-1 text-xs text-warning-800">
                            {(batch.unresolved_questions || []).map((question, index) => <li key={index}>{question}</li>)}
                        </ul>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <textarea
                                value={facts}
                                onChange={(event) => setFacts(event.target.value)}
                                placeholder="New user-provided facts, one per line"
                                className="h-24 resize-none rounded-xl border border-warning-200 bg-white p-3 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                            <textarea
                                value={urls}
                                onChange={(event) => setUrls(event.target.value)}
                                placeholder="New source URLs, one per line"
                                className="h-24 resize-none rounded-xl border border-warning-200 bg-white p-3 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                            />
                        </div>
                        {error ? <p className="mt-2 text-xs font-semibold text-danger-600">{error}</p> : null}
                        <Button className="mt-3" size="sm" onClick={handleResume} disabled={submitting}>
                            {submitting ? 'Resuming...' : 'Resume Research'}
                        </Button>
                    </div>
                ) : null}

                {batch.status === 'research_blocked' ? (
                    <div className="rounded-xl border border-danger-200 bg-danger-50 p-4 text-sm font-semibold text-danger-800">
                        Research is blocked after two unresolved evidence attempts. The final charge was refunded.
                    </div>
                ) : null}

                {Object.entries(evidenceLabels).map(([category, label]) => {
                    const categoryClaims = claims.filter((claim) => claim.category === category);
                    if (categoryClaims.length === 0) return null;

                    return (
                        <div key={category}>
                            <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">{label}</h3>
                            <div className="space-y-2">
                                {categoryClaims.map((claim) => (
                                    <div key={claim.id} className="rounded-xl border border-slate-200 bg-white p-3">
                                        <p className="text-sm leading-6 text-slate-700">{claim.claim}</p>
                                        {claim.confidence_score != null ? (
                                            <p className="mt-1 text-[11px] font-bold text-slate-500">
                                                {claim.confidence_label} confidence, {claim.confidence_score}/100
                                            </p>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}

                {(batch.user_provided_facts || []).length > 0 ? (
                    <div>
                        <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">User-Provided Facts</h3>
                        <div className="space-y-2">
                            {batch.user_provided_facts.map((fact, index) => (
                                <div key={index} className="rounded-xl border border-primary-100 bg-primary-50/40 p-3 text-sm text-slate-700">
                                    {fact}
                                    <div className="mt-1 text-[11px] font-semibold text-primary-600">Provided by user, not independently verified</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {sources.length > 0 ? (
                    <div>
                        <h3 className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Sources</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {sources.map((source) => (
                                <a
                                    key={source.id}
                                    href={source.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="rounded-xl border border-slate-200 p-3 text-sm font-semibold text-primary-700 transition hover:border-primary-200 hover:bg-primary-50"
                                >
                                    <span className="block line-clamp-2">{source.title}</span>
                                    <span className="mt-1 block text-[11px] font-medium text-slate-500">{source.publisher}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                ) : null}
            </div>
        </ScriptPanel>
    );
}

export default function Show({ auth, script }) {
    useScriptPolling({
        enabled: ['researching', 'processing'].includes(script.status),
        onPoll: () => router.reload({ only: ['script'], preserveScroll: true }),
        intervalMs: 3000,
    });

    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [editTitle, setEditTitle] = useState(script.title || '');
    const [editScript, setEditScript] = useState(script.script || '');
    const [isSaving, setIsSaving] = useState(false);

    const isProcessing = ['researching', 'processing'].includes(script.status);
    const isRecreated = script.generation_mode === 'recreate';
    const isFresh = !isRecreated && !script.content_analysis?.post;
    const hasReview = script.revised_script || script.overall_score != null || script.strengths?.length || script.improvements?.length;
    const selectedAngle = script.script_angle || script.generation_batch?.selected_angle;
    const alternativeAngles = (script.generation_batch?.angles || []).filter((angle) => angle.id !== selectedAngle?.id);
    const title = script.title
        || (script.content_analysis?.post
            ? `Script for @${script.content_analysis.post.channel?.username || 'Video'}`
            : isRecreated
                ? 'Recreated AI Script'
                : 'Fresh AI Script');

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const res = await fetch(`/api/scripts/${script.id}/refine`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                body: JSON.stringify({
                    title: editTitle,
                    script: editScript,
                }),
            });

            if (!res.ok) throw new Error('Failed to save script changes');

            addToast('Script updated successfully', 'success');
            setIsEditing(false);
            router.reload({ only: ['script'], preserveScroll: true });
        } catch (err) {
            addToast(err.message, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditTitle(script.title || '');
        setEditScript(script.script || '');
        setIsEditing(false);
    };

    return (
        <AuthenticatedLayout>
            <Head title={`Script – ${title}`} />

            <div className="mx-auto max-w-4xl space-y-5 xl:space-y-4">
                <PageBanner
                    title={isProcessing ? 'Generating Script...' : (
                        isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white px-3 py-2 text-xl font-black text-slate-900 shadow-sm transition focus:border-primary-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 sm:text-2xl"
                                placeholder="Enter script title..."
                            />
                        ) : title
                    )}
                    description={script.suggested_topic && !isEditing ? `Topic: ${script.suggested_topic}` : 'Review, edit, copy, and refine this generated script.'}
                    variant="soft"
                >
                    <PageBannerAction href={route('scripts')} variant="neutralSecondary">
                        <Icon name="arrowLeft" size={4} />
                        Back to Scripts
                    </PageBannerAction>
                </PageBanner>

                {/* Fresh AI Script Banner */}
                {isFresh && !isProcessing && (
                    <div className="rounded-2xl border border-primary-100 bg-primary-50 p-4 text-primary-900 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-primary-600 shadow-sm">
                                <Icon name="bot" size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="mb-0.5 text-sm font-black">Fresh AI Generated Script</div>
                                <div className="text-xs font-medium leading-5 text-primary-700">Created from scratch using AI, not based on an existing video.</div>
                            </div>
                        </div>
                    </div>
                )}

                {isRecreated && !isProcessing && (
                    <div className="rounded-2xl border border-warning-100 bg-warning-50 p-4 text-warning-900 shadow-sm">
                        <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white text-warning-600 shadow-sm">
                                <Icon name="layers" size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="mb-0.5 text-sm font-black">Blueprint Recreation Script</div>
                                <div className="text-xs font-medium leading-5 text-warning-700">Generated from an analyzed pattern with controlled adaptation.</div>
                            </div>
                        </div>
                    </div>
                )}

                <ResearchPanel
                    batch={script.generation_batch}
                    onResumed={() => router.reload({ only: ['script'], preserveScroll: true })}
                />

                {!isProcessing && selectedAngle ? (
                    <ScriptPanel icon="target" title="Selected Angle">
                        <div className="space-y-3">
                            <div>
                                <h3 className="text-base font-black text-slate-900">{selectedAngle.title}</h3>
                                <p className="mt-1 text-sm leading-6 text-slate-600">{selectedAngle.explanation}</p>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected Outcome</span>
                                <p className="mt-1 text-sm font-semibold text-slate-700">{selectedAngle.expected_outcome}</p>
                            </div>
                        </div>
                    </ScriptPanel>
                ) : null}

                {!isProcessing && (script.suggested_hook || script.suggested_cta || script.angle_rationale) ? (
                    <section className="grid gap-4 md:grid-cols-2">
                        {script.suggested_hook ? (
                            <div className="rounded-2xl border border-primary-100 bg-primary-50/40 p-5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-primary-500">Suggested Hook</span>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{script.suggested_hook}</p>
                            </div>
                        ) : null}
                        {script.suggested_cta ? (
                            <div className="rounded-2xl border border-success-100 bg-success-50/40 p-5">
                                <span className="text-[10px] font-black uppercase tracking-widest text-success-600">Suggested CTA</span>
                                <p className="mt-2 text-sm font-bold leading-6 text-slate-800">{script.suggested_cta}</p>
                            </div>
                        ) : null}
                        {script.angle_rationale ? (
                            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Why This Angle Works</span>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{script.angle_rationale}</p>
                            </div>
                        ) : null}
                    </section>
                ) : null}

                {/* Source Video (if linked) */}
                {script.content_analysis?.post && (
                    <ScriptPanel icon="play" title="Source Video">
                        <div className="flex flex-col gap-5 sm:flex-row">
                            {script.content_analysis.post.display_url && (
                                <img
                                    src={script.content_analysis.post.display_url}
                                    alt="Video thumbnail"
                                    className="h-48 w-full flex-shrink-0 rounded-xl object-cover shadow-sm sm:h-28 sm:w-28"
                                />
                            )}
                            <div className="min-w-0 flex-1">
                                <div className="mb-2 flex items-center gap-2">
                                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-bold text-primary-600">
                                        @
                                    </div>
                                    <span className="break-words text-sm font-bold text-slate-900">
                                        {script.content_analysis.post.channel?.username || 'Unknown'}
                                    </span>
                                </div>
                                {script.content_analysis.post.caption && (
                                    <p className="mb-3 break-words text-sm leading-relaxed text-slate-500">
                                        {script.content_analysis.post.caption}
                                    </p>
                                )}
                                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-400">
                                    {script.content_analysis.post.video_play_count && (
                                        <span className="flex items-center gap-1">
                                            <Icon name="play" size={12} />
                                            {script.content_analysis.post.video_play_count.toLocaleString()}
                                        </span>
                                    )}
                                    {script.content_analysis.post.likes_count && (
                                        <span className="flex items-center gap-1">
                                            <Icon name="heart" size={12} />
                                            {script.content_analysis.post.likes_count.toLocaleString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </ScriptPanel>
                )}

                {/* Script Content */}
                <ScriptPanel
                    icon="fileText"
                    title="Script"
                    action={(
                        <>
                            {isEditing ? (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={handleCancel}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                        disabled={isProcessing || !script.script}
                                        icon={<Icon name="edit" size={14} />}
                                    >
                                        Edit Inline
                                    </Button>
                                    <CopyButton text={script.script || ''} disabled={isProcessing || !script.script} />
                                </>
                            )}
                        </>
                    )}
                >
                    {isProcessing ? (
                        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 py-16">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50">
                                <svg className="h-6 w-6 animate-spin text-primary-600" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="mb-1 text-sm font-bold text-slate-900">AI is crafting your script…</p>
                                <p className="text-xs text-slate-400">This usually takes about 10–15 seconds.</p>
                            </div>
                        </div>
                    ) : isEditing ? (
                        <textarea
                            value={editScript}
                            onChange={(e) => setEditScript(e.target.value)}
                            rows={15}
                            className="w-full resize-y rounded-xl border border-primary-200 bg-white p-5 font-sans text-sm leading-relaxed text-slate-700 transition focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                            placeholder="Edit your script here..."
                        />
                    ) : (
                        <pre className="whitespace-pre-wrap break-words rounded-xl border border-slate-100 bg-slate-50/70 p-5 font-sans text-sm leading-relaxed text-slate-700">
                            {script.script}
                        </pre>
                    )}
                </ScriptPanel>

                {/* Revised Script (from Auto-Refine) */}
                {!isProcessing && script.revised_script && script.revised_script !== script.script && (
                    <ScriptPanel
                        icon="badgeCheck"
                        title="Refined Version"
                        tone="success"
                        action={(
                            <CopyButton text={script.revised_script} label="Copy Refined" />
                        )}
                    >
                        <pre className="whitespace-pre-wrap break-words rounded-xl border border-success-100 bg-success-50/30 p-5 font-sans text-sm leading-relaxed text-slate-700">
                            {script.revised_script}
                        </pre>
                    </ScriptPanel>
                )}

                {/* AI Review Scores */}
                {!isProcessing && hasReview && (
                    <ScriptPanel
                        icon="star"
                        title="AI Review"
                        tone="warning"
                        action={script.overall_score != null ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Overall</span>
                                <div className="rounded-full border border-success-100 bg-success-50 px-3 py-1.5 text-sm font-bold text-success-700">
                                    {script.overall_score}/10
                                </div>
                            </div>
                        ) : null}
                    >
                        <div className="space-y-6">
                            {/* Score Breakdown */}
                            {script.scores && Object.keys(script.scores).length > 0 && (
                                <div className="space-y-3">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Score Breakdown</h3>
                                    <div className="space-y-2.5">
                                        {Object.entries(script.scores).map(([key, score]) => (
                                            <ScoreBar key={key} label={key} score={Number(score)} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Strengths & Improvements side-by-side */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {script.strengths?.length > 0 && (
                                    <div className="rounded-xl border border-success-100 bg-success-50/50 p-4">
                                        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-success-700">
                                            <Icon name="check" size={12} />
                                            Strengths
                                        </h3>
                                        <ul className="space-y-2">
                                            {script.strengths.map((s, i) => (
                                                <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                                                    <span className="mt-0.5 shrink-0 text-success-500">•</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {script.improvements?.length > 0 && (
                                    <div className="rounded-xl border border-warning-100 bg-warning-50/50 p-4">
                                        <h3 className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-warning-700">
                                            <Icon name="trendingUp" size={12} />
                                            Improvements
                                        </h3>
                                        <ul className="space-y-2">
                                            {script.improvements.map((s, i) => (
                                                <li key={i} className="flex gap-2 text-xs leading-relaxed text-slate-600">
                                                    <span className="mt-0.5 shrink-0 text-warning-500">•</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </div>
                    </ScriptPanel>
                )}

                {!isProcessing && script.quality_checks && Object.keys(script.quality_checks).length > 0 ? (
                    <ScriptPanel icon="badgeCheck" title="Quality Gate" tone="success">
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                            {Object.entries(script.quality_checks).map(([key, passed]) => (
                                <div
                                    key={key}
                                    className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
                                        passed
                                            ? 'border-success-100 bg-success-50 text-success-700'
                                            : 'border-danger-100 bg-danger-50 text-danger-700'
                                    }`}
                                >
                                    <Icon name={passed ? 'check' : 'x'} size={13} />
                                    <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                </div>
                            ))}
                        </div>
                        {script.corrective_rewrite_applied ? (
                            <p className="mt-4 text-xs font-semibold text-slate-500">
                                One corrective rewrite was applied before saving the final script.
                            </p>
                        ) : null}
                    </ScriptPanel>
                ) : null}

                {!isProcessing && alternativeAngles.length > 0 ? (
                    <ScriptPanel icon="layers" title="Alternative Angles">
                        <div className="grid gap-3 sm:grid-cols-2">
                            {alternativeAngles.map((angle) => (
                                <div key={angle.id} className="rounded-xl border border-slate-200 p-4">
                                    <h3 className="text-sm font-black text-slate-900">{angle.title}</h3>
                                    <p className="mt-1 text-xs leading-5 text-slate-600">{angle.explanation}</p>
                                    <p className="mt-2 text-[11px] font-semibold text-primary-700">{angle.expected_outcome}</p>
                                </div>
                            ))}
                        </div>
                    </ScriptPanel>
                ) : null}

                {/* Meta Stats */}
                {!isProcessing && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <KpiCard
                            icon={<Icon name="clock" className="h-4 w-4" />}
                            label="Duration"
                            value={script.estimated_duration || 'N/A'}
                            variant="primary"
                            size="compact"
                        />
                        <KpiCard
                            icon={<Icon name="target" className="h-4 w-4" />}
                            label="Hook Type"
                            value={script.hook_type ? script.hook_type.charAt(0).toUpperCase() + script.hook_type.slice(1) : 'N/A'}
                            variant="info"
                            size="compact"
                        />
                        <KpiCard
                            icon={<Icon name="tag" className="h-4 w-4" />}
                            label="Topic"
                            value={script.suggested_topic || 'N/A'}
                            variant="success"
                            size="compact"
                            valueClassName="text-base leading-tight"
                        />
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
