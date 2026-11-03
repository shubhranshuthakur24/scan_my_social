import React from 'react';
import { Link } from '@inertiajs/react';
import Icon from './Icon';

export default React.memo(function ScriptTableRow({ script, onDelete }) {
    const post = script.content_analysis?.post;
    const isFreshScript = !post;
    const batch = script.generation_batch;
    const isViralWorkflow = batch?.workflow_version === 'viral-engine-v1';
    const workflowUrl = isViralWorkflow && batch?.id ? route('scripts.build', batch.id) : route('scripts.show', script.id);

    return (
        <tr className="hover:bg-slate-50/80 transition-colors group">
            <td className="px-6 py-4 min-w-[300px]">
                {isFreshScript ? (
                    <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-primary-50 flex-shrink-0 ring-1 ring-primary-200 flex items-center justify-center">
                            <Icon name="scripts" className="w-6 h-6 text-primary-400" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-600 line-clamp-1">{script.title || script.suggested_topic}</span>
                            <span className="text-[10px] text-primary-400 font-bold uppercase tracking-tight">Fresh Script</span>
                        </div>
                    </div>
                ) : (
                    <Link href={`/Library/${post.id}`} className="flex items-center gap-3">
                        <div className="w-10 h-14 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 ring-1 ring-slate-200">
                            <img src={post.display_url} className="w-full h-full object-cover" alt="" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700 line-clamp-1">{script.title || script.suggested_topic || post.short_code}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">@{post.owner_username}</span>
                        </div>
                    </Link>
                )}
            </td>
            <td className="px-6 py-4">
                <span className="px-2 py-1 bg-primary-50 text-primary-600 rounded-md text-[10px] font-bold uppercase tracking-wider">
                    {script.suggested_topic || 'No Topic'}
                </span>
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-1.5">
                    {script.overall_score != null ? (
                        <div className="w-10 h-6 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center text-[11px] font-bold border border-emerald-100">
                            {script.overall_score}
                        </div>
                    ) : (
                        <span className="text-[11px] text-slate-300 font-medium">N/A</span>
                    )}
                </div>
            </td>
            <td className="px-6 py-4 text-sm text-slate-500 font-medium">
                {script.estimated_duration || 'N/A'}
            </td>
            <td className="px-6 py-4">
                <div className="flex items-center gap-2 justify-end">
                    {script.status === 'awaiting_angle' && isViralWorkflow ? (
                        <Link
                            href={workflowUrl}
                            className="inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-primary-700"
                        >
                            Choose Angle
                        </Link>
                    ) : ['researching', 'processing'].includes(script.status) ? (
                        <div className="inline-flex items-center gap-2 text-primary-600 font-bold text-xs">
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            {script.status === 'researching' ? 'Researching...' : 'Generating...'}
                        </div>
                    ) : script.status === 'needs_input' || script.status === 'research_blocked' ? (
                        <Link
                            href={workflowUrl}
                            className={`inline-flex items-center justify-center rounded-lg px-4 py-1.5 text-xs font-bold transition-all ${
                                script.status === 'needs_input'
                                    ? 'bg-warning-50 text-warning-700 hover:bg-warning-100'
                                    : 'bg-danger-50 text-danger-700 hover:bg-danger-100'
                            }`}
                        >
                            {script.status === 'needs_input' ? 'Add Evidence' : 'Research Blocked'}
                        </Link>
                    ) : script.status === 'failed' ? (
                        <Link
                            href={workflowUrl}
                            className="inline-flex items-center justify-center rounded-lg bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all"
                        >
                            Generation Failed
                        </Link>
                    ) : (
                        <>
                            <Link
                                href={route('scripts.show', script.id)}
                                className="inline-flex items-center justify-center px-4 py-1.5 rounded-lg bg-primary-50 text-primary-600 text-xs font-bold hover:bg-primary-600 hover:text-white transition-all"
                            >
                                View Script
                            </Link>
                            {onDelete ? (
                                <button
                                    onClick={() => onDelete(script)}
                                    className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                    title="Delete script"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            ) : null}
                        </>
                    )}
                </div>
            </td>
        </tr>
    );
});
