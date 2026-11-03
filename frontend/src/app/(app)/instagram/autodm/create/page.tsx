'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import InstagramNav from '@/components/InstagramNav';
import PreviewPhone from '@/components/PreviewPhone';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import {
  MessageSquare,
  Zap,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Send,
  Plus,
  Trash2,
  Lock,
  Unlock,
  ExternalLink,
  Layers,
  Film,
  Check,
  Flame,
  Clock,
  ChevronRight,
  ChevronLeft,
  Info,
  Eye,
  SlidersHorizontal,
  FolderPlus,
  Play,
  Share2,
  FileText,
  Signal,
  Wifi,
  BatteryFull,
  MoreHorizontal,
  Heart,
  Bookmark,
  User,
  ThumbsUp,
  Laugh,
  Star,
  X,
  Save,
  ChevronDown,
  RefreshCw,
  Loader2,
} from 'lucide-react';

import Dropdown from '@/components/ui/Dropdown';
import { useInstagramStore } from '@/lib/store/useInstagramStore';
import {
  getInstagramProfile,
  ReelOutlier,
  createAutoDmCampaign,
  getAutoDmCampaign,
  updateAutoDmCampaign,
  getAutoDmTemplates,
  AutoDmTemplateItem,
  fetchAutoDmMedia,
  AutoDmMediaItem,
} from '@/lib/api/instagramService';

const PRESET_TEMPLATES: Record<string, {
  title: string;
  keyword: string;
  aliases: string[];
  greeting: string;
  message: string;
  buttonLabel: string;
  buttonUrl: string;
  commentReplies: string[];
  requireFollow: boolean;
}> = {
  playbook: {
    title: 'Free 2026 AI Growth Playbook & Prompt Vault',
    keyword: 'PLAYBOOK',
    aliases: ['BOOK', 'GUIDE', 'PDF'],
    greeting: 'Hey there! 👋',
    message: 'Thanks for commenting! Here is your exclusive direct access link to our 2026 AI Instagram Growth Playbook & Prompt Vault:',
    buttonLabel: '📥 Download Playbook (PDF)',
    buttonUrl: 'https://scanmysocial.com/playbook',
    commentReplies: ['Check your DMs! 🚀 Just sent you the direct link.', 'Sent to your inbox! 📩 Check your message requests.'],
    requireFollow: true,
  },
  webinar: {
    title: 'Live Masterclass VIP Ticket Access',
    keyword: 'WEBINAR',
    aliases: ['LIVE', 'VIP', 'SEAT'],
    greeting: 'Awesome to connect! 🎯',
    message: 'You are officially registered for this Thursday’s Live Masterclass. Click below to add the calendar invite and claim your VIP pass:',
    buttonLabel: '🎟️ Claim VIP Ticket',
    buttonUrl: 'https://scanmysocial.com/webinar-vip',
    commentReplies: ['VIP Pass sent to your DMs! 🎟️ See you on Thursday.'],
    requireFollow: false,
  },
  discount: {
    title: '50% Creator Pro Discount Code',
    keyword: 'PROMO',
    aliases: ['DISCOUNT', 'DEAL', '50OFF'],
    greeting: 'Hey creator! 🔥',
    message: 'Here is your special 50% discount code for Scan My Social Pro: Use code "CREATOR50" at checkout for lifetime savings!',
    buttonLabel: '🔥 Activate 50% Off Now',
    buttonUrl: 'https://scanmysocial.com/pricing?code=CREATOR50',
    commentReplies: ['Discount code sent to your DMs! 🎉 Enjoy the savings!'],
    requireFollow: true,
  },
  vault: {
    title: 'Viral Hook Scripts Notion Vault',
    keyword: 'VAULT',
    aliases: ['HOOKS', 'TEMPLATES', 'SCRIPTS'],
    greeting: 'Hey! ⚡',
    message: 'Here is the 100+ Viral Hook Templates Notion database. Duplicate it directly to your workspace and start writing high-retention scripts:',
    buttonLabel: '⚡ Open Notion Vault',
    buttonUrl: 'https://scanmysocial.com/vault',
    commentReplies: ['Sent you the full Notion database! 📂 Check your DMs.'],
    requireFollow: true,
  },
};

function CreateAutoDmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateKey = searchParams.get('template');
  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);

  const [isLoadingCampaign, setIsLoadingCampaign] = useState(false);
  const [apiTemplates, setApiTemplates] = useState<AutoDmTemplateItem[]>([]);

  const storeAccounts = useInstagramStore((state) => state.accounts);
  const storeSelectedId = useInstagramStore((state) => state.selectedAccountId);
  const selectedAccountId = storeSelectedId || storeAccounts[0]?.id || '';
  const activeAccount = storeAccounts.find((a) => a.id === selectedAccountId) || storeAccounts[0] || {
    id: 'acc-1',
    username: 'connected_account',
    displayName: 'Connected Account',
    avatar: '',
  };

  // Content library states (Hybrid: Cache-First + Live Refresh)
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [stories, setStories] = useState<AutoDmMediaItem[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [isStoriesLoading, setIsStoriesLoading] = useState(false);
  const [isRefreshingLive, setIsRefreshingLive] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextMediaCursor, setNextMediaCursor] = useState<string | null>(null);
  const [nextStoryCursor, setNextStoryCursor] = useState<string | null>(null);
  const [hasMoreMedia, setHasMoreMedia] = useState(false);
  const [hasMoreStories, setHasMoreStories] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);

  // Automation Triggers & Scope
  const [title, setTitle] = useState('Free 2026 AI Growth Playbook');
  const [sourceType, setSourceType] = useState<'media' | 'story'>('media');
  const [targetScope, setTargetScope] = useState<'all' | 'specific'>('all');
  const [selectedPostId, setSelectedPostId] = useState('post-1');
  const [existingTriggerMediaUrl, setExistingTriggerMediaUrl] = useState<string | null>(null);
  const [triggerKeyword, setTriggerKeyword] = useState('PLAYBOOK');
  const [aliasesInput, setAliasesInput] = useState('BOOK, GUIDE, PDF');

  // Direct Message Payload
  const [dmGreeting, setDmGreeting] = useState('Hey there! 👋');
  const [dmMessage, setDmMessage] = useState('Thanks for commenting! Here is your exclusive direct access link to our 2026 AI Instagram Growth Playbook & Prompt Vault:');
  const [buttonLabel, setButtonLabel] = useState('📥 Download Playbook (PDF)');
  const [buttonUrl, setButtonUrl] = useState('https://scanmysocial.com/playbook');
  const [hasSecondaryButton, setHasSecondaryButton] = useState(false);
  const [secondaryButtonLabel, setSecondaryButtonLabel] = useState('💬 Book 1-on-1 Call');
  const [secondaryButtonUrl, setSecondaryButtonUrl] = useState('https://scanmysocial.com/call');

  // Growth Enhancers
  const [autoCommentReply, setAutoCommentReply] = useState(true);
  const [commentReplies, setCommentReplies] = useState<string[]>([
    'Check your DMs! 🚀 Just sent you the direct link.',
    'Sent to your inbox! 📩 Check your message requests.'
  ]);
  const [newReplyInput, setNewReplyInput] = useState('');
  const [requireFollow, setRequireFollow] = useState(true);
  const [enableReminder, setEnableReminder] = useState(false);
  const [reminderDelayHours, setReminderDelayHours] = useState('2');
  const [reminderMessage, setReminderMessage] = useState('Quick reminder! Did you get a chance to download your free playbook? Let me know if you need anything! 🚀');

  // UI States
  const [previewTab, setPreviewTab] = useState<'content' | 'dm' | 'comment'>('content');
  const [status, setStatus] = useState<'active' | 'draft'>('active');
  const [isFollowGateSimulated, setIsFollowGateSimulated] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [tempSelectedPostId, setTempSelectedPostId] = useState('post-1');

  const isHydrated = useInstagramStore((state) => state.isHydrated);

  // 1. Initial Posts Loading (Cache-First from DB)
  useEffect(() => {
    if (!isHydrated || !selectedAccountId) return;
    let isMounted = true;
    setIsMediaLoading(true);
    setMediaError(null);

    fetchAutoDmMedia(selectedAccountId, { source: 'media' })
      .then((res) => {
        if (!isMounted) return;
        if (Array.isArray(res.media) && res.media.length > 0) {
          setRecentPosts(res.media);
          setNextMediaCursor(res.paging?.next_cursor || null);
          setHasMoreMedia(Boolean(res.paging?.has_next_page && res.paging?.next_cursor));
        } else {
          getInstagramProfile(selectedAccountId).then((data) => {
            if (isMounted && data.posts) {
              setRecentPosts(data.posts);
            }
          });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('fetchAutoDmMedia failed, falling back to profile posts:', err);
        getInstagramProfile(selectedAccountId).then((data) => {
          if (isMounted && data.posts) {
            setRecentPosts(data.posts);
          }
        });
      })
      .finally(() => {
        if (isMounted) setIsMediaLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isHydrated, selectedAccountId]);

  // 2. Fetch Stories live when user switches to 'story' tab
  useEffect(() => {
    if (!isHydrated || sourceType !== 'story' || !selectedAccountId) return;
    let isMounted = true;
    setIsStoriesLoading(true);
    setMediaError(null);

    fetchAutoDmMedia(selectedAccountId, { source: 'story' })
      .then((res) => {
        if (!isMounted) return;
        const fetched = res.media || [];
        setStories(fetched);
        setNextStoryCursor(res.paging?.next_cursor || null);
        setHasMoreStories(Boolean(res.paging?.has_next_page && res.paging?.next_cursor));
        if (fetched.length === 0 || !fetched.some((s: any) => String(s.id) === String(selectedPostId))) {
          setSelectedPostId('all-media');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('Failed to fetch stories from Meta:', err);
        setMediaError('Could not fetch active stories. You can still target the next published story.');
        setSelectedPostId('all-media');
      })
      .finally(() => {
        if (isMounted) setIsStoriesLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sourceType, selectedAccountId]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const openMediaModal = () => {
    setTempSelectedPostId(selectedPostId);
    setIsMediaModalOpen(true);
  };

  const handleConfirmMediaModal = () => {
    setSelectedPostId(tempSelectedPostId);
    setPreviewTab('content');
    setIsMediaModalOpen(false);
  };

  const handleLiveRefresh = async () => {
    if (!selectedAccountId || isRefreshingLive) return;
    setIsRefreshingLive(true);
    setMediaError(null);
    try {
      const res = await fetchAutoDmMedia(selectedAccountId, {
        source: sourceType,
        refresh: true,
      });

      if (sourceType === 'media') {
        if (Array.isArray(res.media) && res.media.length > 0) {
          setRecentPosts(res.media);
          setNextMediaCursor(res.paging?.next_cursor || null);
          setHasMoreMedia(Boolean(res.paging?.has_next_page && res.paging?.next_cursor));
        }
        triggerToast('Synced latest posts & reels live from Instagram!');
      } else {
        setStories(res.media || []);
        setNextStoryCursor(res.paging?.next_cursor || null);
        setHasMoreStories(Boolean(res.paging?.has_next_page && res.paging?.next_cursor));
        triggerToast('Synced active stories live from Instagram!');
      }
    } catch (err: any) {
      console.error('Live refresh failed:', err);
      triggerToast(err.message || 'Instagram live refresh failed. Showing cached content.');
    } finally {
      setIsRefreshingLive(false);
    }
  };

  const handleLoadMore = async () => {
    if (!selectedAccountId || isLoadingMore) return;
    const cursor = sourceType === 'story' ? nextStoryCursor : nextMediaCursor;
    if (!cursor) return;

    setIsLoadingMore(true);
    try {
      const res = await fetchAutoDmMedia(selectedAccountId, {
        source: sourceType,
        after: cursor,
      });

      if (sourceType === 'media') {
        const newItems = res.media || [];
        setRecentPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          return [...prev, ...newItems.filter((p) => !existingIds.has(p.id))];
        });
        setNextMediaCursor(res.paging?.next_cursor || null);
        setHasMoreMedia(Boolean(res.paging?.has_next_page && res.paging?.next_cursor));
      } else {
        const newItems = res.media || [];
        setStories((prev) => {
          const existingIds = new Set(prev.map((s) => s.id));
          return [...prev, ...newItems.filter((s) => !existingIds.has(s.id))];
        });
        setNextStoryCursor(res.paging?.next_cursor || null);
        setHasMoreStories(Boolean(res.paging?.has_next_page && res.paging?.next_cursor));
      }
    } catch (err) {
      console.error('Failed to load more media:', err);
      triggerToast('Could not load more items.');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Helper to load any template into state
  const applyTemplate = (t: any) => {
    if (!t) return;
    setTitle(t.title || t.name || '');
    setTriggerKeyword(t.triggerKeyword || t.keyword || '');
    setAliasesInput(
      t.aliasesInput || (Array.isArray(t.aliases) ? t.aliases.join(', ') : '')
    );
    if (t.greeting !== undefined) setDmGreeting(t.greeting);
    if (t.dmMessage || t.message) setDmMessage(t.dmMessage || t.message);
    if (t.buttonLabel) setButtonLabel(t.buttonLabel);
    if (t.buttonUrl) setButtonUrl(t.buttonUrl);
    if (Array.isArray(t.commentReplies) && t.commentReplies.length > 0) {
      setCommentReplies(t.commentReplies);
    }
    if (typeof t.requireFollow === 'boolean') setRequireFollow(t.requireFollow);
    if (typeof t.enableReminder === 'boolean') setEnableReminder(t.enableReminder);
    if (t.reminderMessage) setReminderMessage(t.reminderMessage);
    triggerToast(`Loaded "${t.title || t.name}" template!`);
  };

  // 1. Fetch template presets from API
  useEffect(() => {
    let isMounted = true;
    getAutoDmTemplates()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setApiTemplates(data);
        }
      })
      .catch((err) => {
        console.warn('Could not load api templates:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Load template prefill if present in URL
  useEffect(() => {
    if (!templateKey) return;
    if (PRESET_TEMPLATES[templateKey]) {
      applyTemplate(PRESET_TEMPLATES[templateKey]);
    } else if (apiTemplates.length > 0) {
      const found = apiTemplates.find(
        (t) => t.slug === templateKey || t.id === templateKey
      );
      if (found) applyTemplate(found);
    }
  }, [templateKey, apiTemplates]);

  // 3. Load existing campaign if edit mode
  useEffect(() => {
    if (!editId) return;
    let isMounted = true;
    setIsLoadingCampaign(true);

    getAutoDmCampaign(editId)
      .then((camp) => {
        if (!isMounted || !camp) return;
        if (camp.title || camp.name) setTitle(camp.title || camp.name);
        if (camp.triggerKeyword || camp.keyword) setTriggerKeyword(camp.triggerKeyword || camp.keyword);
        if (camp.aliasesInput) {
          setAliasesInput(camp.aliasesInput);
        } else if (Array.isArray(camp.aliases)) {
          setAliasesInput(camp.aliases.join(', '));
        } else if (Array.isArray(camp.secondaryKeywords)) {
          setAliasesInput(camp.secondaryKeywords.join(', '));
        }
        if (camp.sourceType === 'story' || camp.triggerType === 'story') {
          setSourceType('story');
        } else {
          setSourceType('media');
        }
        if (camp.selectedPostId || camp.triggerValue) {
          setSelectedPostId(camp.selectedPostId || camp.triggerValue);
        }
        if (camp.thumbnailUrl || (camp as any).triggerMediaUrl) {
          setExistingTriggerMediaUrl(camp.thumbnailUrl || (camp as any).triggerMediaUrl || null);
        }
        if (camp.dmGreeting !== undefined) {
          setDmGreeting(camp.dmGreeting || '');
        }
        if (camp.dmMessage || camp.primaryDmMessage) {
          setDmMessage(camp.dmMessage || camp.primaryDmMessage || '');
        }
        if (camp.buttonLabel || camp.openingButtonText) {
          setButtonLabel(camp.buttonLabel || camp.openingButtonText || '');
        }
        if (camp.buttonUrl) {
          setButtonUrl(camp.buttonUrl);
        }
        if (typeof camp.autoCommentReply === 'boolean') {
          setAutoCommentReply(camp.autoCommentReply);
        } else if (typeof camp.public_reply_enabled === 'boolean') {
          setAutoCommentReply(camp.public_reply_enabled);
        }
        if (Array.isArray(camp.commentReplies) && camp.commentReplies.length > 0) {
          setCommentReplies(camp.commentReplies);
        }
        if (typeof camp.requireFollow === 'boolean') {
          setRequireFollow(camp.requireFollow);
        } else if (typeof camp.ask_to_follow_enabled === 'boolean') {
          setRequireFollow(camp.ask_to_follow_enabled);
        }
        if (typeof camp.enableReminder === 'boolean') {
          setEnableReminder(camp.enableReminder);
        } else if (typeof camp.reminder_enabled === 'boolean') {
          setEnableReminder(camp.reminder_enabled);
        }
        if (camp.reminderDelayHours !== undefined) {
          setReminderDelayHours(String(camp.reminderDelayHours));
        }
        if (camp.reminderMessage) {
          setReminderMessage(camp.reminderMessage);
        }
        if (camp.status) {
          setStatus(camp.status === 'active' ? 'active' : 'draft');
        }
        triggerToast(`Loaded campaign "${camp.title || camp.name}" for editing`);
      })
      .catch((err) => {
        console.error('Failed to load campaign for editing:', err);
        triggerToast('Failed to load campaign details.');
      })
      .finally(() => {
        if (isMounted) setIsLoadingCampaign(false);
      });

    return () => {
      isMounted = false;
    };
  }, [editId]);

  const handleAddCommentReply = () => {
    if (!newReplyInput.trim()) return;
    setCommentReplies([...commentReplies, newReplyInput.trim()]);
    setNewReplyInput('');
  };

  const handleRemoveCommentReply = (idx: number) => {
    if (commentReplies.length <= 1) {
      triggerToast('Must have at least 1 public comment reply.');
      return;
    }
    setCommentReplies(commentReplies.filter((_, i) => i !== idx));
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !triggerKeyword.trim() || !dmMessage.trim()) {
      triggerToast('Please fill out all required fields.');
      return;
    }

    const aliases = aliasesInput
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);

    const resolvedThumbnail = selectedMedia
      ? (selectedMedia.thumbnail || selectedMedia.thumbnail_url || (selectedMedia as any)?.thumbnailUrl || (selectedMedia as any)?.thumbnail_url || selectedMedia.media_url || (selectedMedia as any)?.mediaUrl || (selectedMedia as any)?.url || (selectedMedia as any)?.display_url || (selectedMedia as any)?.image_url || null)
      : (selectedPostId === 'all-media' ? null : existingTriggerMediaUrl);

    setIsSubmitting(true);
    try {
      const payload = {
        accountId: activeAccount?.id,
        instagram_account_id: activeAccount?.id,
        title: title.trim(),
        name: title.trim(),
        triggerKeyword: triggerKeyword.trim(),
        keyword: triggerKeyword.trim(),
        aliases: aliases,
        secondaryKeywords: aliases,
        sourceType: sourceType,
        triggerType: sourceType === 'story' ? 'story' : (selectedMedia ? (selectedMedia.autodm_trigger_type || 'reel') : 'post'),
        selectedPostId: selectedPostId,
        triggerValue: selectedPostId,
        triggerMediaUrl: resolvedThumbnail,
        thumbnailUrl: resolvedThumbnail,
        dmGreeting: dmGreeting,
        dmMessage: dmMessage,
        primaryDmMessage: dmGreeting ? `${dmGreeting}\n\n${dmMessage}` : dmMessage,
        buttonLabel: buttonLabel,
        openingButtonText: buttonLabel,
        buttonUrl: buttonUrl,
        requireFollow: requireFollow,
        ask_to_follow_enabled: requireFollow,
        enableReminder: enableReminder,
        reminder_enabled: enableReminder,
        reminderDelayHours: parseInt(reminderDelayHours, 10) || 2,
        reminderMessage: reminderMessage,
        autoCommentReply: autoCommentReply,
        public_reply_enabled: autoCommentReply,
        commentReplies: commentReplies,
        status: (status === 'active' ? 'active' : 'paused') as 'active' | 'paused',
      };

      if (isEditMode && editId) {
        await updateAutoDmCampaign(editId, payload);
        triggerToast('AutoDM Funnel updated successfully! 🚀');
      } else {
        await createAutoDmCampaign(payload);
        triggerToast(status === 'active' ? 'AutoDM Funnel launched & active on Meta webhook! 🚀' : 'AutoDM Funnel saved as draft.');
      }

      setTimeout(() => {
        router.push('/instagram/autodm');
      }, 1000);
    } catch (err: any) {
      console.error('Failed to save AutoDM campaign:', err);
      triggerToast(err.message || 'Failed to save AutoDM funnel to database.');
      setIsSubmitting(false);
    }
  };

  const isStoryTrigger = sourceType === 'story';
  const currentMediaList = isStoryTrigger ? stories : recentPosts;
  const selectedMedia = selectedPostId === 'all-media'
    ? null
    : currentMediaList.find((p: any) => String(p.id) === String(selectedPostId));
  const mediaTypeLabel = selectedMedia
    ? (selectedMedia.autodm_media_label?.toUpperCase() || (isStoryTrigger ? 'STORY' : 'REEL'))
    : (isStoryTrigger ? 'STORY' : 'POST');

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 text-white px-5 py-3 text-xs font-bold shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-bottom-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* SELECT POST OR REEL MODAL */}
      {isMediaModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
          onClick={() => setIsMediaModalOpen(false)}
        >
          <div
            className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {sourceType === 'story' ? 'Select Active Story' : 'Select Post or Reel'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {sourceType === 'story'
                    ? 'Pick an active 24-hour story or auto-trigger on all stories'
                    : 'Pick a published post/reel from cache or sync latest from Instagram'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLiveRefresh}
                  disabled={isRefreshingLive}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs disabled:opacity-50"
                  title="Fetch latest directly from Meta Graph API"
                >
                  <RefreshCw size={12} className={isRefreshingLive ? 'animate-spin text-primary-600' : ''} />
                  <span>{isRefreshingLive ? 'Syncing...' : 'Refresh from Instagram'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Media Grid Container (Scrollable) */}
            <div className="p-5 max-h-[480px] overflow-y-auto space-y-3">
              {mediaError && (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-xs flex items-center gap-2">
                  <Info size={14} className="shrink-0 text-amber-600" />
                  <span>{mediaError}</span>
                </div>
              )}

              {(isRefreshingLive || (sourceType === 'story' && isStoriesLoading && stories.length === 0) || (sourceType === 'media' && isMediaLoading && recentPosts.length === 0)) ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-center">
                  <Loader2 size={26} className="animate-spin text-primary-600" />
                  <p className="text-xs font-bold text-slate-700">
                    {sourceType === 'story' ? 'Fetching active stories live from Meta...' : 'Connecting to Instagram...'}
                  </p>
                  <p className="text-[11px] text-slate-400">This takes just a second.</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    {/* 1. Next Post or Reel / Global Trigger Card */}
                    <div
                      onClick={() => setTempSelectedPostId('all-media')}
                      className={`group relative aspect-square rounded-2xl cursor-pointer p-3 flex flex-col justify-between transition-all select-none ${tempSelectedPostId === 'all-media'
                        ? 'border-2 border-primary-600 bg-linear-to-b from-primary-100/70 via-primary-50 to-pink-100/60 ring-2 ring-primary-600/50 shadow-md'
                        : 'border-2 border-primary-200 bg-linear-to-b from-primary-50/60 via-white to-pink-50/40 hover:border-primary-400 hover:shadow-xs'
                        }`}
                    >
                      {/* Top Bar: badge and selection circle */}
                      <div className="flex items-center justify-between">
                        <span className="w-6 h-6 rounded bg-[#001e36] text-[#31a8ff] font-black text-[10px] flex items-center justify-center shadow-xs">
                          {sourceType === 'story' ? 'St' : 'Ps'}
                        </span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${tempSelectedPostId === 'all-media'
                            ? 'border-primary-600 bg-primary-600 text-white'
                            : 'border-slate-300 bg-white/80'
                            }`}
                        >
                          {tempSelectedPostId === 'all-media' && <Check size={12} className="stroke-[3]" />}
                        </div>
                      </div>

                      {/* Center: Glowing Primary Squircle Icon */}
                      <div className="flex flex-col items-center justify-center my-auto">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                          <Zap size={20} className="fill-white" />
                        </div>
                        <p className="text-xs font-bold text-primary-700 text-center leading-tight mt-2.5">
                          {sourceType === 'story' ? 'All Active Stories' : 'Next Post or Reel'}
                        </p>
                      </div>
                    </div>

                    {/* 2. Media Cards */}
                    {currentMediaList.map((post: any) => {
                      const isSelected = tempSelectedPostId === post.id;
                      const postLabel = post.autodm_media_label || (post.type === 'video' ? 'Reel' : (sourceType === 'story' ? 'Story' : 'Post'));
                      return (
                        <div
                          key={post.id}
                          onClick={() => setTempSelectedPostId(post.id)}
                          className={`group relative aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all bg-slate-900 select-none ${isSelected
                            ? 'border-2 border-primary-600 ring-2 ring-primary-600 shadow-md'
                            : 'border border-slate-200 hover:border-primary-400 hover:shadow-xs'
                            }`}
                        >
                          <img
                            src={post.thumbnail || post.thumbnail_url || post.media_url}
                            alt={post.title || post.caption || 'Instagram media'}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />

                          {/* Top Right Checkbox / Selection */}
                          <div className="absolute top-2 right-2">
                            <div
                              className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${isSelected
                                ? 'bg-primary-600 text-white shadow-md'
                                : 'bg-black/40 border border-white/50 text-transparent group-hover:border-white'
                                }`}
                            >
                              <Check size={11} className={isSelected ? 'stroke-[3]' : 'opacity-0'} />
                            </div>
                          </div>

                          {/* Bottom Left Media Badge */}
                          <div className="absolute bottom-2 left-2">
                            <div className="flex items-center gap-1 rounded bg-black/75 backdrop-blur-xs px-1.5 py-0.5 text-[9px] font-bold text-white">
                              <Film size={10} />
                              <span className="capitalize">{postLabel}</span>
                            </div>
                          </div>

                          {/* Hover Overlay Title */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                            <p className="text-[10px] font-semibold text-white line-clamp-2 leading-tight">
                              {post.title || post.caption || `@${activeAccount.username}`}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {currentMediaList.length === 0 && (
                    <div className="py-12 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 space-y-2">
                      <p className="font-bold text-slate-700">
                        {sourceType === 'story'
                          ? 'No active 24-hour stories found on Instagram.'
                          : 'No cached posts or reels found.'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {sourceType === 'story'
                          ? 'You can choose "All Active Stories" above, or publish a story to Instagram and click "Refresh from Instagram".'
                          : 'Click "Refresh from Instagram" above to sync latest media directly from Meta.'}
                      </p>
                    </div>
                  )}

                  {/* Load More Button for Pagination */}
                  {(sourceType === 'story' ? hasMoreStories : hasMoreMedia) && (
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                      className="w-full mt-3 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                    >
                      {isLoadingMore ? <Loader2 size={13} className="animate-spin text-primary-600" /> : <ChevronDown size={13} />}
                      <span>{isLoadingMore ? 'Fetching more from Instagram...' : 'Load More Older Content'}</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 bg-slate-50/80 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">
                  {tempSelectedPostId === 'all-media'
                    ? (sourceType === 'story' ? 'All Active Stories' : 'All Posts & Reels')
                    : '1 media item selected'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMediaModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmMediaModal}
                  className="rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  Confirm Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. Module Navigation Tab Strip */}
      <InstagramNav />

      {/* 2. Top Action Controls Bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/instagram/autodm">
            <Button variant="secondary" size="sm" icon={ArrowLeft}>
              Back to Funnels
            </Button>
          </Link>
          {isEditMode && (
            <Badge variant="subtle" color="purple" size="sm">
              Editing Campaign #{editId}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setStatus('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${status === 'active' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
            </button>
            <button
              type="button"
              onClick={() => setStatus('draft')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${status === 'draft' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
            >
              Draft
            </button>
          </div>

          <Button
            variant="gradient"
            size="sm"
            icon={isEditMode ? Save : Zap}
            onClick={handlePublish}
            disabled={isSubmitting || isLoadingCampaign}
          >
            {isSubmitting
              ? (isEditMode ? 'Saving Changes...' : 'Launching...')
              : (isEditMode ? 'Save Changes' : 'Launch Automation')}
          </Button>
        </div>
      </div>

      {/* Template Quick Loader Bar */}
      <div className="rounded-2xl border border-primary-200/80 bg-gradient-to-r from-primary-50/70 via-indigo-50/40 to-pink-50/30 p-4 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-900">One-Click Funnel Templates</h4>
            <p className="text-[11px] text-slate-500">Instant setup with proven high-converting keywords and DM copy.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {(apiTemplates.length > 0
            ? apiTemplates.slice(0, 4)
            : [
              { id: 'playbook', title: 'AI Playbook', badge: 'Lead Magnet' },
              { id: 'webinar', title: 'VIP Webinar', badge: 'Event' },
              { id: 'discount', title: 'Promo Code', badge: 'Offer' },
              { id: 'vault', title: 'Viral Vault', badge: 'Resource' },
            ]
          ).map((tmpl: any) => (
            <button
              key={tmpl.id || tmpl.slug}
              type="button"
              onClick={() => {
                if (apiTemplates.length > 0) {
                  const found = apiTemplates.find((t) => t.id === tmpl.id || t.slug === tmpl.slug);
                  if (found) applyTemplate(found);
                } else if (PRESET_TEMPLATES[tmpl.id]) {
                  applyTemplate(PRESET_TEMPLATES[tmpl.id]);
                }
              }}
              className="px-3 py-1.5 rounded-xl border border-primary-200 bg-white text-xs font-bold text-primary-700 hover:bg-primary-50 hover:border-primary-300 transition-all cursor-pointer shadow-2xs flex items-center gap-1.5"
            >
              <span>{tmpl.title}</span>
              {tmpl.badge && (
                <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-primary-100 text-primary-800 font-extrabold">
                  {tmpl.badge}
                </span>
              )}
            </button>
          ))}

          {apiTemplates.length > 4 && (
            <Dropdown>
              <Dropdown.Trigger asChild>
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                >
                  <span>More Templates ({apiTemplates.length - 4})</span>
                  <ChevronDown size={13} className="text-slate-400" />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align="right" width="w-56">
                <div className="space-y-0.5 max-h-60 overflow-y-auto">
                  {apiTemplates.slice(4).map((tmpl) => (
                    <Dropdown.Item
                      key={tmpl.id}
                      onClick={() => applyTemplate(tmpl)}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 text-xs">{tmpl.title}</span>
                        {tmpl.category && <span className="text-[10px] text-slate-400">{tmpl.category}</span>}
                      </div>
                    </Dropdown.Item>
                  ))}
                </div>
              </Dropdown.Content>
            </Dropdown>
          )}
        </div>
      </div>

      {/* 3. Main Workbench (7 Cols Configuration | 5 Cols Sticky Phone Simulator) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: CREATOR WORKBENCH (7 Cols) */}
        <div className="xl:col-span-7 space-y-6">
          {/* Card 1: 1. SELECT CONTENT */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-700">1. Select Content</h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-700 border border-emerald-200">
                  <Check size={10} /> @{activeAccount.username}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLiveRefresh}
                  disabled={isRefreshingLive}
                  className="text-xs font-bold text-slate-500 hover:text-primary-600 flex items-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 disabled:opacity-50"
                  title="Sync latest posts/stories live from Instagram"
                >
                  <RefreshCw size={12} className={isRefreshingLive ? 'animate-spin text-primary-600' : ''} />
                  <span>{isRefreshingLive ? 'Syncing...' : 'Refresh'}</span>
                </button>
                {!(sourceType === 'story' && stories.length === 0) && (
                  <button
                    type="button"
                    onClick={openMediaModal}
                    className="text-xs font-bold text-primary-600 hover:text-primary-800 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Show all {sourceType === 'story' ? 'stories' : 'posts'} →
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-500">
              {sourceType === 'story'
                ? 'Choose the story to monitor for keyword-triggered story replies.'
                : 'Choose the post or reel to monitor for keyword-triggered replies.'}
            </p>

            {/* Source Switcher: Post/Reel vs Story */}
            <div className="relative inline-flex p-1 bg-primary-50/80 rounded-2xl border border-primary-200/80 shadow-2xs">
              <button
                type="button"
                onClick={() => {
                  setSourceType('media');
                  setSelectedPostId((prev) => (prev === 'all-media' ? 'all-media' : (recentPosts[0]?.id || 'all-media')));
                  setPreviewTab('content');
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${sourceType === 'media'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-primary-900 hover:text-primary-950'
                  }`}
              >
                Post / Reel
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceType('story');
                  setSelectedPostId('all-media');
                  setPreviewTab('content');
                }}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${sourceType === 'story'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-primary-900 hover:text-primary-950'
                  }`}
              >
                Story
              </button>
            </div>

            {/* Media Selector Cards Carousel */}
            <div className="pt-2">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {/* Global Trigger Option */}
                <div
                  onClick={() => {
                    setSelectedPostId('all-media');
                    setPreviewTab('content');
                  }}
                  className={`group relative aspect-square rounded-2xl border cursor-pointer overflow-hidden p-3 flex flex-col justify-between transition-all ${selectedPostId === 'all-media'
                    ? 'border-primary-600 bg-primary-50/70 ring-2 ring-primary-600 shadow-md'
                    : 'border-slate-200 bg-slate-50/60 hover:border-primary-300 hover:bg-white'
                    }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
                      <Layers size={16} />
                    </div>
                    {selectedPostId === 'all-media' && (
                      <span className="w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center text-[10px]">
                        <Check size={11} />
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="inline-block rounded bg-black/80 text-white px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider mb-1">
                      GLOBAL
                    </span>
                    <p className="text-[11px] font-black text-slate-900 leading-tight">
                      {sourceType === 'story' ? 'All Active Stories' : 'All Posts & Reels'}
                    </p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {sourceType === 'story' ? 'Any active or future story' : 'Current & future posts'}
                    </p>
                  </div>
                </div>

                {/* Media Cards or In-Grid Empty State */}
                {sourceType === 'story' && isStoriesLoading && stories.length === 0 ? (
                  <div className="aspect-square rounded-2xl border border-dashed border-primary-200 bg-primary-50/30 flex flex-col items-center justify-center gap-2 p-3 text-center">
                    <Loader2 size={18} className="animate-spin text-primary-600" />
                    <span className="text-[10px] font-bold text-primary-800">Checking Stories...</span>
                  </div>
                ) : sourceType === 'story' && stories.length === 0 ? (
                  <div className="col-span-1 sm:col-span-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 p-4 flex flex-col justify-center gap-2 select-none">
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-xs">
                      <Info size={15} className="text-primary-600 shrink-0" />
                      <span>No active 24-hour stories on @{activeAccount.username}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Instagram stories disappear after 24 hours. Because <strong className="text-slate-700 font-bold">All Active Stories</strong> is selected on the left, your automation will automatically reply whenever viewers interact with any current or upcoming story!
                    </p>
                    <div className="pt-0.5 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleLiveRefresh}
                        disabled={isRefreshingLive}
                        className="text-[11px] font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <RefreshCw size={11} className={isRefreshingLive ? 'animate-spin' : ''} />
                        <span>{isRefreshingLive ? 'Checking Instagram...' : 'Posted a story? Tap to Refresh'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  currentMediaList.slice(0, 3).map((post: any) => {
                    const isSelected = selectedPostId === post.id;
                    const label = post.autodm_media_label || (post.type === 'video' ? 'Reel' : (sourceType === 'story' ? 'Story' : 'Post'));
                    return (
                      <div
                        key={post.id}
                        onClick={() => {
                          setSelectedPostId(post.id);
                          setPreviewTab('content');
                        }}
                        className={`group relative aspect-square rounded-2xl border cursor-pointer overflow-hidden bg-slate-950 transition-all ${isSelected
                          ? 'border-primary-600 ring-2 ring-primary-600 shadow-md'
                          : 'border-slate-200 hover:border-primary-400 hover:shadow-xs'
                          }`}
                      >
                        <img
                          src={post.thumbnail || post.thumbnail_url || post.media_url}
                          alt={post.title || post.caption || 'Instagram media'}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />

                        {/* Top Selection Checkmark Badge */}
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-md animate-in zoom-in-75">
                            <Check size={12} className="stroke-[3]" />
                          </div>
                        )}

                        {/* Bottom Tag */}
                        <div className="absolute bottom-2 left-2">
                          <span className="rounded bg-black/85 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-black uppercase text-white tracking-wider">
                            {label}
                          </span>
                        </div>

                        {/* Hover Overlay with Title */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                          <p className="text-[10px] font-bold text-white line-clamp-2 leading-tight">
                            {post.title || post.caption || `@${activeAccount.username}`}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Showing count and pagination navigation footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 mt-3">
                {sourceType === 'story' && stories.length === 0 ? (
                  <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
                    <Check size={12} className="text-emerald-600 stroke-[3]" />
                    <span>AutoDM is armed to monitor all current & future stories</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={openMediaModal}
                    className="text-[11px] font-bold text-primary-600 hover:text-primary-800 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    Show all {sourceType === 'story' ? 'stories' : 'posts & reels'} ({currentMediaList.length + 1}) →
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={openMediaModal}
                    className="px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors text-xs font-semibold cursor-pointer"
                  >
                    Browse Library
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Card 2: Trigger Keywords Engine */}
          <div className="rounded-2xl border border-primary-200/80 bg-linear-to-br from-white to-primary-50/20 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-primary-900">2. Comment Trigger Keywords</span>
              <span className="text-[10px] font-bold text-primary-700 bg-primary-100 px-2 py-0.5 rounded-full">
                Case-Insensitive Exact Match
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                  Primary Trigger Keyword <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={triggerKeyword}
                  onChange={(e) => setTriggerKeyword(e.target.value.toUpperCase())}
                  onFocus={() => setPreviewTab('comment')}
                  placeholder="e.g. PLAYBOOK"
                  className="w-full uppercase font-mono font-black text-sm px-3.5 py-2.5 rounded-xl bg-white border border-primary-300 text-primary-900 text-center tracking-wider focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  When a viewer comments <strong>"{triggerKeyword || 'KEYWORD'}"</strong>, the bot triggers instantly.
                </p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 uppercase tracking-wider">
                  Secondary Trigger Aliases
                </label>
                <input
                  type="text"
                  value={aliasesInput}
                  onChange={(e) => setAliasesInput(e.target.value.toUpperCase())}
                  placeholder="e.g. BOOK, GUIDE, PDF"
                  className="w-full uppercase font-mono text-xs px-3.5 py-2.5 rounded-xl bg-white border border-primary-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Comma-separated keywords that also trigger this funnel.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3: Direct Message Payload & CTA Button Builder */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-400">3. Direct Message Payload & Buttons</span>
              <span className="text-[10px] font-bold text-slate-400">{dmMessage.length} / 1,000 chars</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">DM Opening Greeting</label>
                <input
                  type="text"
                  value={dmGreeting}
                  onChange={(e) => setDmGreeting(e.target.value)}
                  onFocus={() => setPreviewTab('dm')}
                  placeholder="Hey there! 👋"
                  className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Main Direct Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={dmMessage}
                  onChange={(e) => setDmMessage(e.target.value)}
                  onFocus={() => setPreviewTab('dm')}
                  placeholder="Write the message that will be sent directly to your follower's inbox..."
                  className="w-full text-xs p-3 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/10 outline-none leading-relaxed resize-none"
                />
              </div>

              {/* Primary Action Button */}
              <div className="p-3.5 rounded-xl border border-primary-100 bg-primary-50/30 space-y-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-primary-900 block">
                  Primary Call-to-Action Button
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Button Label</label>
                    <input
                      type="text"
                      value={buttonLabel}
                      onChange={(e) => setButtonLabel(e.target.value)}
                      onFocus={() => setPreviewTab('dm')}
                      placeholder="📥 Download Playbook (PDF)"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-primary-200 text-slate-800 outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Destination URL</label>
                    <input
                      type="url"
                      value={buttonUrl}
                      onChange={(e) => setButtonUrl(e.target.value)}
                      placeholder="https://scanmysocial.com/playbook"
                      className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-primary-200 text-slate-800 outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Optional Secondary Button */}
              {hasSecondaryButton ? (
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">
                      Secondary Action Button
                    </span>
                    <button
                      type="button"
                      onClick={() => setHasSecondaryButton(false)}
                      className="text-[10px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                    >
                      Remove Button
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <input
                        type="text"
                        value={secondaryButtonLabel}
                        onChange={(e) => setSecondaryButtonLabel(e.target.value)}
                        onFocus={() => setPreviewTab('dm')}
                        placeholder="💬 Book 1-on-1 Call"
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <input
                        type="url"
                        value={secondaryButtonUrl}
                        onChange={(e) => setSecondaryButtonUrl(e.target.value)}
                        placeholder="https://scanmysocial.com/call"
                        className="w-full text-xs px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-800 outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setHasSecondaryButton(true);
                    setPreviewTab('dm');
                  }}
                  className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1.5 p-2 rounded-xl hover:bg-primary-50 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Secondary Action Button
                </button>
              )}
            </div>
          </div>

          {/* Card 4: Smart Growth Enhancers */}
          <div className="rounded-2xl border border-emerald-200/80 bg-linear-to-br from-white to-emerald-50/20 p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Zap size={16} className="fill-emerald-600" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900">Conversion & Engagement Multipliers</h4>
                  <p className="text-[10px] text-slate-500">Skyrocket follower count and comment retention automatically</p>
                </div>
              </div>
            </div>

            {/* Enhancer 1: Follow-to-Unlock Gate */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Lock size={13} className="text-amber-600" /> Follow-to-Unlock Lead Gate
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Requires commenter to follow @{activeAccount.username} before the VIP download link unlocks.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={requireFollow}
                  onClick={() => {
                    setRequireFollow(!requireFollow);
                    setPreviewTab('dm');
                  }}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${requireFollow ? 'bg-primary-600' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${requireFollow ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>

            {/* Enhancer 2: Public Comment Auto-Reply Rotation */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <MessageSquare size={13} className="text-primary-600" /> Public Comment Auto-Reply Rotation
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Instantly replies publicly to the viewer's comment to boost post ranking in Instagram algorithm.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCommentReply}
                  onClick={() => {
                    setAutoCommentReply(!autoCommentReply);
                    setPreviewTab('comment');
                  }}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${autoCommentReply ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoCommentReply ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {autoCommentReply && (
                <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                  <div className="space-y-1.5">
                    {commentReplies.map((rep, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-4 text-[10px] font-bold text-slate-400">{idx + 1}.</span>
                        <input
                          type="text"
                          value={rep}
                          onChange={(e) => {
                            const next = [...commentReplies];
                            next[idx] = e.target.value;
                            setCommentReplies(next);
                          }}
                          onFocus={() => setPreviewTab('comment')}
                          className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-primary-500 focus:bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveCommentReply(idx)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded-md"
                          title="Remove reply variant"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="text"
                      value={newReplyInput}
                      onChange={(e) => setNewReplyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCommentReply();
                        }
                      }}
                      onFocus={() => setPreviewTab('comment')}
                      placeholder="Add another comment reply variant..."
                      className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 outline-none focus:border-primary-500"
                    />
                    <Button variant="secondary" size="xs" onClick={handleAddCommentReply}>
                      Add Variant
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Enhancer 3: Smart 2-Hour Follow-up Reminder */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    <Clock size={13} className="text-blue-600" /> Automated Follow-up Reminder
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Sends a gentle follow-up DM if the user has not clicked the link after 2 hours.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={enableReminder}
                  onClick={() => setEnableReminder(!enableReminder)}
                  className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enableReminder ? 'bg-blue-600' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${enableReminder ? 'translate-x-5' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {enableReminder && (
                <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                  <textarea
                    rows={2}
                    value={reminderMessage}
                    onChange={(e) => setReminderMessage(e.target.value)}
                    placeholder="Follow up message..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 outline-none focus:border-primary-500 resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: STICKY INSTAGRAM PHONE PREVIEW SIMULATOR (5 Cols) */}
        <div className="xl:col-span-5 order-2 xl:order-2 h-fit xl:sticky xl:top-6">
          <PreviewPhone
            scene={previewTab}
            onSceneChange={(s) => setPreviewTab(s)}
            handle={activeAccount.username}
            accountProfileImageUrl={activeAccount.avatar}
            selectedMedia={selectedMedia}
            sourceType={sourceType}
            caption={selectedMedia?.title || 'Turn your Instagram comments into sales on autopilot. Comment PLAYBOOK below to get free instant access! 🚀'}
            triggerKeyword={triggerKeyword}
            dmGreeting={dmGreeting}
            dmMessage={dmMessage}
            buttonLabel={buttonLabel}
            buttonUrl={buttonUrl}
            hasSecondaryButton={hasSecondaryButton}
            secondaryButtonLabel={secondaryButtonLabel}
            secondaryButtonUrl={secondaryButtonUrl}
            requireFollow={requireFollow}
            isFollowGateSimulated={isFollowGateSimulated}
            onToggleFollowGate={() => setIsFollowGateSimulated(!isFollowGateSimulated)}
            autoCommentReply={autoCommentReply}
            commentReplies={commentReplies}
          />
        </div>
      </div>
    </div>
  );
}

export default function CreateAutoDmPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-500">Loading AutoDM Workbench...</div>}>
      <CreateAutoDmContent />
    </Suspense>
  );
}
