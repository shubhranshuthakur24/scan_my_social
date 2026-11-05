'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  WebPageTemplate,
  WebPageThemePreset,
  WebPage,
  fetchWebPageCatalog,
  createWebPage,
  CreateWebPagePayload,
} from '@/lib/api/webPagesService';
import WebPagesSkeleton from '@/components/web-pages/WebPagesSkeleton';
import WebPageCanvas from '@/components/web-pages/WebPageCanvas';
import WebPageTemplatePicker from '@/components/web-pages/WebPageTemplatePicker';
import { useWebPageCreationStore } from '@/lib/store/useWebPageCreationStore';
import {
  ArrowLeft,
  Check,
  Eye,
  Smartphone,
  Tablet,
  Monitor,
  AlertCircle,
  ArrowRight,
  ArrowDown,
  Sparkles,
  Signal,
  Wifi,
  BatteryFull,
} from 'lucide-react';
import Button from '@/components/ui/Button';

interface ViewportIframeProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

function ViewportIframe({ children, className = '', title = 'Live Viewport Preview' }: ViewportIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    // Viewport meta for accurate media queries
    if (!doc.querySelector('meta[name="viewport"]')) {
      const meta = doc.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1';
      doc.head.appendChild(meta);
    }

    // Copy all parent document stylesheets into iframe head
    const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleNodes.forEach((node) => {
      doc.head.appendChild(node.cloneNode(true));
    });

    // Style html and body for internal vertical scrolling
    doc.documentElement.style.height = '100%';
    doc.documentElement.style.margin = '0';
    doc.documentElement.style.padding = '0';
    doc.documentElement.style.overflowY = 'auto';
    doc.documentElement.style.overflowX = 'hidden';

    doc.body.style.minHeight = '100%';
    doc.body.style.margin = '0';
    doc.body.style.padding = '0';
    doc.body.style.overflowY = 'auto';
    doc.body.style.overflowX = 'hidden';
    doc.body.style.backgroundColor = 'transparent';

    setMountNode(doc.body);
  }, []);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      className={className}
      style={{ display: 'block', border: 'none', width: '100%', height: '100%' }}
    >
      {mountNode && createPortal(children, mountNode)}
    </iframe>
  );
}

export default function WebPageCreatePage() {
  return (
    <Suspense fallback={<WebPagesSkeleton />}>
      <CreateWizardContent />
    </Suspense>
  );
}

function CreateWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawTemplateParam = searchParams.get('template');
  const rawStepParam = searchParams.get('step');

  const {
    selectedTemplateKey,
    selectedThemeKey,
    currentStep,
    setSelectedTemplateKey,
    setSelectedThemeKey,
    setCurrentStep,
    resetCreationState,
  } = useWebPageCreationStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<'draft' | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<WebPageTemplate[]>([]);
  const [themePresets, setThemePresets] = useState<WebPageThemePreset[]>([]);

  // Live sync animated feedback state
  const [isLiveSyncing, setIsLiveSyncing] = useState(false);
  const [syncFeedbackText, setSyncFeedbackText] = useState('Live Canvas Preview is updating below');
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerLiveSync = (label: string) => {
    setIsLiveSyncing(true);
    setSyncFeedbackText(label);
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      setIsLiveSyncing(false);
      setSyncFeedbackText('Live Canvas Preview is updating below');
    }, 2200);
  };

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, []);

  // Form fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');

  // Dirty state tracking to prevent overwriting user-authored copy on template switch
  const isTitleDirtyRef = useRef(false);
  const isDescriptionDirtyRef = useRef(false);

  // Inline field validation
  const [titleError, setTitleError] = useState<string | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Mobile segmented view toggle (<lg viewports)
  const [mobileTab, setMobileTab] = useState<'details' | 'preview'>('details');

  // Preview device mode
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  const previewSectionRef = useRef<HTMLDivElement>(null);

  const scrollToPreview = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileTab('preview');
    }
    setTimeout(() => {
      previewSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };


  useEffect(() => {
    let active = true;
    fetchWebPageCatalog()
      .then((res) => {
        if (!active) return;
        const tpls: WebPageTemplate[] = Array.isArray(res.templates)
          ? res.templates
          : Object.values(res.templates || {});
        const presets: WebPageThemePreset[] = Array.isArray(res.theme_presets)
          ? res.theme_presets
          : Object.values(res.theme_presets || {});

        setTemplates(tpls);
        setThemePresets(presets);

        // Precedence 1: Explicit valid ?template= parameter takes top priority
        if (rawTemplateParam) {
          const foundTpl = tpls.find((t) => t.key === rawTemplateParam);
          if (foundTpl) {
            setSelectedTemplateKey(foundTpl.key);
            setSelectedThemeKey(foundTpl.theme_key || 'studio');
            if (rawStepParam === '2') {
              setCurrentStep(2);
            } else {
              setCurrentStep(1); // Explicit template selection starts on Step 1
            }
            if (!isTitleDirtyRef.current) setTitle(foundTpl.name);
            if (!isDescriptionDirtyRef.current) setDescription(foundTpl.description);
          }
        } else {
          // Precedence 2: Restore valid persisted creation state if present
          const currentStore = useWebPageCreationStore.getState();
          if (currentStore.selectedTemplateKey) {
            const foundStored = tpls.find((t) => t.key === currentStore.selectedTemplateKey);
            if (foundStored) {
              if (!isTitleDirtyRef.current) setTitle(foundStored.name);
              if (!isDescriptionDirtyRef.current) setDescription(foundStored.description);
              if (!currentStore.selectedThemeKey) {
                setSelectedThemeKey(foundStored.theme_key || 'studio');
              }
            } else {
              // Stored key invalid/obsolete
              resetCreationState();
            }
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setApiError(err instanceof Error ? err.message : 'Failed to load templates');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [rawTemplateParam, rawStepParam, setSelectedTemplateKey, setSelectedThemeKey, setCurrentStep, resetCreationState]);

  const safeTemplates: WebPageTemplate[] = Array.isArray(templates)
    ? templates
    : Object.values(templates || {}).filter((item): item is WebPageTemplate => Boolean(item && typeof item === 'object' && 'key' in item));
  const safePresets: WebPageThemePreset[] = Array.isArray(themePresets)
    ? themePresets
    : Object.values(themePresets || {}).filter((item): item is WebPageThemePreset => Boolean(item && typeof item === 'object' && 'key' in item));
  const selectedTemplate = selectedTemplateKey
    ? safeTemplates.find((t) => t.key === selectedTemplateKey) || null
    : null;
  const activePreset =
    safePresets.find((p) => p.key === (selectedThemeKey || selectedTemplate?.theme_key || 'studio')) ||
    safePresets[0];

  const handleSelectTemplate = (tpl: WebPageTemplate) => {
    setSelectedTemplateKey(tpl.key);
    if (!isTitleDirtyRef.current) {
      setTitle(tpl.name);
      if (titleError) setTitleError(null);
    }
    if (!isDescriptionDirtyRef.current) {
      setDescription(tpl.description);
    }
    setSelectedThemeKey(tpl.theme_key || 'studio');
    triggerLiveSync(`Selected "${tpl.name}" template`);
  };

  const handleProceedToStep2 = () => {
    if (!selectedTemplate) return;

    if (!isTitleDirtyRef.current) {
      setTitle(selectedTemplate.name);
      if (titleError) setTitleError(null);
    }
    if (!isDescriptionDirtyRef.current) {
      setDescription(selectedTemplate.description);
    }
    setCurrentStep(2);
    triggerLiveSync('Preview loaded with chosen template');
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    isTitleDirtyRef.current = true;
    if (titleError && val.trim()) {
      setTitleError(null);
    }
    triggerLiveSync('Headline updated live in preview');
  };

  const handleSlugChange = (val: string) => {
    // Convert spaces to hyphens and allow valid slug characters
    const formatted = val
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    setSlug(formatted);
    triggerLiveSync('URL slug updated live in preview');
  };

  const handleDescriptionChange = (val: string) => {
    setDescription(val);
    isDescriptionDirtyRef.current = true;
    triggerLiveSync('Description updated live in preview');
  };

  const handleThemeChange = (key: string, label: string) => {
    setSelectedThemeKey(key);
    triggerLiveSync(`"${label} Theme" applied live in preview`);
  };

  const previewSections = (selectedTemplate?.sections || []).map((sec, idx) => {
    if (idx === 0 && sec.type === 'hero') {
      return {
        ...sec,
        content: {
          ...sec.content,
          heading: title || sec.content?.heading,
          body: description || sec.content?.body,
        },
      };
    }
    return sec;
  });

  const dummyPreviewPage: WebPage = {
    id: 0,
    title: title || selectedTemplate?.name || 'Untitled Page',
    slug: slug || 'my-page',
    description: description || null,
    template_key: selectedTemplateKey || 'creator',
    sections: previewSections,
    theme_settings: activePreset?.settings || selectedTemplate?.theme_settings || {},
    is_published: false,
    published_at: null,
    public_url: null,
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setTitleError('Please provide a page title.');
      setMobileTab('details'); // Ensure form is visible on mobile so user sees error
      titleInputRef.current?.focus();
      return;
    }

    setTitleError(null);
    setApiError(null);
    setIsSaving(true);
    setSavingAction('draft');

    const chosenTpl = selectedTemplate || safeTemplates.find((t) => t.key === selectedTemplateKey) || safeTemplates[0];

    const payload: CreateWebPagePayload = {
      title: title.trim(),
      slug: slug.trim() || undefined,
      description: description.trim() || undefined,
      template_key: selectedTemplateKey || chosenTpl?.key || 'creator',
      sections: chosenTpl?.sections || [],
      theme_settings: activePreset?.settings || chosenTpl?.theme_settings || {},
      is_published: false,
    };

    try {
      const res = await createWebPage(payload);
      resetCreationState();
      router.push(`/web-pages/${res.web_page.id}/edit`);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Failed to create web page');
      setIsSaving(false);
      setSavingAction(null);
    }
  };

  if (isLoading) {
    return <WebPagesSkeleton />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with Visual Step Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/web-pages"
            className="flex items-center justify-center min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            title="Back to Web Pages"
            aria-label="Back to Web Pages"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-lg font-black text-slate-900 leading-tight">
              Create New Web Page
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Build a standalone mini-website with customized blocks and instant lead capture.
            </p>
          </div>
        </div>

        {/* Lightweight Visual Step Indicator */}
        <nav
          aria-label="Creation progress"
          className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 p-1.5 rounded-xl shrink-0 text-xs font-bold self-start sm:self-auto"
        >
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition ${
              currentStep === 1
                ? 'bg-white text-primary-700 font-black shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            aria-current={currentStep === 1 ? 'step' : undefined}
          >
            {currentStep === 2 ? (
              <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                <Check size={10} strokeWidth={3} />
              </span>
            ) : (
              <span className="w-4 h-4 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-[10px] font-black">
                1
              </span>
            )}
            <span>Template</span>
          </button>

          <span className="text-slate-300 font-normal">→</span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${
              currentStep === 2
                ? 'bg-white text-primary-700 font-black shadow-2xs'
                : 'text-slate-400 font-medium'
            }`}
            aria-current={currentStep === 2 ? 'step' : undefined}
          >
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                currentStep === 2 ? 'bg-primary-100 text-primary-700 font-black' : 'bg-slate-200 text-slate-500'
              }`}
            >
              2
            </span>
            <span>Details & Theme</span>
          </div>
        </nav>
      </div>

      {/* API Failure Alert Banner */}
      {apiError && (
        <div
          role="alert"
          aria-live="assertive"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{apiError}</span>
          </div>
          <button
            type="button"
            onClick={() => setApiError(null)}
            className="text-rose-600 hover:underline text-[11px]"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Step 1: Template Selection */}
      {currentStep === 1 ? (
        <div className="space-y-6 pb-28 sm:pb-32">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-1.5">
            <h2 className="text-base font-black text-slate-900">
              Choose your starting template
            </h2>
            <p className="text-xs text-slate-500">
              Start with a professionally structured page. You can customize every block in the editor.
            </p>
          </div>

          <WebPageTemplatePicker
            templates={templates}
            selectedKey={selectedTemplateKey || undefined}
            onSelect={handleSelectTemplate}
          />

          {/* Step 1 Sticky Action Bar */}
          <div className="sticky bottom-4 z-30 bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 text-center sm:text-left min-w-0">
              {selectedTemplate ? (
                <div className="truncate">
                  Selected template: <strong className="text-slate-900 font-bold">{selectedTemplate.name}</strong>{' '}
                  <span className="text-slate-400 font-normal">({selectedTemplate.category})</span>
                </div>
              ) : (
                <span className="text-slate-400">
                  Please select a template to continue
                </span>
              )}
            </div>

            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!selectedTemplateKey}
              onClick={handleProceedToStep2}
              className="w-full sm:w-auto gap-1.5 shadow-xs shrink-0 min-h-[44px]"
            >
              <span>{selectedTemplate ? `Continue with ${selectedTemplate.name}` : 'Continue'}</span>
              <ArrowRight size={14} />
            </Button>
          </div>
        </div>
      ) : (
        /* Step 2: Details & Live Canvas Preview */
        <div className="space-y-6">
          {/* Segmented Toggle Control (<lg viewports) */}
          <div className="lg:hidden flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setMobileTab('details')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-black transition min-h-[44px] sm:min-h-[38px] flex items-center justify-center gap-1.5 ${
                mobileTab === 'details'
                  ? 'bg-white text-primary-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Details & Theme
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={`flex-1 py-2.5 rounded-lg text-xs font-black transition min-h-[44px] sm:min-h-[38px] flex items-center justify-center gap-1.5 ${
                mobileTab === 'preview'
                  ? 'bg-white text-primary-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Eye size={13} />
              <span>Live Preview</span>
            </button>
          </div>

          {/* Top Form Card (hidden on <lg if mobileTab === 'preview') */}
          <div
            className={`bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6 ${
              mobileTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                Page Details & Theme
              </h2>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={scrollToPreview}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all duration-300 shadow-2xs group cursor-pointer ${
                    isLiveSyncing
                      ? 'bg-primary-600 text-white ring-2 ring-primary-400 shadow-md scale-105'
                      : 'bg-purple-50 hover:bg-purple-100 text-primary-700 border border-purple-200/80'
                  }`}
                  title="Scroll to live preview below"
                >
                  {isLiveSyncing ? (
                    <Sparkles size={13} className="text-white animate-spin" />
                  ) : (
                    <Eye size={13} className="text-primary-600" />
                  )}
                  <span>{isLiveSyncing ? 'Live Updating ↓' : 'Preview Below'}</span>
                  <ArrowDown
                    size={12}
                    className={`transition-transform duration-200 ${
                      isLiveSyncing ? 'text-white animate-bounce' : 'text-primary-600 group-hover:translate-y-0.5'
                    }`}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="text-xs font-bold text-primary-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Change Template</span>
                  <span className="text-slate-400 font-normal">({selectedTemplate?.name})</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Core Fields */}
              <div className="space-y-4">
                {/* Field 1: Title with Inline Validation */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="title"
                      className="block text-[10px] font-black uppercase tracking-wider text-slate-700"
                    >
                      Page Title <span className="text-rose-500">*</span>
                    </label>
                  </div>
                  <input
                    ref={titleInputRef}
                    id="title"
                    name="title"
                    type="text"
                    required
                    aria-required="true"
                    aria-invalid={Boolean(titleError)}
                    aria-describedby={titleError ? 'title-error' : undefined}
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Creator Masterclass 2026"
                    className={`w-full text-xs font-bold p-3 rounded-xl border bg-white outline-none transition ${
                      titleError
                        ? 'border-rose-400 ring-2 ring-rose-500/20 text-slate-900'
                        : 'border-slate-200 focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
                    }`}
                  />
                  {titleError && (
                    <p id="title-error" className="text-xs font-bold text-rose-600 mt-1.5 flex items-center gap-1">
                      <AlertCircle size={13} className="shrink-0" />
                      <span>{titleError}</span>
                    </p>
                  )}
                </div>

                {/* Field 2: Custom Slug */}
                <div>
                  <label
                    htmlFor="slug"
                    className="block text-[10px] font-black uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Custom Slug <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden text-xs focus-within:ring-2 focus-within:ring-primary-500/20 focus-within:border-primary-500 transition">
                    <span className="px-3 py-3 text-slate-400 font-mono font-bold select-none border-r border-slate-200 bg-slate-100/60">
                      /@you/pages/
                    </span>
                    <input
                      id="slug"
                      name="slug"
                      type="text"
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="my-landing-page"
                      className="flex-1 p-3 bg-transparent font-mono font-bold outline-none text-slate-900"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Spaces are converted to hyphens. Leave blank to generate automatically.
                  </p>
                </div>

                {/* Field 3: SEO Description with Character Counter */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="description"
                      className="block text-[10px] font-black uppercase tracking-wider text-slate-700"
                    >
                      SEO Description <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <span className="text-[10px] font-bold text-slate-400">
                      {description.length} / 160
                    </span>
                  </div>
                  <textarea
                    id="description"
                    name="description"
                    rows={2}
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    placeholder="A brief summary for search engines and social link previews..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none transition leading-relaxed"
                  />
                </div>
              </div>

              {/* Right Column: Theme Preset Selector */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-700">
                  Theme Preset
                </label>
                <div
                  role="radiogroup"
                  aria-label="Theme presets"
                  className="grid grid-cols-2 gap-2"
                >
                  {safePresets.map((preset) => {
                    const isSelected = selectedThemeKey === preset.key;
                    return (
                      <button
                        key={preset.key}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => handleThemeChange(preset.key, preset.label)}
                        className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all duration-200 active:scale-98 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer ${
                          isSelected
                            ? 'border-primary-600 bg-primary-50/50 shadow-2xs font-extrabold text-primary-900 ring-2 ring-primary-500/25'
                            : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-bold'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                            style={{ backgroundColor: preset.settings?.accent_color || '#ef4444' }}
                          />
                          <span className="text-xs truncate">{preset.label}</span>
                        </div>
                        {isSelected && <Check size={12} className="text-primary-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Creation Action (Form Footer) */}
            <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs text-slate-500">
                <div>
                  <span>Selected template: </span>
                  <strong className="text-slate-900 font-bold">{selectedTemplate?.name}</strong>
                  <span className="text-slate-400 font-normal"> ({activePreset?.label} Theme)</span>
                </div>
                <button
                  type="button"
                  onClick={scrollToPreview}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary-600 hover:text-primary-800 transition cursor-pointer group"
                >
                  <Eye size={13} className="text-primary-600 group-hover:scale-110 transition-transform" />
                  <span>View live preview below</span>
                  <ArrowDown
                    size={12}
                    className={`text-primary-600 transition-transform ${
                      isLiveSyncing ? 'animate-bounce' : 'group-hover:translate-y-0.5'
                    }`}
                  />
                  {isLiveSyncing && (
                    <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200/80 animate-pulse">
                      Live Synced
                    </span>
                  )}
                </button>
              </div>

              <Button
                type="button"
                variant="primary"
                size="md"
                disabled={isSaving}
                loading={isSaving && savingAction === 'draft'}
                onClick={handleCreate}
                className="w-full sm:w-auto gap-1.5 shadow-xs min-h-[44px]"
              >
                <span>Continue to Editor</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </div>

          {/* Visual Hint Indicator that Live Preview is below */}
          <div className="flex items-center justify-center -my-1">
            <button
              type="button"
              onClick={scrollToPreview}
              className={`inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer group ${
                isLiveSyncing
                  ? 'bg-gradient-to-r from-primary-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 ring-4 ring-purple-300/40 scale-105'
                  : 'bg-white hover:bg-purple-50/70 border border-slate-200/90 hover:border-purple-300 shadow-2xs text-slate-600 hover:text-primary-700 hover:scale-102'
              }`}
            >
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full ${
                    isLiveSyncing ? 'bg-white' : 'bg-emerald-400'
                  } opacity-80`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isLiveSyncing ? 'bg-white' : 'bg-emerald-500'
                  }`}
                />
              </span>
              <span className="truncate">
                {isLiveSyncing ? `⚡ ${syncFeedbackText}` : 'Live Canvas Preview is updating below'}
              </span>
              <ArrowDown
                size={14}
                className={`transition-transform duration-200 ${
                  isLiveSyncing ? 'text-white animate-bounce' : 'text-primary-600 group-hover:translate-y-0.5'
                }`}
              />
            </button>
          </div>

          {/* Live Canvas Preview Section (hidden on <lg if mobileTab === 'details') */}
          <div
            ref={previewSectionRef}
            id="live-canvas-preview"
            className={`space-y-3 scroll-mt-6 ${
              mobileTab === 'details' ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Eye size={14} className="text-primary-600" />
                  <span>Live Canvas Preview</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold transition-all duration-300 ${
                    isLiveSyncing
                      ? 'bg-purple-100 text-purple-800 ring-2 ring-purple-400 shadow-2xs'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full ${
                        isLiveSyncing ? 'bg-purple-500 animate-ping' : 'bg-emerald-400 opacity-75'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-2 w-2 ${
                        isLiveSyncing ? 'bg-purple-600' : 'bg-emerald-500'
                      }`}
                    />
                  </span>
                  <span>{isLiveSyncing ? 'Live Updating...' : 'Live Synced'}</span>
                </span>
              </div>

              {/* 3-Mode Device Preview Switcher */}
              <div
                className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70"
                role="group"
                aria-label="Device preview switcher"
              >
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={`min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg transition ${
                    deviceMode === 'desktop'
                      ? 'bg-primary-600 text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Desktop (100%)"
                  aria-label="Preview on desktop"
                  aria-pressed={deviceMode === 'desktop'}
                >
                  <Monitor size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('tablet')}
                  className={`min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg transition ${
                    deviceMode === 'tablet'
                      ? 'bg-primary-600 text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Tablet (768px)"
                  aria-label="Preview on tablet"
                  aria-pressed={deviceMode === 'tablet'}
                >
                  <Tablet size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={`min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-lg transition ${
                    deviceMode === 'mobile'
                      ? 'bg-primary-600 text-white shadow-2xs font-bold'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                  title="Mobile (375px)"
                  aria-label="Preview on mobile"
                  aria-pressed={deviceMode === 'mobile'}
                >
                  <Smartphone size={16} />
                </button>
              </div>
            </div>

            {/* Preview Frame Container */}
            <div className="flex justify-center bg-slate-200/60 p-4 sm:p-6 rounded-3xl border border-slate-300/60 overflow-hidden min-h-[550px]">
              {deviceMode === 'mobile' ? (
                /* Realistic iPhone Device Mockup Frame (375px width with scrollable viewport) */
                <div className="w-[375px] max-w-full mx-auto">
                  <div className="relative mx-auto w-full">
                    {/* Bezel Frames */}
                    <div
                      className={`rounded-[2.5rem] border-8 border-slate-800 shadow-2xl overflow-hidden bg-slate-950 flex flex-col transition-all duration-500 relative ${
                        isLiveSyncing ? 'ring-4 ring-primary-500/40 shadow-[0_16px_50px_rgba(99,102,241,0.25)]' : ''
                      }`}
                    >
                      {/* Subtle Top Glowing Live Scan Ray */}
                      {isLiveSyncing && (
                        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse z-40 pointer-events-none" />
                      )}
                      {/* iOS Status Bar */}
                      <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold text-slate-300 bg-slate-950 shrink-0 select-none">
                        <span>9:41</span>
                        <div className="h-1.5 w-16 rounded-full bg-slate-800" />
                        <span className="inline-flex items-center gap-1">
                          <Signal className="h-3 w-3" />
                          <Wifi className="h-3 w-3" />
                          <BatteryFull className="h-3 w-3" />
                        </span>
                      </div>
                      {/* Scrollable Viewport */}
                      <div className="h-[660px] bg-white overflow-hidden">
                        <ViewportIframe title="Mobile Viewport Preview">
                          <WebPageCanvas
                            webPage={dummyPreviewPage}
                            mode="preview"
                            className="scale-100"
                          />
                        </ViewportIframe>
                      </div>
                      {/* iOS Home Indicator Bar */}
                      <div className="h-4 bg-slate-950 flex items-center justify-center shrink-0">
                        <div className="w-28 h-1 rounded-full bg-white/40" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : deviceMode === 'tablet' ? (
                /* Realistic Tablet Mockup Frame (768px width with scrollable viewport) */
                <div className="w-[768px] max-w-full mx-auto">
                  <div
                    className={`rounded-2xl border-8 border-slate-800 shadow-2xl overflow-hidden bg-white flex flex-col transition-all duration-500 relative ${
                      isLiveSyncing ? 'ring-4 ring-primary-500/40 shadow-[0_16px_50px_rgba(99,102,241,0.25)]' : ''
                    }`}
                  >
                    {/* Subtle Top Glowing Live Scan Ray */}
                    {isLiveSyncing && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse z-40 pointer-events-none" />
                    )}
                    {/* Tablet Header / Camera Bezel */}
                    <div className="flex items-center justify-center py-2 bg-slate-800 border-b border-slate-700 shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-700 border border-slate-600" />
                    </div>
                    {/* Tablet Viewport */}
                    <div className="h-[660px] bg-white overflow-hidden">
                      <ViewportIframe title="Tablet Viewport Preview">
                        <WebPageCanvas
                          webPage={dummyPreviewPage}
                          mode="preview"
                          className="scale-100"
                        />
                      </ViewportIframe>
                    </div>
                  </div>
                </div>
              ) : (
                /* Realistic Desktop Browser Frame with Scrollable Viewport */
                <div
                  className={`w-full max-w-6xl mx-auto bg-white rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col relative ${
                    isLiveSyncing
                      ? 'border-primary-400 ring-4 ring-primary-500/35 shadow-[0_16px_50px_rgba(99,102,241,0.2)]'
                      : 'border-slate-300/80 shadow-2xl'
                  }`}
                >
                  {/* Subtle Top Glowing Live Scan Ray */}
                  {isLiveSyncing && (
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-pulse z-40 pointer-events-none" />
                  )}
                  {/* Browser Chrome Header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 border-b border-slate-200 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div
                      className={`flex-1 max-w-sm mx-auto px-3 py-1 rounded-lg border text-[11px] font-mono text-center truncate transition-all duration-300 flex items-center justify-center gap-1.5 ${
                        isLiveSyncing
                          ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-500'
                      }`}
                    >
                      {isLiveSyncing && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
                      )}
                      <span>{slug ? `scanmysocial.com/p/${slug}` : 'scanmysocial.com/p/your-page'}</span>
                    </div>
                  </div>
                  {/* Desktop Viewport */}
                  <div className="h-[660px] bg-white overflow-hidden">
                    <ViewportIframe title="Desktop Viewport Preview">
                      <WebPageCanvas
                        webPage={dummyPreviewPage}
                        mode="preview"
                        className="scale-100"
                      />
                    </ViewportIframe>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
