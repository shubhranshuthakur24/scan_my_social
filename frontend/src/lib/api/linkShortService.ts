import { getAuthHeaders } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface ShortLink {
  id: number;
  title: string;
  destination_url: string;
  code: string;
  description?: string | null;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  short_url: string;
  clicks_count: number;
  created_at?: string | null;
}

export interface ShortLinkSummary {
  total_links: number;
  active_links: number;
  total_clicks: number;
}

export interface ShortLinkPagination {
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
}

export interface ShortLinkDailyClick {
  date: string;
  clicks: number;
}

export interface ShortLinkReferrer {
  referrer: string;
  clicks: number;
}

export interface ShortLinkRecentClick {
  clicked_at?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
}

export interface ShortLinkAnalytics {
  total_clicks: number;
  unique_visitors: number;
  period_clicks?: number;
  period?: string;
  days?: number;
  daily_clicks: ShortLinkDailyClick[];
  top_referrers: ShortLinkReferrer[];
  recent_clicks: ShortLinkRecentClick[];
}

export interface AggregateShortLinkTopItem extends ShortLink {
  period_clicks: number;
}

export interface AggregateShortLinkReferrer {
  referrer: string;
  clicks: number;
  percentage: number;
}

export interface AggregateShortLinkRecentClick {
  clicked_at?: string | null;
  referrer?: string | null;
  user_agent?: string | null;
  link_title: string;
  link_code: string;
}

export interface AggregateShortLinkAnalytics {
  total_links: number;
  active_links: number;
  total_clicks: number;
  unique_visitors: number;
  period_clicks: number;
  daily_clicks: ShortLinkDailyClick[];
  top_links: AggregateShortLinkTopItem[];
  top_referrers: AggregateShortLinkReferrer[];
  recent_clicks: AggregateShortLinkRecentClick[];
}

export interface AggregateShortLinkAnalyticsResponse {
  period: '7d' | '14d' | '30d' | '90d';
  days: number;
  analytics: AggregateShortLinkAnalytics;
}

export interface FetchShortLinksParams {
  search?: string;
  status?: 'all' | 'active' | 'inactive' | 'scheduled';
  sort?: 'newest' | 'clicks';
  page?: number;
  per_page?: number;
}

export interface FetchShortLinksResponse {
  summary: ShortLinkSummary;
  short_links: ShortLink[];
  pagination: ShortLinkPagination;
}

export interface CreateShortLinkPayload {
  title: string;
  destination_url: string;
  code?: string | null;
  description?: string | null;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

export interface UpdateShortLinkPayload {
  title: string;
  destination_url: string;
  code?: string | null;
  description?: string | null;
  is_active?: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
}

/**
 * Fetch paginated list of short links with summary counts.
 */
export async function fetchShortLinks(params?: FetchShortLinksParams): Promise<FetchShortLinksResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status && params.status !== 'all') query.set('status', params.status);
  if (params?.sort) query.set('sort', params.sort);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.per_page) query.set('per_page', params.per_page.toString());

  const url = `${API_BASE_URL}/linkshort${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch short links (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Create a new short link.
 */
export async function createShortLink(
  payload: CreateShortLinkPayload
): Promise<{ message: string; short_link: ShortLink }> {
  const res = await fetch(`${API_BASE_URL}/linkshort`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 422 && errorData.errors) {
      const firstError = Object.values(errorData.errors)[0];
      const message = Array.isArray(firstError) ? firstError[0] : String(firstError);
      throw new Error(message || 'Validation failed');
    }
    throw new Error(errorData.message || `Failed to create short link (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch a short link's details and 30-day analytics.
 */
export async function getShortLinkAnalytics(
  id: number,
  period: string = '30d'
): Promise<{ short_link: ShortLink; analytics: ShortLinkAnalytics }> {
  const query = period ? `?period=${encodeURIComponent(period)}` : '';
  const res = await fetch(`${API_BASE_URL}/linkshort/${id}${query}`, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch short link analytics (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Update an existing short link.
 */
export async function updateShortLink(
  id: number,
  payload: UpdateShortLinkPayload
): Promise<{ message: string; short_link: ShortLink }> {
  const res = await fetch(`${API_BASE_URL}/linkshort/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    if (res.status === 422 && errorData.errors) {
      const firstError = Object.values(errorData.errors)[0];
      const message = Array.isArray(firstError) ? firstError[0] : String(firstError);
      throw new Error(message || 'Validation failed');
    }
    throw new Error(errorData.message || `Failed to update short link (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Toggle short link active status.
 */
export async function toggleShortLink(
  id: number
): Promise<{ message: string; id: number; is_active: boolean }> {
  const res = await fetch(`${API_BASE_URL}/linkshort/${id}/toggle`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to toggle short link status (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Delete a short link.
 */
export async function deleteShortLink(id: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/linkshort/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to delete short link (HTTP ${res.status})`);
  }

  return res.json();
}

/**
 * Fetch aggregate analytics across all user short links for a specified period (7d, 14d, 30d, 90d).
 */
export async function fetchLinkShortAggregateAnalytics(
  period?: '7d' | '14d' | '30d' | '90d'
): Promise<AggregateShortLinkAnalyticsResponse> {
  const query = new URLSearchParams();
  if (period) query.set('period', period);

  const url = `${API_BASE_URL}/linkshort/analytics${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to fetch aggregate short link analytics (HTTP ${res.status})`);
  }

  return res.json();
}
