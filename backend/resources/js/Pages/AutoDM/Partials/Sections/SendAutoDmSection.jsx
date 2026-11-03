import InputError from '@/Components/InputError';
import { ClipboardCopy, Link2, Plus, Trash2, Upload } from 'lucide-react';

export default function SendAutoDmSection({ form, replyVariants, preview }) {
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const replyMessagePlaceholder = 'Enter your message here...';
    const linkNamePlaceholder = 'Open this link';
    const linkUrlPlaceholder = 'https://google.com';
    const insertPlaceholder = (current, placeholder) => {
        const text = String(placeholder || '').trim();
        return text || current;
    };

    return (
        <div
            className={sectionCardClass}
            onClick={() => preview.setScene('dm')}
            onFocusCapture={() => preview.setScene('dm')}
        >
            <div className="flex w-full items-center justify-between gap-3">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">6. Add your Resource</h3>
            </div>

            <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500 -mt-1">Add one AutoDM message. It can include text, an uploaded image, or both.</p>

                <div className="space-y-3">
                    {(() => {
                        const index = 0;
                        const variant = form.data.reply_messages?.[0] || { message_text: '', media_url: '' };
                        const variantMessage = String(variant?.message_text || '');
                        const isLinkEditorOpen = Boolean(replyVariants.replyLinkEditors[index]?.open);
                        const linkDraftName = String(replyVariants.replyLinkEditors[index]?.name ?? '');
                        const linkDraftValue = String(replyVariants.replyLinkEditors[index]?.value ?? '');
                        const effectiveMediaUrl = replyVariants.resolveReplyVariantMedia(
                            index,
                            variant?.media_url || '',
                            variant?.preview_media_url || ''
                        );
                        const hasPendingLocalPreview = replyVariants.hasPendingReplyImage(index);
                        const imageError = replyVariants.getReplyImageError(index) || form.errors[`reply_images.${index}`];

                        return (
                            <div className="rounded-2xl border border-primary-300 bg-white p-3">
                                <div className="mb-2 flex items-center justify-between">
                                    <p className="text-[11px] uppercase tracking-widest text-primary-700 font-bold">Your Resource Dm</p>
                                    {effectiveMediaUrl && (
                                        <button
                                            type="button"
                                            onClick={() => replyVariants.setReplyVariantField(index, 'media_url', '')}
                                            className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-red-600 transition-colors duration-200 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Remove Image
                                        </button>
                                    )}
                                </div>

                                {effectiveMediaUrl ? (
                                    <div className="overflow-hidden rounded-xl border border-primary-200">
                                        <img
                                            src={effectiveMediaUrl}
                                            alt={`AutoDm ${index + 1} attachment preview`}
                                            className="h-40 w-full object-cover"
                                        />
                                        <div className="flex items-center justify-between gap-2 border-t border-primary-100 bg-primary-50/60 px-3 py-2">
                                            <button
                                                type="button"
                                                onClick={() => replyVariants.openReplyImagePicker(index)}
                                                className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-primary-200 bg-white px-3 py-1 text-xs font-semibold text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                            >
                                                <Upload className="h-3.5 w-3.5" />
                                                Change
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => replyVariants.setReplyVariantField(index, 'media_url', '')}
                                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-red-200 bg-white text-red-600 transition-colors duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                                aria-label={`Remove image for AutoDm ${index + 1}`}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="rounded-xl border border-dashed border-primary-300 bg-primary-50/40 px-4 py-6 text-center">
                                        <button
                                            type="button"
                                            onClick={() => replyVariants.openReplyImagePicker(index)}
                                            className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-primary-300 bg-white px-4 py-2 text-sm font-medium text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                                        >
                                            <Upload className="h-4 w-4" />
                                            Upload Image
                                        </button>
                                        <p className="mt-2 text-xs text-slate-500">PNG, JPG, WEBP up to 10MB.</p>
                                    </div>
                                )}
                                <input
                                    id={`reply-image-file-${index}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(event) => {
                                        const file = event.target.files?.[0];
                                        replyVariants.handleReplyImageSelection(index, file);
                                        event.target.value = '';
                                    }}
                                />

                                <div className="mt-3">
                                    <div className="relative">
                                        <textarea
                                            maxLength={replyVariants.maxReplyMessageLength}
                                            className="w-full min-h-[110px] rounded-xl border border-slate-300 bg-white p-3 pr-12 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                                            placeholder={replyMessagePlaceholder}
                                            value={variantMessage}
                                            onChange={(event) => replyVariants.setReplyVariantField(index, 'message_text', event.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => replyVariants.setReplyVariantField(index, 'message_text', insertPlaceholder(variantMessage, replyMessagePlaceholder, true))}
                                            className="absolute right-2 top-2 inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                            title="Insert placeholder"
                                            aria-label="Insert placeholder"
                                        >
                                            <ClipboardCopy className="h-4 w-4" />
                                        </button>
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">
                                        {variantMessage.length}/{replyVariants.maxReplyMessageLength}
                                    </p>
                                </div>

                                <div className="mt-3">
                                    {isLinkEditorOpen && (
                                        <div className="space-y-2 rounded-xl border border-primary-300 bg-primary-50/40 p-3">
                                            <label className="text-[11px] font-bold capitalize tracking-widest text-primary-700">
                                                Button Name
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={linkDraftName}
                                                    onChange={(event) => replyVariants.setReplyLinkEditorName(index, event.target.value)}
                                                    placeholder={linkNamePlaceholder}
                                                    className="w-full rounded-xl border border-primary-300 bg-white px-3 py-2.5 pr-11 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => replyVariants.setReplyLinkEditorName(index, insertPlaceholder(linkDraftName, linkNamePlaceholder))}
                                                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                                    title="Insert placeholder"
                                                    aria-label="Insert placeholder"
                                                >
                                                    <ClipboardCopy className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <label className="text-[11px] font-bold capitalize tracking-widest text-primary-700">
                                                Button URL
                                            </label>
                                            <div className="relative">
                                                <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-500" />
                                                <input
                                                    type="text"
                                                    value={linkDraftValue}
                                                    onChange={(event) => replyVariants.setReplyLinkEditorValue(index, event.target.value)}
                                                    placeholder={linkUrlPlaceholder}
                                                    className="w-full rounded-xl border border-primary-300 bg-white py-2.5 pl-9 pr-11 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => replyVariants.setReplyLinkEditorValue(index, insertPlaceholder(linkDraftValue, linkUrlPlaceholder))}
                                                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                                    title="Insert placeholder"
                                                    aria-label="Insert placeholder"
                                                >
                                                    <ClipboardCopy className="h-4 w-4" />
                                                </button>
                                            </div>
                                            <p className="text-[11px] text-slate-500">URL must start with `https://`.</p>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => replyVariants.saveReplyLinkEditor(index)}
                                                    className="cursor-pointer rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                                >
                                                    Save Button
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => replyVariants.removeReplyLink(index)}
                                                    className="cursor-pointer rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors duration-200 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                                >
                                                    Clear
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => replyVariants.closeReplyLinkEditor(index)}
                                                    className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {!isLinkEditorOpen && (
                                        <button
                                            type="button"
                                            onClick={() => replyVariants.openReplyLinkEditor(index)}
                                            className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-lg border border-primary-300 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors duration-200 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                            Add Button
                                        </button>
                                    )}
                                </div>

                                {effectiveMediaUrl && (
                                    <p className="mt-2 truncate text-xs text-slate-500" title={effectiveMediaUrl}>
                                        {hasPendingLocalPreview ? 'Local preview (will upload on save)' : 'Saved image'}
                                    </p>
                                )}
                                <InputError message={imageError} className="mt-2" />
                            </div>
                        );
                    })()}
                </div>
                <InputError message={form.replyVariantError} className="mt-2" />
            </div>
        </div>
    );
}
