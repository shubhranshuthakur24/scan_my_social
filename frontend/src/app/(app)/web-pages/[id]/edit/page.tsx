'use client';

import React, { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  WebPage,
  WebPageThemeSettings,
  WebPageSection,
  WebPageThemePreset,
  WebPageAnalytics as AnalyticsType,
  getWebPage,
  updateWebPage,
  togglePublishWebPage,
  UpdateWebPagePayload,
} from '@/lib/api/webPagesService';
import { buildPublicCardUrl } from '@/lib/utils/publicUrl';
import WebPagesSkeleton from '@/components/web-pages/WebPagesSkeleton';
import WebPageCanvas from '@/components/web-pages/WebPageCanvas';
import WebPageBuilder from '@/components/web-pages/WebPageBuilder';
import WebPageAnalytics from '@/components/web-pages/WebPageAnalytics';
import {
  ArrowLeft,
  Save,
  Eye,
  Copy,
  Check,
  Power,
  Smartphone,
  Monitor,
  Layout,
  Palette,
  Settings as SettingsIcon,
  BarChart3,
  AlertCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface EditPageProps {
  params: Promise<{ id: string }>;
}

export default function WebPageEditPage({ params }: EditPageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const pageId = parseInt(resolvedParams.id, 10);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'content' | 'style' | 'settings' | 'insights'>('content');
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');

  // Page data
  const [webPage, setWebPage] = useState<WebPage | null>(null);
  const [themePresets, setThemePresets] = useState<WebPageThemePreset[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsType | null>(null);

  // Editable fields
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [sections, setSections] = useState<WebPageSection[]>([]);
  const [themeSettings, setThemeSettings] = useState<WebPageThemeSettings>({});
  const [isPublished, setIsPublished] = useState(false);

  const [copiedLink, setCopiedLink] = useState(false);

  // Confirmation Modals
  const [showBackConfirm, setShowBackConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  // Baseline Snapshot for Dirty Tracking
  const [initialBaseline, setInitialBaseline] = useState<string | null>(null);

  const computeSnapshot = useCallback((data: {
    title: string;
    slug: string;
    description: string;
    sections: WebPageSection[];
    theme_settings: WebPageThemeSettings;
  }) => {
    return JSON.stringify({
      title: data.title.trim(),
      slug: data.slug.trim(),
      description: data.description.trim(),
      sections: data.sections,
      theme_settings: data.theme_settings,
    });
  }, []);

  const currentSnapshot = computeSnapshot({
    title,
    slug,
    description,
    sections,
    theme_settings: themeSettings,
  });

  const isDirty = initialBaseline !== null && initialBaseline !== currentSnapshot;

  const loadPageData = useCallback(() => {
    getWebPage(pageId)
      .then((res) => {
        setWebPage(res.web_page);
        setThemePresets(res.theme_presets);
        setAnalytics(res.analytics);

        // Sync local state
        const initialTitle = res.web_page.title;
        const initialSlug = res.web_page.slug;
        const initialDesc = res.web_page.description || '';
        const initialSecs = res.web_page.sections || [];
        const initialTheme = res.web_page.theme_settings || {};

        setTitle(initialTitle);
        setSlug(initialSlug);
        setDescription(initialDesc);
        setSections(initialSecs);
        setThemeSettings(initialTheme);
        setIsPublished(Boolean(res.web_page.is_published));

        setInitialBaseline(computeSnapshot({
          title: initialTitle,
          slug: initialSlug,
          description: initialDesc,
          sections: initialSecs,
          theme_settings: initialTheme,
        }));

        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load page');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [pageId, computeSnapshot]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  // BeforeUnload browser guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleCopyLink = () => {
    if (!webPage?.public_url) return;
    const fullUrl = buildPublicCardUrl(webPage.public_url);
    navigator.clipboard.writeText(fullUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSave = async (): Promise<boolean> => {
    if (!title.trim()) {
      setError('Title cannot be blank.');
      return false;
    }

    setIsSaving(true);
    setError(null);
    setSuccessNotice(null);

    const payload: UpdateWebPagePayload = {
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      sections,
      theme_settings: themeSettings,
      is_published: isPublished,
    };

    try {
      const res = await updateWebPage(pageId, payload);
      setWebPage(res.web_page);

      // Refresh baseline snapshot
      setInitialBaseline(computeSnapshot({
        title: res.web_page.title,
        slug: res.web_page.slug,
        description: res.web_page.description || '',
        sections: res.web_page.sections || [],
        theme_settings: res.web_page.theme_settings || {},
      }));

      setSuccessNotice('Page saved successfully.');
      setTimeout(() => setSuccessNotice(null), 3000);
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save web page');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const handleFullPreview = async () => {
    if (isDirty) {
      setIsPreviewLoading(true);
      const saved = await handleSave();
      setIsPreviewLoading(false);
      if (!saved) return;
    }
    window.open(`/web-pages/${pageId}/preview`, '_blank');
  };

  const executeTogglePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await togglePublishWebPage(pageId);
      setIsPublished(res.is_published);
      if (webPage) {
        setWebPage({ ...webPage, is_published: res.is_published, published_at: res.published_at });
      }
      setSuccessNotice(res.is_published ? 'Page is now LIVE!' : 'Page unpublished (Draft).');
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update publishing status');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleTogglePublish = async () => {
    if (isPublished) {
      // Unpublishing safety confirmation
      setShowUnpublishConfirm(true);
      return;
    }

    // If publishing and dirty, save changes first so stale data is never published
    if (isDirty) {
      setIsPublishing(true);
      const saved = await handleSave();
      if (!saved) {
        setIsPublishing(false);
        return;
      }
    }

    await executeTogglePublish();
  };

  const handleApplyPreset = (preset: WebPageThemePreset) => {
    setThemeSettings((prev) => ({
      ...prev,
      ...preset.settings,
    }));
  };

  const handleBackNavigation = () => {
    if (isDirty) {
      setShowBackConfirm(true);
    } else {
      router.push('/web-pages');
    }
  };

  // Loading Screen
  if (isLoading) {
    return <WebPagesSkeleton />;
  }

  // Load Failure Screen with Retry and Back buttons
  if (error && !webPage) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200/80 shadow-sm text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle size={24} />
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-black text-slate-900">Failed to Load Web Page</h2>
          <p className="text-xs text-slate-500 font-medium">{error}</p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/web-pages">
            <Button variant="outline" size="sm">Back to Web Pages</Button>
          </Link>
          <Button variant="primary" size="sm" onClick={loadPageData} className="gap-1.5">
            <RotateCcw size={14} />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    );
  }

  if (!webPage) {
    return <WebPagesSkeleton />;
  }

  // Live preview representation
  const livePreviewState: WebPage = {
    ...webPage,
    title,
    slug,
    description,
    sections,
    theme_settings: themeSettings,
    is_published: isPublished,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="p-2 min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition shrink-0"
            aria-label="Back to Web Pages"
            title="Back to Web Pages"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="truncate">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black text-slate-900 truncate">
                {title || 'Untitled Page'}
              </h1>
              <Badge variant={isPublished ? 'success' : 'subtle'} className="capitalize shadow-2xs font-extrabold text-[10px]">
                {isPublished ? 'Live' : 'Draft'}
              </Badge>
              {isDirty && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                  Unsaved edits
                </span>
              )}
            </div>
            <p className="text-[11px] font-mono text-slate-400 font-bold truncate">
              /@{webPage.user?.username || 'user'}/pages/{slug}
            </p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {webPage.public_url && isPublished && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] sm:min-h-[36px] rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              title="Copy Public Link"
            >
              {copiedLink ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copiedLink ? 'Copied' : 'Copy URL'}</span>
            </button>
          )}

          <Button
            id="full-preview-button"
            variant="outline"
            size="sm"
            onClick={handleFullPreview}
            disabled={isSaving || isPreviewLoading}
            className="gap-1.5 shadow-2xs min-h-[44px] sm:min-h-[36px] px-3.5"
            title={isDirty ? 'Saves edits and opens preview in new tab' : 'Open live preview in new tab'}
          >
            <Eye size={13} />
            <span>{isPreviewLoading ? 'Saving...' : 'Full Preview'}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isSaving || isPublishing}
            onClick={handleTogglePublish}
            className={`gap-1.5 min-h-[44px] sm:min-h-[36px] px-3.5 font-extrabold transition ${
              isPublished
                ? 'text-emerald-700 bg-emerald-50/70 border border-emerald-200 hover:bg-emerald-100'
                : 'text-slate-600 bg-slate-100 border border-slate-200 hover:bg-slate-200'
            }`}
          >
            <Power size={12} className={isPublished ? 'text-emerald-600' : 'text-slate-400'} />
            <span>{isPublishing ? 'Updating...' : isPublished ? 'Published' : 'Publish'}</span>
          </Button>

          <Button
            id="save-changes-button"
            variant="primary"
            size="sm"
            disabled={isSaving || isPublishing}
            onClick={() => handleSave()}
            className="gap-1.5 shadow-xs min-h-[44px] sm:min-h-[36px] px-3.5"
          >
            <Save size={13} />
            <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
          <AlertCircle size={15} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
          <Check size={15} className="text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/70 shadow-2xs max-w-full overflow-x-auto scrollbar-none">
        <button
          id="tab-content"
          type="button"
          onClick={() => setActiveTab('content')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'content'
              ? 'bg-white text-primary-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layout size={14} />
          <span>Content ({sections.length})</span>
        </button>

        <button
          id="tab-style"
          type="button"
          onClick={() => setActiveTab('style')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'style'
              ? 'bg-white text-primary-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Palette size={14} />
          <span>Theme & Style</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'settings'
              ? 'bg-white text-primary-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <SettingsIcon size={14} />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('insights')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition ${
            activeTab === 'insights'
              ? 'bg-white text-primary-700 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 size={14} />
          <span>Insights</span>
        </button>
      </div>

      {/* Mobile Editor / Preview Switcher (< lg) */}
      {activeTab !== 'insights' && (
        <div
          role="tablist"
          aria-label="Editor view mode"
          className="flex lg:hidden items-center p-1 bg-slate-100/90 rounded-2xl border border-slate-200/80 shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            id="tab-editor"
            aria-selected={mobileView === 'editor'}
            aria-controls="panel-editor"
            tabIndex={mobileView === 'editor' ? 0 : -1}
            onClick={() => setMobileView('editor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 min-h-[44px] rounded-xl text-xs font-black transition ${
              mobileView === 'editor'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layout size={15} />
            <span>Editor Controls</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-preview"
            aria-selected={mobileView === 'preview'}
            aria-controls="panel-preview"
            tabIndex={mobileView === 'preview' ? 0 : -1}
            onClick={() => setMobileView('preview')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 min-h-[44px] rounded-xl text-xs font-black transition ${
              mobileView === 'preview'
                ? 'bg-white text-primary-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Eye size={15} />
            <span>Live Preview</span>
          </button>
        </div>
      )}

      {/* Main Tab Views & Split Canvas */}
      {activeTab === 'insights' && analytics ? (
        <WebPageAnalytics analytics={analytics} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column Editor (5 cols on lg, toggle on mobile) */}
          <div
            role="tabpanel"
            id="panel-editor"
            aria-labelledby="tab-editor"
            className={`lg:col-span-5 space-y-6 ${mobileView === 'editor' ? 'block' : 'hidden lg:block'}`}
          >
            {activeTab === 'content' && (
              <WebPageBuilder sections={sections} onChange={setSections} />
            )}

            {activeTab === 'style' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-6">
                {/* 1. Theme Presets */}
                <div className="space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Theme Presets
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {themePresets.map((preset) => {
                      const isCurrent = themeSettings.theme_key === preset.key;
                      return (
                        <button
                          key={preset.key}
                          type="button"
                          onClick={() => handleApplyPreset(preset)}
                          className={`p-3 rounded-xl border text-left flex items-center justify-between transition ${
                            isCurrent
                              ? 'border-primary-600 bg-primary-50/50 shadow-2xs font-extrabold text-primary-900'
                              : 'border-slate-200 hover:bg-slate-50 text-slate-700 font-bold'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                              style={{ backgroundColor: preset.settings?.accent_color || '#ef4444' }}
                            />
                            <span className="text-xs truncate">{preset.label}</span>
                          </div>
                          {isCurrent && <Check size={12} className="text-primary-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Color Overrides */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                    Custom Color Palette
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label htmlFor="web-page-theme-background-color" className="block text-[10px] font-black uppercase text-slate-400 mb-1 cursor-pointer">
                        Background
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-white">
                        <input
                          id="web-page-theme-background-color"
                          type="color"
                          value={themeSettings.background_color || '#f8fafc'}
                          onChange={(e) =>
                            setThemeSettings((prev) => ({ ...prev, background_color: e.target.value }))
                          }
                          className="w-6 h-6 rounded cursor-pointer border-0"
                        />
                        <span className="font-mono text-xs">{themeSettings.background_color || '#f8fafc'}</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="web-page-theme-accent-color" className="block text-[10px] font-black uppercase text-slate-400 mb-1 cursor-pointer">
                        Accent Color
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-white">
                        <input
                          id="web-page-theme-accent-color"
                          type="color"
                          value={themeSettings.accent_color || '#ef4444'}
                          onChange={(e) =>
                            setThemeSettings((prev) => ({ ...prev, accent_color: e.target.value }))
                          }
                          className="w-6 h-6 rounded cursor-pointer border-0"
                        />
                        <span className="font-mono text-xs">{themeSettings.accent_color || '#ef4444'}</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="web-page-theme-surface-color" className="block text-[10px] font-black uppercase text-slate-400 mb-1 cursor-pointer">
                        Surface (Cards)
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-white">
                        <input
                          id="web-page-theme-surface-color"
                          type="color"
                          value={themeSettings.surface_color || '#ffffff'}
                          onChange={(e) =>
                            setThemeSettings((prev) => ({ ...prev, surface_color: e.target.value }))
                          }
                          className="w-6 h-6 rounded cursor-pointer border-0"
                        />
                        <span className="font-mono text-xs">{themeSettings.surface_color || '#ffffff'}</span>
                      </div>
                    </div>

                    <div>
                      <label htmlFor="web-page-theme-text-color" className="block text-[10px] font-black uppercase text-slate-400 mb-1 cursor-pointer">
                        Text Color
                      </label>
                      <div className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-200 bg-white">
                        <input
                          id="web-page-theme-text-color"
                          type="color"
                          value={themeSettings.text_color || '#0f172a'}
                          onChange={(e) =>
                            setThemeSettings((prev) => ({ ...prev, text_color: e.target.value }))
                          }
                          className="w-6 h-6 rounded cursor-pointer border-0"
                        />
                        <span className="font-mono text-xs">{themeSettings.text_color || '#0f172a'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Button, Radius & Typography */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Button Style
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['rounded', 'pill', 'sharp'] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setThemeSettings((prev) => ({ ...prev, button_style: style }))}
                          className={`py-2 px-3 text-xs font-bold capitalize border transition ${
                            themeSettings.button_style === style
                              ? 'border-primary-600 bg-primary-50 text-primary-900 font-extrabold'
                              : 'border-slate-200 text-slate-600'
                          } ${style === 'pill' ? 'rounded-full' : style === 'sharp' ? 'rounded-none' : 'rounded-xl'}`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>


                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5">
                      Typography Font
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setThemeSettings((prev) => ({ ...prev, font_style: 'sans' }))}
                        className={`py-2 px-3 text-xs font-sans border rounded-xl transition ${
                          themeSettings.font_style !== 'serif'
                            ? 'border-primary-600 bg-primary-50 text-primary-900 font-black'
                            : 'border-slate-200 text-slate-600 font-bold'
                        }`}
                      >
                        Modern Sans-Serif
                      </button>
                      <button
                        type="button"
                        onClick={() => setThemeSettings((prev) => ({ ...prev, font_style: 'serif' }))}
                        className={`py-2 px-3 text-xs font-serif border rounded-xl transition ${
                          themeSettings.font_style === 'serif'
                            ? 'border-primary-600 bg-primary-50 text-primary-900 font-black'
                            : 'border-slate-200 text-slate-600 font-bold'
                        }`}
                      >
                        Editorial Serif
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-2xs space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 pb-2 border-b border-slate-100">
                  General & URL Settings
                </h3>

                <div>
                  <label htmlFor="web-page-title" className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
                    Page Title *
                  </label>
                  <input
                    id="web-page-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-xs font-bold p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>

                <div>
                  <label htmlFor="web-page-slug" className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
                    URL Slug *
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden text-xs">
                    <span className="px-3 text-slate-400 font-mono font-bold select-none border-r border-slate-200">
                      /@{webPage.user?.username || 'you'}/pages/
                    </span>
                    <input
                      id="web-page-slug"
                      type="text"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="flex-1 p-3 bg-transparent font-mono font-bold outline-none text-slate-900"
                    />
                  </div>
                  {isPublished && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                      <span>Warning: Changing the slug will permanently break previously distributed URLs.</span>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="web-page-meta-description" className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5 cursor-pointer">
                    Meta Description (SEO)
                  </label>
                  <textarea
                    id="web-page-meta-description"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short summary for search engines and social cards..."
                    className="w-full text-xs p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500/20 outline-none"
                  />
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Publishing Status</span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {isPublished ? 'Live on public URL' : 'Draft only visible to you'}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isSaving || isPublishing}
                    onClick={handleTogglePublish}
                    className={`min-h-[36px] font-black transition ${
                      isPublished
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {isPublishing ? 'Updating...' : isPublished ? 'Published' : 'Draft'}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column Canvas Live Preview (7 cols on lg, toggle on mobile) */}
          <div
            role="tabpanel"
            id="panel-preview"
            aria-labelledby="tab-preview"
            className={`lg:col-span-7 space-y-3 sticky top-6 ${mobileView === 'preview' ? 'block' : 'hidden lg:block'}`}
          >
            <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Eye size={14} className="text-primary-600" />
                <span>Real-Time Canvas</span>
              </span>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDeviceMode('desktop')}
                  className={`p-1.5 rounded-lg transition ${
                    deviceMode === 'desktop' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'
                  }`}
                  title="Desktop Preview"
                >
                  <Monitor size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceMode('mobile')}
                  className={`p-1.5 rounded-lg transition ${
                    deviceMode === 'mobile' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-400'
                  }`}
                  title="Mobile Preview"
                >
                  <Smartphone size={14} />
                </button>
              </div>
            </div>

            <div className="flex justify-center bg-slate-200/60 p-4 rounded-3xl border border-slate-300/60 overflow-hidden min-h-[550px]">
              <div
                className={`transition-all duration-300 shadow-xl overflow-hidden rounded-2xl ${
                  deviceMode === 'mobile'
                    ? 'w-[375px] max-w-full border-8 border-slate-800'
                    : 'w-full'
                }`}
              >
                <WebPageCanvas
                  webPage={livePreviewState}
                  mode="preview"
                  className="scale-100"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsaved Changes Guard Modal */}
      <ConfirmModal
        isOpen={showBackConfirm}
        onClose={() => setShowBackConfirm(false)}
        onConfirm={() => {
          setShowBackConfirm(false);
          router.push('/web-pages');
        }}
        title="Discard Unsaved Changes?"
        description="You have unsaved edits on this page. If you leave now, your modifications will be permanently discarded."
        confirmText="Discard and Leave"
        cancelText="Keep Editing"
        variant="warning"
      />

      {/* Unpublish Safety Modal */}
      <ConfirmModal
        isOpen={showUnpublishConfirm}
        onClose={() => setShowUnpublishConfirm(false)}
        onConfirm={async () => {
          setShowUnpublishConfirm(false);
          await executeTogglePublish();
        }}
        title="Unpublish Web Page?"
        description="Taking this page offline will return it to Draft status. Anyone visiting your public link will no longer see your page."
        confirmText="Unpublish Page"
        cancelText="Keep Live"
        variant="warning"
        isLoading={isPublishing}
      />
    </div>
  );
}
