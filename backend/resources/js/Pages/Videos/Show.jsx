import React, { useEffect, useRef, useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router } from '@inertiajs/react';
import axios from 'axios';
import ConfirmDialog from '@/Components/common/ConfirmDialog';
import { useToast } from '@/Contexts/ToastContext';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import VideoActionWorkflow from '@/Pages/Videos/Partials/VideoActionWorkflow';
import VideoMetricsPanel from '@/Pages/Videos/Partials/VideoMetricsPanel';
import VideoCaptionPanel from '@/Pages/Videos/Partials/VideoCaptionPanel';
import VideoTranscriptPanel from '@/Pages/Videos/Partials/VideoTranscriptPanel';
import VideoAnalysisPanel from '@/Pages/Videos/Partials/VideoAnalysisPanel';
import AddToProjectModal from '@/Pages/Videos/Partials/AddToProjectModal';
import PageBanner, { PageBannerAction } from '@/Components/common/PageBanner';
import Icon from '@/Components/Icon';

function timeAgo(dateString) {
    if (!dateString) return '';
    const now = new Date();
    const date = new Date(dateString);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return `${Math.floor(diff / 604800)}w ago`;
}

function formatNumber(num) {
    if (!num && num !== 0) return '-';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
}

function deriveDisplayTitle(caption) {
    if (!caption) return '';
    const cleaned = caption
        .replace(/^[\s#\w]*#\w+/g, '')
        .replace(/#\w+/g, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
    if (!cleaned || cleaned.length < 5) return '';
    return cleaned.length > 120 ? `${cleaned.substring(0, 120)}...` : cleaned;
}

const sections = [
    { key: 'actions', label: 'Workflow', icon: 'target' },
    { key: 'caption', label: 'Caption', icon: 'fileText' },
    { key: 'transcript', label: 'Transcript', icon: 'mic' },
    { key: 'analysis', label: 'Analysis', icon: 'flask' },
];

export default function Show({ post, user_has_transcription, user_has_analysis }) {
    const [showFullCaption, setShowFullCaption] = useState(false);
    const [transcriptData, setTranscriptData] = useState(post.content_analysis?.transcription || null);
    const [analysisData, setAnalysisData] = useState(post.content_analysis || null);
    const [userHasTranscription, setUserHasTranscription] = useState(user_has_transcription || false);
    const [userHasAnalysis, setUserHasAnalysis] = useState(user_has_analysis || false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [transcribeError, setTranscribeError] = useState(null);
    const [analysisError, setAnalysisError] = useState(null);
    const [showProjectModal, setShowProjectModal] = useState(false);
    const [projectsList, setProjectsList] = useState([]);
    const [projectsLoading, setProjectsLoading] = useState(false);
    const [addedToProject, setAddedToProject] = useState(null);
    const [newProjectName, setNewProjectName] = useState('');
    const [projectActionLoading, setProjectActionLoading] = useState(false);
    const [showRefineWarning, setShowRefineWarning] = useState(false);
    const [activeSection, setActiveSection] = useState('actions');
    const [copyStatus, setCopyStatus] = useState('idle');

    const { addToast } = useToast();
    const sectionRefs = useRef({});
    const navRef = useRef(null);
    const transcriptionPollRef = useRef(null);
    const analysisPollRef = useRef(null);
    const isMountedRef = useRef(false);
    const shouldToastOnCompleteRef = useRef(false);
    const shouldToastOnAnalysisCompleteRef = useRef(false);
    const copyTimeoutRef = useRef(null);

    useEffect(() => {
        setUserHasTranscription(user_has_transcription);
    }, [user_has_transcription]);

    useEffect(() => {
        setUserHasAnalysis(user_has_analysis);
    }, [user_has_analysis]);

    useEffect(() => {
        setAnalysisData(post.content_analysis || null);
    }, [post.content_analysis]);

    const stopTranscriptionPolling = () => {
        if (transcriptionPollRef.current) {
            clearInterval(transcriptionPollRef.current);
            transcriptionPollRef.current = null;
        }
    };

    const stopAnalysisPolling = () => {
        if (analysisPollRef.current) {
            clearInterval(analysisPollRef.current);
            analysisPollRef.current = null;
        }
    };

    const applyTranscriptionStatus = (data) => {
        const status = data?.status || 'idle';

        if (status === 'completed' && data?.transcription) {
            stopTranscriptionPolling();
            if (!isMountedRef.current) return status;
            setTranscriptData(data.transcription);
            setUserHasTranscription(true);
            setIsTranscribing(false);
            setTranscribeError(null);

            if (shouldToastOnCompleteRef.current) {
                addToast('Transcription completed successfully!', 'success');
                shouldToastOnCompleteRef.current = false;
            }

            return status;
        }

        if (status === 'failed') {
            stopTranscriptionPolling();
            if (!isMountedRef.current) return status;
            setIsTranscribing(false);
            setTranscribeError(data?.error || 'Transcription failed');
            shouldToastOnCompleteRef.current = false;
            return status;
        }

        if (status === 'completed') {
            stopTranscriptionPolling();
            if (!isMountedRef.current) return status;
            setIsTranscribing(false);
            return status;
        }

        if (!isMountedRef.current) return status;
        if (status === 'queued' || status === 'processing') {
            setIsTranscribing(true);
        } else {
            setIsTranscribing(false);
            stopTranscriptionPolling();
        }

        return status;
    };

    const fetchTranscriptionStatus = async () => {
        const { data } = await axios.get(`/api/posts/${post.id}/transcription-status`);
        return applyTranscriptionStatus(data);
    };

    const startTranscriptionPolling = ({ showSuccessToast = false } = {}) => {
        if (showSuccessToast) {
            shouldToastOnCompleteRef.current = true;
        }

        if (transcriptionPollRef.current) {
            return;
        }

        transcriptionPollRef.current = setInterval(async () => {
            try {
                await fetchTranscriptionStatus();
            } catch (err) {
                const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Unable to check transcription status.';
                if (isMountedRef.current) {
                    setTranscribeError(message);
                    setIsTranscribing(false);
                }
                stopTranscriptionPolling();
            }
        }, 2000);
    };

    const applyAnalysisStatus = (data) => {
        const status = data?.status || 'idle';

        if (status === 'completed') {
            stopAnalysisPolling();
            if (!isMountedRef.current) return status;
            setIsAnalyzing(false);
            setAnalysisError(null);
            setUserHasAnalysis(true);

            if (data?.analysis) {
                setAnalysisData(data.analysis);
            } else {
                router.reload();
            }

            if (shouldToastOnAnalysisCompleteRef.current) {
                addToast('Strategy Analysis Complete! Insights unlocked.', 'success');
                shouldToastOnAnalysisCompleteRef.current = false;
            }

            return status;
        }

        if (status === 'failed') {
            stopAnalysisPolling();
            if (!isMountedRef.current) return status;
            setIsAnalyzing(false);
            setAnalysisError(data?.error || 'Analysis failed');
            shouldToastOnAnalysisCompleteRef.current = false;
            return status;
        }

        if (!isMountedRef.current) return status;
        if (status === 'queued' || status === 'processing') {
            setIsAnalyzing(true);
        } else {
            setIsAnalyzing(false);
            stopAnalysisPolling();
        }

        return status;
    };

    const fetchAnalysisStatus = async () => {
        const { data } = await axios.get(`/api/posts/${post.id}/analysis-status`);
        return applyAnalysisStatus(data);
    };

    const startAnalysisPolling = ({ showSuccessToast = false } = {}) => {
        if (showSuccessToast) {
            shouldToastOnAnalysisCompleteRef.current = true;
        }

        if (analysisPollRef.current) {
            return;
        }

        analysisPollRef.current = setInterval(async () => {
            try {
                await fetchAnalysisStatus();
            } catch (err) {
                const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Unable to check analysis status.';
                if (isMountedRef.current) {
                    setAnalysisError(message);
                    setIsAnalyzing(false);
                }
                stopAnalysisPolling();
            }
        }, 2000);
    };

    useEffect(() => {
        isMountedRef.current = true;

        return () => {
            isMountedRef.current = false;
            stopTranscriptionPolling();
            stopAnalysisPolling();
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (transcriptData) {
            stopTranscriptionPolling();
            return;
        }

        let cancelled = false;

        const bootstrap = async () => {
            try {
                const status = await fetchTranscriptionStatus();
                if (cancelled) return;
                if (status === 'queued' || status === 'processing') {
                    startTranscriptionPolling();
                }
            } catch {
                // Silent bootstrap failure. Manual trigger remains available.
            }
        };

        bootstrap();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [post.id, transcriptData]);

    useEffect(() => {
        if (!userHasTranscription || userHasAnalysis) {
            stopAnalysisPolling();
            return;
        }

        let cancelled = false;

        const bootstrap = async () => {
            try {
                const status = await fetchAnalysisStatus();
                if (cancelled) return;
                if (status === 'queued' || status === 'processing') {
                    startAnalysisPolling();
                }
            } catch {
                // Silent bootstrap failure. Manual trigger remains available.
            }
        };

        bootstrap();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [post.id, userHasTranscription, userHasAnalysis]);

    useEffect(() => {
        const entries = Object.entries(sectionRefs.current);
        if (entries.length === 0) return;

        const observer = new IntersectionObserver(
            (observedEntries) => {
                observedEntries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.dataset.section);
                    }
                });
            },
            { rootMargin: '-120px 0px -60% 0px', threshold: 0.1 }
        );

        entries.forEach(([, element]) => {
            if (element) observer.observe(element);
        });

        return () => observer.disconnect();
    }, []);

    const scrollToSection = (key) => {
        const element = sectionRefs.current[key];
        if (!element) return;
        const navHeight = navRef.current?.offsetHeight || 72;
        const y = element.getBoundingClientRect().top + window.scrollY - navHeight - 24;
        window.scrollTo({ top: y, behavior: 'smooth' });
    };

    const caption = post.caption || '';
    const truncatedCaption = caption.length > 200 ? `${caption.substring(0, 200)}...` : caption;
    const cleanedCaption = deriveDisplayTitle(caption);
    const displayTitle = cleanedCaption || caption.substring(0, 80) || 'Untitled Post';

    const outlierScore = post.outlier_score ?? post.breakout_multiplier ?? 1.0;
    const breakoutLabel = post.breakout_label;
    const maxViews = Math.max(post.video_play_count || 0, post.video_view_count || 0);
    const views = formatNumber(maxViews);

    let engagementRate;
    if (post.engagement_rate != null) {
        const erPct = post.engagement_rate * 100;
        engagementRate = erPct < 0.1 && erPct > 0 ? '<0.1%' : `${erPct.toFixed(1)}%`;
    } else {
        const engagementRateVal = maxViews > 0 ? ((post.likes_count + post.comments_count) / maxViews) * 100 : 0;
        engagementRate = engagementRateVal < 0.1 && engagementRateVal > 0 ? '<0.1%' : `${engagementRateVal.toFixed(1)}%`;
    }

    const wordCount = transcriptData ? transcriptData.split(/\s+/).length : 0;

    const handleTranscribe = async () => {
        setIsTranscribing(true);
        setTranscribeError(null);

        try {
            const { data, status } = await axios.post(`/api/posts/${post.id}/transcribe`);

            if (status === 200 && data?.transcription) {
                stopTranscriptionPolling();
                setTranscriptData(data.transcription);
                setUserHasTranscription(true);
                setIsTranscribing(false);
                addToast('Transcription completed successfully!', 'success');
                return;
            }

            if (status === 202 && (data?.status === 'queued' || data?.status === 'processing')) {
                startTranscriptionPolling({ showSuccessToast: true });
                addToast("Transcription queued. You can leave this page; we'll keep processing.", 'info');
                return;
            }

            setIsTranscribing(false);
        } catch (err) {
            const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Transcription failed';
            setTranscribeError(message);
            setIsTranscribing(false);

            if (err.response?.status === 419) {
                addToast('Session expired or CSRF mismatch. Please refresh the page.', 'error');
            } else if (err.response?.status === 403 && err.response?.data?.error === 'no_active_plan') {
                addToast('Active subscription required for transcription.', 'warning');
            }
        }
    };

    const handleAnalyze = async (analysisLanguage = 'English') => {
        if (!userHasTranscription) {
            addToast('Audio transcription is required to run the AI analysis.', 'warning');
            return;
        }

        setIsAnalyzing(true);
        setAnalysisError(null);

        try {
            const { data, status } = await axios.post(`/api/posts/${post.id}/analyze`, {
                analysis_language: analysisLanguage,
            });

            if (status === 200 && data?.analysis) {
                stopAnalysisPolling();
                setAnalysisData(data.analysis);
                setUserHasAnalysis(true);
                setIsAnalyzing(false);
                addToast('Strategy Analysis Complete! Insights unlocked.', 'success');
                setTimeout(() => scrollToSection('analysis'), 300);
                return;
            }

            if (status === 202 && (data?.status === 'queued' || data?.status === 'processing')) {
                startAnalysisPolling({ showSuccessToast: true });
                addToast("Analysis queued. You can leave this page; we'll keep processing.", 'info');
                return;
            }

            setIsAnalyzing(false);
        } catch (err) {
            const message = err.response?.data?.message || err.response?.data?.error || err.message || 'Analysis failed';
            setAnalysisError(message);
            if (err.response?.status === 403 && err.response?.data?.error === 'no_active_plan') {
                addToast('Active subscription required for analysis.', 'warning');
            }
            setIsAnalyzing(false);
        }
    };

    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;

    const openProjectModal = async () => {
        setAddedToProject(null);
        setNewProjectName('');
        setShowProjectModal(true);
        setProjectsLoading(true);
        try {
            const { data } = await axios.get('/api/projects');
            setProjectsList(data);
        } catch {
            addToast('Failed to load projects.', 'error');
        } finally {
            setProjectsLoading(false);
        }
    };

    const resolveApiErrorMessage = async (response, fallbackMessage) => {
        try {
            const payload = await response.json();
            if (typeof payload?.message === 'string' && payload.message.trim()) {
                return payload.message;
            }

            const firstError = payload?.errors && Object.values(payload.errors)[0];
            if (Array.isArray(firstError) && firstError[0]) {
                return firstError[0];
            }
        } catch {
            // Ignore JSON parse failures and use fallback.
        }

        return fallbackMessage;
    };

    const addToProject = async (projectId) => {
        if (!projectId) {
            addToast('Please select a valid project.', 'warning');
            return false;
        }

        setProjectActionLoading(true);

        try {
            const response = await fetch(`/api/projects/${projectId}/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ post_id: post.id }),
            });

            if (!response.ok) {
                const message = await resolveApiErrorMessage(response, 'Could not add to project.');
                throw new Error(message);
            }

            setAddedToProject(projectId);
            addToast('Added to project.', 'success');
            setTimeout(() => {
                setShowProjectModal(false);
                setAddedToProject(null);
            }, 800);
            return true;
        } catch (error) {
            addToast(error.message || 'Could not add to project.', 'error');
            return false;
        } finally {
            setProjectActionLoading(false);
        }
    };

    const createAndAdd = async () => {
        const trimmedName = newProjectName.trim();
        if (!trimmedName) return;

        setProjectActionLoading(true);
        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken },
                body: JSON.stringify({ name: trimmedName }),
            });

            if (!response.ok) {
                const message = await resolveApiErrorMessage(response, 'Could not create project.');
                throw new Error(message);
            }

            const project = await response.json();
            if (!project?.id) {
                throw new Error('Project created but response was invalid.');
            }

            setNewProjectName('');
            setProjectsList((previous) => [project, ...previous.filter((item) => item.id !== project.id)]);
            await addToProject(project.id);
        } catch (error) {
            addToast(error.message || 'Could not create project.', 'error');
        } finally {
            setProjectActionLoading(false);
        }
    };

    const handleRefineClick = () => {
        if (!userHasTranscription || !userHasAnalysis) {
            setShowRefineWarning(true);
            return;
        }
        router.visit(`/Library/${post.id}/refine`);
    };

    const handleCopyTranscript = async () => {
        if (!transcriptData) return;
        try {
            await navigator.clipboard.writeText(transcriptData);
            setCopyStatus('success');
            addToast('Transcript copied.', 'success');
            if (copyTimeoutRef.current) {
                clearTimeout(copyTimeoutRef.current);
            }
            copyTimeoutRef.current = setTimeout(() => {
                setCopyStatus('idle');
            }, 1400);
        } catch {
            setCopyStatus('idle');
            addToast('Unable to copy transcript.', 'error');
        }
    };

    const labelColors = {
        Explosive: { bg: 'bg-red-50 text-red-600 border-red-200/40', dot: 'bg-red-500' },
        Breakout: { bg: 'bg-accent-50 text-accent-600 border-accent-200/40', dot: 'bg-accent-500' },
        Outlier: { bg: 'bg-primary-50 text-primary-600 border-primary-200/40', dot: 'bg-primary-500' },
        Strong: { bg: 'bg-emerald-50 text-emerald-600 border-emerald-200/40', dot: 'bg-emerald-500' },
        Normal: { bg: 'bg-slate-50 text-slate-500 border-slate-200/40', dot: 'bg-slate-400' },
        'Insufficient Data': { bg: 'bg-slate-50 text-slate-400 border-slate-200/40', dot: 'bg-slate-300' },
    };
    const breakoutClasses = labelColors[breakoutLabel] ?? { bg: 'bg-slate-50 text-slate-500 border-slate-200/40', dot: 'bg-slate-400' };

    return (
        <AuthenticatedLayout>
            <Head title={displayTitle} />

            <div className="fixed inset-0 pointer-events-none -z-10 bg-slate-50" />

            <div className="mx-auto max-w-[1400px] space-y-6 pb-16">
                <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-6 md:p-8 text-white shadow-xl border border-slate-800">
                    <div 
                        className="absolute inset-0 bg-cover bg-center opacity-30 blur-2xl scale-110 pointer-events-none" 
                        style={{ backgroundImage: `url(${post.display_url})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-black uppercase tracking-widest text-slate-200 backdrop-blur-md border border-white/5">
                                    <Icon name="videos" size={14} className="text-primary-400" />
                                    Video Analysis
                                </span>
                                {breakoutLabel && breakoutLabel !== 'Insufficient Data' ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/10 px-2.5 py-1 text-xs font-black uppercase tracking-widest text-red-400 backdrop-blur-md border border-red-500/20">
                                        <span className={`h-1.5 w-1.5 rounded-full ${breakoutClasses.dot}`} />
                                        {breakoutLabel} {typeof outlierScore === 'number' ? outlierScore.toFixed(1) : outlierScore}x
                                    </span>
                                ) : null}
                            </div>
                            <h1 className="text-xl md:text-3xl font-black tracking-tight text-white leading-tight">
                                {displayTitle}
                            </h1>
                            <p className="text-sm font-semibold text-slate-300">
                                by @{post.owner_username || 'creator'}
                                {timeAgo(post.post_timestamp) ? ` • ${timeAgo(post.post_timestamp)}` : ''}
                            </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <a 
                                href={route('videos')}
                                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4.5 py-2.5 text-sm font-black text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white transition-all active:scale-[0.98]"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                Back to videos
                            </a>
                        </div>
                    </div>
                </div>

                {/* page navigation */}
                <div
                    ref={navRef}
                    className="sticky top-16 z-40 -mx-4 overflow-x-auto border-b border-slate-200/50 bg-white/75 px-4 py-3 shadow-sm backdrop-blur-xl transition-all duration-300 no-scrollbar custom-scrollbar"
                    aria-label="Video detail sections"
                >
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.2em] font-black text-slate-400 mr-4 whitespace-nowrap hidden sm:block">
                            Navigate
                        </span>
                        <div className="flex items-center gap-1.5 rounded-2xl bg-slate-100/80 p-1 border border-slate-200/40">
                            {sections.map((section) => {
                                const isActive = activeSection === section.key;
                                return (
                                    <button
                                        key={section.key}
                                        onClick={() => scrollToSection(section.key)}
                                        type="button"
                                        aria-current={isActive ? 'true' : undefined}
                                        className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 active:scale-95 ${isActive
                                            ? 'bg-white text-primary-600 shadow-sm border border-slate-200/20'
                                            : 'text-slate-600 border border-transparent hover:text-slate-900 hover:bg-white/40'
                                            }`}
                                    >
                                        <Icon name={section.icon} className={`w-3.5 h-3.5 ${isActive ? 'text-primary-500' : 'text-slate-400'}`} />
                                        {section.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* post and metrics */}
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(320px,400px)_1fr] gap-8 lg:items-start">
                    <div className="relative">
                        <div 
                            className="absolute -inset-4 rounded-[2.5rem] bg-cover bg-center opacity-20 blur-2xl pointer-events-none -z-10" 
                            style={{ backgroundImage: `url(${post.display_url})` }}
                        />
                        <div className="group relative aspect-[9/16] max-h-[calc(100vh-180px)] min-h-[400px] w-full overflow-hidden rounded-[2rem] bg-slate-900 shadow-2xl ring-1 ring-slate-200/60">
                            <img
                                src={post.display_url}
                                alt={post.caption}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                            />
                            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

                            {post.url && (
                                <div className="absolute bottom-6 left-6 right-6 z-10 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                                    <a
                                        href={post.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/95 py-4 text-sm font-bold text-slate-900 shadow-2xl backdrop-blur-md transition-all hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 active:scale-95"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open Original Post
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>

                    <div>
                        {/* Actions & Metrics grouped together */}
                        <div className="flex flex-col gap-6">
                            <div ref={(el) => { sectionRefs.current.actions = el; }} data-section="actions" className="scroll-mt-24">
                                <VideoActionWorkflow
                                    onTranscribe={handleTranscribe}
                                    onAnalyze={handleAnalyze}
                                    onRefine={handleRefineClick}
                                    onOpenProjectModal={openProjectModal}
                                    hasTranscription={userHasTranscription}
                                    hasAnalysis={userHasAnalysis}
                                    isTranscribing={isTranscribing}
                                    isAnalyzing={isAnalyzing}
                                />
                            </div>

                            <div ref={(el) => { sectionRefs.current.metrics = el; }} data-section="metrics" className="scroll-mt-24 flex-1 min-h-0">
                                <VideoMetricsPanel
                                    post={post}
                                    views={views}
                                    engagementRate={engagementRate}
                                    breakoutLabel={breakoutLabel}
                                    outlierScore={outlierScore}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Details Section - Full Width */}
                <div className="mt-8 space-y-8">
                    <div ref={(el) => { sectionRefs.current.caption = el; }} data-section="caption" className="scroll-mt-24">
                        <VideoCaptionPanel
                            caption={caption}
                            truncatedCaption={truncatedCaption}
                            showFullCaption={showFullCaption}
                            onExpand={() => setShowFullCaption(true)}
                            onCollapse={() => setShowFullCaption(false)}
                        />
                    </div>

                    <div ref={(el) => { sectionRefs.current.transcript = el; }} data-section="transcript" className="scroll-mt-24">
                        <VideoTranscriptPanel
                            transcriptData={transcriptData}
                            wordCount={wordCount}
                            isTranscribing={isTranscribing}
                            transcribeError={transcribeError}
                            onTranscribe={handleTranscribe}
                            onCopyTranscript={handleCopyTranscript}
                            copyStatus={copyStatus}
                        />
                    </div>

                    <div ref={(el) => { sectionRefs.current.analysis = el; }} data-section="analysis" className="scroll-mt-24 pb-20">
                        <VideoAnalysisPanel
                            contentAnalysis={analysisData}
                            userHasAnalysis={userHasAnalysis}
                            userHasTranscription={userHasTranscription}
                            isAnalyzing={isAnalyzing}
                            analysisError={analysisError}
                            onAnalyze={handleAnalyze}
                        />
                    </div>
                </div>
            </div>

            <AddToProjectModal
                show={showProjectModal}
                onClose={() => setShowProjectModal(false)}
                projectsLoading={projectsLoading}
                projectsList={projectsList}
                addedToProject={addedToProject}
                isSubmitting={projectActionLoading}
                onAddToProject={addToProject}
                newProjectName={newProjectName}
                onNewProjectNameChange={setNewProjectName}
                onCreateAndAdd={createAndAdd}
            />

            <ConfirmDialog
                show={showRefineWarning}
                title="Transcription Required"
                message="Please transcribe and analyze the video before refining the script."
                confirmLabel="OK"
                variant="warning"
                onConfirm={() => setShowRefineWarning(false)}
                onCancel={() => setShowRefineWarning(false)}
            />
        </AuthenticatedLayout>
    );
}
