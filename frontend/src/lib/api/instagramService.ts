export interface ConnectedAccountItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  profileUrl: string;
  status: string;
  followers: number;
}

export interface ProfileOverview {
  id?: string;
  igAccountId?: string;
  username: string;
  name: string;
  avatar: string;
  profileUrl?: string;
  bio: string;
  tokenStatus: 'active' | 'expired' | 'disconnected';
  autoDmStatus: 'Active & Responding' | 'Paused' | 'Error';
  autoDmEnabled?: boolean;
  welcomeDmStatus?: 'On' | 'Off';
  keywordAutomationsCount?: number;
  avgResponseTime: string;
  connectedOn?: string;
  accountType?: string;
  stats: {
    followers: number;
    following?: number;
    totalPosts?: number;
    scheduledPosts: number;
    autoDmSent: number;
    avgEngagement: number;
  };
}

export interface ReelOutlier {
  id: string;
  title: string;
  thumbnail: string;
  views: number;
  outlierMultiplier: number;
  likes: number;
  comments: number;
  shares: number;
  saves?: number;
  permalink?: string;
  publishedDaysAgo: string;
  instagramUrl?: string;
  hasAutodm?: boolean;
  isAutodmPaused?: boolean;
  triggerKeyword?: string;
  dmMessage?: string;
}

export interface MediaAssetItem {
  id: string;
  title: string;
  originalName: string;
  mediaType: 'image' | 'video';
  url: string;
  sizeBytes: number;
  mimeType: string;
  width?: number;
  height?: number;
  aspectRatio?: number;
  createdAt: string;
}

export interface ScheduledPostItem {
  id: string;
  instagram_account_id?: string;
  caption: string;
  mediaUrl: string;
  mediaAssetIds?: number[];
  format: 'REEL' | 'CAROUSEL' | 'PHOTO' | 'STORY' | 'VIDEO' | 'IMAGE';
  scheduledTime: string;
  publishedAt?: string;
  metaMediaId?: string;
  permalink?: string;
  status: 'Scheduled' | 'Published' | 'Draft' | 'Failed' | 'Publishing' | 'Cancelled';
  hashtags: string[];
  hasAutodm?: boolean;
  autodmKeyword?: string;
  lastError?: string | null;
}

export interface CreateScheduledPostPayload {
  instagram_account_id: number | string;
  media_asset_ids: number[];
  format: 'reel' | 'carousel' | 'image' | 'story' | 'video' | 'REEL' | 'CAROUSEL' | 'IMAGE' | 'STORY' | 'VIDEO';
  caption?: string;
  hashtags?: string[];
  scheduledTime?: string;
  publish_now?: boolean;
  hasAutodm?: boolean;
  autodmKeyword?: string;
  autodmReplyText?: string;
}

export interface AutoDmCampaignItem {
  id: string;
  accountId?: string;
  accountUsername?: string;
  accountAvatar?: string | null;
  name: string;
  keyword: string;
  secondaryKeywords?: string[];
  triggerType: string;
  triggerValue?: string;
  thumbnailUrl?: string | null;
  primaryDmMessage: string;
  openingButtonText?: string;
  followGateRequired: boolean;
  hasReminders: boolean;
  reminderDelayHours: number;
  autoCommentReply: boolean;
  commentReplies?: string[];
  dmsSent: number;
  clicks: number;
  conversionRate: number;
  status: 'active' | 'paused' | 'Active' | 'Paused';
  createdAt: string;
}

export interface AutoDmPerformanceMetrics {
  totalSent: number;
  totalClicks: number;
  avgCtr: string;
  activeCount: number;
  totalCount: number;
  sentLast7Days: number;
}

export interface AutoDmDashboardData {
  campaigns: AutoDmCampaignItem[];
  performance: AutoDmPerformanceMetrics;
  accounts: { id: string; username: string; avatar: string | null }[];
}

