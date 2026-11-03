import { useMemo, useState } from 'react';
import Icon from '@/Components/Icon';
import { Library, MessageSquare, Sparkles } from 'lucide-react';

function getTemplateMeta(template) {
    if (template.use_case_slug === 'story-reply-funnel') {
        return {
            card: 'border-violet-200 bg-linear-to-br from-violet-50 to-white hover:border-violet-300',
            iconWrap: 'bg-violet-100 text-violet-700',
            badge: 'border-violet-200 bg-violet-100 text-violet-700',
            action: 'text-violet-700',
            icon: Sparkles,
        };
    }

    if (template.is_system) {
        return {
            card: 'border-primary-200 bg-linear-to-br from-primary-50 to-white hover:border-primary-300',
            iconWrap: 'bg-primary-100 text-primary-700',
            badge: 'border-primary-200 bg-primary-100 text-primary-700',
            action: 'text-primary-700',
            icon: Library,
        };
    }

    return {
        card: 'border-emerald-200 bg-linear-to-br from-emerald-50 to-white hover:border-emerald-300',
        iconWrap: 'bg-emerald-100 text-emerald-700',
        badge: 'border-emerald-200 bg-emerald-100 text-emerald-700',
        action: 'text-emerald-700',
        icon: MessageSquare,
    };
}

export default function TemplateLibrarySection({ templates }) {
    const {
        flowTemplates = [],
        templateUseCases = [],
        activeTemplateId = null,
        requestApplyTemplate,
        onSaveCurrentTemplate,
        canCreateSystemTemplate = false,
    } = templates;
    const sectionCardClass = 'space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm';
    const [activeUseCaseId, setActiveUseCaseId] = useState('all');

    const templatesByUseCase = useMemo(() => {
        const counts = {};

        flowTemplates.forEach((template) => {
            const key = String(template.use_case_id || 'unknown');
            counts[key] = (counts[key] || 0) + 1;
        });

        return counts;
    }, [flowTemplates]);

    const filteredTemplates = useMemo(() => {
        if (activeUseCaseId === 'all') {
            return flowTemplates;
        }

        return flowTemplates.filter((template) => String(template.use_case_id) === String(activeUseCaseId));
    }, [activeUseCaseId, flowTemplates]);

    return (
        <div className={sectionCardClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">Template Library</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Use a DB-powered preset to prefill name, keywords, reply message, and opening message.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                        {flowTemplates.length} templates
                    </span>
                    <button
                        type="button"
                        onClick={onSaveCurrentTemplate}
                        className="inline-flex items-center rounded-xl border border-primary-200 bg-primary-50 px-3 py-1.5 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100"
                    >
                        Save current as template
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <button
                    type="button"
                    onClick={() => setActiveUseCaseId('all')}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${activeUseCaseId === 'all'
                        ? 'border-primary-500 bg-primary-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        }`}
                >
                    All use cases ({flowTemplates.length})
                </button>
                {templateUseCases.map((useCase) => {
                    const id = String(useCase.id);
                    const count = templatesByUseCase[id] || 0;

                    return (
                        <button
                            type="button"
                            key={id}
                            onClick={() => setActiveUseCaseId(id)}
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${activeUseCaseId === id
                                ? 'border-primary-500 bg-primary-600 text-white'
                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                        >
                            {useCase.name} ({count})
                        </button>
                    );
                })}
            </div>

            {filteredTemplates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                    No templates found for this use case yet.
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredTemplates.map((template) => {
                        const meta = getTemplateMeta(template);
                        const TemplateIcon = meta.icon;
                        const isActiveTemplate = String(activeTemplateId || '') === String(template.id);

                        return (
                            <button
                                type="button"
                                key={template.id}
                                onClick={() => requestApplyTemplate(template)}
                                className={`group cursor-pointer rounded-xl border p-3 text-left transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:ring-offset-2 motion-reduce:transition-none ${isActiveTemplate
                                    ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                                    : meta.card
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${isActiveTemplate ? 'bg-white/15 text-white' : meta.iconWrap
                                        }`}>
                                        <TemplateIcon className="h-4 w-4" />
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {isActiveTemplate && (
                                            <span className="inline-flex items-center rounded-full border border-green-500/30 bg-transparent text-white">
                                                <Icon name="checkCircle" size={6} className="text-green-500" />
                                            </span>
                                        )}
                                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${isActiveTemplate ? 'border-white/30 bg-white/15 text-white' : meta.badge
                                            }`}>
                                            {template.badge || (template.is_system ? 'System' : 'My Template')}
                                        </span>
                                    </div>
                                </div>

                                <p className={`mt-3 text-sm font-semibold ${isActiveTemplate ? 'text-white' : 'text-slate-900'}`}>
                                    {template.title}
                                </p>
                                <p className={`mt-1 line-clamp-2 text-xs ${isActiveTemplate ? 'text-white/80' : 'text-slate-600'}`}>
                                    {template.description || template.use_case_name}
                                </p>

                                <div className="mt-3 flex flex-wrap gap-1.5">
                                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${isActiveTemplate ? 'border-white/25 text-white/90' : 'border-slate-200 text-slate-600'
                                        }`}>
                                        {Array.isArray(template.keywords) ? template.keywords.length : 0} keywords
                                    </span>
                                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${isActiveTemplate ? 'border-white/25 text-white/90' : 'border-slate-200 text-slate-600'
                                        }`}>
                                        {template.trigger_type || 'post'} trigger
                                    </span>
                                    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold ${isActiveTemplate ? 'border-white/25 text-white/90' : 'border-slate-200 text-slate-600'
                                        }`}>
                                        {template.is_system ? 'System' : 'Personal'}
                                    </span>
                                </div>

                                <div className={`mt-3 text-xs font-semibold ${isActiveTemplate ? 'text-white' : meta.action}`}>
                                    {isActiveTemplate ? 'Applied with selected template' : 'Use Template'}
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {canCreateSystemTemplate && (
                <p className="text-xs text-slate-500">
                    Super admin can save templates as system defaults for all users.
                </p>
            )}
        </div>
    );
}
