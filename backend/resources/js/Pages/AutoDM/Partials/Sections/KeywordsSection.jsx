import InputError from '@/Components/InputError';
import { ClipboardCopy, Tag, X } from 'lucide-react';

export default function KeywordsSection({ form, keywords, preview }) {
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const keywordPlaceholder = keywords.keywordChips.length === 0 ? 'price, info, link' : 'Add keyword';
    const anyCommentModeEnabled = Boolean(keywords.isAnyCommentMode);
    const insertPlaceholder = (current, placeholder) => {
        const text = String(placeholder || '').trim();
        return text || current;
    };

    return (
        <div
            className={sectionCardClass}
            onClick={() => preview.setScene('keyword')}
            onFocusCapture={() => preview.setScene('keyword')}
        >
            <div className="flex w-full items-center justify-between gap-3 text-left">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">3. Keywords</h3>
            </div>

            <div className="mt-4 space-y-4">
                {keywords.isCommentTriggerFlow && (
                    <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-3">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <p className="text-sm font-semibold text-slate-900">Trigger on any comment</p>
                                <p className="text-xs text-slate-600">
                                    {anyCommentModeEnabled
                                        ? 'Keyword matching is off. Every comment will trigger this automation.'
                                        : 'Keep this off to trigger only when comments match your keywords.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={keywords.toggleMatchAllComments}
                                className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none ${anyCommentModeEnabled ? 'bg-primary-600' : 'bg-slate-300'}`}
                                aria-pressed={anyCommentModeEnabled}
                                aria-label="Toggle trigger on any comment"
                            >
                                <span
                                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${anyCommentModeEnabled ? 'translate-x-5' : 'translate-x-1'}`}
                                />
                            </button>
                        </div>
                    </div>
                )}

                {!anyCommentModeEnabled ? (
                    <>
                        <p className="text-sm text-slate-500">Separate keywords with commas.</p>

                        <div className="relative rounded-2xl border border-slate-300 bg-white px-3 py-2.5 pr-12 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/40">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-slate-400">
                                    <Tag className="h-4 w-4" />
                                </span>

                                {keywords.keywordChips.map((chip, index) => (
                                    <span
                                        key={`${chip}-${index}`}
                                        className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-medium text-primary-700"
                                    >
                                        {chip}
                                        <button
                                            type="button"
                                            onClick={() => keywords.removeKeywordChip(index)}
                                            className="cursor-pointer rounded-full p-0.5 text-primary-700 transition-colors duration-200 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                            aria-label={`Remove ${chip}`}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </span>
                                ))}

                                <input
                                    type="text"
                                    className="min-w-[120px] flex-1 border-0 p-0 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
                                    placeholder={keywordPlaceholder}
                                    value={keywords.keywordInput}
                                    onChange={e => keywords.setKeywordInput(e.target.value)}
                                    onKeyDown={keywords.handleKeywordKeyDown}
                                    onBlur={keywords.commitKeywordInput}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => keywords.setKeywordInput(insertPlaceholder(keywords.keywordInput, keywordPlaceholder))}
                                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                title="Insert placeholder"
                                aria-label="Insert placeholder"
                            >
                                <ClipboardCopy className="h-4 w-4" />
                            </button>
                            <input
                                type="hidden"
                                value={form.data.keywords}
                                readOnly
                            />
                        </div>
                    </>
                ) : (
                    <div className="rounded-xl border border-primary-200/80 bg-primary-50/60 p-3 text-sm text-primary-800">
                        Keyword input is disabled. This automation will run for every comment.
                    </div>
                )}
                <InputError message={form.errors.keywords} className="mt-2" />
            </div>
        </div>
    );
}
