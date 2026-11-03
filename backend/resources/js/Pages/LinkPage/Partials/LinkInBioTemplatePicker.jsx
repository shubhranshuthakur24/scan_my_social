import LinkInBioPublicCard from '@/Pages/LinkPage/Partials/LinkInBioPublicCard';
import { Check } from 'lucide-react';
import { useMemo, useState } from 'react';

const sampleLinks = [
    { id: 'sample-one', title: 'Latest release', url: '#', icon: 'sparkles' },
    { id: 'sample-two', title: 'Work with me', url: '#', icon: 'calendar' },
    { id: 'sample-three', title: 'Join the list', url: '#', icon: 'mail' },
];

export { sampleLinks };

export default function LinkInBioTemplatePicker({ presets, selectedTheme, onSelect, linkPage, dense = false }) {
    const [activeCategory, setActiveCategory] = useState('All');
    const categories = useMemo(
        () => ['All', ...new Set(Object.values(presets).map((preset) => preset.category).filter(Boolean))],
        [presets],
    );
    const visiblePresets = useMemo(
        () => Object.entries(presets).filter(([, preset]) => activeCategory === 'All' || preset.category === activeCategory),
        [activeCategory, presets],
    );

    return (
        <div>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                {categories.map((category) => (
                    <button
                        key={category}
                        type="button"
                        onClick={() => setActiveCategory(category)}
                        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${activeCategory === category ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className={`grid grid-cols-2 ${dense ? 'gap-3 lg:grid-cols-4' : 'gap-4 md:grid-cols-3'}`}>
                {visiblePresets.map(([key, preset]) => {
                    const isSelected = selectedTheme === key;

                    return (
                        <button
                            key={key}
                            type="button"
                            aria-pressed={isSelected}
                            onClick={() => onSelect(key)}
                            className={`group min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30 focus-visible:ring-offset-2 ${isSelected ? 'text-slate-950' : 'text-slate-600'}`}
                        >
                            <span className={`relative mx-auto block aspect-[9/14] w-full max-w-[220px] overflow-hidden rounded-[1.65rem] border-2 bg-slate-100 p-0.5 transition duration-200 group-hover:-translate-y-1 group-hover:shadow-xl ${isSelected ? 'border-primary-500 shadow-lg shadow-primary-500/15' : 'border-transparent shadow-sm'}`}>
                                <LinkInBioPublicCard
                                    linkPage={{
                                        ...linkPage,
                                        display_name: linkPage.display_name || preset.label,
                                        bio: linkPage.bio || preset.description,
                                    }}
                                    settings={preset.settings}
                                    links={sampleLinks}
                                    disableLinkNavigation
                                    displayMode="template-preview"
                                />
                                {isSelected && (
                                    <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-primary-600 text-white shadow-lg">
                                        <Check className="h-4 w-4" strokeWidth={3} />
                                    </span>
                                )}
                            </span>
                            <span className="mt-2.5 flex items-start justify-between gap-2">
                                <span className="min-w-0">
                                    <span className="block truncate text-sm font-black text-slate-900">{preset.label}</span>
                                    <span className="mt-0.5 block truncate text-[11px] font-semibold text-slate-500">{preset.category}</span>
                                </span>
                                {isSelected && <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-primary-600">Selected</span>}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
