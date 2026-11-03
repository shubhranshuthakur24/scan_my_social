import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ClipboardCopy, Loader2, Send, TestTube2, User, XCircle } from 'lucide-react';
import Icon from '@/Components/Icon';

export default function TestTriggerSimulatorSection({ simulation, preview }) {
    const [showDetails, setShowDetails] = useState(false);
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const commentPlaceholder = 'Write a test comment...';
    const insertPlaceholder = (current, placeholder) => {
        const text = String(placeholder || '').trim();
        return text || current;
    };
    const activeStepLabel = useMemo(() => {
        const steps = Array.isArray(simulation.playback?.timelineSteps)
            ? simulation.playback.timelineSteps
            : [];
        const active = steps.find((step) => step.status === 'active');
        return active?.label || '';
    }, [simulation.playback]);

    const quickSamples = ['price please', 'need pricing', 'share details'];

    const resultTone = simulation.result?.state === 'matched'
        ? 'success'
        : simulation.result?.state === 'no-match'
            ? 'warning'
            : simulation.result
                ? 'error'
                : 'neutral';

    const resultToneClasses = resultTone === 'success'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : resultTone === 'warning'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : resultTone === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-slate-200 bg-slate-50 text-slate-700';

    const ResultIcon = simulation.playback?.isRunning
        ? Loader2
        : resultTone === 'success'
            ? CheckCircle2
            : resultTone === 'warning'
                ? AlertTriangle
                : resultTone === 'error'
                    ? XCircle
                    : TestTube2;
    const showCelebration = !simulation.playback?.isRunning && simulation.result?.state === 'matched';

    return (
        <div
            className={sectionCardClass}
            onClick={() => preview.setScene('keyword')}
            onFocusCapture={() => preview.setScene('keyword')}
        >
            <div className="flex w-full items-center justify-between gap-3">
                <div className="text-left">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">8. Test Trigger Simulator</h3>
                    <p className="mt-1 text-sm text-slate-500">Play a visual timeline of your automation sequence.</p>
                </div>
            </div>

            <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                    <div className="flex items-end gap-2">
                        <div className="mb-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-500">
                            <User className="h-4 w-4" />
                        </div>

                        <div className="relative min-w-0 flex-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 shadow-sm focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/40">
                            <input
                                type="text"
                                className="w-full border-0 bg-transparent p-0 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:ring-0 focus-visible:outline-none"
                                placeholder={commentPlaceholder}
                                value={simulation.comment}
                                onChange={(e) => simulation.setComment(e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => simulation.setComment(insertPlaceholder(simulation.comment, commentPlaceholder))}
                                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                title="Insert placeholder"
                                aria-label="Insert placeholder"
                            >
                                <ClipboardCopy className="h-4 w-4" />
                            </button>
                        </div>

                        {simulation.playback?.isRunning ? (
                            <button
                                type="button"
                                onClick={() => simulation.stopSimulation(true)}
                                className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-red-300 bg-white text-red-700 transition-colors duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                title="Stop Test"
                            >
                                <span className="text-[10px] font-bold">STOP</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={simulation.runSimulation}
                                className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary-300 bg-primary-50 text-primary-700 transition-colors duration-200 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                title="Run Test"
                            >
                                <Send className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    {quickSamples.map((sample) => (
                        <button
                            key={sample}
                            type="button"
                            onClick={() => simulation.setComment(sample)}
                            className="cursor-pointer rounded-full border border-slate-300 bg-slate-50 px-2.5 py-1 text-[10px] font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                        >
                            {sample}
                        </button>
                    ))}
                </div>

                <div className={`rounded-2xl border p-3 ${resultToneClasses}`}>
                    {showCelebration && (
                        <div className="mb-2 rounded-xl border border-emerald-300 bg-emerald-100 px-3 py-2 text-emerald-800">
                            <p className="inline-flex items-center gap-1 text-xs font-bold tracking-wide">
                                <Icon name="partyPopper" size={14} />
                                Simulation successful
                            </p>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <ResultIcon className={`h-4 w-4 ${simulation.playback?.isRunning ? 'animate-spin motion-reduce:animate-none' : ''}`} />
                        <p className="text-sm font-semibold">
                            {simulation.playback?.isRunning
                                ? 'Simulation running'
                                : simulation.result?.title || 'Ready to run'}
                        </p>
                    </div>
                    <p className="mt-1 text-xs">
                        {simulation.playback?.isRunning
                            ? (activeStepLabel || 'Preparing timeline...')
                            : simulation.result?.message || 'Run test to preview the full automation sequence.'}
                    </p>

                    {simulation.result && (
                        <div className="mt-3">
                            <button
                                type="button"
                                onClick={() => setShowDetails((previous) => !previous)}
                                className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-current/80 transition-colors duration-200 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                            >
                                {showDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                                {showDetails ? 'Hide details' : 'View details'}
                            </button>

                            {showDetails && (
                                <div className="mt-2 space-y-1 text-xs">
                                    {Array.isArray(simulation.result.sequenceSteps) && simulation.result.sequenceSteps.map((step, index) => (
                                        <p key={`sim-detail-${index}`} className="break-words">
                                            <span className="font-semibold">Step {index + 1}:</span> {step}
                                        </p>
                                    ))}
                                    {simulation.result.keyword && (
                                        <p><span className="font-semibold">Matched keyword:</span> {simulation.result.keyword}</p>
                                    )}
                                    {typeof simulation.result.replyHasImage === 'boolean' && (
                                        <p><span className="font-semibold">Image attachment:</span> {simulation.result.replyHasImage ? 'Will send' : 'No image'}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
