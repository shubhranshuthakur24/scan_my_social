import InputError from '@/Components/InputError';
import { ClipboardCopy } from 'lucide-react';

export default function OpeningMessageSection({ form, preview }) {
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const messagePlaceholder = 'Hey there! Thanks for your interest. Give me a second and I will send the link.';
    const ctaPlaceholder = 'send me';
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
            <div className="flex w-full items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">
                    5. Greeting Message</h3>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => form.setData('opening_message_enabled', !form.data.opening_message_enabled)}
                        className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none ${form.data.opening_message_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                        aria-pressed={form.data.opening_message_enabled}
                        aria-label="Toggle opening message"
                    >
                        <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-200 motion-reduce:transition-none ${form.data.opening_message_enabled ? 'translate-x-5' : 'translate-x-1'}`}
                        />
                    </button>
                </div>
            </div>

            <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500">
                    If enabled, this message is sent first. optionally Add a button to wait for user click/message before sending resource Dm.
                </p>

                {form.data.opening_message_enabled && (
                    <div className="space-y-3">
                        <label className="relative block">
                            <textarea
                                className="w-full min-h-[120px] rounded-2xl border border-slate-300 bg-white p-4 pr-12 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                                placeholder={messagePlaceholder}
                                value={form.data.opening_message}
                                onChange={e => form.setData('opening_message', e.target.value)}
                            />
                            <button
                                type="button"
                                onClick={() => form.setData('opening_message', insertPlaceholder(form.data.opening_message, messagePlaceholder, true))}
                                className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                title="Insert placeholder"
                                aria-label="Insert placeholder"
                            >
                                <ClipboardCopy className="h-4 w-4" />
                            </button>
                        </label>

                        <div>
                            <div className="mb-1.5 flex items-center justify-between gap-3">
                                <label className="block text-[11px] font-bold uppercase tracking-widest text-slate-500">
                                    Optional CTA Button Label
                                </label>
                                <span className={`text-[11px] font-semibold ${form.ctaWarning ? 'text-amber-700' : 'text-slate-500'}`}>
                                    {form.ctaCharCount}/{form.ctaRecommendedMax} recommended
                                </span>
                            </div>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={form.data.opening_button_text}
                                    onChange={(e) => form.setData('opening_button_text', e.target.value)}
                                    placeholder={ctaPlaceholder}
                                    className={`w-full rounded-xl border bg-white px-3 py-2.5 pr-11 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 ${form.ctaWarning ? 'border-amber-300' : 'border-slate-300'}`}
                                />
                                <button
                                    type="button"
                                    onClick={() => form.setData('opening_button_text', insertPlaceholder(form.data.opening_button_text, ctaPlaceholder))}
                                    className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                                    title="Insert placeholder"
                                    aria-label="Insert placeholder"
                                >
                                    <ClipboardCopy className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                                This CTA is sent as an inline button. Users can tap the button or send the same text to continue.
                            </p>
                            {form.ctaWarning && (
                                <p className="mt-1 text-xs font-semibold text-amber-700">
                                    Keep CTA labels short and clear (2-{form.ctaRecommendedMax} chars).
                                </p>
                            )}
                        </div>
                    </div>
                )}

                <InputError message={form.errors.opening_message} className="mt-2" />
                <InputError message={form.errors.opening_button_text} className="mt-2" />
            </div>
        </div>
    );
}
