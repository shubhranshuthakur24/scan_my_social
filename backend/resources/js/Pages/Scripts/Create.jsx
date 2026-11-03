import { useMemo, useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Button from '@/Components/Button';
import Icon from '@/Components/Icon';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import { useToast } from '@/Contexts/ToastContext';

function FieldError({ message }) {
    return message ? <p className="text-xs font-semibold text-danger-600">{message}</p> : null;
}

function FieldLabel({ children, required = false }) {
    return (
        <label className="text-xs font-black uppercase tracking-widest text-slate-500">
            {children} {required ? <span className="text-danger-500">*</span> : null}
        </label>
    );
}

function ChoiceMode({ value, onChange, manualLabel }) {
    return (
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
            <button
                type="button"
                onClick={() => onChange('ai')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    value === 'ai' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'
                }`}
            >
                AI decides
            </button>
            <button
                type="button"
                onClick={() => onChange('manual')}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition ${
                    value === 'manual' ? 'bg-white text-primary-700 shadow-sm' : 'text-slate-500'
                }`}
            >
                {manualLabel}
            </button>
        </div>
    );
}

function MixSlider({ label, value, onChange, tone }) {
    const toneClasses = {
        primary: 'accent-primary-600',
        warning: 'accent-warning-500',
        danger: 'accent-danger-500',
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-bold text-slate-700">{label}</span>
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{value}%</span>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={value}
                onChange={(event) => onChange(Number(event.target.value))}
                className={`h-2 w-full cursor-pointer ${toneClasses[tone]}`}
            />
        </div>
    );
}

