import React, { useEffect, useRef } from 'react';
import { Check, FolderPlus, X } from 'lucide-react';

export default function AddToProjectModal({
    show,
    onClose,
    projectsLoading,
    projectsList,
    addedToProject,
    isSubmitting,
    onAddToProject,
    newProjectName,
    onNewProjectNameChange,
    onCreateAndAdd,
}) {
    const dialogRef = useRef(null);
    const closeButtonRef = useRef(null);
    const previousActiveElementRef = useRef(null);

    const onCloseRef = useRef(onClose);
    useEffect(() => {
        onCloseRef.current = onClose;
    }, [onClose]);

    useEffect(() => {
        if (!show) return undefined;

        previousActiveElementRef.current = document.activeElement;
        setTimeout(() => {
            closeButtonRef.current?.focus();
        }, 0);

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                onCloseRef.current();
            }

            if (event.key === 'Tab' && dialogRef.current) {
                const focusable = dialogRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                if (!focusable.length) return;

                const first = focusable[0];
                const last = focusable[focusable.length - 1];

                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            if (previousActiveElementRef.current instanceof HTMLElement) {
                previousActiveElementRef.current.focus();
            }
        };
    }, [show]);

    if (!show) {
        return null;
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]"
            onClick={onClose}
            aria-hidden="true"
        >
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-to-project-title"
                className="w-full max-w-[430px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl sm:p-7"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between gap-3">
                    <h2 id="add-to-project-title" className="text-[31px] font-black tracking-tight text-slate-800 sm:text-[33px]">
                        Add to Project
                    </h2>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-slate-700 text-slate-700 transition-colors hover:bg-slate-100"
                        aria-label="Close add to project dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="mt-4 h-px bg-slate-200" />

                {projectsLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                    </div>
                ) : projectsList.length > 0 ? (
                    <div className="mt-4 max-h-56 space-y-2 overflow-y-auto pr-1">
                        {projectsList.map((project) => (
                            <button
                                key={project.id}
                                onClick={() => onAddToProject(project.id)}
                                type="button"
                                disabled={isSubmitting}
                                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${addedToProject === project.id
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 hover:border-primary-300 hover:bg-primary-50/30'
                                    } ${isSubmitting ? 'cursor-not-allowed opacity-60' : ''}`}
                            >
                                {addedToProject === project.id ? (
                                    <Check className="h-5 w-5 text-emerald-500" />
                                ) : (
                                    <FolderPlus className="h-5 w-5 text-slate-400" />
                                )}
                                <span className="text-sm font-semibold">{project.name}</span>
                                <span className="ml-auto text-xs text-slate-400">{project.posts_count} items</span>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2 text-xs font-medium text-slate-500">
                        No projects yet. Create your first one below.
                    </p>
                )}

                <div className="mt-5 border-t border-slate-200 pt-5">
                    <div className="flex flex-col items-stretch gap-2 sm:flex-row">
                        <input
                            type="text"
                            value={newProjectName}
                            onChange={(event) => onNewProjectNameChange(event.target.value)}
                            placeholder="New project name"
                            className="h-11 flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-4 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    onCreateAndAdd();
                                }
                            }}
                            disabled={isSubmitting}
                        />
                        <button
                            onClick={onCreateAndAdd}
                            type="button"
                            disabled={isSubmitting || !newProjectName.trim()}
                            className={`h-11 rounded-xl px-4 text-sm font-bold text-white transition-colors sm:whitespace-nowrap ${isSubmitting || !newProjectName.trim()
                                ? 'cursor-not-allowed bg-slate-400'
                                : 'bg-slate-900 hover:bg-slate-800'
                                }`}
                        >
                            {isSubmitting ? 'Working...' : 'Create & Add'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
