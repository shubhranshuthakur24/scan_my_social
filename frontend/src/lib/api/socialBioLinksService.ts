import { getAuthHeaders } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface BioLink {
  id: number;
  title: string;
  url: string;
  description?: string | null;
  icon?: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at?: string | null;
  ends_at?: string | null;
  clicks_count?: number;
}

export interface BioThemeSettings {
  background_color: string;
  text_color: string;
  button_background_color: string;
  button_text_color: string;
  button_style: 'rounded' | 'pill' | 'sharp';
  layout?: 'editorial' | 'immersive' | 'split' | 'poster' | 'cinematic' | 'portrait' | 'gallery';
  font_style?: 'sans' | 'serif' | 'mono';
  cover_image?: string | null;
}

export interface BioCard {
  id: number;
  slug: string;
  is_primary: boolean;
  display_name: string;
  username: string;
  bio?: string | null;
  custom_bio?: string | null;
  avatar_url?: string | null;
  custom_avatar_url?: string | null;
  banner_url?: string | null;
  theme: string;
  theme_settings: BioThemeSettings;
  is_published: boolean;
  published_at?: string | null;
  public_url: string;
  links: BioLink[];
}

export interface BioCardSummary {
  id: number;
  slug: string;
  is_primary: boolean;
  display_name: string;
  username: string;
  bio?: string | null;
  custom_bio?: string | null;
  avatar_url?: string | null;
  custom_avatar_url?: string | null;
  banner_url?: string | null;
  theme: string;
  theme_settings: BioThemeSettings;
  is_published: boolean;
  public_url: string;
  links_count: number;
  clicks_count: number;
  period_clicks?: number;
  links?: BioLink[];
}

export interface BioDailyClick {
  date: string;
  clicks: number;
}

export interface BioLinkClickSummary {
  id: number;
  title: string;
  clicks: number;
}

export interface BioAnalyticsData {
  total_clicks: number;
  unique_clicks: number;
  period_clicks?: number;
  daily_clicks: BioDailyClick[];
  links: BioLinkClickSummary[];
}

export interface BioThemePreset {
  label: string;
  category?: string;
  description: string;
  settings: BioThemeSettings;
}

export interface SocialBioLinksIndexResponse {
  primary_card: BioCard;
  selected_card: BioCard;
  cards: BioCardSummary[];
  theme_presets: Record<string, BioThemePreset>;
  /** @deprecated Analytics are now served from the dedicated analytics endpoint. */
  period?: '7d' | '14d' | '30d' | '90d';
  /** @deprecated Analytics are now served from the dedicated analytics endpoint. */
  days?: number;
  /** @deprecated Analytics are now served from the dedicated analytics endpoint. */
  analytics?: {
    selected: BioAnalyticsData;
    combined: BioAnalyticsData;
  };
}

export interface SocialBioLinksAnalyticsResponse {
  period: '7d' | '14d' | '30d' | '90d';
  days: number;
  primary_card?: BioCard;
  selected_card?: BioCard;
  cards?: BioCardSummary[];
  analytics: {
    selected: BioAnalyticsData;
    combined: BioAnalyticsData;
  };
}

export interface PublicBioDTO {
  displayName: string;
  username: string;
  bio?: string | null;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
  theme: string;
  themeSettings: BioThemeSettings;
  isPrimary: boolean;
  slug: string;
  links: Array<{
    id: number;
    title: string;
    description?: string | null;
    icon?: string | null;
    url: string;
  }>;
}

/**
 * Fetch authenticated Social Bio Links dashboard data
 */
export async function fetchSocialBioLinks(
  cardId?: number,
  period?: '7d' | '14d' | '30d' | '90d'
): Promise<SocialBioLinksIndexResponse> {
  const url = new URL(`${API_BASE_URL}/social-bio-links`);
  if (cardId) {
    url.searchParams.set('card_id', String(cardId));
  }
  if (period) {
    url.searchParams.set('period', period);
  }

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to fetch social bio links' }));
    throw new Error(err.message || 'Failed to fetch social bio links');
  }

  return res.json();
}

/**
 * Fetch Social Bio Links analytics from the dedicated analytics endpoint
 */
export async function fetchSocialBioLinksAnalytics(
  cardId?: number,
  period?: '7d' | '14d' | '30d' | '90d'
): Promise<SocialBioLinksAnalyticsResponse> {
  const url = new URL(`${API_BASE_URL}/social-bio-links/analytics`);
  if (cardId) {
    url.searchParams.set('card_id', String(cardId));
  }
  if (period) {
    url.searchParams.set('period', period);
  }

  const res = await fetch(url.toString(), {
    headers: getAuthHeaders(),
    cache: 'no-store',
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to fetch analytics' }));
    throw new Error(err.message || 'Failed to fetch analytics');
  }

  return res.json();
}

/**
 * Create a new secondary bio card
 */
export async function createBioCard(payload: {
  display_name: string;
  slug?: string;
  theme?: string;
}): Promise<{ message: string; card: BioCard }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to create card' }));
    throw new Error(err.message || 'Failed to create card');
  }

  return res.json();
}

