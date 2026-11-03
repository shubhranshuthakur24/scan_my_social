import { getAuthHeaders } from './authService';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface WebPageThemeSettings {
  theme_key?: string;
  background_color?: string;
  text_color?: string;
  muted_text_color?: string;
  accent_color?: string;
  surface_color?: string;
  border_color?: string;
  button_style?: 'rounded' | 'pill' | 'sharp';
  radius_style?: 'rounded' | 'soft' | 'sharp';
  font_style?: 'sans' | 'serif';
}

export interface WebPageFeatureItem {
  icon?: string;
  title?: string;
  description?: string;
}

export interface WebPageStatItem {
  value?: string;
  label?: string;
  description?: string;
}

export interface WebPageGalleryImage {
  url: string;
  alt?: string;
  caption?: string;
}

export interface WebPagePricingPlan {
  name: string;
  price: string;
  billing_period?: string;
  description?: string;
  features?: string[];
  cta_label?: string;
  cta_url?: string;
  is_popular?: boolean;
}

export interface WebPageSocialLink {
  label: string;
  url: string;
}

export interface WebPageTimelineStep {
  time_or_step?: string;
  title?: string;
  description?: string;
}

export interface WebPageSectionContent {
  eyebrow?: string;
  heading?: string;
  subheading?: string;
  body?: string;
  primary_label?: string;
  primary_url?: string;
  secondary_label?: string;
  secondary_url?: string;
  image_url?: string;
  url?: string;
  button_label?: string;
  links?: Array<{ label?: string; url?: string }>;
  items?: Array<{
    question?: string;
    answer?: string;
    quote?: string;
    name?: string;
    role?: string;
    avatar_url?: string;
    icon?: string;
    title?: string;
    description?: string;
    value?: string;
    label?: string;
  }>;
  fields?: Array<{ key: string; label: string; type?: string; required?: boolean }>;
  columns?: number;
  images?: WebPageGalleryImage[];
  layout?: 'grid' | 'masonry' | string;
  plans?: WebPagePricingPlan[];
  name?: string;
  role?: string;
  bio?: string;
  avatar_url?: string;
  social_links?: WebPageSocialLink[];
  steps?: WebPageTimelineStep[];
  layout_style?: 'split' | 'immersive' | 'editorial' | 'centered';
  [key: string]: unknown;
}

export interface WebPageSection {
  id: string;
  type:
    | 'hero'
    | 'text'
    | 'image'
    | 'video'
    | 'cta'
    | 'link_list'
    | 'faq'
    | 'testimonials'
    | 'contact_form'
    | 'features'
    | 'stats'
    | 'gallery'
    | 'pricing'
    | 'profile'
    | 'timeline';
  content: WebPageSectionContent;
}

