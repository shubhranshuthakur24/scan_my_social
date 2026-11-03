import { getAuthHeaders } from './authService';
import type {
  ChannelItem,
  ScrapeResponse,
  ScrapeStatusResponse,
  WatchlistItem,
  ProjectItem,
  SavedFilterItem,
  ContentLibraryFilters,
  PostsPaginatedResponse,
  PostDetailResponse,
  GeneratedScriptData,
} from '@/types/contentLibrary';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Fetch discovery posts with server-side filters, search, sorting, and pagination.
 */
export async function getPosts(filters?: ContentLibraryFilters, signal?: AbortSignal): Promise<PostsPaginatedResponse> {
  const url = new URL(`${API_BASE_URL}/posts`);

  if (filters) {
    if (filters.search) url.searchParams.set('search', filters.search);
    if (filters.page) url.searchParams.set('page', String(filters.page));
    if (filters.per_page) url.searchParams.set('per_page', String(filters.per_page));
    if (filters.sort_by) url.searchParams.set('sort_by', filters.sort_by);
    if (filters.sort_dir) url.searchParams.set('sort_dir', filters.sort_dir);

    if (filters.platform && filters.platform.length > 0) {
      filters.platform.forEach((p) => url.searchParams.append('platform[]', p));
    }
    if (filters.creator && filters.creator.length > 0) {
      filters.creator.forEach((c) => url.searchParams.append('creator[]', c));
    }
    if (filters.watchlist && filters.watchlist.length > 0) {
      filters.watchlist.forEach((w) => url.searchParams.append('watchlist[]', String(w)));
    }
    if (filters.project && filters.project.length > 0) {
      filters.project.forEach((pr) => url.searchParams.append('project[]', String(pr)));
    }
    if (filters.label && filters.label.length > 0) {
      filters.label.forEach((l) => url.searchParams.append('label[]', l));
    }

    if (filters.engagement_min !== undefined && filters.engagement_min !== null) {
      url.searchParams.set('engagement_min', String(filters.engagement_min));
    }
    if (filters.engagement_max !== undefined && filters.engagement_max !== null) {
      url.searchParams.set('engagement_max', String(filters.engagement_max));
    }
    if (filters.views_min !== undefined && filters.views_min !== null) {
      url.searchParams.set('views_min', String(filters.views_min));
    }
    if (filters.views_max !== undefined && filters.views_max !== null) {
      url.searchParams.set('views_max', String(filters.views_max));
    }
    if (filters.outlier_min !== undefined && filters.outlier_min !== null) {
      url.searchParams.set('outlier_min', String(filters.outlier_min));
    }
    if (filters.outlier_max !== undefined && filters.outlier_max !== null) {
      url.searchParams.set('outlier_max', String(filters.outlier_max));
    }
    if (filters.date_value && filters.date_value > 0) {
      url.searchParams.set('date_value', String(filters.date_value));
      url.searchParams.set('date_unit', filters.date_unit || 'Days');
    }
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
    signal,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch posts: ${res.status}`);
  }

  return res.json();
}

/**
 * Fetch a single post detail with user unlock flags and scoped analysis.
 */
export async function getPost(id: string | number): Promise<PostDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/posts/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch post: ${res.status}`);
  }

  return res.json();
}

/**
 * Unlock / trigger audio transcription for a post.
 */
export async function transcribePost(id: string | number): Promise<{
  status: string;
  global_status?: string;
  message?: string;
  transcription?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/posts/${id}/transcribe`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to request transcription.');
  }

  return data;
}

/**
 * Poll audio transcription status for a post.
 */
export async function getTranscriptionStatus(id: string | number): Promise<{
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  global_status?: string;
  transcription?: string;
  error?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/posts/${id}/transcription-status`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to poll transcription status.');
  }

  return data;
}

/**
 * Unlock / trigger AI strategic analysis for a post.
 */
export async function analyzePost(
  id: string | number,
  language: string = 'English'
): Promise<{
  status: string;
  global_status?: string;
  message?: string;
  analysis?: Record<string, unknown>;
}> {
  const res = await fetch(`${API_BASE_URL}/posts/${id}/analyze`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ analysis_language: language }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to start AI analysis.');
  }

  return data;
}

/**
 * Poll AI analysis status for a post.
 */
export async function getAnalysisStatus(id: string | number): Promise<{
  status: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  global_status?: string;
  analysis?: Record<string, unknown>;
  error?: string;
}> {
  const res = await fetch(`${API_BASE_URL}/posts/${id}/analysis-status`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to poll analysis status.');
  }

  return data;
}

/**
 * Process a post through the complete content workflow (creates generated script).
 */