/**
 * Update an existing card (display_name, slug, theme, contrast-checked settings, publishing)
 */
export async function updateBioCard(
  cardId: number,
  payload: {
    display_name?: string;
    slug?: string;
    bio?: string | null;
    theme: string;
    theme_settings: BioThemeSettings;
    is_published: boolean;
  }
): Promise<{ message: string; card: BioCard }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update card' }));
    throw new Error(err.message || 'Failed to update card');
  }

  return res.json();
}

/**
 * Promote card to primary
 */
export async function setPrimaryBioCard(cardId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/primary`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update primary card' }));
    throw new Error(err.message || 'Failed to update primary card');
  }

  return res.json();
}

/**
 * Delete a card
 */
export async function deleteBioCard(cardId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to delete card' }));
    throw new Error(err.message || 'Failed to delete card');
  }

  return res.json();
}

/**
 * Upload banner image for a card
 */
export async function uploadBioBanner(cardId: number, file: File): Promise<{ message: string; banner_url: string }> {
  const formData = new FormData();
  formData.append('banner', file);

  const authHeaders = getAuthHeaders();
  // Remove Content-Type so browser sets boundary for multipart
  delete (authHeaders as Record<string, string>)['Content-Type'];

  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/banner`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to upload banner' }));
    throw new Error(err.message || 'Failed to upload banner');
  }

  return res.json();
}

/**
 * Remove banner image for a card
 */
export async function removeBioBanner(cardId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/banner`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to remove banner' }));
    throw new Error(err.message || 'Failed to remove banner');
  }

  return res.json();
}

/**
 * Upload custom avatar image for a card
 */
export async function uploadBioAvatar(cardId: number, file: File): Promise<{ message: string; avatar_url: string }> {
  const formData = new FormData();
  formData.append('avatar', file);

  const authHeaders = getAuthHeaders();
  delete (authHeaders as Record<string, string>)['Content-Type'];

  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/avatar`, {
    method: 'POST',
    headers: authHeaders,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to upload avatar' }));
    throw new Error(err.message || 'Failed to upload avatar');
  }

  return res.json();
}

/**
 * Remove custom avatar image for a card (reverting to global user avatar)
 */
export async function removeBioAvatar(cardId: number): Promise<{ message: string; avatar_url: string | null }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/avatar`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to remove avatar' }));
    throw new Error(err.message || 'Failed to remove avatar');
  }

  return res.json();
}


/**
 * Create a new link on a card
 */
export async function createBioLink(
  cardId: number,
  payload: {
    title: string;
    url: string;
    description?: string | null;
    icon?: string | null;
    is_active: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  }
): Promise<{ message: string; link: BioLink }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/links`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to add link' }));
    throw new Error(err.message || 'Failed to add link');
  }

  return res.json();
}

/**
 * Create multiple links on a card in a batch action
 */
export async function createBatchBioLinks(
  cardId: number,
  links: Array<{
    title: string;
    url: string;
    description?: string | null;
    icon?: string | null;
    is_active?: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  }>
): Promise<{ message: string; links: BioLink[] }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/links/batch`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ links }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to add social links' }));
    throw new Error(err.message || 'Failed to add social links');
  }

  return res.json();
}

/**
 * Update an existing link
 */
export async function updateBioLink(
  linkId: number,
  payload: {
    title: string;
    url: string;
    description?: string | null;
    icon?: string | null;
    is_active: boolean;
    starts_at?: string | null;
    ends_at?: string | null;
  }
): Promise<{ message: string; link: BioLink }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/links/${linkId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to update link' }));
    throw new Error(err.message || 'Failed to update link');
  }

  return res.json();
}

/**
 * Delete a link
 */
export async function deleteBioLink(linkId: number): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/links/${linkId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to delete link' }));
    throw new Error(err.message || 'Failed to delete link');
  }

  return res.json();
}

/**
 * Reorder links on a card
 */
export async function reorderBioLinks(cardId: number, linkIds: number[]): Promise<{ message: string }> {
  const res = await fetch(`${API_BASE_URL}/social-bio-links/cards/${cardId}/links/reorder`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
    body: JSON.stringify({ links: linkIds }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Failed to reorder links' }));
    throw new Error(err.message || 'Failed to reorder links');
  }

  return res.json();
}

/**
 * Fetch unauthenticated public bio DTO
 */
export async function fetchPublicBio(username: string, slug?: string): Promise<PublicBioDTO> {
  const path = slug ? `${API_BASE_URL}/public/bio/${username}/${slug}` : `${API_BASE_URL}/public/bio/${username}`;
  const res = await fetch(path, {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Public bio page not found' }));
    throw new Error(err.message || 'Public bio page not found');
  }

  return res.json();
}
