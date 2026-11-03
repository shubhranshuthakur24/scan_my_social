export type PostStatus = 'scheduled' | 'publishing' | 'published' | 'failed';

export interface ScheduledPost {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  type: 'reel' | 'carousel' | 'image';
  title: string;
  caption: string;
  thumbnail: string;
  status: PostStatus;
  hasAutodm?: boolean;
  autodmKeyword?: string;
  likes?: number;
  views?: number;
}

export interface SchedulerNote {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  color?: 'amber' | 'blue' | 'purple' | 'emerald';
}
