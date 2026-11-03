import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import InputError from '@/Components/InputError';
import { Head, router, useForm } from '@inertiajs/react';
import { Copy, Eye, LayoutDashboard, Share2, Trash2, ArrowLeft, Users, Check, CloudUpload, X, Image, Info } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { motion, AnimatePresence } from 'framer-motion';

// Partials
import InternalNav from './Partials/InternalNav';
import FieldCard from './Partials/FieldCard';
import FieldToolbox from './Partials/FieldToolbox';
import ConfirmDialog from '@/Components/common/ConfirmDialog';

const FIELD_TYPES = [
    { type: 'text', label: 'Text' },
    { type: 'number', label: 'Number' },
    { type: 'email', label: 'Email' },
    { type: 'url', label: 'URL' },
    { type: 'phone', label: 'Phone' },
    { type: 'location', label: 'Location' },
    { type: 'country', label: 'Country' },
    { type: 'date', label: 'Date' },
    { type: 'dropdown', label: 'Dropdown' },
    { type: 'checkbox', label: 'Checkbox' },
    { type: 'radio', label: 'Radio Buttons' },
    { type: 'rating', label: 'Rating' },
    { type: 'upload', label: 'Upload' },
];

export default function Show({ auth, form, active_tab = 'summary', submissions = null }) {
    const [activeFieldIndex, setActiveFieldIndex] = useState(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const { data, setData, patch, processing, errors } = useForm({
        title: form.title || '',
        description: form.description || '',
        cover_image_url: form.cover_image_url || '',
        status: form.status || 'draft',
        fields: Array.isArray(form.fields) ? form.fields : [],
        settings: {
            redirect_enabled: Boolean(form.settings?.redirect_enabled),
            redirect_url: form.settings?.redirect_url || '',
            submit_button_label: form.settings?.submit_button_label || 'Submit',
            success_message: form.settings?.success_message || 'Thanks, your response has been recorded.',
        },
    });

    const activeTab = active_tab;

    useEffect(() => {
        setData('cover_image_url', form.cover_image_url || '');
    }, [form.cover_image_url, setData]);

    const onTabChange = (tab) => {
        router.get(route('lead-forms.show', form.id, false), { tab }, { preserveState: true, preserveScroll: true });
    };

    const saveForm = () => {
        patch(route('lead-forms.update', form.id, false), {
            preserveScroll: true,
        });
    };

    const togglePublish = () => {
        router.patch(route('lead-forms.publish', form.id, false), {}, { preserveScroll: true });
    };

    const handleConfirmDelete = () => {
        router.delete(route('lead-forms.destroy', form.id, false), {
            onSuccess: () => setIsDeleteDialogOpen(false),
        });
    };

    const copyShareLink = async () => {
        try {
            await navigator.clipboard.writeText(form.public_url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error(error);
        }
    };

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }

        setUploading(true);
        router.post(route('lead-forms.upload-cover', form.id), {
            image: file
        }, {
            forceFormData: true,
            preserveScroll: true,
            onFinish: () => {
                e.target.value = '';
                setUploading(false);
            },
        });
    };

    const removeImage = () => {
        router.delete(route('lead-forms.remove-cover', form.id), {
            preserveScroll: true,
        });
    };

    const updateField = (index, key, value) => {
        const next = [...data.fields];
        next[index] = {
            ...next[index],
            [key]: value,
        };
        setData('fields', next);
    };

    const addField = (type) => {
        const next = [...data.fields, {
            id: `${type}_${Date.now()}`,
            key: `${type}_${data.fields.length + 1}`,
            type,
            label: 'Untitled Field',
            placeholder: '',
            required: false,
            options: [],
            max_rating: 5,
        }];
        setData('fields', next);
        setActiveFieldIndex(next.length - 1);

        // If not on editor tab, switch to it
        if (activeTab !== 'editor') {
            router.get(route('lead-forms.show', form.id, false), { tab: 'editor' }, {
                preserveState: true,
                preserveScroll: true
            });
        }

        // Scroll to the new field
        setTimeout(() => {
            const element = document.getElementById(`field-${next.length - 1}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 150);
    };

    const removeField = (index) => {
        const next = data.fields.filter((_, fieldIndex) => fieldIndex !== index);
        setData('fields', next);
        setActiveFieldIndex(null);
    };

    const duplicateField = (index) => {
        const field = data.fields[index];
        const next = [...data.fields];
        next.splice(index + 1, 0, {
            ...field,
            id: `${field.type}_${Date.now()}_dup`,
            key: `${field.key}_copy`,
        });
        setData('fields', next);
        setActiveFieldIndex(index + 1);
    };

    const onDragEnd = (result) => {
        if (!result.destination) return;
        const items = Array.from(data.fields);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setData('fields', items);
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={`Lead Form - ${form.title}`} />

            <div className="mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8">
                <PageBanner
                    className="mb-8"
                    variant="neutral"
                    title={form.title}
                    description={<span className="break-all">{form.public_url}</span>}
                >
                    <PageBannerAction href={route('lead-forms.index')} variant="neutralSecondary">
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </PageBannerAction>
                    <span className={`inline-flex min-h-10 items-center rounded-xl border px-3.5 py-2 text-xs font-black uppercase tracking-wider shadow-sm ${form.status === 'published'
                        ? 'border-success-200 bg-success-50 text-success-700'
                        : form.status === 'draft'
                            ? 'border-warning-200 bg-warning-50 text-warning-700'
                            : 'border-slate-200 bg-slate-100 text-slate-600'
                        }`}>
                        {form.status}
                    </span>
                    <PageBannerAction onClick={copyShareLink} variant={copied ? 'success' : 'neutralSecondary'}>
                        {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                        {copied ? 'Copied' : 'Copy Link'}
                    </PageBannerAction>
                    <PageBannerAction href={form.public_url} external variant="neutralSecondary">
                        <Eye className="h-4 w-4" />
                        Preview
                    </PageBannerAction>
                    <PageBannerAction onClick={togglePublish} variant={form.status === 'published' ? 'neutralSecondary' : 'success'}>
                        {form.status === 'published' ? 'Unpublish Form' : 'Publish Form'}
                    </PageBannerAction>
                    <PageBannerAction onClick={saveForm} disabled={processing || uploading} variant="neutralPrimary">
                        {processing ? 'Saving...' : 'Save Changes'}
                    </PageBannerAction>
                </PageBanner>

                {/* Dashboard Explorer Layout */}
                <div className="relative flex flex-col gap-8 lg:flex-row lg:items-start">
                    {/* Left Sidebar Nav */}
                    <aside className="w-full shrink-0 lg:sticky lg:top-24 lg:w-48">
                        <InternalNav activeTab={activeTab} onTabChange={onTabChange} />

                        <div className="mt-8 border-t border-primary-200 pt-8">
                            <button
                                type="button"
                                onClick={() => setIsDeleteDialogOpen(true)}
                                className="group flex w-full items-center gap-3 rounded-lg bg-red-500 px-3 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-red-600"
                            >
                                <Trash2 className="h-5 w-5 text-slate-300 transition-colors duration-200 group-hover:text-white" />
                                Delete Form
                            </button>
                        </div>
                    </aside>



                    {/* Main Content Area */}
                    <main className="min-w-0 flex-1">
                        <AnimatePresence mode="wait">
                            {activeTab === 'summary' && (
                                <motion.div
                                    key="summary"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-6"
                                >
                                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
                                            <h3 className="text-lg font-bold text-slate-900">Form Overview</h3>
                                            <p className="mt-1 text-sm text-slate-500">Public distribution details and sharing.</p>

                                            <div className="mt-6 space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Public Link</label>
                                                    <div className="mt-2 flex items-center gap-2">
                                                        <code className="flex-1 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 font-mono truncate">
                                                            {form.public_url}
                                                        </code>
                                                        <button
                                                            type="button"
                                                            onClick={copyShareLink}
                                                            aria-label="Copy public form link"
                                                            className={`h-11 w-11 flex items-center justify-center rounded-xl border transition-all ${copied
                                                                ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                                                                : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                                                                }`}
                                                        >
                                                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <KpiCard
                                                label="Submissions"
                                                value={form.submissions_count}
                                                helper="Collected responses"
                                                icon={Users}
                                                size="compact"
                                                variant="info"
                                            />
                                            <KpiCard
                                                label="Fields"
                                                value={data.fields.length}
                                                helper="Current form fields"
                                                icon={LayoutDashboard}
                                                size="compact"
                                            />
                                            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                                                <p className="text-xs font-black uppercase tracking-wider text-slate-400">Form Status</p>
                                                <span className={`mt-3 inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-wider ${form.status === 'published'
                                                    ? 'border-success-200 bg-success-50 text-success-700'
                                                    : form.status === 'draft'
                                                        ? 'border-warning-200 bg-warning-50 text-warning-700'
                                                        : 'border-slate-200 bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {form.status}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'editor' && (
                                <motion.div
                                    key="editor"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="grid grid-cols-1 gap-4 xl:grid-cols-12 xl:items-start"
                                >
                                    {/* Left: The Builder Workspace */}
                                    <section className="space-y-6 xl:col-span-9">
                                        {/* Form Meta Section - High-End Layout */}
                                        <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                                            <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-12 lg:items-center">
                                                {/* Left Column: Interactive Uploader */}
                                                <div>
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse"></div>
                                                        <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block">Form Style & Cover</label>
                                                    </div>

                                                    <div className="relative group/uploader">
                                                        <motion.div
                                                            whileHover={{ scale: 1.01 }}
                                                            whileTap={{ scale: 0.99 }}
                                                            onClick={() => fileInputRef.current?.click()}
                                                            className="relative cursor-pointer aspect-[16/10] rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center transition-all hover:border-primary-400 hover:bg-white hover:shadow-2xl hover:shadow-primary-500/10 overflow-hidden ring-offset-4 ring-primary-500/0 hover:ring-2"
                                                        >
                                                            {form.cover_image_url ? (
                                                                <AnimatePresence>
                                                                    <motion.div
                                                                        initial={{ opacity: 0 }}
                                                                        animate={{ opacity: 1 }}
                                                                        className="absolute inset-0 h-full w-full"
                                                                    >
                                                                        <img src={form.cover_image_url} className="rounded-2xl h-full w-full object-cover transition-transform duration-700 group-hover/uploader:scale-110" alt="Cover" />

                                                                        {/* Glassmorphic Action Hub */}
                                                                        <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-0 group-hover/uploader:backdrop-blur-md group-hover/uploader:bg-slate-900/40 opacity-0 group-hover/uploader:opacity-100 flex items-center justify-center gap-3 transition-all duration-300">
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white text-slate-900 shadow-xl transition-colors hover:bg-primary-500 hover:text-white"
                                                                            >
                                                                                <CloudUpload className="h-5 w-5" />
                                                                            </motion.button>
                                                                            <motion.button
                                                                                whileHover={{ scale: 1.1 }}
                                                                                whileTap={{ scale: 0.9 }}
                                                                                onClick={(e) => { e.stopPropagation(); removeImage(); }}
                                                                                className="h-12 w-12 flex items-center justify-center rounded-2xl bg-white text-slate-900 shadow-xl transition-colors hover:bg-red-500 hover:text-white"
                                                                            >
                                                                                <X className="h-5 w-5" />
                                                                            </motion.button>
                                                                        </div>
                                                                    </motion.div>
                                                                </AnimatePresence>
                                                            ) : (
                                                                <div className="flex flex-col items-center gap-4 p-8 text-center">
                                                                    <div className="relative">
                                                                        <div className="absolute inset-0 rounded-full bg-primary-100 animate-ping opacity-20"></div>
                                                                        <div className="relative rounded-2xl bg-white p-5 shadow-xl ring-1 ring-slate-100 text-primary-500">
                                                                            <CloudUpload className="h-8 w-8" />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-sm font-bold text-slate-900 block">Click to upload cover</span>
                                                                        <span className="text-xs text-slate-400 mt-1">or drag and drop your image</span>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {uploading && (
                                                                <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-20">
                                                                    <div className="flex flex-col items-center gap-4">
                                                                        <div className="relative flex items-center justify-center">
                                                                            <div className="absolute h-12 w-12 border-2 border-primary-100 rounded-full"></div>
                                                                            <div className="h-12 w-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Processing Upload...</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                            <input
                                                                ref={fileInputRef}
                                                                type="file"
                                                                className="hidden"
                                                                onChange={handleImageUpload}
                                                                accept="image/*"
                                                            />
                                                        </motion.div>
                                                    </div>
                                                </div>

                                                {/* Right Column: Knowledge & Layout */}
                                                <div className="space-y-8">
                                                    <div>
                                                        <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                                            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                                                                <Image className="h-4 w-4" />
                                                            </div>
                                                            Visual Presentation
                                                        </h4>
                                                        <p className="mt-3 text-sm text-slate-500 leading-relaxed">
                                                            Your cover image is the first thing users see. A high-quality visual can increase form completion rates by up to <span className="text-emerald-600 font-bold">24%</span>.
                                                        </p>
                                                    </div>

                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                                <LayoutDashboard className="h-3.5 w-3.5" />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Ratio</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-900">16:10 Recommended</span>
                                                        </div>
                                                        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100">
                                                            <div className="flex items-center gap-2 text-slate-500 mb-1">
                                                                <Info className="h-3.5 w-3.5" />
                                                                <span className="text-[10px] font-bold uppercase tracking-wider">Max Size</span>
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-900">5MB per image</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary-50/50 border border-primary-100 text-[11px] text-primary-700 leading-relaxed">
                                                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                                                        <p>
                                                            <span className="font-bold">Pro Tip:</span> Minimalistic images with plenty of white space work best to keep the focus on your form fields.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        {/* Fields List Section */}
                                        <div className="min-h-[400px]">
                                            <div className="mb-6 flex items-center justify-between">
                                                <div>
                                                    <h3 className="text-lg font-bold text-slate-900">Form Fields</h3>
                                                    <p className="mt-1 text-sm text-slate-500">Drag to reorder or click a field to edit its properties.</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
                                                        {data.fields.length} Fields
                                                    </span>
                                                </div>
                                            </div>

                                            {data.fields.length === 0 ? (
                                                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-20 text-center">
                                                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100 mb-4">
                                                        <LayoutDashboard className="h-8 w-8 text-slate-300" />
                                                    </div>
                                                    <h4 className="text-base font-bold text-slate-900">No fields added yet</h4>
                                                    <p className="mt-1 max-w-[280px] text-sm text-slate-500">
                                                        Click an element on the right toolbox to start building your form.
                                                    </p>
                                                </div>
                                            ) : (
                                                <DragDropContext onDragEnd={onDragEnd}>
                                                    <Droppable droppableId="lead-form-fields">
                                                        {(provided) => (
                                                            <div
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className="space-y-3"
                                                            >
                                                                {data.fields.map((field, index) => (
                                                                    <Draggable
                                                                        key={field.id}
                                                                        draggableId={field.id}
                                                                        index={index}
                                                                    >
                                                                        {(draggableProvided) => (
                                                                            <div id={`field-${index}`}>
                                                                                <FieldCard
                                                                                    draggableProvided={draggableProvided}
                                                                                    field={field}
                                                                                    index={index}
                                                                                    fieldTypes={FIELD_TYPES}
                                                                                    isExpanded={activeFieldIndex === index}
                                                                                    onExpand={() => setActiveFieldIndex(activeFieldIndex === index ? null : index)}
                                                                                    onUpdate={updateField}
                                                                                    onRemove={removeField}
                                                                                    onDuplicate={duplicateField}
                                                                                />
                                                                            </div>
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </DragDropContext>
                                            )}
                                        </div>
                                    </section>

                                    {/* Right: Component Toolbox */}
                                    <aside className="xl:col-span-3 xl:sticky xl:top-24">
                                        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 shadow-sm backdrop-blur-sm">
                                            <FieldToolbox fieldTypes={FIELD_TYPES} onAddField={addField} />
                                        </div>
                                    </aside>
                                </motion.div>
                            )}


                            {activeTab === 'settings' && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="max-w-2xl space-y-8"
                                >
                                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-900">Form Identity</h3>
                                        <p className="mt-1 text-sm text-slate-500">Manage your form's name and introductory message.</p>

                                        <div className="mt-8 space-y-6">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Display Title</label>
                                                <input
                                                    type="text"
                                                    value={data.title}
                                                    onChange={(e) => setData('title', e.target.value)}
                                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                                    placeholder="e.g. Early Access Program"
                                                />
                                                <InputError message={errors.title} className="mt-1" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Introductory Description</label>
                                                <textarea
                                                    value={data.description}
                                                    onChange={(e) => setData('description', e.target.value)}
                                                    rows={3}
                                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                                    placeholder="Add a few lines about the form's purpose..."
                                                />
                                            </div>
                                        </div>
                                    </section>

                                    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                        <h3 className="text-lg font-bold text-slate-900">On-Submit Actions</h3>
                                        <p className="mt-1 text-sm text-slate-500">Configure what happens after a lead submits your form.</p>

                                        <div className="mt-8 space-y-6">
                                            <label className="flex items-center gap-3 cursor-pointer group p-4 rounded-2xl border border-primary-200 bg-primary-100 ">
                                                <div className="relative inline-flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={Boolean(data.settings.redirect_enabled)}
                                                        onChange={(e) => setData('settings', {
                                                            ...data.settings,
                                                            redirect_enabled: e.target.checked,
                                                        })}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-11 h-6 bg-primary-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-bold text-slate-900 block">Enable URL Redirection</span>
                                                    <span className="text-xs text-slate-500">Redirect users to a custom URL after they submit.</span>
                                                </div>
                                            </label>

                                            <div className="space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Redirect URL</label>
                                                    <input
                                                        type="url"
                                                        disabled={!data.settings.redirect_enabled}
                                                        value={data.settings.redirect_url || ''}
                                                        onChange={(e) => setData('settings', {
                                                            ...data.settings,
                                                            redirect_url: e.target.value,
                                                        })}
                                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-primary-500/10 disabled:bg-slate-50 disabled:text-slate-400 transition-colors"
                                                        placeholder="https://yourwebsite.com/thank-you"
                                                    />
                                                    <InputError message={errors['settings.redirect_url']} className="mt-1" />
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Success Message</label>
                                                    <textarea
                                                        value={data.settings.success_message || ''}
                                                        onChange={(e) => setData('settings', {
                                                            ...data.settings,
                                                            success_message: e.target.value,
                                                        })}
                                                        rows={3}
                                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                                        placeholder="Enter the message displayed after submission..."
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 block">Submit Button Label</label>
                                                    <input
                                                        type="text"
                                                        value={data.settings.submit_button_label || ''}
                                                        onChange={(e) => setData('settings', {
                                                            ...data.settings,
                                                            submit_button_label: e.target.value,
                                                        })}
                                                        className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-primary-500 focus:ring-primary-500/10"
                                                        placeholder="e.g. Join the waitlist"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </section>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </main>
                </div>
            </div>
            <ConfirmDialog
                show={isDeleteDialogOpen}
                title="Delete Lead Form?"
                message="This will permanently delete the form and all collected submissions. This action cannot be undone."
                confirmLabel="Delete Form"
                variant="danger"
                onConfirm={handleConfirmDelete}
                onCancel={() => setIsDeleteDialogOpen(false)}
            />
        </AuthenticatedLayout>
    );
}
