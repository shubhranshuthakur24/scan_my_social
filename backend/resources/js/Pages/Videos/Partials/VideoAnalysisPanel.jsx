import React, { useMemo, useState } from 'react';
import Button from '@/Components/Button';
import SectionHeader from './components/SectionHeader';
import Icon from '@/Components/Icon';

function ProcessingSpinner() {
    return (
        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    );
}

function ExpandableValue({ value }) {
    const [expanded, setExpanded] = useState(false);
    const text = String(value || '').trim();
    const shouldCollapse = text.length > 260;
    const visibleText = shouldCollapse && !expanded ? `${text.slice(0, 260).trimEnd()}...` : text;

    return (
        <div>
            <p className="break-words text-[15px] font-medium leading-8 text-slate-700 whitespace-pre-wrap">{visibleText}</p>
            {shouldCollapse ? (
                <button
                    type="button"
                    onClick={() => setExpanded((previous) => !previous)}
                    className="mt-2 rounded-lg text-xs font-bold text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                >
                    {expanded ? 'Show less' : 'Read more'}
                </button>
            ) : null}
        </div>
    );
}

function AnalysisCard({ icon, label, value, fullWidth = false, warning = false, emphasis = false }) {
    return (
        <div
            className={[
                'rounded-2xl border bg-white px-5 py-5 shadow-sm ring-1',
                warning ? 'border-amber-200 ring-amber-100' : 'border-slate-200/80 ring-slate-100',
                emphasis ? 'shadow-md' : '',
                fullWidth ? 'sm:col-span-2' : '',
            ].join(' ')}
        >
            <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-primary-500 flex-shrink-0">
                        {React.isValidElement(icon) ? icon : <Icon name={icon} size={20} />}
                    </div>
                    <p className="text-[11px] uppercase tracking-[0.18em] font-black text-slate-400 truncate">{label}</p>
                </div>
                {warning ? (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-amber-700">
                        Needs review
                    </span>
                ) : null}
            </div>
            <ExpandableValue value={value} />
        </div>
    );
}

function AnalysisSection({ title, subtitle, children }) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 sm:p-5">
            <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.16em] font-black text-slate-500">{title}</p>
                <p className="text-xs text-slate-400 font-medium mt-0.5">{subtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
        </section>
    );
}

function toDisplayText(value, fallback = '') {
    if (value === null || value === undefined) {
        return fallback;
    }

    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed !== '' ? trimmed : fallback;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
        return String(value);
    }

    if (Array.isArray(value)) {
        const items = value
            .map((item) => (typeof item === 'string' ? item.trim() : ''))
            .filter(Boolean);
        return items.length > 0 ? items.join(', ') : fallback;
    }

    if (typeof value === 'object') {
        const examples = Array.isArray(value.examples)
            ? value.examples.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
            : [];
        if (examples.length > 0) {
            return examples.join(', ');
        }

        const count = Number(value.count);
        if (Number.isFinite(count) && count > 0) {
            return `Detected ${count} authority signal${count === 1 ? '' : 's'}.`;
        }
    }

    return fallback;
}

function isWeakSignal(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) {
        return true;
    }

    const weakPhrases = [
        'no obvious shift detected',
        'shift position not available',
        'no authority signals detected',
        'no clear closure',
        'none',
        'not available yet',
    ];

    return weakPhrases.some((phrase) => normalized.includes(phrase));
}

function splitScriptFlow(value) {
    const text = String(value || '').trim();
    if (!text) {
        return [];
    }

    return text
        .split(/->|→|>|,|\n|;/g)
        .map((part) => part.trim())
        .filter(Boolean);
}

