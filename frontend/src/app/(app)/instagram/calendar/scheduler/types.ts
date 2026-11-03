import { MediaAssetItem } from '@/lib/api/instagramService';

export type MediaFormat = 'reel' | 'carousel' | 'image' | 'story';
export type ScheduleMode = 'recommended' | 'custom' | 'now';
export type LibraryCategory = 'All' | 'Reels' | 'Carousels' | 'Photos';
export type QueueTab = 'upcoming' | 'published';

export interface ScheduledQueueItem {
  id: string;
  type: MediaFormat;
  title: string;
  caption: string;
  thumbnail: string;
  scheduledTime: string;
  publishedAt?: string;
  metaMediaId?: string;
  permalink?: string;
  status: 'scheduled' | 'publishing' | 'published' | 'failed';
  hasAutodm?: boolean;
  autodmKeyword?: string;
}

export interface MediaLibraryItem {
  id: string;
  title: string;
  type: MediaFormat;
  category: 'Reels' | 'Carousels' | 'Photos';
  url: string;
  duration?: string;
  fileSize?: string;
  uploadedAt: string;
}

export const toLibraryItem = (asset: MediaAssetItem): MediaLibraryItem => ({
  id: String(asset.id),
  title: asset.title || asset.originalName,
  type: asset.mediaType === 'video' ? 'reel' : 'image',
  category: asset.mediaType === 'video' ? 'Reels' : 'Photos',
  url: asset.url,
  fileSize: `${Math.max(0.1, asset.sizeBytes / (1024 * 1024)).toFixed(1)} MB`,
  uploadedAt: asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'Just now',
});