export interface CreateAutoDmPayload {
  instagram_account_id?: string | number;
  accountId?: string | number;
  title?: string;
  name?: string;
  triggerKeyword?: string;
  keyword?: string;
  aliases?: string[] | string;
  secondaryKeywords?: string[];
  sourceType?: string;
  triggerType?: string;
  selectedPostId?: string;
  triggerValue?: string;
  triggerMediaUrl?: string;
  thumbnailUrl?: string;
  dmGreeting?: string;
  dmMessage?: string;
  primaryDmMessage?: string;
  buttonLabel?: string;
  openingButtonText?: string;
  buttonUrl?: string;
  requireFollow?: boolean;
  ask_to_follow_enabled?: boolean;
  enableReminder?: boolean;
  reminder_enabled?: boolean;
  reminderDelayHours?: number;
  reminderMessage?: string;
  autoCommentReply?: boolean;
  public_reply_enabled?: boolean;
  commentReplies?: string[];
  status?: 'active' | 'paused';
}

export interface AutoDmTemplateItem {
  id: string;
  slug: string;
  title: string;
  name: string;
  description: string;
  badge: string;
  category: string;
  triggerKeyword: string;
  keyword: string;
  aliases: string[];
  aliasesInput: string;
  dmMessage: string;
  buttonLabel: string;
  buttonUrl: string;
  autoCommentReply: boolean;
  commentReplies: string[];
  requireFollow: boolean;
  enableReminder: boolean;
  reminderDelayHours: number;
  reminderMessage: string;
}

export interface MetricComparison {
  current: number;
  previous: number;
  delta: number;
  delta_percent: number | null;
  trend: 'up' | 'down' | 'neutral' | 'none';
}

export interface AnalyticsOverview {
  posts: number;
  reach: number;
  impressions: number;
  engagement: number;
  followers: number;
  last_synced_at: string | null;
  has_data: boolean;
  comparison: {
    posts: MetricComparison;
    reach: MetricComparison;
    impressions: MetricComparison;
    engagement: MetricComparison;
  };
}

export interface DailyMetricPoint {
  date: string;
  reach: number;
  impressions: number;
  engagement: number;
  followers?: number;
  profile_views?: number;
}

export interface FormatBreakdownItem {
  format: string;
  label: string;
  count: number;
  share_percent: number;
}

export interface AutodmAnalyticsSummary {
  total_automations: number;
  active_automations: number;
  paused_automations: number;
  automations_sent: number;
  conversion_rate: number;
  runs_last_7_days: number;
}

export interface StoryAnalyticsSummary {
  total_stories: number;
  reach: number;
  replies: number;
  taps_forward: number;
  taps_back: number;
  exits: number;
  completion_rate: number;
}

export interface AnalyticsSummary {
  accounts?: ConnectedAccountItem[];
  selected_account_id?: string | null;
  selected_account?: ConnectedAccountItem | null;
  has_active_account?: boolean;
  date_range?: { start: string; end: string; days: number };
  overview?: AnalyticsOverview;
  daily_metrics?: DailyMetricPoint[];
  format_breakdown?: FormatBreakdownItem[];
  top_performing_reels?: ReelOutlier[];
  autodm_analytics?: AutodmAnalyticsSummary;
  story_analytics?: StoryAnalyticsSummary;

  // Backward compatibility fields
  followerVelocity: { date: string; followers: number }[];
  reachVelocity: { date: string; impressions: number }[];
  topPerformingReels: ReelOutlier[];
  autoDmConversionRate: number;
  totalAutomationsTriggered: number;
  avgOutlierScore: number;
  totalFollowers?: number;
  followersGrowth?: number;
  accountsReached?: number;
  totalImpressions?: number;
}

import { getAuthHeaders } from "./authService";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

// Client API functions

export interface ProfileFilterParams {
  format?: 'all' | 'post' | 'reel' | 'story' | 'carousel';
  autodm?: 'all' | 'active' | 'paused' | 'none';
  datePreset?: 'all_time' | 'last_7_days' | 'last_30_days' | 'this_month';
  start?: string;
  end?: string;
  outlier?: 'all' | 'outliers';
}

export interface ProfileFiltersMetadata {
  format: string;
  autodm: string;
  date_preset: string;
  start: string | null;
  end: string | null;
  outlier: string;
  options: {
    format: { value: string; label: string }[];
    autodm: { value: string; label: string }[];
    date_presets: { value: string; label: string }[];
  };
}

