'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { MediaAssetItem, getPresetHashtags } from '@/lib/api/instagramService';
import { MediaFormat, ScheduleMode } from '../types';

export interface CarouselConsistency {
  hasMixedRatios: boolean;
  primaryRatio: number | null;
  mismatches: Array<{
    index: number;
    id: string | number;
    name: string;
    ratio?: number;
    isMismatched: boolean;
  }>;
}

export function useSchedulerForm(triggerToast?: (msg: string) => void) {
  // Core format & text fields
  const [format, setFormat] = useState<MediaFormat>('reel');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');

  // Media state
  const [selectedMediaUrl, setSelectedMediaUrl] = useState<string | null>(null);
  const [selectedMediaAsset, setSelectedMediaAsset] = useState<MediaAssetItem | null>(null);
  const [isVideoMedia, setIsVideoMedia] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [imageAspectRatio, setImageAspectRatio] = useState<'4:5' | '1:1'>('4:5');
  const [activeImageAspectRatio, setActiveImageAspectRatio] = useState<number | null>(null);
  const [storyLinkSticker, setStoryLinkSticker] = useState('https://scanmysocial.com/growth');
  const [reelCoverUrl, setReelCoverUrl] = useState<string | null>(null);
  const [reelCoverAsset, setReelCoverAsset] = useState<MediaAssetItem | null>(null);

  // Carousel-specific state
  const [carouselAssets, setCarouselAssets] = useState<MediaAssetItem[]>([]);
  const [carouselSlides, setCarouselSlides] = useState<string[]>([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // AutoDM Configuration
  const [hasAutodm, setHasAutodm] = useState(true);
  const [autodmKeyword, setAutodmKeyword] = useState('TOOLS');
  const [autodmReplyText, setAutodmReplyText] = useState(
    'Hey there! 👋 Here is your instant access link: https://scanmysocial.com/free-access'
  );

  // Scheduling timing
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('recommended');
  const [customDate, setCustomDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customTime, setCustomTime] = useState('18:00');
  const [selectedRecommendation, setSelectedRecommendation] = useState(
    'Tomorrow at 6:00 PM (Peak Audience)'
  );

  // Carousel aspect-ratio consistency check
  const carouselConsistency: CarouselConsistency = useMemo(() => {
    if (carouselAssets.length < 2) {
      return { hasMixedRatios: false, primaryRatio: null, mismatches: [] };
    }
    const firstRatio = carouselAssets[0]?.aspectRatio;
    if (!firstRatio) return { hasMixedRatios: false, primaryRatio: null, mismatches: [] };

    const mismatches = carouselAssets
      .slice(1)
      .map((asset, i) => ({
        index: i + 2,
        id: asset.id,
        name: asset.title || asset.originalName,
        ratio: asset.aspectRatio,
        isMismatched: asset.aspectRatio ? Math.abs(asset.aspectRatio - firstRatio) > 0.02 : false,
      }))
      .filter((m) => m.isMismatched);

    return {
      hasMixedRatios: mismatches.length > 0,
      primaryRatio: firstRatio,
      mismatches,
    };
  }, [carouselAssets]);

  // Sync aspect ratio when selected media or asset changes
  useEffect(() => {
    if (!selectedMediaUrl || isVideoMedia) {
      setActiveImageAspectRatio(null);
      return;
    }

    if (selectedMediaAsset?.aspectRatio) {
      setActiveImageAspectRatio(selectedMediaAsset.aspectRatio);
      return;
    }

    const img = new Image();
    img.src = selectedMediaUrl;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setActiveImageAspectRatio(Math.round((img.naturalWidth / img.naturalHeight) * 10000) / 10000);
      }
    };
  }, [selectedMediaUrl, isVideoMedia, selectedMediaAsset]);

  // Load preset hashtags on mount
  useEffect(() => {
    getPresetHashtags().then((categories) => {
      if (categories && categories.length > 0) {
        setHashtags(categories[0].tags.slice(0, 3));
      }
    });
  }, []);

  // Form Mutations
  const handleAddHashtag = useCallback(
    (tag: string) => {
      const clean = tag.startsWith('#') ? tag : `#${tag}`;
      if (!hashtags.includes(clean) && hashtags.length < 30) {
        setHashtags((prev) => [...prev, clean]);
      }
      setCustomTagInput('');
    },
    [hashtags]
  );

  const handleRemoveHashtag = useCallback((tag: string) => {
    setHashtags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const handleRemoveSlide = useCallback(
    (idx: number) => {
      if (carouselSlides.length <= 1) {
        triggerToast?.('Carousel must have at least 1 slide.');
        return;
      }
      setCarouselSlides((prev) => prev.filter((_, i) => i !== idx));
      setCarouselAssets((prev) => prev.filter((_, i) => i !== idx));
      if (activeSlideIndex >= carouselSlides.length - 1) {
        setActiveSlideIndex(Math.max(0, carouselSlides.length - 2));
      }
      triggerToast?.(`Removed slide ${idx + 1}`);
    },
    [carouselSlides.length, activeSlideIndex, triggerToast]
  );

  const handleMoveSlide = useCallback(
    (idx: number, direction: 'left' | 'right') => {
      const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= carouselSlides.length) return;

      setCarouselSlides((prev) => {
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[targetIdx];
        next[targetIdx] = temp;
        return next;
      });

      setCarouselAssets((prev) => {
        const next = [...prev];
        const temp = next[idx];
        next[idx] = next[targetIdx];
        next[targetIdx] = temp;
        return next;
      });

      setActiveSlideIndex(targetIdx);
    },
    [carouselSlides.length]
  );

  const resetSchedulerForm = useCallback(() => {
    setTitle('');
    setCaption('');
    setHashtags([]);
    setCustomTagInput('');
    setSelectedMediaAsset(null);
    setSelectedMediaUrl(null);
    setIsVideoMedia(false);
    setUploadedFileName(null);
    setActiveImageAspectRatio(null);
    setReelCoverAsset(null);
    setReelCoverUrl(null);
    setCarouselAssets([]);
    setCarouselSlides([]);
    setActiveSlideIndex(0);
    setStoryLinkSticker('https://scanmysocial.com/growth');
    setHasAutodm(false);
    setAutodmKeyword('TOOLS');
    setAutodmReplyText('Hey there! 👋 Here is your instant access link: https://scanmysocial.com/free-access');
    setScheduleMode('recommended');
    setCustomDate(new Date().toISOString().split('T')[0]);
    setCustomTime('18:00');
  }, []);

  return {
    format,
    setFormat,
    title,
    setTitle,
    caption,
    setCaption,
    hashtags,
    setHashtags,
    customTagInput,
    setCustomTagInput,
    selectedMediaUrl,
    setSelectedMediaUrl,
    selectedMediaAsset,
    setSelectedMediaAsset,
    isVideoMedia,
    setIsVideoMedia,
    uploadedFileName,
    setUploadedFileName,
    imageAspectRatio,
    setImageAspectRatio,
    activeImageAspectRatio,
    setActiveImageAspectRatio,
    storyLinkSticker,
    setStoryLinkSticker,
    reelCoverUrl,
    setReelCoverUrl,
    reelCoverAsset,
    setReelCoverAsset,
    carouselAssets,
    setCarouselAssets,
    carouselSlides,
    setCarouselSlides,
    activeSlideIndex,
    setActiveSlideIndex,
    hasAutodm,
    setHasAutodm,
    autodmKeyword,
    setAutodmKeyword,
    autodmReplyText,
    setAutodmReplyText,
    scheduleMode,
    setScheduleMode,
    customDate,
    setCustomDate,
    customTime,
    setCustomTime,
    selectedRecommendation,
    setSelectedRecommendation,
    carouselConsistency,
    handleAddHashtag,
    handleRemoveHashtag,
    handleRemoveSlide,
    handleMoveSlide,
    resetSchedulerForm,
  };
}

export type UseSchedulerFormReturn = ReturnType<typeof useSchedulerForm>;