export default function Create({ engineOptions }) {
    const { scriptIntelligence } = usePage().props;
    const { addToast } = useToast();
    const hookTypes = scriptIntelligence?.hookTypes || [];
    const ctaTypes = scriptIntelligence?.ctaTypes || [];
    const platforms = engineOptions?.platforms || {};
    const lengths = engineOptions?.lengths || {};
    const objectives = engineOptions?.objectives || {};
    const presets = engineOptions?.contentMixPresets || {};

    const [form, setForm] = useState({
        topic: '',
        audience: '',
        primary_problem: '',
        objective: 'go_viral',
        platform: 'instagram_reel',
        language: 'Hinglish',
        length: '45s',
        content_mix: { educate: 40, entertain: 30, emotion: 30 },
        tone_mode: 'ai',
        tone: 'Informative',
        hook_mode: 'ai',
        hook_type: hookTypes[0]?.slug || '',
        cta_mode: 'ai',
        cta_type: ctaTypes[0]?.slug || '',
        supporting_information: '',
        research_enabled: false,
        research_intent: 'auto',
        proof_points: '',
        key_points: '',
        user_facts: '',
        source_urls: '',
    });
    const [errors, setErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);

    const platformLengths = useMemo(
        () => platforms[form.platform]?.lengths || [],
        [form.platform, platforms]
    );
    const mixTotal = form.content_mix.educate + form.content_mix.entertain + form.content_mix.emotion;

    const update = (key, value) => {
        setForm((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: null }));
    };

    const updatePlatform = (platform) => {
        const nextLengths = platforms[platform]?.lengths || [];
        setForm((current) => ({
            ...current,
            platform,
            length: nextLengths.includes(current.length) ? current.length : nextLengths[0],
        }));
    };

    const updateMix = (key, value) => {
        setForm((current) => ({
            ...current,
            content_mix: { ...current.content_mix, [key]: value },
        }));
        setErrors((current) => ({ ...current, content_mix: null }));
    };

    const applyPreset = (preset) => {
        setForm((current) => ({
            ...current,
            content_mix: {
                educate: preset.educate,
                entertain: preset.entertain,
                emotion: preset.emotion,
            },
        }));
    };

    const submit = async (event) => {
        event.preventDefault();
        if (submitting || mixTotal !== 100) return;

        setSubmitting(true);
        setErrors({});

        const payload = {
            mode: 'fresh',
            variants: 1,
            topic: form.topic,
            audience: form.audience,
            primary_problem: form.primary_problem,
            objective: form.objective,
            platform: form.platform,
            language: form.language,
            length: form.length,
            content_mix: form.content_mix,
            tone_mode: form.tone_mode,
            tone: form.tone_mode === 'manual' ? form.tone : null,
            hook_mode: form.hook_mode,
            hook_type: form.hook_mode === 'manual' ? form.hook_type : null,
            cta_mode: form.cta_mode,
            cta_type: form.cta_mode === 'manual' ? form.cta_type : null,
            supporting_information: form.supporting_information || null,
            research_enabled: form.research_enabled,
            research_intent: form.research_intent,
            research_tier: 'lite',
            proof_points: form.proof_points || null,
            key_points: form.key_points || null,
            user_facts: form.user_facts.split('\n').map((value) => value.trim()).filter(Boolean),
            source_urls: form.source_urls.split('\n').map((value) => value.trim()).filter(Boolean),
        };

        try {
            const response = await fetch(route('api.scripts.generate'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content,
                },
                credentials: 'same-origin',
                body: JSON.stringify(payload),
            });
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 422) {
                    setErrors(data.errors || {});
                }
                throw new Error(data.message || 'Unable to start script generation.');
            }

            addToast(data.message || 'Your angles are being prepared.', 'success');
            router.visit(data.workflow_url);
        } catch (error) {
            addToast(error.message || 'Unable to start script generation.', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthenticatedLayout>
            <Head title="Create Viral Script" />

            <form onSubmit={submit} className="mx-auto max-w-5xl space-y-5">
                <PageBanner
                    title="Build a Viral Script"
                    description="Set the strategic brief, generate five distinct angles, then choose the one to turn into a final script."
                    variant="soft"
                >
                    <PageBannerAction href={route('scripts')} variant="neutralSecondary">
                        <Icon name="arrowLeft" size={16} />
                        Back to Scripts
                    </PageBannerAction>
                </PageBanner>

                <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Strategic Brief</h2>
                        <p className="text-sm text-slate-500">Define who this is for, what they need, and what the content should achieve.</p>
                    </div>

                    <div className="space-y-2">
                        <FieldLabel required>Topic</FieldLabel>
                        <textarea
                            value={form.topic}
                            onChange={(event) => update('topic', event.target.value)}
                            rows={3}
                            placeholder="What should this content be about?"
                            className="w-full resize-none rounded-xl border-slate-200 text-sm focus:border-primary-400 focus:ring-primary-200"
                        />
                        <FieldError message={errors.topic?.[0]} />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <FieldLabel required>Audience</FieldLabel>
                            <input
                                list="audience-suggestions"
                                value={form.audience}
                                onChange={(event) => update('audience', event.target.value)}
                                placeholder="Search or describe your audience"
                                className="w-full rounded-xl border-slate-200 text-sm focus:border-primary-400 focus:ring-primary-200"
                            />
                            <datalist id="audience-suggestions">
                                {(engineOptions?.audienceSuggestions || []).map((item) => <option key={item} value={item} />)}
                            </datalist>
                            <FieldError message={errors.audience?.[0]} />
                        </div>
                        <div className="space-y-2">
                            <FieldLabel required>Primary Problem</FieldLabel>
                            <input
                                list="problem-suggestions"
                                value={form.primary_problem}
                                onChange={(event) => update('primary_problem', event.target.value)}
                                placeholder="Search or describe the main problem"
                                className="w-full rounded-xl border-slate-200 text-sm focus:border-primary-400 focus:ring-primary-200"
                            />
                            <datalist id="problem-suggestions">
                                {(engineOptions?.problemSuggestions || []).map((item) => <option key={item} value={item} />)}
                            </datalist>
                            <FieldError message={errors.primary_problem?.[0]} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <FieldLabel required>Content Objective</FieldLabel>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(objectives).map(([key, objective]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => update('objective', key)}
                                    className={`rounded-xl border p-3 text-left transition ${
                                        form.objective === key
                                            ? 'border-primary-300 bg-primary-50 ring-2 ring-primary-100'
                                            : 'border-slate-200 hover:border-slate-300'
                                    }`}
                                >
                                    <span className="block text-sm font-black text-slate-800">{objective.label}</span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">{objective.instruction}</span>
                                </button>
                            ))}
                        </div>
                        <FieldError message={errors.objective?.[0]} />
                    </div>
                </section>

                <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Format</h2>
                        <p className="text-sm text-slate-500">The engine adapts structure, pacing, and communication style to the destination.</p>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                        {Object.entries(platforms).map(([key, platform]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => updatePlatform(key)}
                                className={`min-h-20 rounded-xl border px-3 py-3 text-sm font-black transition ${
                                    form.platform === key
                                        ? 'border-primary-400 bg-primary-600 text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-primary-200'
                                }`}
                            >
                                {platform.label}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <FieldLabel required>Language</FieldLabel>
                            <select
                                value={form.language}
                                onChange={(event) => update('language', event.target.value)}
                                className="w-full rounded-xl border-slate-200 text-sm focus:border-primary-400 focus:ring-primary-200"
                            >
                                {['English', 'Hindi', 'Hinglish'].map((language) => <option key={language}>{language}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <FieldLabel required>Length</FieldLabel>
                            <select
                                value={form.length}
                                onChange={(event) => update('length', event.target.value)}
                                className="w-full rounded-xl border-slate-200 text-sm focus:border-primary-400 focus:ring-primary-200"
                            >
                                {platformLengths.map((length) => <option key={length} value={length}>{lengths[length]}</option>)}
                            </select>
                            <FieldError message={errors.length?.[0]} />
                        </div>
                    </div>
                </section>

                <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Content Mix</h2>
                            <p className="text-sm text-slate-500">Balance teaching, entertainment, and emotion. The total must equal 100%.</p>
                        </div>
                        <span className={`rounded-xl px-3 py-2 text-sm font-black ${
                            mixTotal === 100 ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'
                        }`}>
                            Total {mixTotal}%
                        </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {Object.entries(presets).map(([key, preset]) => (
                            <button
                                key={key}
                                type="button"
                                onClick={() => applyPreset(preset)}
                                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700"
                            >
                                {preset.label} {preset.educate}/{preset.entertain}/{preset.emotion}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        <MixSlider label="Educate People" value={form.content_mix.educate} onChange={(value) => updateMix('educate', value)} tone="primary" />
                        <MixSlider label="Entertain People" value={form.content_mix.entertain} onChange={(value) => updateMix('entertain', value)} tone="warning" />
                        <MixSlider label="Evoke Emotions" value={form.content_mix.emotion} onChange={(value) => updateMix('emotion', value)} tone="danger" />
                    </div>
                    <FieldError message={errors.content_mix?.[0]} />
                </section>

                <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div>
                        <h2 className="text-lg font-black text-slate-900">Creative Direction</h2>
                        <p className="text-sm text-slate-500">Let AI optimize each choice, or lock in your preferred strategy.</p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <FieldLabel>Tone</FieldLabel>
                            <ChoiceMode value={form.tone_mode} onChange={(value) => update('tone_mode', value)} manualLabel="Choose tone" />
                            {form.tone_mode === 'manual' ? (
                                <select value={form.tone} onChange={(event) => update('tone', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm">
                                    {(engineOptions?.tones || []).map((tone) => <option key={tone}>{tone}</option>)}
                                </select>
                            ) : <p className="text-xs leading-5 text-slate-500">AI chooses the tone that best fits the audience and objective.</p>}
                            <FieldError message={errors.tone?.[0]} />
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <FieldLabel>Hook</FieldLabel>
                            <ChoiceMode value={form.hook_mode} onChange={(value) => update('hook_mode', value)} manualLabel="Choose hook" />
                            {form.hook_mode === 'manual' ? (
                                <select value={form.hook_type} onChange={(event) => update('hook_type', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm">
                                    {hookTypes.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
                                </select>
                            ) : <p className="text-xs leading-5 text-slate-500">AI chooses the strongest opening for the selected angle.</p>}
                            <FieldError message={errors.hook_type?.[0]} />
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                            <FieldLabel>CTA</FieldLabel>
                            <ChoiceMode value={form.cta_mode} onChange={(value) => update('cta_mode', value)} manualLabel="Choose CTA" />
                            {form.cta_mode === 'manual' ? (
                                <select value={form.cta_type} onChange={(event) => update('cta_type', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm">
                                    {ctaTypes.map((item) => <option key={item.slug} value={item.slug}>{item.label}</option>)}
                                </select>
                            ) : <p className="text-xs leading-5 text-slate-500">AI chooses the action most aligned with your objective.</p>}
                            <FieldError message={errors.cta_type?.[0]} />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <FieldLabel>Supporting Information</FieldLabel>
                        <textarea
                            value={form.supporting_information}
                            onChange={(event) => update('supporting_information', event.target.value)}
                            rows={4}
                            placeholder="Add offer details, personal experience, positioning, examples, or anything the engine should consider."
                            className="w-full resize-none rounded-xl border-slate-200 text-sm focus:border-primary-400 focus:ring-primary-200"
                        />
                    </div>
                </section>

                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Research</h2>
                            <p className="text-sm text-slate-500">Optional. Add current evidence before angle generation.</p>
                        </div>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={form.research_enabled}
                            onClick={() => update('research_enabled', !form.research_enabled)}
                            className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                                form.research_enabled ? 'bg-primary-600' : 'bg-slate-300'
                            }`}
                        >
                            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                                form.research_enabled ? 'left-6' : 'left-1'
                            }`} />
                        </button>
                    </div>

                    {form.research_enabled ? (
                        <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <FieldLabel>Research Intent</FieldLabel>
                                <select value={form.research_intent} onChange={(event) => update('research_intent', event.target.value)} className="w-full rounded-xl border-slate-200 text-sm">
                                    <option value="auto">Auto (Recommended)</option>
                                    {(scriptIntelligence?.research?.intents || []).map((intent) => (
                                        <option key={intent.value} value={intent.value}>{intent.label}</option>
                                    ))}
                                </select>
                                <p className="text-xs leading-5 text-slate-500">
                                    {form.research_intent === 'auto'
                                        ? 'Automatically chooses the best intent from your complete brief.'
                                        : 'Manual selection overrides automatic intent detection.'}
                                </p>
                                <FieldError message={errors.research_intent?.[0]} />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel>Key Points</FieldLabel>
                                <textarea value={form.key_points} onChange={(event) => update('key_points', event.target.value)} rows={3} className="w-full resize-none rounded-xl border-slate-200 text-sm" placeholder="What must the content cover?" />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel>Proof Points</FieldLabel>
                                <textarea value={form.proof_points} onChange={(event) => update('proof_points', event.target.value)} rows={3} className="w-full resize-none rounded-xl border-slate-200 text-sm" placeholder="Which claims require evidence?" />
                            </div>
                            <div className="space-y-2">
                                <FieldLabel>User Facts</FieldLabel>
                                <textarea value={form.user_facts} onChange={(event) => update('user_facts', event.target.value)} rows={3} className="w-full resize-none rounded-xl border-slate-200 text-sm" placeholder="One internal or personal fact per line" />
                            </div>
                            <div className="space-y-2 sm:col-span-2">
                                <FieldLabel>Source URLs</FieldLabel>
                                <textarea value={form.source_urls} onChange={(event) => update('source_urls', event.target.value)} rows={3} className="w-full resize-none rounded-xl border-slate-200 text-sm" placeholder="Optional, one URL per line" />
                                <FieldError message={errors.source_urls?.[0]} />
                            </div>
                        </div>
                    ) : null}
                </section>

                <div className="sticky bottom-3 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-5 text-slate-500">
                        The next step generates five angles. Credits are reserved once when you start.
                    </p>
                    <Button type="submit" size="lg" isLoading={submitting} disabled={mixTotal !== 100}>
                        <Icon name="wand" size={18} />
                        Generate 5 Angles
                    </Button>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}
