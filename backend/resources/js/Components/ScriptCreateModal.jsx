import React, { useMemo, useState, useRef } from 'react';
import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import { Listbox, Transition } from '@headlessui/react';
import { useToast } from '@/Contexts/ToastContext';
import { usePage } from '@inertiajs/react';

const ACTIVE_PLAN_CODES = new Set([
    'starter',
    'starter_yearly',
    'pro',
    'pro_yearly',
    'creator',
    'creator_yearly',
]);

export default function ScriptCreateModal({ show, onClose, onGenerate, availableScripts = [] }) {
    const { auth, scriptIntelligence } = usePage().props;
    const currentPlan = auth?.plan;
    const normalizedPlan = String(currentPlan || '').toLowerCase();
    const hasActivePlan = ACTIVE_PLAN_CODES.has(normalizedPlan);
    const isPaidPlan = currentPlan === 'pro' || currentPlan === 'creator';

    const dbHookTypes = scriptIntelligence?.hookTypes || [];
    const dbCtaTypes = scriptIntelligence?.ctaTypes || [];
    const dbObjectives = scriptIntelligence?.objectives || [];
    const researchConfig = scriptIntelligence?.research || {};
    const researchIntents = researchConfig.intents || [];

    const [topic, setTopic] = useState('');
    const [platform, setPlatform] = useState('Instagram');
    const [audience, setAudience] = useState('');
    const [tone, setTone] = useState('Informative');
    const [length, setLength] = useState('45s');
    const [language, setLanguage] = useState('Hinglish');
    const [variants, setVariants] = useState(1);
    const [hookType, setHookType] = useState(dbHookTypes.length > 0 ? dbHookTypes[0].slug : '');
    const [objective, setObjective] = useState(dbObjectives.length > 0 ? dbObjectives[0].slug : '');
    const [desiredCtaType, setDesiredCtaType] = useState(dbCtaTypes.length > 0 ? dbCtaTypes[0].slug : '');
    const [researchEnabled, setResearchEnabled] = useState(false);
    const [researchIntent, setResearchIntent] = useState('educational');
    const [intentOverridden, setIntentOverridden] = useState(false);
    const [proofPoints, setProofPoints] = useState('');
    const [keyPoints, setKeyPoints] = useState('');
    const [sourceUrls, setSourceUrls] = useState('');

    const [error, setError] = useState('');
    const [isCreditError, setIsCreditError] = useState(false);
    const [isNoPlanError, setIsNoPlanError] = useState(false);
    const [generating, setGenerating] = useState(false);
    const isSubmittingRef = useRef(false);
    const { addToast } = useToast();

    const sourceScripts = useMemo(() => {
        return availableScripts
            .filter((script) => script?.status === 'completed' && script?.content_analysis_id)
            .map((script) => ({
                id: script.id,
                label: script?.title || script?.suggested_topic || `Script #${script.id}`,
            }));
    }, [availableScripts]);

    const platforms = [
        { id: 'Instagram', label: 'Insta', icon: <Icon name="instagram" size={18} plain={true} /> },
        { id: 'TikTok', label: 'TikTok', icon: <Icon name="tiktok" size={18} plain={true} /> },
        { id: 'YouTube', label: 'YouTube', icon: <Icon name="youtube" size={18} plain={true} /> },
        { id: 'LinkedIn', label: 'LinkedIn', icon: <Icon name="linkedin" size={18} plain={true} /> },
    ];

    const tones = ['Savage', 'Informative', 'Calm', 'Exposing'];
    const lengths = ['30s', '45s', '60s'];
    const languages = ['English', 'Hindi', 'Hinglish'];
    const suggestedIntent = useMemo(() => {
        const value = topic.toLowerCase();
        if (['latest', 'today', 'recent', 'announced', 'breaking'].some((word) => value.includes(word))) return 'news';
        if (['trend', 'viral', 'popular', 'people are saying'].some((word) => value.includes(word))) return 'trend';
        if (['controversy', 'truth about', 'investigate', 'evidence', 'exposed'].some((word) => value.includes(word))) return 'investigative';
        if (['should', 'opinion', 'why i think', 'best'].some((word) => value.includes(word))) return 'opinion';
        return 'educational';
    }, [topic]);
    const researchPrice = researchConfig?.prices?.lite?.live || 20;

    const resetForm = () => {
        setTopic('');
        setPlatform('Instagram');
        setAudience('');
        setTone('Informative');
        setLength('45s');
        setLanguage('Hinglish');
        setVariants(1);
        setHookType(dbHookTypes.length > 0 ? dbHookTypes[0].slug : '');
        setObjective(dbObjectives.length > 0 ? dbObjectives[0].slug : '');
        setDesiredCtaType(dbCtaTypes.length > 0 ? dbCtaTypes[0].slug : '');
        setResearchEnabled(false);
        setResearchIntent('educational');
        setIntentOverridden(false);
        setProofPoints('');
        setKeyPoints('');
        setSourceUrls('');
        setError('');
        setIsCreditError(false);
        setIsNoPlanError(false);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();

        if (generating || isSubmittingRef.current) return;
        isSubmittingRef.current = true;
        setGenerating(true);

        if (!topic.trim()) {
            setError('Please enter a topic');
            setGenerating(false);
            isSubmittingRef.current = false;
            return;
        }

        if (!hasActivePlan) {
            const noPlanMessage = 'You need an active subscription to generate scripts.';
            setError(noPlanMessage);
            setIsNoPlanError(true);
            setIsCreditError(false);
            addToast(`${noPlanMessage} Please upgrade to continue.`, 'error');
            setGenerating(false);
            isSubmittingRef.current = false;
            return;
        }

        const payload = {
            mode: 'fresh',
            topic,
            platform,
            audience,
            tone,
            length,
            language,
            hook_type: hookType,
            cta_type: desiredCtaType,
            objective,
            variants,
            research_enabled: researchEnabled,
            research_intent: intentOverridden ? researchIntent : suggestedIntent,
            research_tier: 'lite',
            key_points: keyPoints || null,
            proof_points: proofPoints || null,
            source_urls: sourceUrls
                .split('\n')
                .map((url) => url.trim())
                .filter(Boolean),
        };

        try {
            setError('');
            setIsCreditError(false);
            setIsNoPlanError(false);

            const res = await fetch('/api/scripts/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });

            if (res.redirected && (res.url.includes('/settings/upgrade') || res.url.includes('/login'))) {
                const noPlanMessage = 'You need an active subscription to generate scripts.';
                setError(noPlanMessage);
                setIsNoPlanError(true);
                setIsCreditError(false);
                addToast(`${noPlanMessage} Please upgrade to continue.`, 'error');
                return;
            }

            const contentType = res.headers.get('content-type') || '';
            const data = contentType.includes('application/json') ? await res.json() : null;

            if (!res.ok) {
                if (res.status === 402) {
                    setIsCreditError(true);
                }

                if (res.status === 403 && data?.error === 'no_active_plan') {
                    setIsNoPlanError(true);
                    setIsCreditError(false);
                    const noPlanMessage = data.message || 'You need an active subscription to generate scripts.';
                    setError(noPlanMessage);
                    addToast(`${noPlanMessage} Please upgrade to continue.`, 'error');
                    return;
                }

                throw new Error(data?.message || 'Failed to start script generation.');
            }

            onGenerate(data.scripts || []);
            resetForm();
            onClose();
        } catch (err) {
            const errorMessage = err.message || 'Failed to start script generation. Please try again.';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setGenerating(false);
            isSubmittingRef.current = false;
        }
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex max-h-[90vh] w-full max-w-2xl animate-in flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl zoom-in-95 duration-300">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                    <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-50">
                            <Icon name="wand" size={20} className="text-primary-600" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="break-words text-xl font-black text-slate-900">
                                Create Fresh Script
                            </h2>
                            <p className="text-xs font-medium leading-5 text-slate-500">
                                Generate a brand new AI script.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        type="button"
                        aria-label="Close create script modal"
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2"
                    >
                        <Icon name="x" size={20} className="text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">


                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                            What's your topic? <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            value={topic}
                            onChange={(e) => {
                                setTopic(e.target.value);
                                if (error) setError('');
                            }}
                            placeholder="e.g. budget solo travel in Europe, weird Amazon gadgets..."
                            className="w-full h-24 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none shadow-inner"
                        />
                    </div>

                    <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 className="text-sm font-black text-slate-900">Research this topic</h3>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                    Add current facts and sources before writing. Off by default.
                                </p>
                            </div>
                            <button
                                type="button"
                                role="switch"
                                aria-checked={researchEnabled}
                                onClick={() => setResearchEnabled((value) => !value)}
                                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                                    researchEnabled ? 'bg-primary-600' : 'bg-slate-300'
                                }`}
                            >
                                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                                    researchEnabled ? 'left-6' : 'left-1'
                                }`} />
                            </button>
                        </div>

                        {researchEnabled ? (
                            <div className="mt-4 space-y-4 border-t border-slate-200 pt-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                            Research Intent
                                        </label>
                                        <select
                                            value={intentOverridden ? researchIntent : suggestedIntent}
                                            onChange={(event) => {
                                                setResearchIntent(event.target.value);
                                                setIntentOverridden(true);
                                            }}
                                            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-700 focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                        >
                                            {researchIntents.map((intent) => (
                                                <option key={intent.value} value={intent.value}>
                                                    {intent.label}
                                                </option>
                                            ))}
                                        </select>
                                        <p className="text-[11px] text-slate-500">
                                            Suggested: {researchIntents.find((item) => item.value === suggestedIntent)?.label || 'Educational'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border border-primary-100 bg-white p-3">
                                        <div className="text-xs font-black uppercase tracking-widest text-primary-500">Estimated research</div>
                                        <div className="mt-1 text-lg font-black text-slate-900">Up to {researchPrice} credits</div>
                                        <div className="text-[11px] text-slate-500">Cached research settles at 10 credits.</div>
                                    </div>
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Key Points</label>
                                        <textarea
                                            value={keyPoints}
                                            onChange={(event) => setKeyPoints(event.target.value)}
                                            placeholder="What must the script cover?"
                                            className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Proof Points</label>
                                        <textarea
                                            value={proofPoints}
                                            onChange={(event) => setProofPoints(event.target.value)}
                                            placeholder="Claims that require evidence"
                                            className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        Source URLs
                                    </label>
                                    <textarea
                                        value={sourceUrls}
                                        onChange={(event) => setSourceUrls(event.target.value)}
                                        placeholder="Optional: one URL per line"
                                        className="h-20 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm focus:border-primary-400 focus:ring-2 focus:ring-primary-100"
                                    />
                                </div>
                            </div>
                        ) : null}
                    </section>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                <Icon name="languages" size={14} /> Language
                            </label>
                            <Listbox value={language} onChange={setLanguage}>
                                <div className="relative mt-1">
                                    <Listbox.Button className="relative flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700 transition-all focus:outline-none focus-visible:border-primary-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary-100">
                                        <span className="block truncate">{language}</span>
                                        <Icon name="chevronDown" size={16} className="text-slate-400" aria-hidden="true" />
                                    </Listbox.Button>
                                    <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                        <Listbox.Options className="absolute z-50 w-full py-1 mt-1 overflow-auto text-sm bg-white border border-slate-200 shadow-lg max-h-60 rounded-xl focus:outline-none">
                                            {languages.map((item) => (
                                                <Listbox.Option
                                                    key={item}
                                                    className={({ active }) => `relative cursor-pointer select-none py-2 px-4 ${active ? 'bg-primary-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
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

                            <>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                        <Icon name="speech" size={14} /> Tone
                                    </label>
                                    <Listbox value={tone} onChange={setTone}>
                                        <div className="relative mt-1">
                                                <Listbox.Button className="relative flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700 transition-all focus:outline-none focus-visible:border-primary-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary-100">
                                                <span className="block truncate">{tone}</span>
                                                <Icon name="chevronDown" size={16} className="text-slate-400" aria-hidden="true" />
                                            </Listbox.Button>
                                            <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                <Listbox.Options className="absolute z-50 w-full py-1 mt-1 overflow-auto text-sm bg-white border border-slate-200 shadow-lg max-h-60 rounded-xl focus:outline-none">
                                                    {tones.map((item) => (
                                                        <Listbox.Option
                                                            key={item}
                                                            className={({ active }) => `relative cursor-pointer select-none py-2 px-4 ${active ? 'bg-primary-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
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
                                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                        <Icon name="clock" size={14} /> Duration
                                    </label>
                                    <Listbox value={length} onChange={setLength}>
                                        <div className="relative mt-1">
                                                <Listbox.Button className="relative flex w-full items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm font-bold text-slate-700 transition-all focus:outline-none focus-visible:border-primary-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-primary-100">
                                                <span className="block truncate">{length}</span>
                                                <Icon name="chevronDown" size={16} className="text-slate-400" aria-hidden="true" />
                                            </Listbox.Button>
                                            <Transition as={React.Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                                                <Listbox.Options className="absolute z-50 w-full py-1 mt-1 overflow-auto text-sm bg-white border border-slate-200 shadow-lg max-h-60 rounded-xl focus:outline-none">
                                                    {lengths.map((item) => (
                                                        <Listbox.Option
                                                            key={item}
                                                            className={({ active }) => `relative cursor-pointer select-none py-2 px-4 ${active ? 'bg-primary-600 text-white' : 'text-slate-700 hover:bg-slate-50'}`}
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
                            </>
                    </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Hook Strategy</label>
                                <select
                                    value={hookType}
                                    onChange={(e) => setHookType(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                                >
                                    {dbHookTypes.map((item) => (
                                        <option key={item.slug} value={item.slug} title={item.description}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Objective</label>
                                <select
                                    value={objective}
                                    onChange={(e) => setObjective(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                                >
                                    {dbObjectives.map((item) => (
                                        <option key={item.slug} value={item.slug} title={item.description}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">CTA Strategy</label>
                                <select
                                    value={desiredCtaType}
                                    onChange={(e) => setDesiredCtaType(e.target.value)}
                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                                >
                                    {dbCtaTypes.map((item) => (
                                        <option key={item.slug} value={item.slug} title={item.description}>{item.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-400">Variants</label>
                                <select
                                    value={variants}
                                    onChange={(e) => setVariants(Number(e.target.value))}
                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-sm font-semibold text-slate-700 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all"
                                >
                                    <option value={1}>1 Variant</option>
                                    <option value={2}>2 Variants</option>
                                    <option value={3}>3 Variants</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-slate-400">Target Platform</label>
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {platforms.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => setPlatform(item.id)}
                                        className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl border-2 py-2 text-[11px] font-black uppercase transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 ${platform === item.id
                                            ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200'
                                            : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                            }`}
                                    >
                                        {item.icon}
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Target Audience</label>
                        <textarea
                            value={audience}
                            onChange={(e) => setAudience(e.target.value)}
                            placeholder="e.g. Students in India, creators, entrepreneurs..."
                            className="w-full h-20 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-sm font-medium placeholder:text-slate-300 focus:bg-white focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition-all resize-none shadow-inner"
                        />
                    </div>

                    {error ? (
                        <div className={`p-4 rounded-2xl border ${(isCreditError || isNoPlanError) ? 'bg-primary-50 border-primary-100 shadow-sm' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex flex-col gap-3">
                                <p className={`text-xs font-bold text-center ${(isCreditError || isNoPlanError) ? 'text-primary-700' : 'text-red-600'}`}>
                                    {error}
                                </p>
                                {(isCreditError || isNoPlanError) ? (
                                    <Button
                                        href={route('settings.upgrade')}
                                        size="xs"
                                        className="mx-auto rounded-lg text-[10px] uppercase tracking-wider"
                                    >
                                        {isNoPlanError ? 'Upgrade Now' : (isPaidPlan ? 'Top Up Credits' : 'Upgrade Now')}
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4 sm:flex-row sm:justify-end">
                    <Button
                        onClick={onClose}
                        type="button"
                        disabled={generating}
                        variant="secondary"
                        className="w-full rounded-xl sm:w-auto"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        type="button"
                        disabled={generating}
                        variant="primary"
                        className="w-full rounded-xl sm:w-auto"
                    >
                        {generating ? (
                            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : (
                            <Icon name="rocket" size={16} />
                        )}
                        {generating ? 'Generating...' : 'Generate Script'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