export async function getInstagramProfile(
  accountId?: string,
  filters?: ProfileFilterParams
): Promise<{
  profile: ProfileOverview | null;
  accounts: ConnectedAccountItem[];
  posts: ReelOutlier[];
  filters?: ProfileFiltersMetadata;
}> {
  try {
    const params = new URLSearchParams();
    if (accountId) params.set("instagram_account_id", accountId);
    if (filters?.format && filters.format !== 'all') params.set("format", filters.format);
    if (filters?.autodm && filters.autodm !== 'all') params.set("autodm", filters.autodm);
    if (filters?.datePreset && filters.datePreset !== 'all_time') params.set("date_preset", filters.datePreset);
    if (filters?.start) params.set("start", filters.start);
    if (filters?.end) params.set("end", filters.end);
    if (filters?.outlier && filters.outlier !== 'all') params.set("outlier", filters.outlier);

    const queryString = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE_URL}/instagram/profile${queryString}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch profile");
    return await res.json();
  } catch (error) {
    return {
      profile: null,
      accounts: [],
      posts: [],
    };
  }
}

export async function saveReelAutoDm(payload: {
  instagram_account_id: string;
  instagram_media_id: string;
  keyword: string;
  dmMessage: string;
}): Promise<{ success: boolean; message: string; flow: unknown }> {
  const res = await fetch(`${API_BASE_URL}/instagram/profile/autodm`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to save AutoDM for reel");
  return data;
}

export async function toggleReelAutoDmPause(mediaId: string): Promise<{ success: boolean; isPaused: boolean }> {
  const res = await fetch(`${API_BASE_URL}/instagram/profile/autodm/${encodeURIComponent(mediaId)}/toggle-pause`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Failed to toggle AutoDM status");
  return data;
}

export async function syncInstagramProfileData(accountId?: string): Promise<{ success: boolean; lastSynced: string; synced_count?: number; message?: string }> {
  const res = await fetch(`${API_BASE_URL}/instagram/profile/sync`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(accountId ? { instagram_account_id: accountId } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || "Sync failed");
  return data;
}

export interface SchedulerNoteItem {
  id: string;
  date: string;
  content: string;
  color?: string;
}

export interface CalendarResponse {
  posts: ScheduledPostItem[];
  notes: SchedulerNoteItem[];
}

export async function uploadMediaAsset(file: File, title?: string): Promise<MediaAssetItem> {
  const formData = new FormData();
  formData.append('media', file);
  if (title) formData.append('title', title);

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('viralyzer_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}/instagram/media`, {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || (data.errors ? Object.values(data.errors).flat().join(' ') : 'Media upload failed');
    throw new Error(msg);
  }
  return data;
}

export async function getMediaLibrary(params?: { type?: string; search?: string }): Promise<{ media: MediaAssetItem[]; total: number }> {
  try {
    const q = new URLSearchParams();
    if (params?.type) q.append('type', params.type);
    if (params?.search) q.append('search', params.search);

    const res = await fetch(`${API_BASE_URL}/instagram/media?${q.toString()}`, {
      cache: 'no-store',
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { media: [], total: 0 };
    return await res.json();
  } catch {
    return { media: [], total: 0 };
  }
}

export async function deleteMediaAsset(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/instagram/media/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete media asset');
  }
}

export async function getScheduledCalendar(accountId?: string, status?: string): Promise<CalendarResponse> {
  try {
    const params = new URLSearchParams();
    if (accountId) params.set('instagram_account_id', accountId);
    if (status) params.set('status', status);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE_URL}/instagram/calendar${queryString}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch calendar");
    const data = await res.json();
    if (Array.isArray(data)) {
      return { posts: data, notes: [] };
    }
    return {
      posts: data.posts || [],
      notes: data.notes || [],
    };
  } catch {
    return { posts: [], notes: [] };
  }
}

export async function createSchedulerNote(note: { date: string; content: string; color?: string }): Promise<SchedulerNoteItem> {
  const res = await fetch(`${API_BASE_URL}/instagram/notes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error("Failed to create strategy note");
  return await res.json();
}

export async function updateSchedulerNote(
  id: string,
  note: { content: string; color?: string }
): Promise<SchedulerNoteItem> {
  const res = await fetch(`${API_BASE_URL}/instagram/notes/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(note),
  });
  if (!res.ok) throw new Error("Failed to update strategy note");
  return await res.json();
}

export async function deleteSchedulerNote(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/instagram/notes/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete strategy note");
}

export async function createScheduledPost(post: CreateScheduledPostPayload): Promise<ScheduledPostItem> {
  const res = await fetch(`${API_BASE_URL}/instagram/scheduler`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(post),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data.message || (data.errors ? Object.values(data.errors).flat().join(' ') : 'Failed to create scheduled post');
    const err: any = new Error(msg);
    err.status = res.status;
    err.data = data;
    err.code = data.code;
    throw err;
  }
  return data;
}

export async function deleteScheduledPost(id: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/instagram/scheduler/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to delete scheduled post');
  }
}

export async function retryScheduledPost(id: string): Promise<ScheduledPostItem> {
  const res = await fetch(`${API_BASE_URL}/instagram/scheduler/${encodeURIComponent(id)}/retry`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Failed to retry scheduled post');
  }
  return data;
}

export async function getPresetHashtags(): Promise<{ category: string; tags: string[] }[]> {
  const res = await fetch(`${API_BASE_URL}/instagram/hashtags`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch hashtags");
  return await res.json();
}

export async function getAutoDmDashboard(accountId?: string): Promise<AutoDmDashboardData> {
  try {
    const url = accountId
      ? `${API_BASE_URL}/instagram/autodm?instagram_account_id=${encodeURIComponent(accountId)}`
      : `${API_BASE_URL}/instagram/autodm`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch autodm dashboard");
    const data = await res.json();
    if (Array.isArray(data)) {
      return {
        campaigns: data,
        performance: {
          totalSent: 0,
          totalClicks: 0,
          avgCtr: '0%',
          activeCount: data.filter((c: any) => c.status?.toLowerCase() === 'active').length,
          totalCount: data.length,
          sentLast7Days: 0,
        },
        accounts: [],
      };
    }
    return data;
  } catch (error) {
    return {
      campaigns: [],
      performance: {
        totalSent: 0,
        totalClicks: 0,
        avgCtr: '0%',
        activeCount: 0,
        totalCount: 0,
        sentLast7Days: 0,
      },
      accounts: [],
    };
  }
}

export async function getAutoDmCampaigns(): Promise<AutoDmCampaignItem[]> {
  const data = await getAutoDmDashboard();
  return data.campaigns;
}

export async function createAutoDmCampaign(payload: CreateAutoDmPayload): Promise<AutoDmCampaignItem> {
  const res = await fetch(`${API_BASE_URL}/instagram/autodm`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create AutoDM campaign");
  }
  return await res.json();
}

export async function getAutoDmCampaign(id: string): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/instagram/autodm/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to fetch AutoDM campaign");
  }
  return await res.json();
}