function getStepMeaning(step) {
    const normalized = String(step || '').trim().toLowerCase();

    if (normalized.includes('hook')) {
        return 'Captures attention immediately with a relatable opening.';
    }
    if (normalized.includes('problem') || normalized.includes('pain')) {
        return 'Names the pain point so viewers feel understood.';
    }
    if (normalized.includes('breakthrough') || normalized.includes('shift') || normalized.includes('insight')) {
        return 'Introduces a new way to think about the problem.';
    }
    if (normalized.includes('proof') || normalized.includes('result') || normalized.includes('authority')) {
        return 'Builds trust with evidence, credibility, or outcomes.';
    }
    if (normalized.includes('use case') || normalized.includes('example')) {
        return 'Shows where this idea applies in real scenarios.';
    }
    if (normalized.includes('cta') || normalized.includes('action') || normalized.includes('close')) {
        return 'Converts attention into a clear next step.';
    }

    return `Moves the narrative forward by focusing on ${normalized || 'the next point'}.`;
}

export default function VideoAnalysisPanel({
    contentAnalysis,
    userHasAnalysis,
    userHasTranscription,
    isAnalyzing,
    analysisError,
    onAnalyze,
}) {
    const [isLanguagePickerOpen, setIsLanguagePickerOpen] = React.useState(false);
    const [analysisLanguage, setAnalysisLanguage] = React.useState('English');
    const [isTechnicalDetailOpen, setIsTechnicalDetailOpen] = useState(false);
    const [checkedImprovements, setCheckedImprovements] = useState(new Set());
    const technicalDetailRef = React.useRef(null);
    const analysis = contentAnalysis || {};
    const confidence = Number(analysis.analysis_confidence || 0);
    const confidencePercent = Math.max(0, Math.min(100, Math.round(confidence * 100)));

    const confidenceUi = useMemo(() => {
        if (confidencePercent >= 80) {
            return {
                badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                bar: 'from-emerald-500 to-teal-500',
                label: 'High',
            };
        }

        if (confidencePercent >= 60) {
            return {
                badge: 'bg-amber-50 text-amber-700 border-amber-200',
                bar: 'from-amber-500 to-orange-500',
                label: 'Medium',
            };
        }

        return {
            badge: 'bg-rose-50 text-rose-700 border-rose-200',
            bar: 'from-rose-500 to-red-500',
            label: 'Low',
        };
    }, [confidencePercent]);

    const normalizedCtaType = String(analysis.cta_type || '')
        .replace(/DMCTA/gi, 'DM CTA')
        .replace(/Comment\/DM/gi, 'Comment/DM')
        .trim();
    const ctaText = toDisplayText(analysis.cta_text);
    const ctaValue = ctaText
        ? `${ctaText}${normalizedCtaType ? ` (${normalizedCtaType})` : ''}`
        : (normalizedCtaType || 'No CTA identified');

    const authoritySignalsValue = toDisplayText(analysis.authority_signals, 'No authority signals detected.');
    const openingLine = toDisplayText(analysis.hook_text || analysis.hook, 'Opening line not available yet.');
    const hookType = toDisplayText(analysis.hook_type, 'Hook type not available yet.');
    const scriptType = toDisplayText(analysis.script_type || analysis.archetype, 'Script type not available yet.');
    const coreClaim = toDisplayText(analysis.topic_angle || analysis.content_angle, 'Core claim not available yet.');
    const scriptFlow = toDisplayText(analysis.script_flow || analysis.structure_model, 'Script flow not available yet.');
    const postInOneLine = toDisplayText(
        analysis.post_in_one_line || analysis.summary || analysis.main_message,
        coreClaim !== 'Core claim not available yet.' ? coreClaim : openingLine,
    );
    const simpleTranslation = toDisplayText(
        analysis.simple_translation || analysis.translation_simple || analysis.insight_shift_text,
        postInOneLine ? `In simple words: ${postInOneLine}` : 'Simple explanation not available yet.',
    );

    const timelineSteps = (() => {
        const parsedFlow = splitScriptFlow(scriptFlow);
        const fallbackFlow = ['Hook', 'Problem', 'Breakthrough', 'Proof', 'Use Cases', 'CTA'];
        const baseSteps = parsedFlow.length > 0 ? parsedFlow : fallbackFlow;
        return baseSteps.slice(0, 6).map((step) => ({
            step,
            why: getStepMeaning(step),
        }));
    })();

    const improvementActions = (() => {
        const suggestions = [];

        if (isWeakSignal(openingLine)) {
            suggestions.push('Strengthen the opening line with one specific pain point and a curiosity gap.');
        }

        if (isWeakSignal(coreClaim)) {
            suggestions.push('Clarify one core claim so viewers can repeat it in one sentence.');
        }

        if (isWeakSignal(ctaValue) || String(ctaValue).toLowerCase().includes('no cta')) {
            suggestions.push('Add one explicit CTA using a clear action verb and outcome.');
        }

        if (confidencePercent < 60) {
            suggestions.push('Add a concrete proof element like data, before/after, or a short case example.');
        }

        if (suggestions.length === 0) {
            suggestions.push('Keep the hook as is and tighten transitions between each story step.');
            suggestions.push('Use one short proof line before CTA to increase trust.');
        }

        return suggestions.slice(0, 3);
    })();

    const toggleCheckedImprovement = (index) => {
        setCheckedImprovements((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const toggleTechnicalDetail = () => {
        setIsTechnicalDetailOpen((previous) => {
            const next = !previous;

            if (next) {
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        const container = technicalDetailRef.current;
                        if (!container) {
                            return;
                        }

                        const topOffset = 96;
                        const targetTop = container.getBoundingClientRect().top + window.scrollY - topOffset;

                        window.scrollTo({
                            top: Math.max(0, targetTop),
                            behavior: 'smooth',
                        });
                    });
                });
            }

            return next;
        });
    };

    const coreNarrative = [
        {
            key: 'hook',
            label: 'Hook',
            value: openingLine,
            icon: 'anchor',
            fullWidth: true,
            emphasis: true,
        },
        {
            key: 'hookType',
            label: 'Hook Type',
            value: hookType,
            icon: 'anchor',
        },
        {
            key: 'scriptType',
            label: 'Script Type',
            value: scriptType,
            icon: 'layers',
        },
        {
            key: 'topicAngle',
            label: 'Topic Angle',
            value: coreClaim,
            icon: 'triangle',
            fullWidth: true,

        },
        {
            key: 'scriptFlow',
            label: 'Script Flow',
            value: scriptFlow,
            icon: 'shuffle',
            fullWidth: true,
        },
    ];

    const persuasionEngine = [
        {
            key: 'mechanism',
            label: 'Mechanism',
            value: toDisplayText(analysis.mechanism_type, 'Mechanism not available yet.'),
            icon: 'cpu',
        },
        {
            key: 'driver',
            label: 'Psychological Driver',
            value: toDisplayText(analysis.psychological_driver, 'Driver not available yet.'),
            icon: 'engagement',
        },
        {
            key: 'insightShift',
            label: 'Insight Shift',
            value: toDisplayText(analysis.insight_shift_text || analysis.insight_shift, 'No obvious shift detected.'),
            icon: 'moveRight',
        },
        {
            key: 'authority',
            label: 'Authority Signals',
            value: authoritySignalsValue,
            icon: 'flask',
        },
    ];

    const conversion = [
        {
            key: 'closure',
            label: 'Closure Type',
            value: toDisplayText(analysis.closure_type, 'Closure type not available yet.'),
            icon: 'lockKeyhole',
        },
        {
            key: 'cta',
            label: 'Call To Action',
            value: ctaValue,
            icon: 'megaphone',
            emphasis: true,
        },
    ];

    return (
        <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="relative mb-6 flex items-center justify-between gap-3">
                <SectionHeader
                    icon={<Icon name="microscope" />}
                    title="Content Intelligence Breakdown"
                    subtitle="Narrative, persuasion, and conversion signals from this script."
                />
                <div className={`hidden sm:flex items-center gap-2 rounded-2xl border px-3 py-1.5 ${userHasAnalysis ? confidenceUi.badge : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                    <div className="flex items-center gap-2.5">
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] whitespace-nowrap">
                            {userHasAnalysis ? `Confidence ${confidenceUi.label}` : 'Status Locked'}
                        </p>
                        {userHasAnalysis ? (
                            <span className="text-xs font-black">{confidencePercent}%</span>
                        ) : (
                            <Icon name="lock" size={12} strokeWidth={3} />
                        )}
                    </div>
                </div>
            </div>

            {userHasAnalysis ? (
                <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white/80 backdrop-blur px-4 py-3">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-[10px] uppercase tracking-[0.18em] font-black text-slate-400">Confidence</p>
                        <p className="text-xs font-bold text-slate-500">{confidencePercent}%</p>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                            className={`h-full rounded-full bg-gradient-to-r ${confidenceUi.bar} transition-all duration-700`}
                            style={{ width: `${confidencePercent}%` }}
                        />
                    </div>
                </div>
            ) : null}

            <div className={`relative transition-all duration-700 ${!userHasAnalysis ? 'max-h-[360px] overflow-hidden' : ''}`}>

                {/* main analysis section */}
                <div className={`space-y-5 ${!userHasAnalysis ? 'blur-[6px] select-none opacity-35 pointer-events-none grayscale' : ''}`}>
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] font-black text-slate-500">
                                    Understand This Post in 5 Seconds
                                </p>
                                <p className="text-xs text-slate-400 font-medium mt-0.5">
                                    What it says, why it works, and what to improve next.
                                </p>
                            </div>
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.06em] ${confidenceUi.badge}`}>
                                <Icon name="shieldCheck" className="w-3.5 h-3.5" />
                                Confidence {confidenceUi.label}
                            </span>
                        </div>

                        <div className="mt-5 rounded-2xl border border-primary-100 bg-primary-50/70 px-4 py-4">
                            <p className="text-[10px] uppercase tracking-[0.16em] font-black text-primary-600">Post In One Line</p>
                            <p className="mt-2 text-base sm:text-lg font-black leading-7 text-slate-900">
                                {postInOneLine}
                            </p>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-4">
                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-500">Opening Line</p>
                                <p className="mt-2 text-[15px] leading-7 text-slate-800 font-semibold whitespace-pre-wrap">
                                    {openingLine}
                                </p>
                                <div className="mt-3 border-t border-slate-100 pt-3">
                                    <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-500">In simple words</p>
                                    <p className="mt-2 text-sm leading-7 text-slate-700 font-medium whitespace-pre-wrap">
                                        {simpleTranslation}
                                    </p>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-500">Intent Chips</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                        <Icon name="anchor" className="w-3.5 h-3.5" />
                                        {hookType}
                                    </span>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                                        <Icon name="layers" className="w-3.5 h-3.5" />
                                        {scriptType}
                                    </span>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
                                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-500">Core Claim</p>
                                <p className="mt-2 text-sm leading-7 text-slate-800 font-semibold whitespace-pre-wrap">
                                    {coreClaim}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
                                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-slate-500 mb-4">Story Timeline Flow</p>
                                <div className="relative border-l border-slate-200 ml-3 pl-6 space-y-6">
                                    {timelineSteps.map((timelineItem, index) => (
                                        <div key={`${timelineItem.step}-${index}`} className="relative">
                                            <span className="absolute -left-[31px] top-0 flex h-6 w-6 items-center justify-center rounded-full bg-white border border-primary-500 text-[10px] font-black text-primary-600 ring-4 ring-primary-50/50">
                                                {index + 1}
                                            </span>
                                            <div className="space-y-1">
                                                <h5 className="text-xs font-black uppercase tracking-wider text-slate-700">{timelineItem.step}</h5>
                                                <p className="text-sm font-semibold text-slate-500">{timelineItem.why}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 px-5 py-5">
                                <p className="text-[10px] uppercase tracking-[0.16em] font-black text-amber-800 mb-3">Improve Next Recommendations</p>
                                <div className="space-y-2.5">
                                    {improvementActions.map((action, index) => {
                                        const isChecked = checkedImprovements.has(index);
                                        return (
                                            <div 
                                                key={`${action}-${index}`} 
                                                onClick={() => toggleCheckedImprovement(index)}
                                                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                                                    isChecked 
                                                        ? 'bg-amber-100/30 border-amber-300/40 opacity-70' 
                                                        : 'bg-white border-amber-200/50 hover:bg-amber-50/30 hover:border-amber-300'
                                                }`}
                                            >
                                                <div className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded border transition-colors ${
                                                    isChecked 
                                                        ? 'bg-amber-600 border-amber-600 text-white' 
                                                        : 'bg-white border-slate-300 text-transparent'
                                                }`}>
                                                    <Icon name="check" size={10} strokeWidth={4} />
                                                </div>
                                                <p className={`text-xs font-semibold leading-relaxed ${
                                                    isChecked ? 'line-through text-slate-500' : 'text-amber-950'
                                                }`}>
                                                    {action}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div ref={technicalDetailRef} className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50/70 ring-1 ring-slate-100/80 overflow-hidden">
                            <button
                                type="button"
                                onClick={toggleTechnicalDetail}
                                aria-expanded={isTechnicalDetailOpen}
                                className={`w-full px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-inset sm:px-5 sm:py-4 ${isTechnicalDetailOpen ? 'bg-white/80' : 'hover:bg-white/70'}`}
                            >
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <span className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border ${isTechnicalDetailOpen ? 'border-primary-200 bg-primary-50 text-primary-600' : 'border-slate-200 bg-white text-slate-500'}`}>
                                            <Icon name="flask" size={16} />
                                        </span>
                                        <div className="min-w-0">
                                            <p className="text-[11px] uppercase tracking-[0.16em] font-black text-slate-500">
                                                Technical Detail
                                            </p>
                                            <p className="mt-1 text-xs sm:text-[13px] leading-5 text-slate-500 font-medium">
                                                Field-level signal breakdown for deeper review.
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] ${isTechnicalDetailOpen ? 'border-primary-200 bg-primary-50 text-primary-700' : 'border-slate-200 bg-white text-slate-500'}`}>
                                            {isTechnicalDetailOpen ? 'Hide detail' : 'See detail'}
                                        </span>
                                        <Icon name="chevronDown" className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isTechnicalDetailOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                            </button>

                            <div className={`origin-top grid transition-all duration-300 ease-out ${isTechnicalDetailOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                                <div className="overflow-hidden">
                                    <div className="border-t border-slate-200/90 px-3 pb-3 pt-4 sm:px-4 sm:pb-4 sm:pt-5 space-y-4">
                                        <AnalysisSection title="Core Narrative" subtitle="Detailed field-level view of script structure.">
                                            {coreNarrative.map((item) => (
                                                <AnalysisCard
                                                    key={item.key}
                                                    icon={item.icon}
                                                    label={item.label}
                                                    value={item.value}
                                                    fullWidth={item.fullWidth}
                                                    emphasis={item.emphasis}
                                                    warning={isWeakSignal(item.value)}
                                                />
                                            ))}
                                        </AnalysisSection>

                                        <AnalysisSection title="Persuasion Engine" subtitle="Detailed cognitive and emotional persuasion signals.">
                                            {persuasionEngine.map((item) => (
                                                <AnalysisCard
                                                    key={item.key}
                                                    icon={item.icon}
                                                    label={item.label}
                                                    value={item.value}
                                                    warning={isWeakSignal(item.value)}
                                                />
                                            ))}
                                        </AnalysisSection>

                                        <AnalysisSection title="Conversion" subtitle="Detailed closure and action-driving fields.">
                                            {conversion.map((item) => (
                                                <AnalysisCard
                                                    key={item.key}
                                                    icon={item.icon}
                                                    label={item.label}
                                                    value={item.value}
                                                    emphasis={item.emphasis}
                                                    warning={isWeakSignal(item.value)}
                                                />
                                            ))}
                                        </AnalysisSection>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
                {/* end main analysis section */}

                {!userHasAnalysis && (
                    <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                )}
            </div>

            {!userHasAnalysis ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 bg-slate-950/20 backdrop-blur-[4px] rounded-2xl transition-all duration-300">
                    <div className="w-full max-w-md rounded-3xl border border-white/40 bg-white/85 p-6 text-center shadow-2xl backdrop-blur-xl ring-1 ring-slate-900/5">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg shadow-slate-200 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-primary-500/20 rounded-full animate-ping" />
                            {isAnalyzing ? <ProcessingSpinner /> : <Icon name="microscope" className="w-8 h-8 relative z-10" />}
                        </div>
                        <h4 className="text-xl sm:text-2xl font-black text-slate-950 mb-2 tracking-tight">Unlock Analysis</h4>
                        <p className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed font-semibold">
                            Run deterministic + AI-assisted analysis to unlock the blueprint behind this video.
                        </p>
                        <div className="mb-5 flex items-center justify-center">
                            <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-black tracking-wide ${userHasTranscription
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/50'
                                : 'bg-amber-50 text-amber-700 border-amber-200/50'
                                }`}>
                                {userHasTranscription ? <Icon name="checkCircle" className="w-3.5 h-3.5" /> : <Icon name="alertCircle" className="w-3.5 h-3.5" />}
                                {userHasTranscription ? 'Ready to analyze' : 'Transcription required'}
                            </span>
                        </div>

                        <Button
                            title={!userHasTranscription ? 'Transcription required first' : ''}
                            onClick={() => setIsLanguagePickerOpen(true)}
                            disabled={isAnalyzing || !userHasTranscription}
                            type="button"
                            variant="primary"
                            size="lg"
                            className="w-full font-bold shadow-sm"
                            isLoading={isAnalyzing}
                        >
                            {isAnalyzing ? 'Decoding Strategy...' : 'Run Deep Analysis'}
                        </Button>

                        {analysisError ? (
                            <div className="mt-4 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 w-full text-left">
                                <p className="text-xs text-red-600 font-bold mb-1">Analysis Issue</p>
                                <p className="text-[11px] text-red-500 font-medium leading-relaxed">{analysisError}</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {isLanguagePickerOpen ? (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 px-4 backdrop-blur-sm">
                    <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-xl ring-1 ring-slate-100">
                        <div className="mb-5 text-center">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                                Analysis Language
                            </p>
                            <h4 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                                Choose output language
                            </h4>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {['English', 'Hindi', 'Hinglish'].map((language) => (
                                <button
                                    key={language}
                                    type="button"
                                    onClick={() => setAnalysisLanguage(language)}
                                    className={`rounded-2xl border px-4 py-3 text-sm font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${analysisLanguage === language
                                        ? 'border-primary-300 bg-primary-50 text-primary-700 ring-2 ring-primary-100'
                                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                                        }`}
                                >
                                    {language}
                                </button>
                            ))}
                        </div>

                        <div className="mt-5 flex gap-3">
                            <Button
                                type="button"
                                onClick={() => setIsLanguagePickerOpen(false)}
                                variant="secondary"
                                className="flex-1 font-bold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                onClick={() => {
                                    setIsLanguagePickerOpen(false);
                                    onAnalyze?.(analysisLanguage);
                                }}
                                variant="primary"
                                className="flex-1 font-bold"
                            >
                                Start Analysis
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
