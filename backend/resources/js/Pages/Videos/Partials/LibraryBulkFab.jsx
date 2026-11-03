import React from 'react';
import Icon from '@/Components/Icon';
import Tooltip from '@/Components/Tooltip';
import Button from '@/Components/Button';

/**
 * Floating bulk-action bar that appears when videos are selected.
 * Handles project selection and "Add to Project" submission.
 *
 * @param {{
 *   fabRef: React.Ref,
 *   dropdownProjectRef: (node: HTMLElement|null) => void,
 *   selectedCount: number,
 *   projects: object[],
 *   selectedProjectId: number|null,
 *   isProjectDropdownOpen: boolean,
 *   isBulkAdding: boolean,
 *   onSelectProject: (id: number) => void,
 *   onToggleProjectDropdown: () => void,
 *   onBulkAdd: () => void,
 *   onClearSelection: () => void,
 * }} props
 */
export default function LibraryBulkFab({
    fabRef,
    dropdownProjectRef,
    selectedCount,
    projects = [],
    selectedProjectId,
    isProjectDropdownOpen,
    isBulkAdding,
    onSelectProject,
    onToggleProjectDropdown,
    onBulkAdd,
    onClearSelection,
}) {
    if (selectedCount === 0) return null;

    const selectedProjectName = selectedProjectId
        ? projects.find((p) => String(p.id) === String(selectedProjectId))?.name
        : null;

    return (
        <div
            ref={fabRef}
            className="fixed bottom-20 left-1/2 z-[100] w-[calc(100vw-1rem)] -translate-x-1/2 animate-in slide-in-from-bottom-8 duration-500 ease-out sm:bottom-24 sm:w-auto"
        >
            <div className="flex w-full flex-col gap-2 rounded-2xl border border-primary-500/50 bg-primary-600 p-1.5 text-white shadow-xl shadow-primary-900/20 sm:min-w-[400px] sm:flex-row sm:items-center sm:gap-3">
                {/* Selection count badge */}
                <div className="flex items-center gap-2.5 border-b border-primary-500/50 px-3 py-2 sm:border-b-0 sm:border-r">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-[12px] font-black text-primary-600 shadow-sm">
                        {selectedCount}
                    </div>
                    <span className="text-[13px] font-bold tracking-tight">
                        Videos selected
                    </span>
                </div>

                {/* Project selector */}
                <div className="relative flex flex-1 items-center gap-1.5 pr-1.5">
                    <div className="relative flex-1" ref={dropdownProjectRef}>
                        <button
                            type="button"
                            onClick={onToggleProjectDropdown}
                            aria-haspopup="listbox"
                            aria-expanded={isProjectDropdownOpen}
                            className="flex w-full items-center justify-between rounded-xl border border-primary-500/30 bg-primary-700/50 px-3 py-2 text-[12px] font-bold transition-all hover:bg-primary-700/70 focus:ring-1 focus:ring-white/50 group"
                        >
                            <span
                                className={`truncate capitalize ${!selectedProjectId ? 'text-primary-100' : 'text-white'}`}
                            >
                                {selectedProjectName ?? 'Select project...'}
                            </span>
                            <Icon
                                name="chevronDown"
                                size={3.5}
                                className={`text-primary-200 transition-transform duration-200 ${isProjectDropdownOpen ? 'rotate-180' : ''}`}
                            />
                        </button>

                        {isProjectDropdownOpen && (
                            <div className="absolute bottom-full left-0 z-[110] mb-2 max-h-48 w-full animate-in fade-in slide-in-from-bottom-2 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-2xl duration-200">
                                <div className="p-1">
                                    {projects.length === 0 ? (
                                        <div className="px-3 py-2 text-[11px] font-medium text-slate-500">
                                            No projects found
                                        </div>
                                    ) : (
                                        projects.map((project) => (
                                            <button
                                                key={project.id}
                                                type="button"
                                                onClick={() => {
                                                    onSelectProject(project.id);
                                                }}
                                                className={`w-full rounded-lg px-3 py-2 text-left text-[12px] font-bold capitalize transition-colors ${
                                                    String(selectedProjectId) === String(project.id)
                                                        ? 'bg-primary-50 text-primary-600'
                                                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                                                }`}
                                            >
                                                {project.name}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Add to Project button */}
                    {selectedProjectId && (
                        <Tooltip
                            text="Add selected videos to project"
                            position="top"
                            showOnFocus={false}
                        >
                            <button
                                type="button"
                                onClick={onBulkAdd}
                                disabled={isBulkAdding}
                                className="flex h-[36px] animate-in fade-in zoom-in items-center gap-1.5 rounded-xl bg-white px-5 text-[12px] font-black text-primary-600 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:bg-primary-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isBulkAdding ? (
                                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-600/20 border-t-primary-600" />
                                ) : (
                                    <>
                                        Add to Project
                                        <Icon name="plus" size={3.5} />
                                    </>
                                )}
                            </button>
                        </Tooltip>
                    )}

                    {/* Cancel button */}
                    <Tooltip
                        text="Cancel and clear selection"
                        position="top"
                        showOnFocus={false}
                    >
                        <button
                            type="button"
                            onClick={onClearSelection}
                            className="flex h-[36px] w-[36px] items-center justify-center rounded-xl border border-primary-500/30 bg-primary-700/50 text-primary-100 transition-all hover:bg-primary-700 hover:text-white"
                            title="Cancel selection"
                        >
                            <Icon name="x" size={4} />
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    );
}
