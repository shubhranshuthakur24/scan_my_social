import WebPageCanvas from '@/Pages/LinkPage/Partials/WebPageCanvas';
import { Check, LayoutTemplate } from 'lucide-react';
import { useMemo, useState } from 'react';

export default function WebPageTemplatePicker({
    templates = {},
    selectedKey,
    onSelect,
    title = 'Untitled page',
    dense = false,
}) {
    const [activeCategory, setActiveCategory] = useState('All');
    const templateList = Object.values(templates);
    const categories = useMemo(
        () => ['All', ...new Set(templateList.map((template) => template.category).filter(Boolean))],
        [templateList],
    );
    const visibleTemplates = templateList.filter(
        (template) => activeCategory === 'All' || template.category === activeCategory,
    );

    return (
        <div>
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                {categories.map((category) => (
                    <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${activeCategory === category ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className={`grid grid-cols-1 gap-4 ${dense ? 'md:grid-cols-2' : 'md:grid-cols-2 2xl:grid-cols-3'}`}>
                {visibleTemplates.map((template) => {
                    const isSelected = selectedKey === template.key;
                    const previewPage = {
                        title: title || template.label,
                        slug: 'preview',
                        username: 'preview',
                        sections: template.sections,
                        theme_settings: template.theme_settings,
                    };

                    return (
                        <button
                            key={template.key}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onSelect(template)}
                            className={`group overflow-hidden rounded-lg border bg-white text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 ${isSelected ? 'border-primary-500 shadow-lg shadow-primary-500/10' : 'border-slate-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg'}`}
                        >
                            <span className="relative block aspect-[4/3] overflow-hidden border-b border-slate-200 bg-slate-100">
                                <WebPageCanvas webPage={previewPage} displayMode="thumbnail" disableInteractions showBranding={false} />
                                <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600 shadow-sm">
                                    <LayoutTemplate className="h-3 w-3" />
                                    {template.sections?.length || 0} blocks
                                </span>
                                {isSelected && (
                                    <span className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
                                        <Check className="h-4 w-4" strokeWidth={3} />
                                    </span>
                                )}
                            </span>
                            <span className="block p-4">
                                <span className="flex items-start justify-between gap-3">
                                    <span className="min-w-0">
                                        <span className="block text-sm font-black text-slate-900">{template.label}</span>
                                        <span className="mt-1 block text-xs font-bold uppercase tracking-wider text-primary-600">{template.category}</span>
                                    </span>
                                    {isSelected && <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-primary-600">Selected</span>}
                                </span>
                                <span className="mt-2 block text-sm leading-6 text-slate-500">{template.description}</span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
