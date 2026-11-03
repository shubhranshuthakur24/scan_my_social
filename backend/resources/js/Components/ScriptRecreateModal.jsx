import React, { useState, useRef, useEffect } from 'react';
import Button from '@/Components/Button';
import { X, Languages, ChevronDown, Wand2 } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import { usePage } from '@inertiajs/react';

export default function ScriptRecreateModal({ show, onClose, onConfirm, sourceScriptId }) {
    const { scriptIntelligence } = usePage().props;

    const dbCtaTypes = scriptIntelligence?.ctaTypes || [];
    const dbObjectives = scriptIntelligence?.objectives || [];

    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState('Hinglish');
    const [audience, setAudience] = useState('');
    const [objective, setObjective] = useState(dbObjectives.length > 0 ? dbObjectives[0].slug : '');
    const [desiredCtaType, setDesiredCtaType] = useState(dbCtaTypes.length > 0 ? dbCtaTypes[0].slug : '');
    const [brandInput, setBrandInput] = useState('');
    const [offer, setOffer] = useState('');
    const [closeness, setCloseness] = useState(50); // Maps to recreation_mode
    const isSubmittingRef = useRef(false);

    useEffect(() => {
        if (show) {
            isSubmittingRef.current = false;
        }
    }, [show]);

    const languages = ['English', 'Hindi', 'Hinglish'];

    const getRecreationMode = (val) => {
        if (val > 66) return 'close_match';
        if (val > 33) return 'balanced';
        return 'fresh_version';
    };

    const handleSubmit = (e) => {
        if (e) e.preventDefault();

        if (isSubmittingRef.current) return;
        isSubmittingRef.current = true;

        const payload = {
            mode: 'recreate',
            topic,
            language,
            audience,
            source_script_id: sourceScriptId,
            recreation_mode: getRecreationMode(closeness),
            objective,
            desired_cta_type: desiredCtaType,
            brand_input: brandInput,
            offer,
        };

        onConfirm(payload);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex max-h-[90vh] w-full max-w-2xl animate-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl zoom-in-95 duration-300">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-50">
                            <Wand2 className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="break-words text-xl font-black text-slate-900">Recreate Script</h2>
                            <p className="text-xs font-medium leading-5 text-slate-500">Reuse a proven structure with controlled changes.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        aria-label="Close recreate script modal"
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning-300 focus-visible:ring-offset-2"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
                    {/* Closeness Slider */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Similarity / Closeness to Original</label>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-[11px] font-bold text-amber-600">
                                {closeness > 66 ? 'Close Match' : closeness > 33 ? 'Balanced Adaptation' : 'Fresh Version'}
                            </span>
                        </div>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="10"
                            value={closeness}
                            onChange={(e) => setCloseness(Number(e.target.value))}
                            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-amber-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-warning-300 focus-visible:ring-offset-2"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase">
                            <span>Fresh Version</span>
                            <span>Balanced</span>
                            <span>Close Match</span>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                            New Topic (Optional)
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="e.g. Replace original topic with AI productivity for founders..."
                            className="w-full h-20 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none shadow-inner"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Languages className="w-3.5 h-3.5" /> Language
                            </label>
                            <Listbox value={language} onChange={setLanguage}>
                                <div className="relative mt-1">
                                    <Listbox.Button className="relative flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700 transition-all focus:outline-none focus-visible:border-amber-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-amber-100">
                                        <span className="block truncate">{language}</span>
                                        <ChevronDown className="w-4 h-4 text-slate-400" aria-hidden="true" />
                                    </Listbox.Button>
                                    <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                        <Listbox.Options className="absolute z-50 w-full py-1 mt-1 overflow-auto text-sm bg-white border border-slate-200 shadow-lg max-h-60 rounded-xl focus:outline-none">
                                            {languages.map((item) => (
                                                <Listbox.Option
                                                    key={item}
                                                    className={({ active }) => `relative cursor-pointer select-none py-2 px-4 ${active ? 'bg-amber-500 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
                                                    value={item}
                                                >
                                                    {item}
                                                </Listbox.Option>
                                            ))}
                                        </Listbox.Options>
                                    </Transition>
                                </div>
                            </Listbox>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Target Audience</label>
                            <input
                                value={audience}
                                onChange={(e) => setAudience(e.target.value)}
                                placeholder="e.g. Students, creators..."
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Objective</label>
                            <select
                                value={objective}
                                onChange={(e) => setObjective(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                            >
                                {dbObjectives.map((item) => (
                                    <option key={item.slug} value={item.slug}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Desired CTA Type</label>
                            <select
                                value={desiredCtaType}
                                onChange={(e) => setDesiredCtaType(e.target.value)}
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                            >
                                {dbCtaTypes.map((item) => (
                                    <option key={item.slug} value={item.slug}>{item.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Brand / Product Input</label>
                            <input
                                value={brandInput}
                                onChange={(e) => setBrandInput(e.target.value)}
                                placeholder="Brand or product name"
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Offer (Optional)</label>
                            <input
                                value={offer}
                                onChange={(e) => setOffer(e.target.value)}
                                placeholder="Offer details"
                                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end">
                    <Button
                        onClick={onClose}
                        type="button"
                        variant="secondary"
                        className="w-full rounded-xl sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        type="button"
                        variant="warning"
                        className="w-full rounded-xl sm:w-auto"
                    >
                        <Wand2 className="w-4 h-4 fill-current" />
                        Recreate Script
                    </Button>
                </div>
            </div>
        </div>
    );
}
