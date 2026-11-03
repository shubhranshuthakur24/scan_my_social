import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import EmptyState from '@/Components/EmptyState';
import Modal from '@/Components/Modal';
import KpiCard from '@/Components/common/KpiCard';
import PageBanner from '@/Components/common/PageBanner';
import { Head, router, useForm } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Image, UploadCloud, Video, Trash2, Search } from 'lucide-react';
import {
    SchedulerModalShell,
    SchedulerUploadDropzone,
    SchedulerUploadPreview,
    SchedulerUploadProgress,
} from './ContentSchedulerModalShell';

const formatSize = (bytes) => {
    const size = Number(bytes || 0);
    if (size < 1024 * 1024) {
        return `${Math.max(1, Math.round(size / 1024))} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function Library({ media_assets = [], filters = {}, library_summary = {} }) {
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const uploadForm = useForm({
        media: null,
    });
    const selectedUploadFile = uploadForm.data.media;
    const selectedUploadFileType = selectedUploadFile?.type || '';
    const isImagePreview = selectedUploadFileType.startsWith('image/');
    const isVideoPreview = selectedUploadFileType.startsWith('video/');
    const [uploadPreviewUrl, setUploadPreviewUrl] = useState(null);

    useEffect(() => {
        if (!selectedUploadFile) {
            setUploadPreviewUrl(null);

            return undefined;
        }

        const objectUrl = URL.createObjectURL(selectedUploadFile);
        setUploadPreviewUrl(objectUrl);

        return () => {
            URL.revokeObjectURL(objectUrl);
        };
    }, [selectedUploadFile]);

    const closeUploadModal = () => {
        if (uploadForm.processing) {
            return;
        }

        uploadForm.reset();
        uploadForm.clearErrors();
        setIsUploadModalOpen(false);
    };

    const submitUpload = (event) => {
        event.preventDefault();
        uploadForm.post(route('instagram.media.store'), {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                uploadForm.reset();
                setIsUploadModalOpen(false);
            },
        });
    };

    const updateFilters = (nextFilters) => {
        router.get(route('instagram.library'), {
            ...filters,
            ...nextFilters,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    return (
        <AuthenticatedLayout>
            <Head title="Scheduler Library" />

            <div className="mx-auto max-w-[1280px] space-y-5">
                <PageBanner
                    variant="neutral"
                    title="Media Library"
                    description="Upload images and videos once, then reuse them in scheduled Instagram posts."
                >
                    <button
                        type="button"
                        onClick={() => setIsUploadModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/95 px-3.5 py-2 text-sm font-black text-primary-800 shadow-sm transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-600 xl:px-3 xl:py-1.5 xl:text-[13px] 2xl:px-4 2xl:py-2.5 2xl:text-sm"
                    >
                        <UploadCloud className="h-4 w-4" />
                        Upload Media
                    </button>
                </PageBanner>

                <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                        ['All Media', library_summary.total || 0, Image, 'primary'],
                        ['Images', library_summary.images || 0, Image, 'sky'],
                        ['Videos', library_summary.videos || 0, Video, 'rose'],
                    ].map(([label, value, Icon, variant]) => (
                        <KpiCard
                            key={label}
                            label={label}
                            value={value}
                            icon={Icon}
                            variant={variant}
                        />
                    ))}
                </section>

                <section className="space-y-4">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative min-w-0 flex-1">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="search"
                                    defaultValue={filters.search || ''}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            updateFilters({ search: event.currentTarget.value });
                                        }
                                    }}
                                    className="w-full rounded-xl border-slate-200 pl-9 text-sm font-semibold focus:border-primary-400 focus:ring-primary-200"
                                    placeholder="Search media..."
                                />
                            </div>
                            <div className="flex gap-2">
                                {['all', 'image', 'video'].map((type) => (
                                    <button
                                        key={type}
                                        type="button"
                                        onClick={() => updateFilters({ type })}
                                        className={`rounded-xl px-3 py-2 text-xs font-black capitalize transition ${filters.type === type || (!filters.type && type === 'all')
                                            ? 'bg-primary-600 text-white'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                            }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {media_assets.length === 0 ? (
                            <EmptyState
                                className="rounded-2xl border border-slate-200 bg-white py-14"
                                title="No media found"
                                description="Upload an image or video to start building your scheduling library."
                                icon={UploadCloud}
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                                {media_assets.map((asset) => (
                                    <article key={asset.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                        <div className="aspect-video bg-slate-100">
                                            {asset.media_type === 'video' ? (
                                                <video src={asset.url} className="h-full w-full object-cover" muted controls />
                                            ) : (
                                                <img src={asset.url} alt={asset.title || asset.original_name} className="h-full w-full object-cover" />
                                            )}
                                        </div>
                                        <div className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <h3 className="truncate text-sm font-black text-slate-900">{asset.title || asset.original_name}</h3>
                                                    <p className="mt-1 text-xs font-bold uppercase tracking-widest text-slate-400">{asset.media_type} · {formatSize(asset.size_bytes)}</p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => router.delete(route('instagram.media.destroy', asset.id), { preserveScroll: true })}
                                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-600 transition hover:bg-rose-100"
                                                    aria-label="Delete media"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                            {asset.default_caption && (
                                                <p className="line-clamp-2 text-sm font-semibold leading-6 text-slate-600">{asset.default_caption}</p>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <Modal show={isUploadModalOpen} onClose={closeUploadModal} maxWidth="lg" closeable={!uploadForm.processing}>
                    <SchedulerModalShell
                        as="form"
                        onSubmit={submitUpload}
                        className="max-w-none border-0 shadow-none"
                        title="Upload Media"
                        description="Images, videos, Reels, stories, and carousel assets."
                        icon={UploadCloud}
                        onClose={closeUploadModal}
                        closeDisabled={uploadForm.processing}
                        closeLabel="Close upload modal"
                        footer={(
                            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    type="button"
                                    variant="secondary"
                                    onClick={closeUploadModal}
                                    disabled={uploadForm.processing}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={uploadForm.processing}
                                    icon={<UploadCloud className="h-4 w-4" />}
                                >
                                    {uploadForm.processing ? `Uploading ${Math.round(uploadForm.progress?.percentage || 0)}%` : 'Upload Media'}
                                </Button>
                            </div>
                        )}
                    >
                        <div className="space-y-4">
                            <SchedulerUploadDropzone
                                id="library-upload-media"
                                accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
                                onChange={(event) => uploadForm.setData('media', event.target.files?.[0] || null)}
                                file={selectedUploadFile}
                                error={uploadForm.errors.media}
                                icon={UploadCloud}
                            />

                            <SchedulerUploadPreview
                                file={selectedUploadFile}
                                previewUrl={uploadPreviewUrl}
                                isImagePreview={isImagePreview}
                                isVideoPreview={isVideoPreview}
                            />

                            <SchedulerUploadProgress progress={uploadForm.progress} />
                        </div>
                    </SchedulerModalShell>
                </Modal>
            </div>
        </AuthenticatedLayout>
    );
}
