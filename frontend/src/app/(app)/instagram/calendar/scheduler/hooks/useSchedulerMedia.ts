'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  uploadMediaAsset,
  getMediaLibrary,
  deleteMediaAsset,
  MediaAssetItem,
} from '@/lib/api/instagramService';
import { CANONICAL_RATIOS } from '@/lib/types/instagramRatios';
import { MediaFormat, MediaLibraryItem, toLibraryItem, LibraryCategory } from '../types';
import { UseSchedulerFormReturn } from './useSchedulerForm';

export interface UseSchedulerMediaProps {
  form: UseSchedulerFormReturn;
  triggerToast: (msg: string) => void;
}

export function useSchedulerMedia({ form, triggerToast }: UseSchedulerMediaProps) {
  // Input references
  const fileInputRef = useRef<HTMLInputElement>(null);
  const carouselInputRef = useRef<HTMLInputElement>(null);
  const reelCoverInputRef = useRef<HTMLInputElement>(null);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  // Upload & drag states
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Media Library state
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>([]);
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState<LibraryCategory>('All');

  // Cropping state (react-easy-crop workflow)
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  const [cropTargetRatio, setCropTargetRatio] = useState<number | null>(CANONICAL_RATIOS.PORTRAIT_4_5);
  const [cropTargetImage, setCropTargetImage] = useState<{
    url: string;
    name: string;
    id?: string | number;
  } | null>(null);
  const [cropBatchQueue, setCropBatchQueue] = useState<
    Array<{ id: string | number; url: string; name: string }>
  >([]);

  // Load media library from backend
  useEffect(() => {
    let isCancelled = false;
    getMediaLibrary().then((res) => {
      if (!isCancelled && res && res.media && res.media.length > 0) {
        setMediaLibrary(res.media.map(toLibraryItem));
      }
    });
    return () => {
      isCancelled = true;
    };
  }, []);

  // Process a single uploaded file
  const handleProcessFile = useCallback(
    async (file: File) => {
      if (!file) return;
      setIsUploading(true);
      try {
        const asset = await uploadMediaAsset(file);
        const libItem = toLibraryItem(asset);
        setMediaLibrary((prev) => [libItem, ...prev.filter((m) => m.id !== libItem.id)]);
        form.setSelectedMediaAsset(asset);
        form.setSelectedMediaUrl(asset.url);
        form.setUploadedFileName(asset.originalName);

        if (asset.mediaType === 'video') {
          form.setIsVideoMedia(true);
          if (form.format === 'image') form.setFormat('reel');
          triggerToast(`Video uploaded & saved to Media Library: ${file.name}`);
        } else {
          form.setIsVideoMedia(false);
          triggerToast(`Image uploaded & saved to Media Library: ${file.name}`);
        }
      } catch (err: any) {
        triggerToast(err.message || `Failed to upload ${file.name}`);
      } finally {
        setIsUploading(false);
      }
    },
    [form, triggerToast]
  );

  // Single crop complete - replaces currently selected scheduler media
  const handleCropComplete = useCallback(
    async (croppedFile: File) => {
      setIsUploading(true);
      try {
        const asset = await uploadMediaAsset(croppedFile);
        const libItem = toLibraryItem(asset);
        setMediaLibrary((prev) => [libItem, ...prev.filter((m) => m.id !== libItem.id)]);

        if (form.format === 'carousel' && cropTargetImage?.id) {
          const targetId = String(cropTargetImage.id);
          form.setCarouselAssets((prev) =>
            prev.map((a) => (String(a.id) === targetId ? asset : a))
          );
          form.setCarouselSlides((prev) =>
            prev.map((url, i) => (String(form.carouselAssets[i]?.id) === targetId ? asset.url : url))
          );
          triggerToast('Carousel slide replaced with cropped image!');
        } else {
          form.setSelectedMediaAsset(asset);
          form.setSelectedMediaUrl(asset.url);
          form.setUploadedFileName(asset.originalName);
          if (asset.aspectRatio) {
            form.setActiveImageAspectRatio(asset.aspectRatio);
          }
          triggerToast('Cropped media replaced selected scheduler media!');
        }
        setCropTargetImage(null);
      } catch (err: any) {
        triggerToast(err.message || 'Failed to save cropped image');
      } finally {
        setIsUploading(false);
      }
    },
    [form, cropTargetImage, triggerToast]
  );

  // Batch crop complete for carousel slides
  const handleBatchCropComplete = useCallback(
    async (croppedFiles: Array<{ id: string | number; file: File }>) => {
      if (croppedFiles.length === 0) return;
      setIsUploading(true);
      try {
        const updatedAssets = [...form.carouselAssets];
        for (const item of croppedFiles) {
          const asset = await uploadMediaAsset(item.file);
          const libItem = toLibraryItem(asset);
          setMediaLibrary((prev) => [libItem, ...prev.filter((m) => m.id !== libItem.id)]);
          const idx = updatedAssets.findIndex((a) => String(a.id) === String(item.id));
          if (idx !== -1) {
            updatedAssets[idx] = asset;
          }
        }
        form.setCarouselAssets(updatedAssets);
        form.setCarouselSlides(updatedAssets.map((a) => a.url));
        setCropBatchQueue([]);
        triggerToast(`All ${croppedFiles.length} carousel slides cropped and aligned to format!`);
      } catch (err: any) {
        triggerToast(err.message || 'Failed to update cropped carousel slides');
      } finally {
        setIsUploading(false);
      }
    },
    [form, triggerToast]
  );

  // Add multiple files to carousel
  const handleAddCarouselFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      if (fileArr.length === 0) return;
      setIsUploading(true);
      try {
        const uploadedAssets: MediaAssetItem[] = [];
        for (const f of fileArr) {
          const asset = await uploadMediaAsset(f);
          uploadedAssets.push(asset);
        }
        const newLibItems = uploadedAssets.map(toLibraryItem);
        setMediaLibrary((prev) => [...newLibItems, ...prev]);
        form.setCarouselAssets((prev) => [...prev, ...uploadedAssets]);
        form.setCarouselSlides((prev) => [...prev, ...uploadedAssets.map((a) => a.url)]);
        form.setActiveSlideIndex(form.carouselSlides.length);
        triggerToast(`Uploaded ${uploadedAssets.length} slide(s) to Media Library`);
      } catch (err: any) {
        triggerToast(err.message || 'Failed to upload some carousel slides');
      } finally {
        setIsUploading(false);
      }
    },
    [form, triggerToast]
  );

  // Upload file from inside the media library modal
  const handleModalFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      setIsUploading(true);
      try {
        const fileArr = Array.from(files);
        const uploaded: MediaAssetItem[] = [];
        for (const f of fileArr) {
          const asset = await uploadMediaAsset(f);
          uploaded.push(asset);
        }
        setMediaLibrary((prev) => [...uploaded.map(toLibraryItem), ...prev]);
        triggerToast(`Uploaded ${uploaded.length} file(s) to your Media Library`);
      } catch (err: any) {
        triggerToast(err.message || 'Upload failed');
      } finally {
        setIsUploading(false);
      }
    },
    [triggerToast]
  );

  // Delete media asset from library
  const handleDeleteMediaLibraryItem = useCallback(
    async (id: string, title: string) => {
      try {
        await deleteMediaAsset(id);
        setMediaLibrary((prev) => prev.filter((item) => item.id !== id));
        if (form.selectedMediaAsset?.id === id) {
          form.setSelectedMediaAsset(null);
          form.setSelectedMediaUrl(null);
          form.setUploadedFileName(null);
        }
        form.setCarouselAssets((prev) => prev.filter((item) => String(item.id) !== id));
        form.setCarouselSlides((prev) =>
          prev.filter((_, i) => String(form.carouselAssets[i]?.id) !== id)
        );
        triggerToast(`Removed "${title}" from Media Library`);
      } catch (err: any) {
        triggerToast(err.message || 'Failed to delete media asset');
      }
    },
    [form, triggerToast]
  );

  // Select asset from media library
  const handleSelectFromMediaLibrary = useCallback(
    (item: MediaLibraryItem) => {
      const assetItem: MediaAssetItem = {
        id: item.id,
        title: item.title,
        originalName: item.title,
        mediaType: item.type === 'reel' ? 'video' : 'image',
        url: item.url,
        sizeBytes: 0,
        mimeType: item.type === 'reel' ? 'video/mp4' : 'image/jpeg',
        createdAt: item.uploadedAt,
      };

      if (form.format === 'carousel') {
        form.setCarouselAssets((prev) => [...prev, assetItem]);
        form.setCarouselSlides((prev) => [...prev, item.url]);
        form.setActiveSlideIndex(form.carouselSlides.length);
        triggerToast(`Added "${item.title}" to carousel sequence`);
      } else {
        form.setSelectedMediaAsset(assetItem);
        form.setSelectedMediaUrl(item.url);
        form.setUploadedFileName(item.title);
        if (item.type === 'reel') {
          form.setIsVideoMedia(true);
          if (form.format === 'image') form.setFormat('reel');
        } else {
          form.setIsVideoMedia(false);
        }
        triggerToast(`Selected "${item.title}" from Media Library`);
      }
      setIsLibraryModalOpen(false);
    },
    [form, triggerToast]
  );

  // Upload custom cover for reel
  const handleReelCoverUpload = useCallback(
    async (file: File) => {
      if (!file) return;
      setIsUploading(true);
      try {
        const asset = await uploadMediaAsset(file);
        form.setReelCoverAsset(asset);
        form.setReelCoverUrl(asset.url);
        setMediaLibrary((prev) => [toLibraryItem(asset), ...prev]);
        triggerToast('Reel custom cover frame updated!');
      } catch (err: any) {
        triggerToast(err.message || 'Failed to upload reel cover');
      } finally {
        setIsUploading(false);
      }
    },
    [form, triggerToast]
  );

  // File input change router
  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      if (form.format === 'carousel') {
        handleAddCarouselFiles(files);
      } else {
        handleProcessFile(files[0]);
      }
    },
    [form.format, handleAddCarouselFiles, handleProcessFile]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        if (form.format === 'carousel') {
          handleAddCarouselFiles(e.dataTransfer.files);
        } else {
          handleProcessFile(e.dataTransfer.files[0]);
        }
      }
    },
    [form.format, handleAddCarouselFiles, handleProcessFile]
  );

  return {
    fileInputRef,
    carouselInputRef,
    reelCoverInputRef,
    modalFileInputRef,
    isUploading,
    setIsUploading,
    isDragging,
    mediaLibrary,
    setMediaLibrary,
    isLibraryModalOpen,
    setIsLibraryModalOpen,
    librarySearch,
    setLibrarySearch,
    libraryCategory,
    setLibraryCategory,
    isCropModalOpen,
    setIsCropModalOpen,
    cropTargetRatio,
    setCropTargetRatio,
    cropTargetImage,
    setCropTargetImage,
    cropBatchQueue,
    setCropBatchQueue,
    handleProcessFile,
    handleCropComplete,
    handleBatchCropComplete,
    handleAddCarouselFiles,
    handleModalFileUpload,
    handleDeleteMediaLibraryItem,
    handleSelectFromMediaLibrary,
    handleReelCoverUpload,
    handleFileInputChange,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}

export type UseSchedulerMediaReturn = ReturnType<typeof useSchedulerMedia>;
