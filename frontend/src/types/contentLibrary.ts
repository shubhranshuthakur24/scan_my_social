export interface ContentPostItem {
  id: number;
  channel_id: number;
  platform: string;
  type: string;
  caption: string;
  owner_username: string;
  url: string;
  video_url: string | null;
  video_play_count: number | null;
  video_view_count: number | null;
  likes_count: number;
  comments_count: number;
  engagement_rate: number;
  post_timestamp: string;
  breakout_multiplier: number | null;
  breakout_label: string | null;
  display_url: string;
  audio_url?: string | null;
  is_transcribed?: boolean;
  is_analyzed?: boolean;
  channel?: ChannelItem;
  content_analysis?: ContentAnalysisData | null;
  projects?: Array<{ id: number; name: string }>;
  created_at?: string;
}

export interface ChannelItem {
  id: number;
  handle: string;
  name: string;
  platform: string;
  bio?: string | null;
  profile_image_url?: string | null;
  followers_count: number;
  posts_count: number;
  follows_count?: number;
  is_mine?: boolean;
  is_private?: boolean;
  is_verified?: boolean;
  is_business?: boolean;
  last_scraped_at?: string | null;
  last_refreshed_data_on?: string | null;
  can_scrape?: boolean;
  is_scraping?: boolean;
  next_scrape_available_at?: string | null;
  apify_profile_run_status?: string;
  apify_post_run_status?: string;
  created_at?: string;
}

export type ChannelDiscoveryDropdownState =
  | 'idle'
  | 'loading'
  | 'results'
  | 'zero_results'
  | 'api_error'
  | 'invalid_url';

export interface ChannelsPaginatedResponse {
  data: ChannelItem[];
  current_page: number;
  last_page: number;
  total: number;
  untrack_limit?: number;
  untrack_used?: number;
  untrack_remaining?: number;
}

export interface ScrapeResponse {
  message: string;
  channel_id: number;
  handle: string;
  status: string;
  last_scraped_at?: string | null;
  next_scrape_available_at?: string | null;
}

export interface ScrapeStatusResponse {
  channel_id: number;
  handle: string;
  is_scraping: boolean;
  can_scrape: boolean;
  next_scrape_available_at?: string | null;
  apify_profile_run_status?: string | null;
  apify_post_run_status?: string | null;
  last_scraped_at?: string | null;
  last_refreshed_data_on?: string | null;
}

export interface WatchlistItem {
  id: number;
  name: string;
  description?: string | null;
  channels_count: number;
  is_favorite: boolean;
  channels?: ChannelItem[];
  created_at?: string;
  updated_at?: string;
}

export interface ProjectItem {
  id: number;
  user_id: number;
  name: string;
  description?: string | null;
  color: string;
  posts_count: number;
  created_at?: string;
  updated_at?: string;
  posts?: ContentPostItem[];
  posts_pagination?: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    has_more_pages: boolean;
  };
}

export interface SavedFilterItem {
  id: number;
  name: string;
  filters: ContentLibraryFilters;
  created_at?: string;
  updated_at?: string;
}

export interface ContentAnalysisData {
  id: number;
  post_id: number;
  transcription?: string | null;
  transcription_status?: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  transcription_error?: string | null;
  analysis_status?: 'idle' | 'queued' | 'processing' | 'completed' | 'failed';
  analysis_error?: string | null;
  hook?: string | null;
  hook_text?: string | null;
  hook_type?: string | null;
  hook_score?: number | null;
  content_angle?: string | null;
  topic_angle?: string | null;
  content_angle_score?: number | null;
  psychological_driver?: string | null;
  psychological_driver_score?: number | null;
  structure_model?: string | null;
  structure_model_score?: number | null;
  script_flow?: string | null;
  mechanism_type?: string | null;
  mechanism_type_score?: number | null;
  insight_shift?: string | null;
  insight_shift_text?: string | null;
  insight_shift_score?: number | null;
  rhythm_profile?: string | null;
  rhythm_profile_score?: number | null;
  cta_type?: string | null;
  cta_text?: string | null;
  cta_type_score?: number | null;
  closure_type?: string | null;
  archetype?: string | null;
  script_type?: string | null;
  language_style?: string | null;
  language_used?: string | null;
  generated_scripts?: GeneratedScriptData[];
}

export interface GeneratedScriptData {
  id: number;
  title?: string | null;
  script?: string | null;
  revised_script?: string | null;
  status?: string;
  error_message?: string | null;
  suggested_topic?: string | null;
  hook?: string | null;
  content_angle?: string | null;
  psychological_driver?: string | null;
  structure_model?: string | null;
  mechanism_type?: string | null;
  insight_shift?: string | null;
  rhythm_profile?: string | null;
  cta_type?: string | null;
  closure_type?: string | null;
  archetype?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ContentLibraryFilters {
  search?: string;
  platform?: string[];
  creator?: string[];
  watchlist?: number[];
  project?: number[];
  label?: string[];
  engagement_min?: number;
  engagement_max?: number;
  views_min?: number;
  views_max?: number;
  outlier_min?: number;
  outlier_max?: number;
  date_value?: number;
  date_unit?: 'Days' | 'Weeks' | 'Months' | 'Years';
  sort_by?: 'outlier_score' | 'views' | 'engagement_rate' | 'posted_date';
  sort_dir?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface PostsPaginatedResponse {
  data: ContentPostItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number;
  to?: number;
}

export interface PostDetailResponse {
  post: ContentPostItem;
  user_has_transcription: boolean;
  user_has_analysis: boolean;
}
