'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import {
  getPost,
  refineScript,
  autoRefineScript,
  getScriptStatus,
} from '@/lib/api/contentLibraryService';
import type { ContentPostItem, GeneratedScriptData } from '@/types/contentLibrary';
import {
  ArrowLeft,
  Check,
  PenBox,
  ScrollText,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Copy,
  Lock,
} from 'lucide-react';

export default function ScriptRefinementPage() {
  const params = useParams();
  const id = params?.id as string;

  const [post, setPost] = useState<ContentPostItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [script, setScript] = useState<GeneratedScriptData | null>(null);
  const [title, setTitle] = useState('');
  const [revisedScript, setRevisedScript] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isRefining, setIsRefining] = useState(false);
  const [refineError, setRefineError] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  const lastSavedData = useRef({ title: '', revisedScript: '' });
  const statusPollRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getPost(id);
      setPost(data.post);

      const scripts = data.post.content_analysis?.generated_scripts || [];
      const latestScript = scripts.length > 0 ? scripts[scripts.length - 1] : null;

      if (latestScript) {
        setScript(latestScript);
        setTitle(latestScript.title || '');
        setRevisedScript(latestScript.revised_script || latestScript.script || '');
        lastSavedData.current = {
          title: latestScript.title || '',
          revisedScript: latestScript.revised_script || latestScript.script || '',
        };
      } else {
        // Fallback draft based on transcription or caption
        const defaultTitle = `Viral Reel Concept — @${data.post.owner_username}`;
        const defaultScript = data.post.content_analysis?.transcription || data.post.caption || '';
        setTitle(defaultTitle);
        setRevisedScript(defaultScript);
        lastSavedData.current = { title: defaultTitle, revisedScript: defaultScript };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load post for refinement.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
    return () => {
      if (statusPollRef.current) clearInterval(statusPollRef.current);
    };
  }, [loadData]);

  // Handle Manual & Auto Save
  const handleSave = useCallback(
    async (isManual: boolean = false) => {
      if (!script?.id) return;
      if (
        title === lastSavedData.current.title &&
        revisedScript === lastSavedData.current.revisedScript
      ) {
        return; // No changes to save
      }

      setSaveStatus('saving');
      try {
        await refineScript(script.id, {
          title: title.trim(),
          revised_script: revisedScript,
        });
        lastSavedData.current = { title, revisedScript };
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } catch {
        setSaveStatus('error');
      }
    },
    [script?.id, title, revisedScript]
  );

  // Auto-save every 15 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (script?.id && !isRefining) {
        handleSave(false);
      }
    }, 15000);
    return () => clearInterval(timer);
  }, [handleSave, script?.id, isRefining]);

  // Handle AI Auto-Refine
  const handleAutoRefine = async () => {
    if (!script?.id) return;
    setIsRefining(true);
    setRefineError(null);

    try {
      const res = await autoRefineScript(script.id);
      if (res.script?.revised_script) {
        setRevisedScript(res.script.revised_script);
        setTitle(res.script.title || title);
        lastSavedData.current = {
          title: res.script.title || title,
          revisedScript: res.script.revised_script,
        };
        setIsRefining(false);
        setSaveStatus('saved');
        return;
      }

      // Poll background refinement status
      statusPollRef.current = setInterval(async () => {
        try {
          const status = await getScriptStatus(script.id);
          if (status.status === 'completed' && status.script) {
            clearInterval(statusPollRef.current!);
            setRevisedScript(status.script.revised_script || status.script.script || '');
            if (status.script.title) setTitle(status.script.title);
            lastSavedData.current = {
              title: status.script.title || title,
              revisedScript: status.script.revised_script || status.script.script || '',
            };
            setIsRefining(false);
            setSaveStatus('saved');
          } else if (status.status === 'failed') {
            clearInterval(statusPollRef.current!);
            setIsRefining(false);
            setRefineError(status.error || 'AI refinement failed. Please try again.');
          }
        } catch {
          // Retry
        }
      }, 2500);
    } catch (err: unknown) {
      setIsRefining(false);
      setRefineError(err instanceof Error ? err.message : 'Refinement request failed.');
    }
  };

  const copyTranscript = () => {
    if (post?.content_analysis?.transcription) {
      navigator.clipboard.writeText(post.content_analysis.transcription);
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-16 animate-pulse">
        <div className="h-6 w-48 rounded bg-slate-200" />
        <div className="h-20 rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="h-[600px] rounded-2xl bg-slate-100" />
          <div className="h-[600px] rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 space-y-3">
          <AlertCircle size={32} className="mx-auto text-rose-500" />
          <h3 className="text-sm font-bold text-rose-900">Unable to load script workspace</h3>
          <p className="text-xs text-rose-600">{error || 'Post not found.'}</p>
          <Link href="/content-library/videos">
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Return to Videos
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const wordCount = revisedScript.trim() ? revisedScript.trim().split(/\s+/).length : 0;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Link href="/content-library/videos" className="hover:text-primary-600 transition-colors">
          Videos
        </Link>
        <span>/</span>
        <Link href={`/content-library/videos/${post.id}`} className="hover:text-primary-600 transition-colors">
          Post Details (#{post.id})
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-extrabold">Refine Script</span>
      </div>

      {/* 2. Page Action Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900">
              Refine Script{script?.id ? ` (v${script.id})` : ''}
            </h1>
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
                <RefreshCw size={10} className="animate-spin" /> Autosaving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <Check size={10} /> Saved
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            Craft your rewritten hook and revised script side-by-side with the competitor&apos;s original transcript.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/content-library/videos/${post.id}`}>
            <Button variant="outline" size="sm" icon={ArrowLeft}>
              Back to Post
            </Button>
          </Link>

          {script?.id && (
            <Button
              variant="outline"
              size="sm"
              icon={Sparkles}
              onClick={handleAutoRefine}
              disabled={isRefining}
            >
              {isRefining ? 'AI Refining...' : 'Auto-Refine with AI'}
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSave(true)}
            disabled={saveStatus === 'saving'}
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {refineError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{refineError}</span>
        </div>
      )}

      {/* 3. Split Screen Editor */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {/* Left Column: Original Context / Spoken Transcript */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-slate-400" />
              <div>
                <h2 className="text-xs font-black uppercase tracking-widest text-slate-600">
                  Original Spoken Transcript
                </h2>
                <p className="text-[11px] font-medium text-slate-400">
                  Source context from @{post.owner_username}
                </p>
              </div>
            </div>

            {post.content_analysis?.transcription && (
              <button
                type="button"
                onClick={copyTranscript}
                className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline"
              >
                {copiedTranscript ? (
                  <>
                    <Check size={12} className="text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="h-[520px] xl:h-[680px] overflow-y-auto p-5">
            {post.content_analysis?.transcription ? (
              <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                {post.content_analysis.transcription}
              </p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
                <Lock size={28} className="text-slate-300" />
                <p className="text-xs font-semibold">Audio transcript not unlocked on this post.</p>
                <Link href={`/content-library/videos/${post.id}`}>
                  <Button variant="outline" size="xs">
                    Unlock on Post Details
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Right Column: Editable Refined Script Draft */}
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs">
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PenBox className="h-4 w-4 text-primary-600" />
                <div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-primary-700">
                    Refined Script Workspace
                  </h2>
                  <p className="text-[11px] font-medium text-slate-500">
                    Editable draft tailored for your personal reel.
                  </p>
                </div>
              </div>

              {wordCount > 0 && (
                <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-black text-primary-700 border border-primary-200">
                  {wordCount} words (~{Math.max(1, Math.round(wordCount / 2.5))}s)
                </span>
              )}
            </div>

            {/* Title Input */}
            <div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a punchy working title..."
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-300 focus:border-primary-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div className="h-[460px] xl:h-[610px] p-4">
            <textarea
              value={revisedScript}
              onChange={(e) => setRevisedScript(e.target.value)}
              placeholder="Write your revised script draft here... Use hook formulas, personal stories, and strong calls-to-action."
              className="h-full w-full resize-none rounded-xl border border-primary-100 bg-slate-50/40 p-4 text-xs font-medium leading-relaxed text-slate-800 placeholder:text-slate-300 focus:bg-white focus:border-primary-500 focus:outline-hidden"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
