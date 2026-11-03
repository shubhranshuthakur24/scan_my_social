import { ScheduledPostItem } from '@/lib/api/instagramService';
import { ScheduledPost } from '../types';

export function mapScheduledPost(item: ScheduledPostItem): ScheduledPost {
  const dateStr = item.scheduledTime ? item.scheduledTime.split('T')[0] : '';
  const timeStr = item.scheduledTime && item.scheduledTime.includes('T')
    ? item.scheduledTime.split('T')[1]?.slice(0, 5) || '12:00'
    : '12:00';

  const rawFormat = (item.format || '').toLowerCase();
  const type: 'reel' | 'carousel' | 'image' =
    rawFormat === 'reel' ? 'reel' : rawFormat === 'carousel' ? 'carousel' : 'image';

  const rawStatus = (item.status || '').toLowerCase();
  const status: 'scheduled' | 'publishing' | 'published' | 'failed' =
    rawStatus === 'published'
      ? 'published'
      : rawStatus === 'publishing'
      ? 'publishing'
      : rawStatus === 'failed'
      ? 'failed'
      : 'scheduled';

  const title = item.caption
    ? item.caption.length > 35
      ? item.caption.slice(0, 35) + '...'
      : item.caption
    : 'Scheduled Content';

  return {
    id: item.id,
    date: dateStr,
    time: timeStr,
    type,
    title,
    caption: item.caption || '',
    thumbnail: item.mediaUrl || '',
    status,
    hasAutodm: true,
    autodmKeyword: 'AUTO',
  };
}
