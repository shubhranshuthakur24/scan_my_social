'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useInstagramStore } from '@/lib/store/useInstagramStore';
import { useMediaHandoffStore } from '@/lib/store/useMediaHandoffStore';
import { createScheduledPost } from '@/lib/api/instagramService';
import { classifyAspectRatio, StructuredValidationError } from '@/lib/types/instagramRatios';
import { ScheduledQueueItem } from '../types';
import { useSchedulerForm } from './useSchedulerForm';
import { useSchedulerMedia } from './useSchedulerMedia';
import { useSchedulerQueue } from './useSchedulerQueue';

export function useScheduler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const triggerToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Account Store Integration (Single Source of Truth)
  const storeAccounts = useInstagramStore((state) => state.accounts);
  const storeSelectedId = useInstagramStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useInstagramStore((state) => state.setSelectedAccountId);
  const isHydrated = useInstagramStore((state) => state.isHydrated);

  const selectedAccountId = storeSelectedId || '';
  const activeAccount = storeAccounts.find((a) => a.id === selectedAccountId);

  // Domain Hooks
  const form = useSchedulerForm(triggerToast);
  const media = useSchedulerMedia({ form, triggerToast });
  const queue = useSchedulerQueue({ selectedAccountId, isHydrated, triggerToast });

  // Submission & Validation state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrorData, setValidationErrorData] = useState<StructuredValidationError | null>(null);

  // URL / Search Parameters Synchronization
  useEffect(() => {
    const dateParam = searchParams.get('date');
    const typeParam = searchParams.get('type');

    if (dateParam) {
      form.setCustomDate(dateParam);
      form.setScheduleMode('custom');
    }
    if (typeParam) {
      const normalizedType = typeParam.toLowerCase();
      if (normalizedType === 'story') form.setFormat('story');
      else if (normalizedType === 'reel') form.setFormat('reel');
      else if (normalizedType === 'carousel') form.setFormat('carousel');
      else if (normalizedType === 'post' || normalizedType === 'image') form.setFormat('image');
    }

    // Handoff from in-memory media store (e.g. Watermark Remover)
    const handoffParam = searchParams.get('handoff');
    if (handoffParam === '1') {
      const pendingFile = useMediaHandoffStore.getState().pendingFile;
      const targetFormat = useMediaHandoffStore.getState().targetFormat || 'reel';
      if (pendingFile) {
        if (targetFormat === 'image') {
          form.setFormat('image');
        } else if (targetFormat === 'carousel') {
          form.setFormat('carousel');
        } else {
          form.setFormat('reel');
        }

        media.handleProcessFile(pendingFile)
          .then(() => {
            // Invariant: Clear only AFTER successful ingestion
            useMediaHandoffStore.getState().clearPendingFile();
            router.replace(`/instagram/calendar/scheduler?type=${targetFormat}`);
            triggerToast(`Cleaned ${targetFormat === 'image' ? 'image' : 'video'} loaded into Scheduler.`);
          })
          .catch(() => {
            triggerToast('Failed to upload cleaned media. File preserved in memory.');
          });
      } else {
        router.replace(`/instagram/calendar/scheduler?type=${targetFormat}`);
      }
    }
  }, [searchParams, router, triggerToast, media, form]);

  // Main Schedule Submission Orchestration
  const handleScheduleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedAccountId || !activeAccount) {
        triggerToast('Please select a connected Instagram account before scheduling.');
        return;
      }

      if (form.format !== 'story' && !form.caption.trim()) {
        triggerToast('Please write a post caption before scheduling.');
        return;
      }

      if (form.format !== 'story') {
        const combined =
          form.caption.trim() + (form.hashtags.length ? '\n\n' + form.hashtags.join(' ') : '');
        if (combined.length > 2200) {
          triggerToast(
            `Caption with hashtags exceeds Instagram 2,200 character limit (${combined.length} chars).`
          );
          return;
        }
      }

      if (form.format === 'carousel' && form.carouselAssets.length < 2) {
        triggerToast('Carousel posts require at least 2 slides.');
        return;
      }

      if (form.format !== 'carousel' && !form.selectedMediaAsset) {
        triggerToast('Please upload or select a media asset before scheduling.');
        return;
      }

      if (form.format === 'image' && form.activeImageAspectRatio !== null) {
        const classification = classifyAspectRatio(form.activeImageAspectRatio);
        if (!classification.isFeedCompliant) {
          triggerToast(
            `Instagram Feed photo requires an aspect ratio between 4:5 (0.80) and 1.91:1. Current image is ${classification.label}. Please crop to 4:5 or switch to Story.`
          );
          return;
        }
      }

      if (form.format === 'carousel' && form.carouselConsistency.hasMixedRatios) {
        triggerToast(
          `Carousel slides have mixed aspect ratios. Meta requires all slides to match Cover slide (${form.carouselConsistency.primaryRatio?.toFixed(
            2
          )}). Use "Crop All to 4:5" before scheduling.`
        );
        return;
      }

      let isoScheduledTime: string;
      let displayScheduledTime: string;

      if (form.scheduleMode === 'now') {
        isoScheduledTime = new Date().toISOString();
        displayScheduledTime = 'Publishing in queue...';
      } else if (form.scheduleMode === 'recommended') {
        const target = new Date();
        if (form.selectedRecommendation.includes('Tomorrow')) {
          target.setDate(target.getDate() + 1);
          target.setHours(18, 0, 0, 0);
        } else if (form.selectedRecommendation.includes('Friday')) {
          const day = target.getDay();
          const diff = (5 - day + 7) % 7 || 7;
          target.setDate(target.getDate() + diff);
          target.setHours(14, 30, 0, 0);
        } else {
          const day = target.getDay();
          const diff = (7 - day) % 7 || 7;
          target.setDate(target.getDate() + diff);
          target.setHours(19, 0, 0, 0);
        }
        isoScheduledTime = target.toISOString();
        displayScheduledTime = form.selectedRecommendation;
      } else {
        const localDate = new Date(`${form.customDate}T${form.customTime}:00`);
        if (isNaN(localDate.getTime())) {
          triggerToast('Please select a valid schedule date and time.');
          return;
        }
        if (localDate.getTime() <= Date.now() + 60000) {
          triggerToast('Schedule time must be at least 1 minute in the future.');
          return;
        }
        isoScheduledTime = localDate.toISOString();
        displayScheduledTime = `${form.customDate} at ${form.customTime}`;
      }

      const mediaAssetIds =
        form.format === 'carousel'
          ? form.carouselAssets.map((a) => Number(a.id))
          : [Number(form.selectedMediaAsset!.id)];

      const itemThumbnail =
        form.format === 'carousel'
          ? form.carouselSlides[0] || ''
          : form.selectedMediaUrl || form.reelCoverUrl || '';

      setIsSubmitting(true);
      setValidationErrorData(null);
      try {
        const created = await createScheduledPost({
          instagram_account_id: selectedAccountId,
          media_asset_ids: mediaAssetIds,
          format: form.format,
          caption: form.format === 'story' ? '' : form.caption,
          hashtags: form.format === 'story' ? [] : form.hashtags,
          scheduledTime: isoScheduledTime,
          publish_now: form.scheduleMode === 'now',
          hasAutodm: form.format !== 'story' ? form.hasAutodm : false,
          autodmKeyword: form.hasAutodm ? form.autodmKeyword : undefined,
          autodmReplyText: form.hasAutodm ? form.autodmReplyText : undefined,
        });

        const newItem: ScheduledQueueItem = {
          id: created.id,
          type: form.format,
          title: form.title || `${form.format.toUpperCase()} on @${activeAccount.username}`,
          caption: created.caption || form.caption,
          thumbnail: created.mediaUrl || itemThumbnail,
          scheduledTime: displayScheduledTime,
          status: form.scheduleMode === 'now' ? 'publishing' : 'scheduled',
          hasAutodm: form.hasAutodm,
          autodmKeyword: form.hasAutodm ? form.autodmKeyword : undefined,
        };

        queue.setQueue((prev) => [newItem, ...prev]);
        triggerToast(
          form.scheduleMode === 'now'
            ? 'Post dispatched to Instagram Meta Queue!'
            : 'Post scheduled successfully!'
        );
        form.resetSchedulerForm();
        if (media.fileInputRef.current) media.fileInputRef.current.value = '';
        if (media.carouselInputRef.current) media.carouselInputRef.current.value = '';
        if (media.reelCoverInputRef.current) media.reelCoverInputRef.current.value = '';
      } catch (err: any) {
        console.error('Failed to save post to backend:', err);
        if (err.data) {
          setValidationErrorData(err.data);
        }
        triggerToast(err.message || 'Failed to schedule post to server.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [selectedAccountId, form, media, queue, activeAccount, triggerToast]
  );

  return {
    form,
    media,
    queue,
    account: {
      selectedAccountId,
      activeAccount,
      setSelectedAccountId,
      isHydrated,
    },
    submit: {
      isSubmitting,
      validationErrorData,
      handleScheduleSubmit,
    },
    toast: {
      message: toastMessage,
      trigger: triggerToast,
    },
  };
}

export type UseSchedulerReturn = ReturnType<typeof useScheduler>;
