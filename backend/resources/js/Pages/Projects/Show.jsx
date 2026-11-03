import React, { Fragment, useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import { Menu, Transition } from "@headlessui/react";
import axios from "axios";
import Button from "@/Components/Button";
import ContentCard from "@/Components/ContentCard";
import ContentCardSkeleton from "@/Components/ContentCardSkeleton";
import EmptyState from "@/Components/EmptyState";
import Icon from "@/Components/Icon";
import ProjectEditModal from "@/Components/ProjectEditModal";
import SearchInput from "@/Components/SearchInput";
import ConfirmDialog from "@/Components/common/ConfirmDialog";

import { useToast } from "@/Contexts/ToastContext";

const menuItemClasses = (active, tone = "default") => {
    const baseClasses =
        "group flex w-full items-center gap-2 rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1";
    const toneClasses =
        tone === "danger"
            ? active
                ? "bg-danger-50 text-danger-700 focus-visible:ring-danger-300"
                : "text-danger-600 focus-visible:ring-danger-300"
            : active
              ? "bg-slate-100 text-slate-950 focus-visible:ring-primary-300"
              : "text-slate-700 focus-visible:ring-primary-300";

    return `${baseClasses} ${toneClasses}`;
};

function ProjectEmptyIcon({ className = "" }) {
    return <Icon name="projects" className={className} />;
}

function SearchEmptyIcon({ className = "" }) {
    return <Icon name="search" className={className} />;
}

export default function Show({ id }) {
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [viewAs, setViewAs] = useState("Cards");
    const [postsPagination, setPostsPagination] = useState(null);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [showViewMenu, setShowViewMenu] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isEditingVideos, setIsEditingVideos] = useState(false);
    const [pendingRemovedPosts, setPendingRemovedPosts] = useState(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const { addToast } = useToast();

    const resolveApiError = (error, fallbackMessage) => {
        const message = error?.response?.data?.message;
        if (typeof message === "string" && message.trim() !== "") {
            return message;
        }

        const firstError = error?.response?.data?.errors
            ? Object.values(error.response.data.errors)?.[0]?.[0]
            : null;
        if (typeof firstError === "string" && firstError.trim() !== "") {
            return firstError;
        }

        return fallbackMessage;
    };

    const fetchProject = async (page = 1, appendPosts = false) => {
        if (!appendPosts) {
            setLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        try {
            const response = await axios.get(`/api/projects/${id}`, {
                params: { page, per_page: 24 },
            });

            const payload = response.data ?? {};
            const posts = Array.isArray(payload.posts) ? payload.posts : [];
            const pagination = payload.posts_pagination ?? null;

            setProject((previous) => {
                if (!appendPosts || !previous) {
                    return {
                        ...payload,
                        posts,
                    };
                }

                return {
                    ...payload,
                    posts: [...previous.posts, ...posts],
                };
            });
            setPostsPagination(pagination);
        } catch (error) {
            addToast(
                resolveApiError(error, "Failed to load project."),
                "error",
            );
        } finally {
            if (!appendPosts) {
                setLoading(false);
            } else {
                setIsLoadingMore(false);
            }
        }
    };

    useEffect(() => {
        fetchProject(1, false);

        const handleClickAway = () => {
            setShowViewMenu(false);
        };

        window.addEventListener("click", handleClickAway);
        return () => window.removeEventListener("click", handleClickAway);
    }, [id]);

    const handleRename = async (newName) => {
        if (!newName.trim()) {
            return;
        }

        try {
            await axios.put(`/api/projects/${id}`, { name: newName });
            setProject((previous) =>
                previous ? { ...previous, name: newName } : previous,
            );
            addToast("Project updated.", "success");
        } catch (error) {
            addToast(
                resolveApiError(error, "Failed to update project."),
                "error",
            );
        }
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`/api/projects/${id}`);
            addToast("Project deleted.", "success");
            router.visit("/projects");
        } catch (error) {
            addToast(
                resolveApiError(error, "Failed to delete project."),
                "error",
            );
        }

        setShowDeleteConfirm(false);
    };

    const handleQueueRemove = (postId) => {
        setPendingRemovedPosts((previous) => {
            const newSet = new Set(previous);
            if (newSet.has(postId)) {
                newSet.delete(postId);
            } else {
                newSet.add(postId);
            }
            return newSet;
        });
    };

    const handleSaveEditing = async () => {
        if (pendingRemovedPosts.size === 0) {
            setIsEditingVideos(false);
            return;
        }

        setIsSaving(true);
        try {
            for (const postId of pendingRemovedPosts) {
                await axios.delete(`/api/projects/${id}/posts/${postId}`);
            }

            const removedCount = pendingRemovedPosts.size;

            setProject((previous) => ({
                ...previous,
                posts: previous.posts.filter(
                    (post) => !pendingRemovedPosts.has(post.id),
                ),
                posts_count: Math.max(
                    0,
                    (previous.posts_count ?? 0) - removedCount,
                ),
            }));

            setPendingRemovedPosts(new Set());
            setIsEditingVideos(false);
            addToast(
                `Successfully removed ${removedCount} ${removedCount === 1 ? "video" : "videos"}`,
                "success",
            );
        } catch (error) {
            console.error("Error removing videos:", error);
            addToast("Failed to remove some videos", "error");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancelEditing = () => {
        setPendingRemovedPosts(new Set());
        setIsEditingVideos(false);
    };

    const filteredPosts =
        project?.posts?.filter((post) => {
            return (
                post.caption?.toLowerCase().includes(search.toLowerCase()) ||
                post.owner_username
                    ?.toLowerCase()
                    .includes(search.toLowerCase())
            );
        }) || [];

    const hasMorePosts = Boolean(postsPagination?.has_more_pages);
    const projectItemCount = project?.posts_count ?? 0;
    const pendingRemovalCount = pendingRemovedPosts.size;
    const hasProjectPosts = (project?.posts?.length ?? 0) > 0;

    const handleLoadMore = async () => {
        if (!hasMorePosts || isLoadingMore) {
            return;
        }

        const nextPage = (postsPagination?.current_page ?? 1) + 1;
        await fetchProject(nextPage, true);
    };

    return (
        <AuthenticatedLayout
            topbarTitle={project ? `Project Details: ${project.name}` : 'Project Details'}
            topbarDescription={
                loading ? (
                    'Loading project details...'
                ) : (
                    <>
                        {projectItemCount}{" "}
                        {projectItemCount === 1 ? "video" : "videos"}{" "}
                        saved
                    </>
                )
            }
            moduleTabsAction={
                <Button href={route("projects")} variant="secondary" size="sm">
                    <Icon name="arrowLeft" size={4} className="mr-1.5" />
                    Back to projects
                </Button>
            }
        >
            <Head title={project ? project.name : "Project Details"} />

            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">


                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1 space-y-3">
                            <SearchInput
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                onClear={() => setSearch("")}
                                placeholder="Search project items"
                                className="w-full"
                            />

                            <div className="flex flex-wrap items-center gap-2">
                                <div className="relative">
                                    <button
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            setShowViewMenu(
                                                (previous) => !previous,
                                            );
                                        }}
                                        aria-haspopup="menu"
                                        aria-expanded={showViewMenu}
                                        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                                    >
                                        <Icon
                                            name={
                                                viewAs === "Cards"
                                                    ? "grid"
                                                    : "list"
                                            }
                                            size={4}
                                            className="text-slate-500"
                                        />
                                        View: {viewAs}
                                        <Icon
                                            name="chevronDown"
                                            size={4}
                                            className={`text-slate-400 transition-transform ${showViewMenu ? "rotate-180" : ""}`}
                                        />
                                    </button>

                                    {showViewMenu && (
                                        <div
                                            className="absolute left-0 z-[160] mt-2 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5"
                                            onClick={(event) =>
                                                event.stopPropagation()
                                            }
                                        >
                                            <button
                                                onClick={() => {
                                                    setViewAs("Cards");
                                                    setShowViewMenu(false);
                                                }}
                                                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1 ${
                                                    viewAs === "Cards"
                                                        ? "bg-primary-50 text-primary-700"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Icon
                                                        name="grid"
                                                        size={4}
                                                    />
                                                    Cards
                                                </span>
                                                {viewAs === "Cards" && (
                                                    <Icon
                                                        name="check"
                                                        size={3.5}
                                                        className="text-primary-500"
                                                    />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setViewAs("Table");
                                                    setShowViewMenu(false);
                                                }}
                                                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1 ${
                                                    viewAs === "Table"
                                                        ? "bg-primary-50 text-primary-700"
                                                        : "text-slate-700 hover:bg-slate-50"
                                                }`}
                                            >
                                                <span className="flex items-center gap-2">
                                                    <Icon
                                                        name="list"
                                                        size={4}
                                                    />
                                                    Table
                                                </span>
                                                {viewAs === "Table" && (
                                                    <Icon
                                                        name="check"
                                                        size={3.5}
                                                        className="text-primary-500"
                                                    />
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {isEditingVideos && (
                                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-danger-200 bg-danger-50 px-3 py-1.5 text-xs font-bold text-danger-700">
                                        <Icon name="trash" size={3.5} />
                                        {pendingRemovalCount} selected for
                                        removal
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                            {isEditingVideos ? (
                                <>
                                    <Button
                                        className="w-full sm:w-auto"
                                        onClick={handleSaveEditing}
                                        disabled={isSaving}
                                        icon={<Icon name="check" />}
                                    >
                                        {isSaving
                                            ? "Saving..."
                                            : "Save changes"}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        className="w-full sm:w-auto"
                                        onClick={handleCancelEditing}
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <Menu
                                    as="div"
                                    className="relative inline-block w-full text-left sm:w-auto"
                                >
                                    {({ open }) => (
                                        <>
                                            <Menu.Button
                                                className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 sm:w-auto"
                                                aria-label="Open project actions"
                                                aria-expanded={open}
                                            >
                                                Actions
                                                <Icon
                                                    name="chevronDown"
                                                    size={4}
                                                    className="text-slate-400"
                                                />
                                            </Menu.Button>
                                            <Transition
                                                as={Fragment}
                                                enter="transition ease-out duration-100"
                                                enterFrom="transform opacity-0 scale-95"
                                                enterTo="transform opacity-100 scale-100"
                                                leave="transition ease-in duration-75"
                                                leaveFrom="transform opacity-100 scale-100"
                                                leaveTo="transform opacity-0 scale-95"
                                            >
                                                <Menu.Items className="absolute left-0 right-0 z-[180] mt-2 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl ring-1 ring-slate-900/5 focus:outline-none sm:left-auto sm:w-64">
                                                    {hasProjectPosts && (
                                                        <div className="pb-1">
                                                            <Menu.Item>
                                                                {({
                                                                    active,
                                                                }) => (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setIsEditingVideos(
                                                                                true,
                                                                            )
                                                                        }
                                                                        className={menuItemClasses(
                                                                            active,
                                                                        )}
                                                                    >
                                                                        <Icon
                                                                            name="videos"
                                                                            size={
                                                                                4
                                                                            }
                                                                            className="text-slate-400 group-hover:text-slate-600"
                                                                        />
                                                                        Manage
                                                                        videos
                                                                    </button>
                                                                )}
                                                            </Menu.Item>
                                                        </div>
                                                    )}
                                                    <div className="border-t border-slate-100 py-1">
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setIsEditModalOpen(
                                                                            true,
                                                                        )
                                                                    }
                                                                    className={menuItemClasses(
                                                                        active,
                                                                    )}
                                                                >
                                                                    <Icon
                                                                        name="edit"
                                                                        size={4}
                                                                        className="text-slate-400 group-hover:text-slate-600"
                                                                    />
                                                                    Rename
                                                                    project
                                                                </button>
                                                            )}
                                                        </Menu.Item>
                                                    </div>
                                                    <div className="border-t border-slate-100 pt-1">
                                                        <Menu.Item>
                                                            {({ active }) => (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        setShowDeleteConfirm(
                                                                            true,
                                                                        )
                                                                    }
                                                                    className={menuItemClasses(
                                                                        active,
                                                                        "danger",
                                                                    )}
                                                                >
                                                                    <Icon
                                                                        name="trash"
                                                                        size={4}
                                                                    />
                                                                    Delete
                                                                    project
                                                                </button>
                                                            )}
                                                        </Menu.Item>
                                                    </div>
                                                </Menu.Items>
                                            </Transition>
                                        </>
                                    )}
                                </Menu>
                            )}
                        </div>
                    </div>
                </section>

                {loading ? (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                        {Array.from({ length: 8 }).map((_, index) => (
                            <div
                                key={index}
                                className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                            >
                                <ContentCardSkeleton />
                            </div>
                        ))}
                    </div>
                ) : filteredPosts.length > 0 ? (
                    viewAs === "Cards" ? (
                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                            {filteredPosts.map((post) => (
                                <ContentCard
                                    key={post.id}
                                    post={post}
                                    onApprove={() => {}}
                                    onTranscribe={() => {}}
                                    onProcess={() => {}}
                                    onGenerateAudio={() => {}}
                                    isEditing={isEditingVideos}
                                    isPendingRemoval={pendingRemovedPosts.has(
                                        post.id,
                                    )}
                                    onRemove={() => handleQueueRemove(post.id)}
                                />
                            ))}
                        </div>
                    ) : (
                        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="min-w-full text-left">
                                    <thead className="border-b border-slate-200 bg-slate-50/80">
                                        <tr>
                                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                                                Type
                                            </th>
                                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                                                Caption / Name
                                            </th>
                                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                                                Added At
                                            </th>
                                            <th className="px-4 py-3 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredPosts.map((post) => (
                                            <tr
                                                key={post.id}
                                                className="group transition-colors hover:bg-slate-50/60"
                                            >
                                                <td className="px-4 py-3 align-top">
                                                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary-100 bg-primary-50 text-primary-600">
                                                        <Icon
                                                            name="videos"
                                                            size={4}
                                                        />
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    <div className="min-w-[220px] max-w-[440px]">
                                                        <p className="text-sm font-bold text-slate-900 break-words">
                                                            {post.caption ||
                                                                "Untitled item"}
                                                        </p>
                                                        <p className="mt-1 text-xs font-semibold text-slate-500 break-all">
                                                            by @
                                                            {post.owner_username ||
                                                                "unknown"}
                                                        </p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 align-top text-xs font-semibold text-slate-500">
                                                    {new Date(
                                                        post.created_at,
                                                    ).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 align-top">
                                                    {isEditingVideos ? (
                                                        <button
                                                            onClick={() =>
                                                                handleQueueRemove(
                                                                    post.id,
                                                                )
                                                            }
                                                            aria-label={
                                                                pendingRemovedPosts.has(
                                                                    post.id,
                                                                )
                                                                    ? "Undo remove video"
                                                                    : "Remove video"
                                                            }
                                                            className={`inline-flex min-h-8 items-center rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 ${
                                                                pendingRemovedPosts.has(
                                                                    post.id,
                                                                )
                                                                    ? "bg-slate-200 text-slate-700 hover:bg-slate-300 focus-visible:ring-slate-300"
                                                                    : "bg-danger-50 text-danger-700 hover:bg-danger-100 focus-visible:ring-danger-300"
                                                            }`}
                                                        >
                                                            {pendingRemovedPosts.has(
                                                                post.id,
                                                            )
                                                                ? "Undo"
                                                                : "Remove"}
                                                        </button>
                                                    ) : (
                                                        <Link
                                                            href={`/Library/${post.id}`}
                                                            className="inline-flex min-h-8 items-center rounded-lg px-2.5 py-1.5 text-xs font-bold text-primary-600 transition hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-1"
                                                            aria-label={`View video ${post.id}`}
                                                        >
                                                            View
                                                        </Link>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )
                ) : projectItemCount === 0 ? (
                    <EmptyState
                        className="rounded-2xl xl:py-14"
                        title="This project is empty"
                        description="Add videos to this project from the Videos workspace to start organizing and reviewing content here."
                        icon={ProjectEmptyIcon}
                        iconContainerClassName="rounded-2xl border-success-100 bg-success-50"
                        iconClassName="text-success-500"
                        action={
                            <Button
                                href="/Library"
                                size="sm"
                                icon={<Icon name="videos" />}
                            >
                                Browse videos
                            </Button>
                        }
                    />
                ) : (
                    <EmptyState
                        className="rounded-2xl xl:py-14"
                        title="No matches found"
                        description="We couldn't find anything matching your current search term."
                        icon={SearchEmptyIcon}
                        iconContainerClassName="rounded-2xl border-slate-200 bg-slate-50"
                        iconClassName="text-slate-400"
                        action={
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setSearch("");
                                }}
                            >
                                Clear search
                            </Button>
                        }
                    />
                )}

                {!loading && hasMorePosts && (
                    <div className="mt-2 flex justify-center">
                        <Button
                            variant="secondary"
                            onClick={handleLoadMore}
                            disabled={isLoadingMore}
                            className="min-w-36 font-bold"
                        >
                            {isLoadingMore ? "Loading..." : "Load more"}
                        </Button>
                    </div>
                )}
            </div>

            {project && (
                <ProjectEditModal
                    show={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    onEdit={handleRename}
                    project={project}
                />
            )}

            <ConfirmDialog
                show={showDeleteConfirm}
                title="Delete Project"
                message="Are you sure you want to delete this project? This action cannot be undone."
                confirmLabel="Delete"
                variant="danger"
                onConfirm={confirmDelete}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </AuthenticatedLayout>
    );
}
