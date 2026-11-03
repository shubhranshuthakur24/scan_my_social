import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import Modal from '@/Components/Modal';
import TextInput from '@/Components/TextInput';
import InputLabel from '@/Components/InputLabel';
import InputError from '@/Components/InputError';
import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Copy,
    ExternalLink,
    Plus,
    Check,
    Search,
    Users,
    Trash2,
    LayoutDashboard,
    Clock,
    FileText,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import EmptyState from '@/Components/EmptyState';
import KpiCard from '@/Components/common/KpiCard';

const cardActionBaseClasses = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2';

export default function Index({ auth, forms = [] }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState(null);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [formToDelete, setFormToDelete] = useState(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
    });

    const filteredForms = useMemo(() => {
        return forms.filter(form =>
            form.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [forms, searchQuery]);

    const stats = useMemo(() => {
        const totalSubmissions = forms.reduce((sum, f) => sum + (f.submissions_count || 0), 0);
        const publishedCount = forms.filter(f => f.status === 'published').length;
        const draftCount = forms.filter(f => f.status === 'draft').length;
        return {
            total: forms.length,
            submissions: totalSubmissions,
            published: publishedCount,
            draft: draftCount
        };
    }, [forms]);

    const openCreateModal = () => {
        reset();
        setIsCreateModalOpen(true);
    };

    const handleCreateSubmit = (e) => {
        e.preventDefault();
        post(route('lead-forms.store', [], false), {
            onSuccess: () => setIsCreateModalOpen(false),
        });
    };

    const copyLink = async (e, id, url) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(url);
            setCopiedId(id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch (error) {
            console.error(error);
        }
    };

    const confirmDelete = (e, form) => {
        e.preventDefault();
        e.stopPropagation();
        setFormToDelete(form);
        setIsConfirmOpen(true);
    };

    const handleDelete = () => {
        if (!formToDelete) return;
        router.delete(route('lead-forms.destroy', formToDelete.id, false), {
            onSuccess: () => {
                setIsConfirmOpen(false);
                setFormToDelete(null);
            }
        });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            topbarTitle="Lead Forms"
            topbarDescription="Create, manage, and analyze lead capture forms."
            moduleTabsAction={(
                <Button onClick={openCreateModal} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    New Lead Form
                </Button>
            )}
        >
            <Head title="Lead Forms Dashboard" />
            <div className="mx-auto max-w-[1280px] space-y-5 xl:space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <KpiCard
                        label="Total Forms"
                        value={stats.total}
                        icon={LayoutDashboard}
                        helper="Capture forms"
                        size="compact"
                        variant="info"
                    />
                    <KpiCard
                        label="Active Forms"
                        value={stats.published}
                        icon={Check}
                        helper="Published"
                        size="compact"
                        variant="success"
                    />
                    <KpiCard
                        label="Draft Forms"
                        value={stats.draft}
                        icon={FileText}
                        helper="Not public"
                        size="compact"
                        variant="warning"
                    />
                    <KpiCard
                        label="Total Leads"
                        value={stats.submissions}
                        icon={Users}
                        helper="Submissions"
                        size="compact"
                        variant="primary"
                    />
                </div>

                <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search forms by title..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            aria-label="Search lead forms by title"
                            className="w-full rounded-xl border-slate-200 pl-11 text-sm shadow-sm transition-all placeholder:text-slate-400 focus:border-primary-500 focus:ring-primary-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
                        />
                    </div>
                    {searchQuery && (
                        <Button
                            onClick={() => setSearchQuery('')}
                            variant="ghost"
                            size="sm"
                            aria-label="Clear lead form search"
                        >
                            Clear search
                        </Button>
                    )}
                </div>

                {forms.length === 0 ? (
                    <EmptyState
                        className="xl:py-14"
                        title="Create your first lead form"
                        description="Start capturing high-quality leads by creating your first professional form in seconds."
                        icon={Plus}
                        titleClassName="text-xl font-bold text-slate-800 xl:text-lg"
                        descriptionClassName="max-w-85 text-sm leading-relaxed text-slate-600"
                        action={(
                            <Button type="button" onClick={openCreateModal} icon={Plus} size="sm">
                                Create First Form
                            </Button>
                        )}
                    />
                ) : filteredForms.length === 0 ? (
                    <EmptyState
                        className="xl:py-12"
                        title="No forms match your search"
                        description="Try another title or clear the search to see all forms."
                        icon={Search}
                        iconContainerClassName="rounded-xl border-slate-200 bg-slate-50"
                        iconClassName="text-slate-400"
                        titleClassName="text-lg font-black text-slate-900"
                        descriptionClassName="text-sm font-medium text-slate-500"
                        action={(
                            <Button
                                onClick={() => setSearchQuery('')}
                                variant="secondary"
                                size="sm"
                                aria-label="Clear lead form search"
                            >
                                Clear search
                            </Button>
                        )}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        <AnimatePresence>
                            {filteredForms.map((leadForm, index) => (
                                <motion.div
                                    key={leadForm.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                >
                                    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
                                        <Link
                                            href={route('lead-forms.show', leadForm.id, false)}
                                            className="relative h-32 w-full overflow-hidden bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2"
                                            aria-label={`Edit ${leadForm.title}`}
                                        >
                                            {leadForm.cover_image_url ? (
                                                <img
                                                    src={leadForm.cover_image_url}
                                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    alt={leadForm.title}
                                                />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-slate-100 to-slate-200">
                                                    <LayoutDashboard className="h-12 w-12 text-slate-300 opacity-50" />
                                                </div>
                                            )}

                                            <div className="absolute left-4 top-4 z-10">
                                                <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm border ${leadForm.status === 'published'
                                                    ? 'border-success-300 bg-success-500/90 text-white'
                                                    : leadForm.status === 'draft'
                                                        ? 'border-warning-300 bg-warning-500/90 text-white'
                                                        : 'border-slate-300/60 bg-slate-900/50 text-white'
                                                    }`}>
                                                    {leadForm.status}
                                                </span>
                                            </div>

                                            <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5">
                                                <span className="rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600 shadow-sm backdrop-blur-md">
                                                    Edit
                                                </span>
                                            </div>
                                        </Link>

                                        <div className="flex flex-1 flex-col p-5">
                                            <div className="flex-1">
                                                <Link
                                                    href={route('lead-forms.show', leadForm.id, false)}
                                                    className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2"
                                                >
                                                    <h3 className="line-clamp-2 break-words text-lg font-black leading-tight text-slate-900 transition-colors group-hover:text-primary-600">
                                                        {leadForm.title}
                                                    </h3>
                                                </Link>
                                                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Users className="h-4 w-4 text-slate-400" />
                                                        <span className="text-sm font-semibold">{leadForm.submissions_count} <span className="text-[10px] font-medium opacity-70">Leads</span></span>
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-slate-500">
                                                        <Clock className="h-4 w-4 text-slate-400" />
                                                        <span className="text-sm">{new Date(leadForm.updated_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-4">
                                                <Button
                                                    href={route('lead-forms.show', leadForm.id, false)}
                                                    icon={LayoutDashboard}
                                                    size="xs"
                                                    variant="outline"
                                                    className="w-full rounded-xl border-primary-100 bg-primary-50 text-[10px] uppercase tracking-widest text-primary-700 hover:bg-primary-100 hover:text-primary-800"
                                                    aria-label={`Edit ${leadForm.title}`}
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    href={route('lead-forms.submissions', leadForm.id, false)}
                                                    icon={Users}
                                                    size="xs"
                                                    variant="secondary"
                                                    className="w-full rounded-xl bg-slate-50 text-[10px] uppercase tracking-widest"
                                                    aria-label={`View leads for ${leadForm.title}`}
                                                >
                                                    Leads
                                                </Button>
                                                <a
                                                    href={leadForm.public_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className={`${cardActionBaseClasses} border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50`}
                                                    aria-label={`Open public form for ${leadForm.title}`}
                                                    title={`Open public form for ${leadForm.title}`}
                                                >
                                                    <ExternalLink className="h-3.5 w-3.5" />
                                                    Open
                                                </a>
                                                <button
                                                    type="button"
                                                    onClick={(e) => copyLink(e, leadForm.id, leadForm.public_url)}
                                                    className={`${cardActionBaseClasses} ${copiedId === leadForm.id
                                                        ? 'border-success-200 bg-success-50 text-success-700'
                                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                                        }`}
                                                    aria-label={copiedId === leadForm.id ? `Copied public link for ${leadForm.title}` : `Copy public link for ${leadForm.title}`}
                                                    title={copiedId === leadForm.id ? 'Copied' : 'Copy public link'}
                                                >
                                                    {copiedId === leadForm.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                                    {copiedId === leadForm.id ? 'Copied' : 'Copy'}
                                                </button>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={(e) => confirmDelete(e, leadForm)}
                                                className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-500/30 focus-visible:ring-offset-2 hover:bg-danger-50 hover:text-danger-600"
                                                aria-label={`Delete ${leadForm.title}`}
                                                title={`Delete ${leadForm.title}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                                Delete
                                            </button>
                                        </div>
                                    </article>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>

            <ConfirmDialog
                show={isConfirmOpen}
                title="Delete Lead Form?"
                message={`This will permanently delete "${formToDelete?.title}" and all its collected submissions. This action cannot be undone.`}
                confirmLabel="Delete Form"
                variant="danger"
                onConfirm={handleDelete}
                onCancel={() => setIsConfirmOpen(false)}
            />

            <Modal show={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} maxWidth="md">
                <form onSubmit={handleCreateSubmit} className="overflow-hidden rounded-2xl bg-white">
                    <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-600">
                                <Plus className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl font-black text-slate-950">Create New Form</h2>
                                <p className="mt-1 text-sm font-medium leading-6 text-slate-500">
                                    Give your form a name and a short description to get started.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6 px-6 py-6 sm:px-8">
                        <div>
                            <InputLabel htmlFor="title" value="Display Title" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5" />
                            <TextInput
                                id="title"
                                value={data.title}
                                onChange={(e) => setData('title', e.target.value)}
                                className="w-full rounded-xl"
                                placeholder="e.g. Early Access Program"
                                isFocused
                                required
                            />
                            <InputError message={errors.title} className="mt-2" />
                        </div>

                        <div>
                            <InputLabel htmlFor="description" value="Introductory Description" className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5" />
                            <textarea
                                id="description"
                                value={data.description}
                                onChange={(e) => setData('description', e.target.value)}
                                className="w-full rounded-xl border-slate-300 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500/10"
                                placeholder="State the purpose of this form..."
                                rows={3}
                            />
                            <InputError message={errors.description} className="mt-2" />
                        </div>
                    </div>

                    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-end sm:px-8">
                        <Button
                            type="button"
                            onClick={() => setIsCreateModalOpen(false)}
                            disabled={processing}
                            variant="secondary"
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={processing}
                            isLoading={processing}
                            icon={Plus}
                            className="w-full sm:w-auto"
                        >
                            {processing ? 'Creating...' : 'Create Form'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </AuthenticatedLayout>
    );
}
