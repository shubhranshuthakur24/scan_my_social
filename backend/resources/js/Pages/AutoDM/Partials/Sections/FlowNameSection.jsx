import InputError from '@/Components/InputError';
import { ClipboardCopy } from 'lucide-react';

export default function FlowNameSection({ form, preview }) {
    const sectionCardClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const placeholderText = 'e.g. Pricing Reel AutoDM';
    const insertPlaceholder = (current, placeholder) => {
        const text = String(placeholder || '').trim();
        return text || current;
    };

    return (
        <div
            className={sectionCardClass}
            onClick={() => preview.setScene('content')}
            onFocusCapture={() => preview.setScene('content')}
        >
            <div className="flex w-full items-center justify-between gap-3 text-left">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">2. Flow Name</h3>
            </div>

            <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-500">Give this automation a clear name so it is easier to manage later.</p>
                <label htmlFor="autodm-flow-name" className="sr-only">
                    Flow name
                </label>
                <div className="relative">
                    <input
                        id="autodm-flow-name"
                        type="text"
                        value={form.data.name}
                        onChange={(e) => form.setData('name', e.target.value)}
                        placeholder={placeholderText}
                        className="w-full rounded-2xl border border-slate-300 bg-white p-3 pr-12 text-sm text-slate-900 focus:border-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1"
                    />
                    <button
                        type="button"
                        onClick={() => form.setData('name', insertPlaceholder(form.data.name, placeholderText))}
                        className="absolute right-3 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-primary-700 transition-colors duration-200 hover:bg-primary-50 hover:text-primary-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-1 motion-reduce:transition-none"
                        title="Insert placeholder"
                        aria-label="Insert placeholder"
                    >
                        <ClipboardCopy className="h-4 w-4" />
                    </button>
                </div>
                <InputError message={form.errors.name} className="mt-2" />
            </div>
        </div>
    );
}