export interface WebPage {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  template_key: string;
  sections: WebPageSection[];
  theme_settings: WebPageThemeSettings;
  is_published: boolean;
  published_at?: string | null;
  public_url?: string | null;
  events_count?: number;
  submissions_count?: number;
  user?: { id: number; name: string; username?: string; email?: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface PublicWebPageDto {
  id: number;
  username: string;
  title: string;
  slug: string;
  description?: string | null;
  template_key: string;
  sections: WebPageSection[];
  theme_settings: WebPageThemeSettings;
  is_published: boolean;
}

export interface WebPageSummary {
  total_pages: number;
  published_pages: number;
  total_views: number;
  total_submissions: number;
}

export interface WebPageTemplate {
  key: string;
  name: string;
  category: string;
  description: string;
  theme_key: string;
  theme_settings: WebPageThemeSettings;
  preview_image: string;
  sections: WebPageSection[];
}

export interface WebPageThemePreset {
  key: string;
  label: string;
  description: string;
  settings: WebPageThemeSettings;
}

export interface WebPageAnalytics {
  total_views: number;
  total_cta_clicks: number;
  total_submissions: number;
  unique_visitors: number;
  daily_views: { date: string; views: number }[];
  cta_clicks: { block_id: string; clicks: number }[];
  recent_submissions: {
    id: number;
    block_id: string;
    data: Record<string, unknown>;
    submitted_at: string | null;
  }[];
}

export interface FetchWebPagesParams {
  search?: string;
  status?: 'all' | 'published' | 'draft';
}

export interface WebPagesResponse {
  web_pages: WebPage[];
  summary: WebPageSummary;
  templates: WebPageTemplate[];
  theme_presets: WebPageThemePreset[];
}

export interface WebPageDetailResponse {
  web_page: WebPage;
  templates: WebPageTemplate[];
  theme_presets: WebPageThemePreset[];
  analytics: WebPageAnalytics;
}

export interface WebPageCatalogResponse {
  templates: WebPageTemplate[];
  theme_presets: WebPageThemePreset[];
}

let cachedCatalogPromise: Promise<WebPageCatalogResponse> | null = null;

export async function fetchWebPageCatalog(): Promise<WebPageCatalogResponse> {
  if (cachedCatalogPromise) {
    return cachedCatalogPromise;
  }

  cachedCatalogPromise = (async () => {
    const res = await fetch(`${API_BASE_URL}/web-pages/catalog`, {
      headers: {
        ...getAuthHeaders(),
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      cachedCatalogPromise = null;
      const data = await res.json().catch(() => ({}));
      throw new Error(data.message || `Failed to fetch web page catalog (${res.status})`);
    }

    const data = await res.json();
    return {
      templates: Array.isArray(data.templates) ? data.templates : Object.values(data.templates || {}),
      theme_presets: Array.isArray(data.theme_presets) ? data.theme_presets : Object.values(data.theme_presets || {}),
    };
  })();

  return cachedCatalogPromise;
}

export function clearWebPageCatalogCache(): void {
  cachedCatalogPromise = null;
}

export interface CreateWebPagePayload {
  title: string;
  slug?: string;
  description?: string;
  template_key?: string;
  sections?: WebPageSection[];
  theme_settings?: WebPageThemeSettings;
  is_published?: boolean;
}

export interface UpdateWebPagePayload {
  title: string;
  slug: string;
  description?: string;
  template_key?: string;
  sections: WebPageSection[];
  theme_settings?: WebPageThemeSettings;
  is_published?: boolean;
}

export async function fetchWebPages(params: FetchWebPagesParams = {}): Promise<WebPagesResponse> {
  const query = new URLSearchParams();
  if (params.search) query.append('search', params.search);
  if (params.status && params.status !== 'all') query.append('status', params.status);

  const res = await fetch(`${API_BASE_URL}/web-pages?${query.toString()}`, {
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to fetch web pages (${res.status})`);
  }

  const data = await res.json();
  return {
    ...data,
    web_pages: Array.isArray(data.web_pages) ? data.web_pages : Object.values(data.web_pages || {}),
    templates: Array.isArray(data.templates) ? data.templates : Object.values(data.templates || {}),
    theme_presets: Array.isArray(data.theme_presets) ? data.theme_presets : Object.values(data.theme_presets || {}),
  };
}

export async function getWebPage(id: number): Promise<WebPageDetailResponse> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}`, {
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to fetch web page (${res.status})`);
  }

  const data = await res.json();
  return {
    ...data,
    templates: Array.isArray(data.templates) ? data.templates : Object.values(data.templates || {}),
    theme_presets: Array.isArray(data.theme_presets) ? data.theme_presets : Object.values(data.theme_presets || {}),
  };
}

export async function createWebPage(payload: CreateWebPagePayload): Promise<{ message: string; web_page: WebPage }> {
  const res = await fetch(`${API_BASE_URL}/web-pages`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errorMsg = data.errors ? Object.values(data.errors).flat().join(', ') : data.message;
    throw new Error(errorMsg || `Failed to create web page (${res.status})`);
  }

  return res.json();
}

export async function updateWebPage(id: number, payload: UpdateWebPagePayload): Promise<{ message: string; web_page: WebPage }> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}`, {
    method: 'PUT',
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const errorMsg = data.errors ? Object.values(data.errors).flat().join(', ') : data.message;
    throw new Error(errorMsg || `Failed to update web page (${res.status})`);
  }

  return res.json();
}

export async function togglePublishWebPage(
  id: number
): Promise<{ message: string; is_published: boolean; published_at?: string | null; web_page: WebPage }> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}/publish`, {
    method: 'PATCH',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to toggle publish status (${res.status})`);
  }

  return res.json();
}

export async function deleteWebPage(id: number): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/web-pages/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || `Failed to delete web page (${res.status})`);
  }
}
