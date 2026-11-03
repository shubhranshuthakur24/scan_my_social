import React from 'react';
import Icon from '@/Components/Icon';
import SectionHeader from './components/SectionHeader';

function WorkflowButton({ stepNumber, icon, label, hint, onClick, disabled = false, loading = false, active = false }) {
    const isDisabled = disabled || loading;

    return (
        <button
            type="button"
            onClick={isDisabled ? undefined : onClick}
            disabled={isDisabled}
            aria-busy={loading ? 'true' : undefined}
            className={`group w-full rounded-2xl border p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-[0.98] ${isDisabled
                ? 'cursor-not-allowed border-slate-200 bg-slate-50/50 text-slate-400 opacity-60'
                : 'border-slate-200 bg-white hover:border-primary-300 hover:shadow-md hover:bg-slate-50/40'
                }`}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                        isDisabled 
                            ? 'border-slate-100 bg-slate-50 text-slate-300' 
                            : active
                                ? 'border-success-200 bg-success-50 text-success-600'
                                : 'border-primary-100 bg-primary-50 text-primary-500 group-hover:bg-primary-100 group-hover:text-primary-600'
                    }`}>
                        {active && !loading ? <Icon name="check" size={18} strokeWidth={3} /> : icon}
                    </div>
                    <div className="min-w-0">
                        <span className="text-[9px] uppercase tracking-widest font-black text-slate-400">Step {stepNumber}</span>
                        <p className="text-sm font-black text-slate-800 leading-tight mt-0.5">{label}</p>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">{loading ? 'Processing...' : hint}</p>
                    </div>
                </div>
                {!isDisabled && !active && (
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon name="chevronRight" size={12} strokeWidth={3} />
                    </div>
                )}
                {isDisabled && !active && (
                    <div className="text-slate-300">
                        <Icon name="lock" size={14} />
                    </div>
                )}
            </div>
        </button>
    );
}

export default function VideoActionWorkflow({
    onTranscribe,
    onAnalyze,
    onRefine,
    onOpenProjectModal,
    hasTranscription,
    hasAnalysis,
    isTranscribing,
    isAnalyzing,
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <SectionHeader
                icon={<Icon name="target" />}
                title="Action Workflow"
                subtitle="Run the next best action in sequence for this video."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
                <WorkflowButton
                    stepNumber="1"
                    icon={<Icon name="mic" size={18} />}
                    label={hasTranscription ? 'Transcription Ready' : 'Generate Transcription'}
                    hint={hasTranscription ? 'Transcript is available.' : 'Convert voice to text first.'}
                    onClick={onTranscribe}
                    disabled={hasTranscription}
                    loading={isTranscribing}
                    active={hasTranscription}
                />

                <WorkflowButton
                    stepNumber="2"
                    icon={<Icon name="microscope" size={18} />}
                    label={hasAnalysis ? 'Analysis Ready' : 'Run Deep Analysis'}
                    hint={hasAnalysis ? 'Strategic breakdown is available.' : 'Unlock strategic pattern insights.'}
                    onClick={onAnalyze}
                    disabled={!hasTranscription || hasAnalysis}
                    loading={isAnalyzing}
                    active={hasAnalysis}
                />

                <WorkflowButton
                    stepNumber="3"
                    icon={<Icon name="wand" size={18} />}
                    label="Refine Script"
                    hint="Generate improved script version."
                    onClick={onRefine}
                    disabled={!hasTranscription || !hasAnalysis}
                />

                <WorkflowButton
                    stepNumber="4"
                    icon={<Icon name="folderPlus" size={18} />}
                    label="Add to Project"
                    hint="Save video into a project collection."
                    onClick={onOpenProjectModal}
                />
            </div>
        </section>
    );
}
