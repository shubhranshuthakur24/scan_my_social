'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/ui/PageHeader';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import AddToProjectModal from '@/components/content-library/AddToProjectModal';
import {
  getPost,
  transcribePost,
  getTranscriptionStatus,
  analyzePost,
  getAnalysisStatus,
} from '@/lib/api/contentLibraryService';
import { formatNumber } from '@/lib/format';
import type { ContentPostItem, ContentAnalysisData } from '@/types/contentLibrary';
import {
  ArrowLeft,
  Flame,
  TrendingUp,
  ExternalLink,
  Eye,
  Heart,
  MessageCircle,
  Copy,
  Check,
  Headphones,
  Sparkles,
  PenTool,
  FolderPlus,
  Clock,
  Zap,
  Target,
  Brain,
  Layers,
  Activity,
  Compass,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export type AsyncProcessStatus = 'idle' | 'queued' | 'processing' | 'completed' | 'failed';

export const isAsyncProcessStatus = (value: unknown): value is AsyncProcessStatus =>
  value === 'idle' ||
  value === 'queued' ||
  value === 'processing' ||
  value === 'completed' ||
  value === 'failed';

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [post, setPost] = useState<ContentPostItem | null>(null);
  const [hasTranscription, setHasTranscription] = useState(false);
  const [hasAnalysis, setHasAnalysis] = useState(false);
  const [analysisData, setAnalysisData] = useState<ContentAnalysisData | null>(null);
  const [transcriptText, setTranscriptText] = useState<string>('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Transcription State
  const [transcribeLoading, setTranscribeLoading] = useState(false);
  const [transcribeStatus, setTranscribeStatus] = useState<AsyncProcessStatus>('idle');
  const [transcribeError, setTranscribeError] = useState<string | null>(null);

  // Analysis State
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisStatusState, setAnalysisStatusState] = useState<AsyncProcessStatus>('idle');
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Copy feedback
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  // Project Modal
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);

  // Polling Refs (Timer + Operation Token + Post ID)
  const transcribePollRef = useRef<NodeJS.Timeout | null>(null);
  const transcribePollTokenRef = useRef<number>(0);
  const transcribePollingPostIdRef = useRef<number | null>(null);

  const analysisPollRef = useRef<NodeJS.Timeout | null>(null);
  const analysisPollTokenRef = useRef<number>(0);
  const analysisPollingPostIdRef = useRef<number | null>(null);

  // Authoritative State Tracking Refs for Bootstrap (prevents dependency loops)
  const hasTranscriptionRef = useRef(hasTranscription);
  hasTranscriptionRef.current = hasTranscription;

  const transcriptTextRef = useRef(transcriptText);
  transcriptTextRef.current = transcriptText;

  const hasAnalysisRef = useRef(hasAnalysis);
  hasAnalysisRef.current = hasAnalysis;

  // --- LAYER 1: PURE DATA FETCHER ---
  const loadPost = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getPost(id);
      setPost(data.post);
      setHasTranscription(Boolean(data.user_has_transcription));
      setHasAnalysis(Boolean(data.user_has_analysis));
      setAnalysisData(data.post.content_analysis || null);
      setTranscriptText(data.post.content_analysis?.transcription || '');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load video details.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // --- LAYER 3: DEDICATED POLLING CONTROLLERS WITH TOKEN INVALIDATION ---
  const stopTranscriptionPolling = useCallback(() => {
    transcribePollTokenRef.current++;
    if (transcribePollRef.current) {
      clearInterval(transcribePollRef.current);
      transcribePollRef.current = null;
    }
    transcribePollingPostIdRef.current = null;
  }, []);

  const stopAnalysisPolling = useCallback(() => {
    analysisPollTokenRef.current++;
    if (analysisPollRef.current) {
      clearInterval(analysisPollRef.current);
      analysisPollRef.current = null;
    }
    analysisPollingPostIdRef.current = null;
  }, []);

  const startTranscriptionPolling = useCallback(
    (postId: number, initialStatus: AsyncProcessStatus = 'queued') => {
      // Idempotency: if already polling this exact post, do not spawn competing timer
      if (transcribePollRef.current) {
        if (transcribePollingPostIdRef.current === postId) {
          return;
        }
        stopTranscriptionPolling();
      }

      transcribePollingPostIdRef.current = postId;
      const currentToken = ++transcribePollTokenRef.current;

      setTranscribeError(null);
      setTranscribeStatus(initialStatus);
      setTranscribeLoading(false);

      transcribePollRef.current = setInterval(async () => {
        try {
          const res = await getTranscriptionStatus(postId);

          // Verification guard: discard if token incremented or post changed
          if (
            currentToken !== transcribePollTokenRef.current ||
            transcribePollingPostIdRef.current !== postId
          ) {
            return;
          }

          const nextStatus = isAsyncProcessStatus(res.status) ? res.status : 'idle';

          if (nextStatus === 'completed') {
            stopTranscriptionPolling();
            if (res.transcription) {
              setTranscriptText(res.transcription);
              setHasTranscription(true);
              setTranscribeStatus('completed');
              setTranscribeLoading(false);
              setTranscribeError(null);
            } else {
              // Fall back to full post reload if payload omitted
              await loadPost();
            }
          } else if (nextStatus === 'failed') {
            stopTranscriptionPolling();
            setTranscribeError(res.error || 'Audio transcription failed.');
            setTranscribeStatus('failed');
            setTranscribeLoading(false);
          } else if (nextStatus === 'queued' || nextStatus === 'processing') {
            setTranscribeStatus(nextStatus);
          }
        } catch {
          // Transient network failure; retry on next tick
        }
      }, 2500);
    },
    [stopTranscriptionPolling, loadPost]
  );

  const startAnalysisPolling = useCallback(
    (postId: number, initialStatus: AsyncProcessStatus = 'queued') => {
      // Idempotency: if already polling this exact post, do not spawn competing timer
      if (analysisPollRef.current) {
        if (analysisPollingPostIdRef.current === postId) {
          return;
        }
        stopAnalysisPolling();
      }

      analysisPollingPostIdRef.current = postId;
      const currentToken = ++analysisPollTokenRef.current;

      setAnalysisError(null);
      setAnalysisStatusState(initialStatus);
      setAnalysisLoading(false);

      analysisPollRef.current = setInterval(async () => {
        try {
          const res = await getAnalysisStatus(postId);

          // Verification guard: discard if token incremented or post changed
          if (
            currentToken !== analysisPollTokenRef.current ||
            analysisPollingPostIdRef.current !== postId
          ) {
            return;
          }

          const nextStatus = isAsyncProcessStatus(res.status) ? res.status : 'idle';

          if (nextStatus === 'completed') {
            stopAnalysisPolling();
            if (res.analysis) {
              setAnalysisData(res.analysis as unknown as ContentAnalysisData);
              setHasAnalysis(true);
              setAnalysisStatusState('completed');
              setAnalysisLoading(false);
              setAnalysisError(null);
            } else {
              // Fall back to full post reload if payload omitted
              await loadPost();
            }
          } else if (nextStatus === 'failed') {
            stopAnalysisPolling();
            setAnalysisError(res.error || 'Strategic analysis failed.');
            setAnalysisStatusState('failed');
            setAnalysisLoading(false);
          } else if (nextStatus === 'queued' || nextStatus === 'processing') {
            setAnalysisStatusState(nextStatus);
          }
        } catch {
          // Transient network failure; retry on next tick
        }
      }, 2500);
    },
    [stopAnalysisPolling, loadPost]
  );

  // Initial Post Load
  useEffect(() => {
    loadPost();
  }, [loadPost]);

  // Teardown Polling Intervals on Post Change or Component Unmount
  useEffect(() => {
    return () => {
      stopTranscriptionPolling();
      stopAnalysisPolling();
    };
  }, [post?.id, stopTranscriptionPolling, stopAnalysisPolling]);

  // --- LAYER 2: STATUS BOOTSTRAP (MOUNT / POST-LOAD SENTINEL) ---
  useEffect(() => {
    if (!post || loading) return;

    let cancelled = false;
    const currentPostId = post.id;

    const runBootstrap = async () => {
      // 1. Transcription Bootstrap if not already unlocked
      if (!hasTranscriptionRef.current && !transcriptTextRef.current) {
        try {
          const res = await getTranscriptionStatus(currentPostId);
          if (cancelled) return;

          const currentStatus = isAsyncProcessStatus(res.status) ? res.status : 'idle';
          if (currentStatus === 'completed') {
            if (res.transcription) {
              setTranscriptText(res.transcription);
              setHasTranscription(true);
              setTranscribeStatus('completed');
              stopTranscriptionPolling();
            } else {
              await loadPost();
            }
          } else if (currentStatus === 'queued' || currentStatus === 'processing') {
            setTranscribeError(null);
            startTranscriptionPolling(currentPostId, currentStatus);
          }
        } catch {
          // Status check failed gracefully; user retains manual action button
        }
      }

      // 2. Analysis Bootstrap if not already unlocked
      if (!hasAnalysisRef.current) {
        try {
          const res = await getAnalysisStatus(currentPostId);
          if (cancelled) return;

          const currentStatus = isAsyncProcessStatus(res.status) ? res.status : 'idle';
          if (currentStatus === 'completed') {
            if (res.analysis) {
              setAnalysisData(res.analysis as unknown as ContentAnalysisData);
              setHasAnalysis(true);
              setAnalysisStatusState('completed');
              stopAnalysisPolling();
            } else {
              await loadPost();
            }
          } else if (currentStatus === 'queued' || currentStatus === 'processing') {
            setAnalysisError(null);
            startAnalysisPolling(currentPostId, currentStatus);
          }
        } catch {
          // Status check failed gracefully
        }
      }
    };

    runBootstrap();

    return () => {
      cancelled = true;
    };
  }, [
    post?.id,
    loading,
    loadPost,
    startTranscriptionPolling,
    stopTranscriptionPolling,
    startAnalysisPolling,
    stopAnalysisPolling,
  ]);

  // --- USER INTERACTION HANDLERS ---
  const handleStartTranscription = async () => {
    if (!post) return;
    setTranscribeLoading(true);
    setTranscribeError(null);

    try {
      const res = await transcribePost(post.id);
      if (res.status === 'completed' && res.transcription) {
        setHasTranscription(true);
        setTranscriptText(res.transcription);
        setTranscribeStatus('completed');
        setTranscribeLoading(false);
        stopTranscriptionPolling();
        return;
      }

      const initialStatus: AsyncProcessStatus = isAsyncProcessStatus(res.status)
        ? res.status
        : 'queued';
      stopTranscriptionPolling();
      startTranscriptionPolling(post.id, initialStatus);
    } catch (err: unknown) {
      setTranscribeError(err instanceof Error ? err.message : 'Transcription request failed.');
      setTranscribeLoading(false);
    }
  };

  const handleStartAnalysis = async () => {
    if (!post) return;
    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const res = await analyzePost(post.id);
      if (res.status === 'completed' && res.analysis) {
        setHasAnalysis(true);
        setAnalysisData(res.analysis as unknown as ContentAnalysisData);
        setAnalysisStatusState('completed');
        setAnalysisLoading(false);
        stopAnalysisPolling();
        return;
      }

      const initialStatus: AsyncProcessStatus = isAsyncProcessStatus(res.status)
        ? res.status
        : 'queued';
      stopAnalysisPolling();
      startAnalysisPolling(post.id, initialStatus);
    } catch (err: unknown) {
      setAnalysisError(err instanceof Error ? err.message : 'Analysis request failed.');
      setAnalysisLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'caption' | 'transcript') => {
    navigator.clipboard.writeText(text);
    if (type === 'caption') {
      setCopiedCaption(true);
      setTimeout(() => setCopiedCaption(false), 2000);
    } else {
      setCopiedTranscript(true);
      setTimeout(() => setCopiedTranscript(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-16">
        <div className="h-6 w-48 rounded-lg bg-slate-200" />
        <div className="h-20 rounded-2xl bg-slate-100" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-4">
            <div className="aspect-[4/5] rounded-2xl bg-slate-200" />
            <div className="h-32 rounded-2xl bg-slate-100" />
          </div>
          <div className="lg:col-span-7 space-y-4">
            <div className="h-64 rounded-2xl bg-slate-100" />
            <div className="h-80 rounded-2xl bg-slate-100" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto py-12 text-center">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 space-y-4">
          <AlertCircle size={36} className="mx-auto text-rose-500" />
          <h2 className="text-base font-black text-rose-900">Post Unavailable</h2>
          <p className="text-xs text-rose-600 font-medium">
            {error || 'The requested competitor video could not be loaded.'}
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link href="/content-library/videos">
              <Button variant="outline" size="sm" icon={ArrowLeft}>
                Back to Content Library
              </Button>
            </Link>
            <Button variant="primary" size="sm" onClick={loadPost}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isOutlier = post.breakout_multiplier && post.breakout_multiplier >= 2.0;
  const engagementText = post.engagement_rate
    ? `${(Number(post.engagement_rate) * (post.engagement_rate <= 1 ? 100 : 1)).toFixed(1)}%`
    : '0.0%';

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Breadcrumbs */}
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
        <Link href="/content-library/videos" className="hover:text-primary-600 transition-colors">
          Videos
        </Link>
        <span>/</span>
        <span className="text-slate-900">@{post.owner_username}</span>
        <span>/</span>
        <span className="text-slate-400">Post #{post.id}</span>
      </div>

      {/* 2. Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs">
        <div className="flex items-center gap-3.5">
          {post.channel?.profile_image_url ? (
            <img
              src={post.channel.profile_image_url}
              alt={post.owner_username}
              className="h-12 w-12 rounded-full object-cover ring-2 ring-primary-100"
            />
          ) : (
            <div className="h-12 w-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
              @{post.owner_username.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-slate-900">@{post.owner_username}</h1>
              {isOutlier && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2.5 py-0.5 text-[10px] font-black text-white shadow-2xs">
                  <Flame size={12} className="fill-white" />
                  <span>{Number(post.breakout_multiplier).toFixed(1)}x Outlier</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              Platform: <span className="capitalize font-bold text-slate-600">{post.platform}</span> • Posted{' '}
              {new Date(post.post_timestamp).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Global Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {post.url && (
            <a
              href={post.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              <ExternalLink size={14} />
              <span>Instagram</span>
            </a>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={FolderPlus}
            onClick={() => setIsProjectModalOpen(true)}
          >
            Save to Board
          </Button>

          <Link href={`/content-library/videos/${post.id}/refine`}>
            <Button
              variant="primary"
              size="sm"
              icon={PenTool}
            >
              Refine Script
            </Button>
          </Link>
        </div>
      </div>

      {/* 3. Main Split Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Media Preview & Post Performance (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Video / Image Display */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 shadow-sm relative aspect-[4/5] flex items-center justify-center">
            {post.video_url ? (
              <video
                src={post.video_url}
                controls
                playsInline
                poster={post.display_url || post.url}
                className="h-full w-full object-cover"
              />
            ) : (
              <img
                src={post.display_url || post.url}
                alt={post.caption}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Performance KPIs Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">
              Performance Intelligence
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <Eye size={14} className="text-primary-600" />
                  <span>Views Count</span>
                </div>
                <p className="text-base font-black text-slate-900 mt-1">
                  {formatNumber(post.video_view_count ?? post.video_play_count ?? 0)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <Heart size={14} className="text-rose-500" />
                  <span>Likes</span>
                </div>
                <p className="text-base font-black text-slate-900 mt-1">
                  {formatNumber(post.likes_count || 0)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <MessageCircle size={14} className="text-blue-500" />
                  <span>Comments</span>
                </div>
                <p className="text-base font-black text-slate-900 mt-1">
                  {formatNumber(post.comments_count || 0)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-100">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500">
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span>Engagement</span>
                </div>
                <p className="text-base font-black text-primary-700 mt-1">{engagementText}</p>
              </div>
            </div>

            {/* Outlier baseline comparison */}
            {post.breakout_multiplier && (
              <div className="rounded-xl bg-primary-50/70 border border-primary-200/80 p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Flame size={16} className="text-primary-600" />
                  <span className="text-xs font-bold text-primary-900">Breakout Multiplier</span>
                </div>
                <span className="text-xs font-black text-primary-700">
                  {Number(post.breakout_multiplier).toFixed(2)}x channel baseline
                </span>
              </div>
            )}
          </div>

          {/* Caption & Hashtags Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Original Caption</h3>
              <button
                type="button"
                onClick={() => copyToClipboard(post.caption, 'caption')}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-600 hover:underline"
              >
                {copiedCaption ? (
                  <>
                    <Check size={12} className="text-emerald-600" />
                    <span className="text-emerald-600">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Caption</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap">
              {post.caption || 'No caption provided.'}
            </p>
          </div>
        </div>

        {/* RIGHT COLUMN: Transcription & AI Strategic Hook Analysis (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* SECTION A: Audio Transcript Intelligence */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Headphones size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">Audio Spoken Transcript</h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    High-fidelity AI transcription extracted directly from video audio.
                  </p>
                </div>
              </div>

              {hasTranscription && transcriptText && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(transcriptText, 'transcript')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary-600 hover:underline"
                >
                  {copiedTranscript ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span className="text-emerald-600">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Transcript</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Transcript State Handling */}
            {hasTranscription && transcriptText ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 max-h-72 overflow-y-auto">
                <p className="text-xs font-medium text-slate-700 leading-relaxed whitespace-pre-wrap font-mono">
                  {transcriptText}
                </p>
              </div>
            ) : transcribeLoading || transcribeStatus === 'processing' || transcribeStatus === 'queued' ? (
              <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-6 text-center space-y-3">
                <RefreshCw size={24} className="mx-auto text-primary-600 animate-spin" />
                <h4 className="text-xs font-bold text-primary-900">
                  {transcribeStatus === 'queued'
                    ? 'Transcription Queued'
                    : 'Transcribing Audio...'}
                </h4>
                <p className="text-[11px] text-primary-700 max-w-sm mx-auto">
                  {transcribeStatus === 'queued'
                    ? 'Audio is waiting in the transcription queue.'
                    : "We're extracting and transcribing the audio. This usually takes a few seconds."}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-3">
                <Headphones size={28} className="mx-auto text-slate-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Transcript Not Unlocked Yet</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                    Extract the word-for-word spoken audio transcript to analyze the script and unlock AI hooks.
                  </p>
                </div>
                {transcribeError && (
                  <p className="text-xs font-bold text-rose-600">{transcribeError}</p>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartTranscription}
                  disabled={transcribeLoading}
                >
                  <Zap size={14} className="mr-1" />
                  Unlock Transcript (1 Credit)
                </Button>
              </div>
            )}
          </div>

          {/* SECTION B: AI Strategic Hook Analysis */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                  <Brain size={18} />
                </div>
                <div>
                  <h2 className="text-sm font-black text-slate-900">AI Strategic Hook & Blueprint Analysis</h2>
                  <p className="text-[11px] font-medium text-slate-400">
                    Psychological drivers, hook scoring, script flow, and persuasion mechanisms.
                  </p>
                </div>
              </div>
            </div>

            {hasAnalysis && analysisData ? (
              <div className="space-y-4">
                {/* Hook Box */}
                <div className="rounded-xl border border-primary-200 bg-primary-50/40 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary-700 flex items-center gap-1.5">
                      <Target size={14} /> Hook Text & Delivery
                    </span>
                    {analysisData.hook_score && (
                      <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-[10px] font-black text-white">
                        Hook Score: {analysisData.hook_score}/100
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 italic leading-relaxed">
                    &ldquo;{analysisData.hook_text || analysisData.hook || 'Not detected'}&rdquo;
                  </p>
                  {analysisData.hook_type && (
                    <span className="inline-block text-[11px] font-semibold text-primary-700 bg-white px-2 py-0.5 rounded-md border border-primary-200">
                      Type: {analysisData.hook_type}
                    </span>
                  )}
                </div>

                {/* Strategy Dimensions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Topic / Content Angle */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Compass size={12} /> Content Angle
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {analysisData.content_angle || analysisData.topic_angle || '—'}
                    </p>
                  </div>

                  {/* Psychological Driver */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Brain size={12} /> Psychological Driver
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {analysisData.psychological_driver || '—'}
                    </p>
                  </div>

                  {/* Structure Model */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Layers size={12} /> Structure Model
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {analysisData.structure_model || analysisData.script_flow || '—'}
                    </p>
                  </div>

                  {/* Mechanism Type */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Activity size={12} /> Mechanism Type
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {analysisData.mechanism_type || '—'}
                    </p>
                  </div>

                  {/* Insight Shift */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1 md:col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Sparkles size={12} /> Paradigm / Insight Shift
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {analysisData.insight_shift_text || analysisData.insight_shift || '—'}
                    </p>
                  </div>

                  {/* Call to Action */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 space-y-1 md:col-span-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Target size={12} /> Call to Action (CTA)
                    </span>
                    <p className="text-xs font-bold text-slate-800">
                      {analysisData.cta_type || '—'} {analysisData.cta_text && `— "${analysisData.cta_text}"`}
                    </p>
                  </div>
                </div>

                {/* Action Link to Script Refinement */}
                <div className="pt-2 flex justify-end">
                  <Link href={`/content-library/videos/${post.id}/refine`}>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={PenTool}
                    >
                      Refine & Rewrite This Video
                    </Button>
                  </Link>
                </div>
              </div>
            ) : analysisLoading || analysisStatusState === 'processing' || analysisStatusState === 'queued' ? (
              <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-6 text-center space-y-3">
                <RefreshCw size={24} className="mx-auto text-primary-600 animate-spin" />
                <h4 className="text-xs font-bold text-primary-900">
                  {analysisStatusState === 'queued'
                    ? 'Analysis Queued'
                    : 'Analyzing Content Blueprint & Psychology...'}
                </h4>
                <p className="text-[11px] text-primary-700 max-w-sm mx-auto">
                  {analysisStatusState === 'queued'
                    ? 'Waiting in the queue for content strategy evaluation.'
                    : 'Evaluating psychological hooks, mechanisms, and insight shifts.'}
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-center space-y-3">
                <Brain size={28} className="mx-auto text-slate-400" />
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Strategic Analysis Locked</h4>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-0.5">
                    {!hasTranscription
                      ? 'Please unlock the audio transcript first to enable strategic hook analysis.'
                      : 'Unlock complete hook scoring, psychological triggers, and narrative framework.'}
                  </p>
                </div>
                {analysisError && <p className="text-xs font-bold text-rose-600">{analysisError}</p>}
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleStartAnalysis}
                  disabled={analysisLoading || !hasTranscription}
                >
                  <Sparkles size={14} className="mr-1" />
                  Unlock AI Analysis (3 Credits)
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add to Project Modal */}
      <AddToProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        post={post}
        onSuccess={() => {
          loadPost();
        }}
      />
    </div>
  );
}
