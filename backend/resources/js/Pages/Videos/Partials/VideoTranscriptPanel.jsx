import React from 'react';
import Button from '@/Components/Button';
import SectionHeader from './components/SectionHeader';
import Icon from '@/Components/Icon';

export default function VideoTranscriptPanel({
    transcriptData,
    wordCount,
    isTranscribing,
    transcribeError,
    onTranscribe,
    onCopyTranscript,
    copyStatus = 'idle',
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <SectionHeader
                    icon={<Icon name="mic" />}
                    title="AI Transcript"
                    subtitle="Voice-to-text for deeper content analysis."
                />

                {transcriptData ? (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-600 bg-accent-50/60 border border-accent-100/60 px-2.5 py-1 rounded-lg">
                            {wordCount} words
                        </span>
                        <Button
                            onClick={onCopyTranscript}
                            type="button"
                            size="xs"
                            variant={copyStatus === 'success' ? 'success' : 'secondary'}
                            aria-label={copyStatus === 'success' ? 'Transcript copied' : 'Copy transcript'}
                            icon={copyStatus === 'success' ? <Icon name="checkCircle" className="h-3.5 w-3.5" /> : <Icon name="copy" className="h-3.5 w-3.5" />}
                            className="active:scale-95 transition-transform duration-100 font-bold"
                        >
                            {copyStatus === 'success' ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                ) : null}
            </div>

            {transcriptData ? (
                <div className="relative mt-5 rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6 overflow-hidden">
                    <div className="absolute top-[-8px] left-6 px-3 py-1 bg-white border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest shadow-sm">
                        Verbatim Result
                    </div>
                    <div className="border-l-4 border-primary-500 pl-4 py-1">
                        <p className="break-words text-[15px] italic leading-relaxed tracking-tight text-slate-600 whitespace-pre-line font-medium">
                            "{transcriptData}"
                        </p>
                    </div>
                </div>
            ) : (
                <div className="group/transcribe relative mt-5 overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 py-12 text-center transition-all hover:bg-slate-50">
                    <div className="relative z-10">
                        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-primary-500 shadow-sm transition-transform duration-300 group-hover/transcribe:scale-105 group-hover/transcribe:shadow-md">
                            <Icon name="mic" className="w-6 h-6 animate-pulse" />
                        </div>
                        <h4 className="text-lg font-bold text-slate-900 mb-1.5">Ready to Transcribe</h4>
                        <p className="text-xs text-slate-500 max-w-xs mx-auto mb-6 leading-relaxed font-semibold">
                            Convert audio to text to analyze hooks and content patterns.
                        </p>

                        <Button
                            onClick={onTranscribe}
                            disabled={isTranscribing}
                            type="button"
                            variant="primary"
                            size="lg"
                            isLoading={isTranscribing}
                            icon={!isTranscribing ? <Icon name="mic" className="h-4 w-4" /> : null}
                            className="font-bold shadow-sm hover:shadow active:scale-95"
                        >
                            {isTranscribing ? 'Processing Voice...' : 'Initiate Transcription'}
                        </Button>

                        {transcribeError ? (
                            <div className="mt-6 px-4 py-3 rounded-2xl bg-red-50 border border-red-100 max-w-sm mx-auto animate-in fade-in slide-in-from-top-2 duration-300">
                                <p className="text-xs text-red-600 font-bold mb-1">Transcription Issue</p>
                                <p className="text-[11px] text-red-500 font-medium leading-relaxed">{transcribeError}</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </section>
    );
}
