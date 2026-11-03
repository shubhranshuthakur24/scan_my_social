import React, { useMemo, useState, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import Button from '@/Components/Button';
import ScriptRecreateModal from '@/Components/ScriptRecreateModal';
import ScriptRowSkeleton from '@/Components/ScriptRowSkeleton';
import SearchInput from '@/Components/SearchInput';
import Icon from '@/Components/Icon';
import EmptyState from '@/Components/EmptyState';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import useScriptPolling from '@/Hooks/useScriptPolling';
import ScriptTableRow from '@/Components/ScriptTableRow';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import axios from 'axios';

import { useToast } from '@/Contexts/ToastContext';

function ScriptTableHeader() {
    return (
        <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Script Item</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Suggested Topic</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Score</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
        </thead>
    );
}

function ScriptsEmptyIcon({ className = '' }) {
    return <Icon name="scripts" size={6} className={className} />;
}

function ScriptsTableShell({ children }) {
    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse text-left sm:min-w-0">
                    {children}
                </table>
            </div>
        </section>
    );
}

export default function Index() {
    const { url } = usePage();
    const { addToast } = useToast();
    const [scripts, setScripts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showRecreateModal, setShowRecreateModal] = useState(false);
    const [recreateSourceScriptId, setRecreateSourceScriptId] = useState(null);
    const [pendingOpenRecreate, setPendingOpenRecreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const queryParams = useMemo(() => new URLSearchParams(String(url || '').split('?')[1] || ''), [url]);
    const activeScriptingTab = (queryParams.get('scripting_tab') || 'collection').toLowerCase();
    const visibleScripts = useMemo(() => {
        if (activeScriptingTab !== 'recreated') {
            return scripts;
        }

        return scripts.filter((script) => script?.generation_mode === 'recreate');
    }, [scripts, activeScriptingTab]);

    const fetchScripts = async (isPoll = false) => {
        if (!isPoll) setLoading(true);
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        // Prevent browser caching by appending a timestamp
        params.append('_t', Date.now());

        try {
            const res = await fetch(`/api/scripts?${params.toString()}`, {
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });
            const data = await res.json();
            setScripts(data.data || data);
        } catch (err) {
            console.error('Failed to fetch scripts:', err);
        } finally {
            if (!isPoll) setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/scripts/${deleteTarget.id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
            });
            if (!res.ok) throw new Error('Failed to delete script.');
            setScripts(prev => prev.filter(s => s.id !== deleteTarget.id));
            addToast('Script deleted successfully.', 'success');
        } catch (err) {
            addToast(err.message || 'Failed to delete script.', 'error');
        } finally {
            setDeleting(false);
            setDeleteTarget(null);
        }
    };

    const clearQuickActionFlags = () => {
        if (typeof window === 'undefined') {
            return;
        }

        const params = new URLSearchParams(window.location.search);
        let changed = false;

        if (params.has('open_recreate')) {
            params.delete('open_recreate');
            changed = true;
        }

        if (!changed) {
            return;
        }

        const queryString = params.toString();
        const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash || ''}`;
        window.history.replaceState({}, '', nextUrl);
    };

    const handleRecreate = async (payload) => {
        setShowRecreateModal(false);

        try {
            const { data } = await axios.post('/api/scripts/generate', payload, {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!data?.success) {
                throw new Error(data?.message || 'Failed to recreate script.');
            }

            addToast('Recreated script generation started.', 'success');
            fetchScripts();
        } catch (error) {
            const message = error?.response?.data?.message || error?.message || 'Failed to recreate script.';
            addToast(message, 'error');
        }
    };

    useEffect(() => {
        const t = setTimeout(() => {
            fetchScripts();
        }, 400); // Debounce search
        return () => clearTimeout(t);
    }, [search]);

    useEffect(() => {
        const shouldOpenRecreate = queryParams.get('open_recreate') === '1';

        if (!shouldOpenRecreate) {
            return;
        }

        if (shouldOpenRecreate) {
            setPendingOpenRecreate(true);
        }

        clearQuickActionFlags();
    }, [queryParams]);

    useEffect(() => {
        if (!pendingOpenRecreate || loading) {
            return;
        }

        const candidate = scripts.find(
            (script) => script?.status === 'completed' && script?.content_analysis_id
        );

        if (!candidate) {
            setPendingOpenRecreate(false);
            addToast('No reusable completed script found for recreation yet.', 'warning');
            return;
        }

        setRecreateSourceScriptId(candidate.id);
        setShowRecreateModal(true);
        setPendingOpenRecreate(false);
    }, [pendingOpenRecreate, loading, scripts, addToast]);

    useScriptPolling({
        enabled: scripts.some(s => ['researching', 'processing', 'needs_input'].includes(s.status)),
        onPoll: async () => {
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            params.append('_t', Date.now());
            try {
                const res = await fetch(`/api/scripts?${params.toString()}`, {
                    headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
                });
                if (res.ok) {
                    const data = await res.json();
                    setScripts(data.data || data);
                }
            } catch (err) {
                // Ignore silent errors
            }
        },
        intervalMs: 3000
    });

    return (
        <AuthenticatedLayout>
            <Head title="Scripts Workspace" />

            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">
                <PageBanner
                    title="Scripts Workspace"
                    description="Manage, search, and review AI-generated content scripts."
                    variant="soft"
                >
                    <PageBannerAction href={route('scripts.create')} variant="neutralPrimary">
                        <Icon name="plus" size={5} />
                        New Script
                    </PageBannerAction>
                </PageBanner>

                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm xl:p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <form
                            onSubmit={(e) => { e.preventDefault(); fetchScripts(); }}
                            className="flex flex-1 items-center gap-2"
                        >
                            <SearchInput
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onClear={() => setSearch('')}
                                placeholder="Search scripts..."
                                className="flex-1"
                            />
                            <Button
                                type="submit"
                                variant="secondary"
                                size="sm"
                                aria-label="Submit search"
                                disabled={!search.trim()}
                                className="h-[42px] shrink-0 rounded-xl"
                                icon={<Icon name="chevronRight" size={4} />}
                                iconPosition="right"
                            >
                                Go
                            </Button>
                        </form>
                    </div>
                </div>

            {/* Content */}
            {
                loading ? (
                    <ScriptsTableShell>
                        <ScriptTableHeader />
                        <tbody className="divide-y divide-slate-50">
                            {[...Array(5)].map((_, i) => (
                                <ScriptRowSkeleton key={i} />
                            ))}
                        </tbody>
                    </ScriptsTableShell>
                ) : visibleScripts.length > 0 ? (
                    <ScriptsTableShell>
                        <ScriptTableHeader />
                        <tbody className="divide-y divide-slate-50">
                            {visibleScripts.map(script => (
                                <ScriptTableRow
                                    key={script.id}
                                    script={script}
                                    onDelete={setDeleteTarget}
                                />
                            ))}
                        </tbody>
                    </ScriptsTableShell>
                ) : (
                    <EmptyState
                        className="col-span-full rounded-2xl border-slate-200 shadow-sm xl:py-14"
                        title={activeScriptingTab === 'recreated' ? 'No recreated scripts found.' : 'No scripts found.'}
                        description={activeScriptingTab === 'recreated'
                            ? 'Use the Recreated tab action to generate recreated scripts from completed source scripts.'
                            : 'Generate your first script by navigating to any video and choosing the AI Process option in the details page.'}
                        icon={ScriptsEmptyIcon}
                        iconContainerClassName="rounded-2xl border-success-100 bg-success-50"
                        titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                        descriptionClassName="max-w-md text-slate-600 text-sm leading-relaxed"
                        action={(
                            <Button
                                variant="primary"
                                className="flex h-10 items-center gap-2 rounded-lg px-6 text-sm font-bold shadow-sm"
                                href={activeScriptingTab === 'recreated' ? undefined : route('scripts.create')}
                                onClick={() => {
                                    if (activeScriptingTab === 'recreated') {
                                        const candidate = scripts.find(
                                            (script) => script?.status === 'completed' && script?.content_analysis_id
                                        );

                                        if (!candidate) {
                                            addToast('No reusable completed script found for recreation yet.', 'warning');
                                            return;
                                        }

                                        setRecreateSourceScriptId(candidate.id);
                                        setShowRecreateModal(true);
                                        return;
                                    }

                                }}
                            >
                                <Icon name="plus" size={5} />
                                {activeScriptingTab === 'recreated' ? 'Recreate Script' : 'Generate New Script'}
                            </Button>
                        )}
                    />
                )
            }
            </div>

            <ScriptRecreateModal
                show={showRecreateModal}
                onClose={() => setShowRecreateModal(false)}
                onConfirm={handleRecreate}
                sourceScriptId={recreateSourceScriptId}
            />

            <ConfirmDialog
                show={!!deleteTarget}
                title="Delete Script"
                message={`Are you sure you want to delete "${deleteTarget?.title || deleteTarget?.suggested_topic || 'this script'}"? This action cannot be undone.`}
                confirmLabel={deleting ? 'Deleting...' : 'Delete'}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
                variant="danger"
            />
        </AuthenticatedLayout>
    );
}
