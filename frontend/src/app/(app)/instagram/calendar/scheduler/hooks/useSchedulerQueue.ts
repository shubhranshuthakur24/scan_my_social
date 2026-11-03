'use client';

import { useState, useEffect, useCallback } from 'react';
import { getScheduledCalendar, deleteScheduledPost } from '@/lib/api/instagramService';
import { ScheduledQueueItem, QueueTab } from '../types';

export interface UseSchedulerQueueProps {
  selectedAccountId: string;
  isHydrated: boolean;
  triggerToast: (msg: string) => void;
}

export function useSchedulerQueue({
  selectedAccountId,
  isHydrated,
  triggerToast,
}: UseSchedulerQueueProps) {
  const [queue, setQueue] = useState<ScheduledQueueItem[]>([]);
  const [queueTab, setQueueTab] = useState<QueueTab>('upcoming');
  const [isLoadingQueue, setIsLoadingQueue] = useState(false);

  const fetchQueue = useCallback(async () => {
    if (!isHydrated || !selectedAccountId) return;
    setIsLoadingQueue(true);
    try {
      const data = await getScheduledCalendar(selectedAccountId);
      const items = data.posts;
      if (items && items.length > 0) {
        setQueue(
          items.map((item) => ({
            id: item.id,
            type: (item.format.toLowerCase() as any) || 'reel',
            title: item.caption ? item.caption.slice(0, 30) + '...' : 'Scheduled Post',
            caption: item.caption || '',
            thumbnail: item.mediaUrl || '',
            scheduledTime: item.scheduledTime
              ? item.scheduledTime.replace('T', ' at ').slice(0, 20)
              : '',
            publishedAt: item.publishedAt
              ? item.publishedAt.replace('T', ' at ').slice(0, 20)
              : undefined,
            metaMediaId: item.metaMediaId,
            permalink: item.permalink,
            status: (item.status.toLowerCase() as any) || 'scheduled',
            hasAutodm: item.hasAutodm,
            autodmKeyword: item.autodmKeyword,
          }))
        );
      } else {
        setQueue([]);
      }
    } catch (err: any) {
      console.error('Failed to load queue:', err);
    } finally {
      setIsLoadingQueue(false);
    }
  }, [isHydrated, selectedAccountId]);

  useEffect(() => {
    let isCancelled = false;
    if (isHydrated && selectedAccountId) {
      fetchQueue();
    } else {
      setQueue([]);
    }
    return () => {
      isCancelled = true;
    };
  }, [isHydrated, selectedAccountId, fetchQueue]);

  const handleDeleteQueueItem = useCallback(
    async (id: string) => {
      try {
        await deleteScheduledPost(id);
        setQueue((prev) => prev.filter((item) => item.id !== id));
        triggerToast('Scheduled post removed from queue.');
      } catch (err: any) {
        triggerToast(err.message || 'Failed to remove post from server.');
      }
    },
    [triggerToast]
  );

  return {
    queue,
    setQueue,
    queueTab,
    setQueueTab,
    isLoadingQueue,
    refreshQueue: fetchQueue,
    handleDeleteQueueItem,
  };
}

export type UseSchedulerQueueReturn = ReturnType<typeof useSchedulerQueue>;