export async function updateAutoDmCampaign(id: string, payload: CreateAutoDmPayload): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/instagram/autodm/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update AutoDM campaign");
  }
  return await res.json();
}

export async function getAutoDmTemplates(): Promise<AutoDmTemplateItem[]> {
  try {
    const res = await fetch(`${API_BASE_URL}/instagram/autodm/templates`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function toggleAutoDmStatus(id: string, status?: 'Active' | 'Paused' | 'active' | 'paused'): Promise<{ success: boolean; status: string }> {
  const res = await fetch(`${API_BASE_URL}/instagram/autodm/${id}`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify(status ? { status } : {}),
  });
  if (!res.ok) throw new Error("Failed to toggle status");
  return await res.json();
}

export async function duplicateAutoDmCampaign(id: string): Promise<{ success: boolean; id: string; name: string }> {
  const res = await fetch(`${API_BASE_URL}/instagram/autodm/${id}/duplicate`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to duplicate campaign");
  return await res.json();
}

export async function deleteAutoDmCampaign(id: string): Promise<{ deleted: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/instagram/autodm/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete campaign");
  return await res.json();
}

export interface AutoDmMediaItem {
  id: string;
  title: string;
  caption?: string;
  thumbnail: string;
  thumbnail_url: string;
  media_url: string;
  permalink?: string;
  instagramUrl?: string;
  media_type?: string;
  media_product_type?: string;
  timestamp?: string;
  autodm_source: 'media' | 'story';
  autodm_trigger_type: 'post' | 'reel' | 'story';
  autodm_media_label: 'Post' | 'Reel' | 'Story';
}

export interface FetchAutoDmMediaResponse {
  media: AutoDmMediaItem[];
  source: 'media' | 'story';
  cached?: boolean;
  refreshed?: boolean;
  paging: {
    next_cursor: string | null;
    has_next_page: boolean;
  };
}

export interface FetchAutoDmMediaOptions {
  source?: 'media' | 'story';
  refresh?: boolean;
  after?: string | null;
  limit?: number;
  mediaId?: string;
}

export async function fetchAutoDmMedia(
  accountId: string,
  options: FetchAutoDmMediaOptions = {}
): Promise<FetchAutoDmMediaResponse> {
  const params = new URLSearchParams();
  if (options.source) params.set('source', options.source);
  if (options.refresh) params.set('refresh', 'true');
  if (options.after) params.set('after', options.after);
  if (options.limit) params.set('limit', String(options.limit));
  if (options.mediaId) params.set('media_id', options.mediaId);

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await fetch(`${API_BASE_URL}/instagram/autodm/media/${accountId}${query}`, {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to fetch media');
  }

  return await res.json();
}

export async function getInstagramAnalytics(accountId?: string, period: string = '30d'): Promise<AnalyticsSummary> {
  try {
    const params = new URLSearchParams();
    if (period) params.append('period', period);
    if (accountId) params.append('instagram_account_id', accountId);

    const res = await fetch(`${API_BASE_URL}/instagram/analytics?${params.toString()}`, {
      cache: "no-store",
      headers: getAuthHeaders(),
    });
    if (!res.ok) throw new Error("Failed to fetch analytics");
    return await res.json();
  } catch (error) {
    return {
      followerVelocity: [],
      reachVelocity: [],
      topPerformingReels: [],
      autoDmConversionRate: 0,
      totalAutomationsTriggered: 0,
      avgOutlierScore: 0,
    };
  }
}

export async function syncInstagramAnalytics(accountId?: string): Promise<{ message: string; account_id?: string; status?: string }> {
  const res = await fetch(`${API_BASE_URL}/instagram/analytics/sync`, {
    method: "POST",
    headers: {
      ...getAuthHeaders(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ instagram_account_id: accountId }),
  });
  if (!res.ok) throw new Error("Failed to initiate analytics sync");
  return await res.json();
}

export async function getUserInstagramIntegrations(): Promise<{
  accounts: Array<{
    id: string;
    ig_account_id: string;
    username: string;
    displayName: string;
    avatar: string;
    profile_url: string;
    followers: string;
    status: string;
    welcomeDmEnabled: boolean;
    welcomeDmVariants: string[];
  }>;
  limitMeta: {
    connectedCount: number;
    accountLimit: number;
    canConnectMore: boolean;
    hasPaidPlan: boolean;
    activePlanTier: string;
  };
}> {
  const res = await fetch(`${API_BASE_URL}/user/integrations/instagram`, {
    cache: "no-store",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch Instagram integrations");
  return await res.json();
}

export async function toggleInstagramWelcomeDm(id: string): Promise<{ success: boolean; welcomeDmEnabled: boolean }> {
  const res = await fetch(`${API_BASE_URL}/user/integrations/instagram/${id}/welcome-dm`, {
    method: "PATCH",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to toggle Welcome DM status");
  return await res.json();
}

export async function updateInstagramWelcomeDmMessages(id: string, variants: string[]): Promise<{ success: boolean; welcomeDmVariants: string[] }> {
  const res = await fetch(`${API_BASE_URL}/user/integrations/instagram/${id}/welcome-dm-messages`, {
    method: "PATCH",
    headers: getAuthHeaders(),
    body: JSON.stringify({ variants }),
  });
  if (!res.ok) throw new Error("Failed to update Welcome DM message variants");
  return await res.json();
}

export async function disconnectInstagramAccount(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE_URL}/user/integrations/instagram/${id}`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error("Failed to disconnect account");
  return await res.json();
}

export async function getInstagramConnectUrl(reconnectAccountId?: string): Promise<{ success: boolean; url: string; error?: string }> {
  const params = new URLSearchParams();
  if (reconnectAccountId) {
    params.set("reconnect_account_id", reconnectAccountId);
  }
  const query = params.toString() ? `?${params.toString()}` : "";

  const res = await fetch(`${API_BASE_URL}/user/integrations/instagram/connect-url${query}`, {
    headers: getAuthHeaders(),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Failed to generate Meta OAuth URL");
  }
  return data;
}

