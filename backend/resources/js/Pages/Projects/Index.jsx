import React, { useState, useEffect, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import Icon from '@/Components/Icon';
import Button from '@/Components/Button';
import ConfirmDialog from '@/Components/common/ConfirmDialog';

import Skeleton from '@/Components/Skeleton';
import SearchInput from '@/Components/SearchInput';
import EmptyState from '@/Components/EmptyState';
import ProjectEditModal from '@/Components/ProjectEditModal';
import { Plus, Search, Pencil, Trash2 } from 'lucide-react';
import ProjectCreateModal from '@/Components/Projects/ProjectCreateModal';
import ProjectStatsBar from '@/Pages/Projects/Partials/ProjectStatsBar';
import axios from 'axios';
import { useToast } from '@/Contexts/ToastContext';

const colorMap = {
    slate:   { bg: 'bg-slate-50',   border: 'border-slate-200',   icon: 'text-slate-400',   swatch: 'bg-slate-400'   },
    orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  icon: 'text-orange-400',  swatch: 'bg-orange-400'  },
    red:     { bg: 'bg-red-50',     border: 'border-red-200',     icon: 'text-red-400',     swatch: 'bg-red-400'     },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-400', swatch: 'bg-emerald-400' },
    blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-400',    swatch: 'bg-blue-400'    },
    purple:  { bg: 'bg-purple-50',  border: 'border-purple-200',  icon: 'text-purple-400',  swatch: 'bg-purple-400'  },
    pink:    { bg: 'bg-pink-50',    border: 'border-pink-200',    icon: 'text-pink-400',    swatch: 'bg-pink-400'    },
};

const colorOptions = ['slate', 'orange', 'red', 'emerald', 'blue', 'purple', 'pink'];

const COLOR_FILTER_LABELS = {
    slate:   'Slate',
    orange:  'Orange',
    red:     'Red',
    emerald: 'Emerald',
    blue:    'Blue',
    purple:  'Purple',
    pink:    'Pink',
};

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function timeAgo(dateStr) {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 2) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return formatDate(dateStr);
}

function ProjectsEmptyIcon({ className = '' }) {
    return <Icon name="projects" size={6} className={className} />;
}