export async function processPost(id: string | number): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE_URL}/posts/${id}/process`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to process post.');
  }

  return data;
}

/* =========================================================================
   COMPETITOR CHANNELS
   ========================================================================= */

export async function getChannels(params?: { search?: string; page?: number }): Promise<{
  data: ChannelItem[];
  current_page: number;
  last_page: number;
  total: number;
  untrack_limit?: number;
  untrack_used?: number;
  untrack_remaining?: number;
}> {
  const url = new URL(`${API_BASE_URL}/channels`);
  if (params?.search) url.searchParams.set('search', params.search);
  if (params?.page) url.searchParams.set('page', String(params.page));

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch channels.');
  }

  return res.json();
}

export async function searchChannels(query: string): Promise<ChannelItem[]> {
  const url = new URL(`${API_BASE_URL}/channels/search`);
  url.searchParams.set('q', query);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    return [];
  }

  return res.json();
}

export async function trackChannel(
  platform: string,
  channel: string
): Promise<{
  message: string;
  created_count: number;
  channels: ChannelItem[];
}> {
  const res = await fetch(`${API_BASE_URL}/channels`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      channels: [
        {
          platform,
          channel,
        },
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 207) {
    throw new Error(data.message || data.error || 'Failed to track channel.');
  }

  return data;
}

export async function untrackChannel(channelId: number): Promise<{
  message: string;
  untrack_remaining?: number;
}> {
  const res = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to untrack channel.');
  }

  return data;
}

/**
 * Trigger on-demand manual scrape for a tracked channel.
 */
export async function scrapeChannel(channelId: number): Promise<ScrapeResponse> {
  const res = await fetch(`${API_BASE_URL}/channels/${channelId}/scrape`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || data.error || 'Failed to initiate scrape.') as Error & {
      error_code?: string;
      status_code?: number;
      next_scrape_available_at?: string;
    };
    err.error_code = data.error;
    err.status_code = res.status;
    err.next_scrape_available_at = data.next_scrape_available_at;
    throw err;
  }

  return data;
}

/**
 * Check active scrape and sync status for a channel.
 */
export async function getScrapeStatus(channelId: number): Promise<ScrapeStatusResponse> {
  const res = await fetch(`${API_BASE_URL}/channels/${channelId}/scrape-status`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to fetch scrape status.');
  }

  return data;
}

/* =========================================================================
   WATCHLISTS
   ========================================================================= */

export async function getWatchlists(params?: { search?: string }): Promise<WatchlistItem[]> {
  const url = new URL(`${API_BASE_URL}/watchlists`);
  if (params?.search) url.searchParams.set('search', params.search);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || 'Failed to fetch watchlists.');
  }

  return res.json();
}

export async function createWatchlist(name: string, description?: string): Promise<WatchlistItem> {
  const res = await fetch(`${API_BASE_URL}/watchlists`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, description }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create watchlist.');
  }

  return data;
}

export async function getWatchlist(id: number): Promise<WatchlistItem> {
  const res = await fetch(`${API_BASE_URL}/watchlists/${id}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch watchlist ${id}`);
  }

  return res.json();
}

export async function deleteWatchlist(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/watchlists/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete watchlist.');
  }
}

export async function addChannelToWatchlist(watchlistId: number, channelId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/channels`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ channel_id: channelId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to add channel to watchlist.');
  }
}

export async function removeChannelFromWatchlist(watchlistId: number, channelId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/channels/${channelId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to remove channel from watchlist.');
  }
}

export async function toggleWatchlistFavorite(watchlistId: number): Promise<{ is_favorite: boolean }> {
  const res = await fetch(`${API_BASE_URL}/watchlists/${watchlistId}/favorite`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to toggle favorite.');
  }

  return res.json();
}

/* =========================================================================
   PROJECTS (Curated Video Collections)
   ========================================================================= */

export async function getProjects(params?: { search?: string }): Promise<ProjectItem[]> {
  const url = new URL(`${API_BASE_URL}/projects`);
  if (params?.search) url.searchParams.set('search', params.search);

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch projects.');
  }

  return res.json();
}

export async function createProject(name: string, description?: string, color?: string): Promise<ProjectItem> {
  const res = await fetch(`${API_BASE_URL}/projects`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, description, color }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to create project.');
  }

  return data;
}

export async function getProject(id: number, page: number = 1): Promise<ProjectItem> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}?page=${page}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch project details.');
  }

  return res.json();
}

export async function deleteProject(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete project.');
  }
}

export async function addPostToProject(projectId: number, postId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/posts`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ post_id: postId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || 'Failed to add post to project.');
  }
}

export async function removePostFromProject(projectId: number, postId: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/projects/${projectId}/posts/${postId}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to remove post from project.');
  }
}

/* =========================================================================
   SAVED VIDEO FILTERS
   ========================================================================= */

export async function getSavedVideoFilters(): Promise<SavedFilterItem[]> {
  const res = await fetch(`${API_BASE_URL}/saved-video-filters`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to fetch saved video filters.');
  }

  const payload = await res.json();
  return payload.data || [];
}

export async function saveVideoFilter(name: string, filters: ContentLibraryFilters): Promise<SavedFilterItem> {
  const res = await fetch(`${API_BASE_URL}/saved-video-filters`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, filters }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to save filter preset.');
  }

  return data.data;
}

export async function deleteSavedVideoFilter(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/saved-video-filters/${id}`, {
    method: 'DELETE',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to delete saved filter.');
  }
}

/* =========================================================================
   SCRIPTS & REFINEMENT
   ========================================================================= */

export async function refineScript(
  scriptId: number,
  payload: {
    title?: string;
    revised_script?: string;
    hook?: string;
    content_angle?: string;
    psychological_driver?: string;
    structure_model?: string;
    mechanism_type?: string;
    insight_shift?: string;
    rhythm_profile?: string;
    cta_type?: string;
  }
): Promise<{ success: boolean; script: GeneratedScriptData }> {
  const res = await fetch(`${API_BASE_URL}/scripts/${scriptId}/refine`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to save refined script.');
  }

  return data;
}

export async function autoRefineScript(
  scriptId: number,
  options?: {
    similarity?: string;
    language?: string;
    duration?: string;
    platform?: string;
    audience?: string;
  }
): Promise<{ success: boolean; script: GeneratedScriptData }> {
  const res = await fetch(`${API_BASE_URL}/scripts/${scriptId}/auto-refine`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(options || {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Failed to auto-refine script.');
  }

  return data;
}

export async function getScriptStatus(scriptId: number): Promise<{
  success: boolean;
  status: 'idle' | 'processing' | 'completed' | 'failed';
  error?: string | null;
  script?: GeneratedScriptData;
}> {
  const res = await fetch(`${API_BASE_URL}/scripts/${scriptId}/status`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Failed to check script status.');
  }

  return data;
}