export default function Index() {
    const [projects, setProjects] = useState([]);
    const [search, setSearch] = useState('');
    const [activeColorFilter, setActiveColorFilter] = useState(null);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState(null);
    const [renameProject, setRenameProject] = useState(null);
    const { addToast } = useToast();

    const resolveApiError = (error, fallbackMessage) => {
        const message = error?.response?.data?.message;
        if (typeof message === 'string' && message.trim() !== '') {
            return message;
        }
        const firstError = error?.response?.data?.errors
            ? Object.values(error.response.data.errors)?.[0]?.[0]
            : null;
        if (typeof firstError === 'string' && firstError.trim() !== '') {
            return firstError;
        }
        return fallbackMessage;
    };

    const fetchProjects = async (searchQuery = search) => {
        setLoading(true);
        try {
            const response = await axios.get('/api/projects', {
                params: searchQuery ? { search: searchQuery } : {},
            });
            setProjects(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            addToast(resolveApiError(error, 'Failed to load projects.'), 'error');
            setProjects([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects('');
    }, []);

    const handleCreate = async ({ name, color }) => {
        try {
            await axios.post('/api/projects', { name, color });
            await fetchProjects();
            addToast('Project created.', 'success');
            return true;
        } catch (error) {
            addToast(resolveApiError(error, 'Failed to create project.'), 'error');
            return false;
        }
    };

    const handleDelete = (id) => {
        setDeleteConfirm(id);
    };

    const confirmDelete = async () => {
        if (!deleteConfirm) return;
        try {
            await axios.delete(`/api/projects/${deleteConfirm}`);
            addToast('Project deleted.', 'success');
        } catch (error) {
            addToast(resolveApiError(error, 'Failed to delete project.'), 'error');
        } finally {
            setDeleteConfirm(null);
            fetchProjects();
        }
    };

    const handleRename = async (newName) => {
        if (!renameProject) return;
        try {
            await axios.put(`/api/projects/${renameProject.id}`, { name: newName });
            addToast('Project renamed.', 'success');
            await fetchProjects();
        } catch (error) {
            addToast(resolveApiError(error, 'Failed to rename project.'), 'error');
        } finally {
            setRenameProject(null);
        }
    };

    // Derive which colours are actually in use so we only show relevant filter pills.
    const availableColors = useMemo(
        () => colorOptions.filter((c) => projects.some((p) => (p.color || 'slate') === c)),
        [projects],
    );

    // Client-side colour filter (search is server-side via fetchProjects).
    const filteredProjects = useMemo(() => {
        if (!activeColorFilter) return projects;
        return projects.filter((p) => (p.color || 'slate') === activeColorFilter);
    }, [projects, activeColorFilter]);

    return (
        <AuthenticatedLayout
            topbarTitle={"Projects"}
            topbarDescription={"Organize saved content into focused workspaces for your team."}
            moduleTabsAction={(
                <Button onClick={() => setShowCreate(true)} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Create Project
                </Button>
            )}
        >
            <Head title="Projects" />

            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">

                {/* Search bar */}
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm xl:p-3">
                    <div className="flex items-center gap-3">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                setActiveColorFilter(null);
                                fetchProjects(search.trim());
                            }}
                            className="flex flex-1 items-center gap-2"
                        >
                            <SearchInput
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClear={() => {
                                    setSearch('');
                                    setActiveColorFilter(null);
                                    fetchProjects('');
                                }}
                                placeholder="Search projects"
                                className="flex-1"
                            />
                            <button
                                type="submit"
                                aria-label="Submit search"
                                disabled={!search.trim()}
                                className={`flex h-[42px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold shadow-sm transition-all ${
                                    !search.trim()
                                        ? 'cursor-not-allowed text-slate-400 opacity-50'
                                        : 'text-slate-700 hover:bg-slate-50 active:scale-95'
                                }`}
                            >
                                Go
                                <Icon name="chevronRight" size={4} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* Stats bar */}
                {!loading && <ProjectStatsBar projects={projects} />}

                {/* Colour filter pills */}
                {!loading && availableColors.length > 1 && (
                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        <button
                            type="button"
                            aria-pressed={activeColorFilter === null}
                            onClick={() => setActiveColorFilter(null)}
                            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-bold shadow-sm transition-all active:scale-95 ${
                                activeColorFilter === null
                                    ? 'border-primary-300 bg-primary-50 text-primary-700 ring-1 ring-primary-200'
                                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                            }`}
                        >
                            All
                        </button>
                        {availableColors.map((color) => {
                            const c = colorMap[color];
                            const isActive = activeColorFilter === color;
                            return (
                                <button
                                    key={color}
                                    type="button"
                                    aria-pressed={isActive}
                                    onClick={() =>
                                        setActiveColorFilter(isActive ? null : color)
                                    }
                                    className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[12px] font-bold shadow-sm transition-all active:scale-95 ${
                                        isActive
                                            ? `${c.border} ${c.bg} ${c.icon} ring-1`
                                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                                    }`}
                                >
                                    <span className={`h-2 w-2 rounded-full ${c.swatch}`} />
                                    {COLOR_FILTER_LABELS[color]}
                                </button>
                            );
                        })}
                    </div>
                )}

                <ProjectCreateModal
                    show={showCreate}
                    onClose={() => setShowCreate(false)}
                    onCreate={handleCreate}
                    colorOptions={colorOptions}
                    colorMap={colorMap}
                />

                <ProjectEditModal
                    show={renameProject !== null}
                    onClose={() => setRenameProject(null)}
                    onEdit={handleRename}
                    project={renameProject}
                />

                {/* Projects Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center"
                            >
                                <Skeleton variant="default" className="mb-3 h-12 w-12" />
                                <Skeleton variant="text" className="mb-2 w-3/4" />
                                <Skeleton variant="text" className="h-3 w-1/2" />
                            </div>
                        ))}
                    </div>
                ) : filteredProjects.length === 0 ? (
                    search.trim() ? (
                        <EmptyState
                            className="col-span-full xl:py-14"
                            title="No matches found"
                            description={`We couldn't find any projects matching "${search}". Try a different search term or clear the filter.`}
                            icon={Search}
                            iconContainerClassName="rounded-full border-slate-200 bg-slate-50"
                            iconClassName="text-slate-400"
                            titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                            descriptionClassName="max-w-md text-sm leading-relaxed text-slate-500"
                            action={(
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setSearch('');
                                        setActiveColorFilter(null);
                                        fetchProjects('');
                                    }}
                                    className="font-bold shadow-sm"
                                >
                                    Clear search
                                </Button>
                            )}
                        />
                    ) : activeColorFilter ? (
                        <EmptyState
                            className="col-span-full xl:py-14"
                            title="No projects with this colour"
                            description="Try a different colour filter or clear to see all projects."
                            icon={ProjectsEmptyIcon}
                            iconContainerClassName="rounded-3xl border-slate-100 bg-slate-50 shadow-inner"
                            titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                            descriptionClassName="max-w-md text-slate-600 text-sm leading-relaxed"
                            action={(
                                <Button
                                    variant="secondary"
                                    onClick={() => setActiveColorFilter(null)}
                                    className="font-bold shadow-sm"
                                >
                                    Clear filter
                                </Button>
                            )}
                        />
                    ) : (
                        <EmptyState
                            className="col-span-full xl:py-14"
                            title="No projects yet."
                            description="Create a project folder to organize and manage all your team's video ideas, scripts, and media in one workspace."
                            icon={ProjectsEmptyIcon}
                            iconContainerClassName="rounded-3xl border-success-100 bg-success-50 shadow-inner"
                            titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                            descriptionClassName="max-w-md text-slate-600 text-sm leading-relaxed"
                            action={(
                                <Button
                                    variant="primary"
                                    className="flex h-10 items-center gap-2 rounded-lg px-6 text-sm font-bold shadow-sm"
                                    onClick={() => setShowCreate(true)}
                                >
                                    <Icon name="plus" size={5} />
                                    Create Project
                                </Button>
                            )}
                        />
                    )
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                        {filteredProjects.map((project) => {
                            const colors = colorMap[project.color] || colorMap.slate;
                            const updatedLabel = timeAgo(project.updated_at || project.created_at);

                            return (
                                <div
                                    key={project.id}
                                    className={`group relative flex flex-col rounded-2xl border p-5 transition-all hover:shadow-md ${colors.border} ${colors.bg}`}
                                >
                                    {/* Hover action buttons */}
                                    <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setRenameProject(project);
                                            }}
                                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/80 hover:text-primary-500"
                                            aria-label="Rename project"
                                            title="Rename"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDelete(project.id);
                                            }}
                                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/80 hover:text-red-500"
                                            aria-label="Delete project"
                                            title="Delete"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>

                                    <Link
                                        href={`/projects/${project.id}`}
                                        className="flex flex-1 flex-col items-center text-center"
                                    >
                                        {/* Colour swatch dot */}
                                        <span
                                            className={`mb-3 block h-2 w-2 rounded-full ${colors.swatch} opacity-60`}
                                        />

                                        {/* Folder icon */}
                                        <Icon
                                            name="projects"
                                            size={6}
                                            className={`${colors.icon} mb-3`}
                                        />

                                        {/* Name */}
                                        <h3 className="mb-1 text-sm font-bold text-slate-800 leading-snug">
                                            {project.name}
                                        </h3>

                                        {/* Item count */}
                                        <p className={`text-xs font-semibold ${colors.icon}`}>
                                            {project.posts_count}{' '}
                                            {project.posts_count === 1 ? 'item' : 'items'}
                                        </p>

                                        {/* Last updated */}
                                        {updatedLabel && (
                                            <p className="mt-1.5 text-[10px] text-slate-400">
                                                Updated {updatedLabel}
                                            </p>
                                        )}
                                    </Link>
                                </div>
                            );
                        })}
                    </div>
                )}

                <ConfirmDialog
                    show={deleteConfirm !== null}
                    title="Delete Project"
                    message="Delete this project? This action cannot be undone."
                    confirmLabel="Delete"
                    variant="danger"
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteConfirm(null)}
                />
            </div>
        </AuthenticatedLayout>
    );
}
