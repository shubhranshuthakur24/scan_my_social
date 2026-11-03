'use client';

import React, { RefObject } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import {
  Layers,
  Film,
  UploadCloud,
  Trash2,
  Plus,
  Info,
  Crop,
  Link2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { MediaAssetItem } from '@/lib/api/instagramService';
import { CANONICAL_RATIOS, classifyAspectRatio } from '@/lib/types/instagramRatios';
import { MediaFormat } from './SchedulerFormatCard';

export interface SchedulerMediaManagerCardProps {
  format: MediaFormat;
  selectedMediaUrl: string | null;
  selectedMediaAsset: MediaAssetItem | null;
  uploadedFileName: string | null;
  isVideoMedia: boolean;
  reelCoverUrl: string | null;
  carouselSlides: string[];
  carouselAssets: MediaAssetItem[];
  carouselConsistency: {
    hasMixedRatios: boolean;
    primaryRatio: number | null;
    mismatches: any[];
  };
  imageAspectRatio: '4:5' | '1:1';
  activeImageAspectRatio: number | null;
  storyLinkSticker: string;
  activeSlideIndex: number;
  setActiveSlideIndex: (idx: number) => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
  carouselInputRef: RefObject<HTMLInputElement | null>;
  reelCoverInputRef: RefObject<HTMLInputElement | null>;
  handleFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddCarouselFiles: (files: FileList) => void;
  handleReelCoverUpload: (file: File) => void;
  handleRemoveSlide: (idx: number) => void;
  handleMoveSlide: (idx: number, direction: 'left' | 'right') => void;
  setIsLibraryModalOpen: (open: boolean) => void;
  setSelectedMediaUrl: (url: string | null) => void;
  setSelectedMediaAsset: (asset: MediaAssetItem | null) => void;
  setUploadedFileName: (name: string | null) => void;
  setReelCoverUrl: (url: string | null) => void;
  setReelCoverAsset: (asset: MediaAssetItem | null) => void;
  setIsVideoMedia: (isVideo: boolean) => void;
  setImageAspectRatio: (ratio: '4:5' | '1:1') => void;
  setActiveImageAspectRatio: (ratio: number | null) => void;
  setCropTargetRatio: (ratio: number) => void;
  setCropBatchQueue: (queue: { id: string; url: string; name: string }[]) => void;
  setIsCropModalOpen: (open: boolean) => void;
  setStoryLinkSticker: (url: string) => void;
  setFormat: (fmt: MediaFormat) => void;
  triggerToast: (msg: string) => void;
  className?: string;
}

export default function SchedulerMediaManagerCard({
  format,
  selectedMediaUrl,
  selectedMediaAsset,
  uploadedFileName,
  isVideoMedia,
  reelCoverUrl,
  carouselSlides,
  carouselAssets,
  carouselConsistency,
  imageAspectRatio,
  activeImageAspectRatio,
  storyLinkSticker,
  activeSlideIndex,
  setActiveSlideIndex,
  fileInputRef,
  carouselInputRef,
  reelCoverInputRef,
  handleFileInputChange,
  handleAddCarouselFiles,
  handleReelCoverUpload,
  handleRemoveSlide,
  handleMoveSlide,
  setIsLibraryModalOpen,
  setSelectedMediaUrl,
  setSelectedMediaAsset,
  setUploadedFileName,
  setReelCoverUrl,
  setReelCoverAsset,
  setIsVideoMedia,
  setImageAspectRatio,
  setActiveImageAspectRatio,
  setCropTargetRatio,
  setCropBatchQueue,
  setIsCropModalOpen,
  setStoryLinkSticker,
  setFormat,
  triggerToast,
  className = '',
}: SchedulerMediaManagerCardProps) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs space-y-4 ${className}`}>
      {/* Hidden native file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept={
          format === 'reel'
            ? 'video/mp4,video/quicktime,video/webm,video/*'
            : format === 'image'
            ? 'image/png,image/jpeg,image/webp'
            : 'image/*,video/*'
        }
        multiple={format === 'carousel'}
        className="hidden"
        onChange={handleFileInputChange}
      />
      <input
        ref={carouselInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) handleAddCarouselFiles(e.target.files);
        }}
      />
      <input
        ref={reelCoverInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) handleReelCoverUpload(e.target.files[0]);
        }}
      />

      {/* Header with Format Label & Library Action */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
            2. Media Asset Manager
          </span>
          <span className="text-xs font-bold text-slate-700">
            {format === 'reel' && 'Instagram Reel Video (9:16 Vertical)'}
            {format === 'carousel' && `Carousel Slides Sequence (${carouselSlides.length} of 10 Slides)`}
            {format === 'image' && 'Single High-Resolution Photo'}
            {format === 'story' && '24-Hour Story Broadcast (9:16 Fullscreen)'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsLibraryModalOpen(true)}
          className="text-xs font-black text-primary-600 hover:text-primary-800 transition-colors cursor-pointer flex items-center gap-1.5 bg-primary-50 hover:bg-primary-100 px-3 py-1.5 rounded-lg shrink-0"
        >
          <Layers size={13} /> Select from Media Library
        </button>
      </div>

      {/* FORMAT 1: INSTAGRAM REEL */}
      {format === 'reel' && (
        <div className="space-y-4">
          {selectedMediaUrl ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Reel Video Player / Thumbnail Preview */}
              <div className="relative aspect-[9/16] max-h-[230px] mx-auto sm:mx-0 w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 group shadow-xs">
                {isVideoMedia ? (
                  <video
                    src={selectedMediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={selectedMediaUrl}
                    alt="Reel Media"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                  <Button
                    variant="primary"
                    size="xs"
                    icon={UploadCloud}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Video
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={Trash2}
                    onClick={() => {
                      setSelectedMediaUrl(null);
                      setSelectedMediaAsset(null);
                      setUploadedFileName(null);
                      setReelCoverUrl(null);
                      setReelCoverAsset(null);
                      setIsVideoMedia(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      triggerToast('Reel video removed.');
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <span className="absolute top-2 left-2 rounded bg-primary-600/90 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider flex items-center gap-1">
                  <Film size={9} /> 9:16 Reel
                </span>
                <span className="absolute bottom-2 left-2 right-2 rounded bg-black/75 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white truncate">
                  {uploadedFileName || 'Active Reel Asset'}
                </span>
              </div>

              {/* Reel Secondary Settings & Cover Frame */}
              <div className="sm:col-span-2 space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50/70">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-14 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300 relative">
                      <img
                        src={reelCoverUrl || selectedMediaUrl}
                        alt="Cover Frame"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-800">Reel Cover Thumbnail</p>
                      <p className="text-[10px] text-slate-500">First frame or upload custom cover</p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => reelCoverInputRef.current?.click()}
                  >
                    {reelCoverUrl ? 'Replace Cover' : 'Upload Cover'}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    icon={UploadCloud}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload New Video
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setIsLibraryModalOpen(true)}
                  >
                    Select from Library
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary-500 p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-primary-50/30 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Film size={28} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Upload Reel Video File</p>
                <p className="text-xs text-slate-500 mt-0.5">MP4, MOV, or WEBP up to 100MB (9:16 Vertical Recommended)</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="xs"
                  icon={UploadCloud}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Video File
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  icon={Layers}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLibraryModalOpen(true);
                  }}
                >
                  Select from Library
                </Button>
                <Link
                  href="/video-tools/watermark-remover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="xs"
                    icon={Sparkles}
                  >
                    Clean Gemini Video
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FORMAT 2: CAROUSEL MULTI-SLIDES */}
      {format === 'carousel' && (
        <div className="space-y-4">
          {carouselSlides.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  {carouselSlides.length} slide(s) added (Slide 1 is your cover):
                </span>
                <Button
                  variant="secondary"
                  size="xs"
                  icon={Plus}
                  onClick={() => carouselInputRef.current?.click()}
                >
                  Add Slide
                </Button>
              </div>

              {/* Carousel Consistency Alert if Mixed Aspect Ratios Detected */}
              {carouselConsistency.hasMixedRatios && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/95 p-3.5 text-xs text-amber-950 space-y-2.5 shadow-xs animate-in fade-in duration-200">
                  <div className="flex items-start gap-2.5">
                    <Info size={18} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-black text-amber-950">
                        Mixed Aspect Ratios Detected in Carousel
                      </p>
                      <p className="text-[11px] text-amber-900 leading-snug">
                        Slide #1 (Cover) has an aspect ratio of <strong>{carouselConsistency.primaryRatio?.toFixed(2)}</strong>, but {carouselConsistency.mismatches.length} slide(s) have differing aspect ratios. Meta requires <strong>all slides in a carousel container to share the exact same aspect ratio</strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/80">
                    <Button
                      variant="primary"
                      size="xs"
                      icon={Crop}
                      onClick={() => {
                        setCropTargetRatio(CANONICAL_RATIOS.PORTRAIT_4_5);
                        setCropBatchQueue(
                          carouselAssets.map((a, i) => ({ id: a.id, url: a.url, name: a.title || `Slide ${i + 1}` }))
                        );
                        setIsCropModalOpen(true);
                      }}
                    >
                      Crop All Slides to 4:5 Portrait
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      icon={Crop}
                      onClick={() => {
                        setCropTargetRatio(CANONICAL_RATIOS.SQUARE_1_1);
                        setCropBatchQueue(
                          carouselAssets.map((a, i) => ({ id: a.id, url: a.url, name: a.title || `Slide ${i + 1}` }))
                        );
                        setIsCropModalOpen(true);
                      }}
                    >
                      Crop All Slides to 1:1 Square
                    </Button>
                  </div>
                </div>
              )}

              {/* Slide Thumbnails Reordering Strip */}
              <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                {carouselSlides.map((url, i) => (
                  <div
                    key={i}
                    onClick={() => setActiveSlideIndex(i)}
                    className={`relative w-24 aspect-[4/5] rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer group ${
                      activeSlideIndex === i ? 'border-primary-600 ring-2 ring-primary-500/20 shadow-sm' : 'border-slate-200 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute top-1 left-1 rounded bg-black/75 px-1.5 py-0.5 text-[9px] font-black text-white">
                      #{i + 1}
                    </div>

                    {/* Overlay Action Buttons */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(i, 'left');
                          }}
                          className="p-1 rounded bg-white/20 text-white hover:bg-white/40"
                          title="Move left"
                        >
                          <ChevronLeft size={12} />
                        </button>
                      )}
                      {i < carouselSlides.length - 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveSlide(i, 'right');
                          }}
                          className="p-1 rounded bg-white/20 text-white hover:bg-white/40"
                          title="Move right"
                        >
                          <ChevronRight size={12} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSlide(i);
                        }}
                        className="p-1 rounded bg-rose-600/80 text-white hover:bg-rose-600"
                        title="Delete slide"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {carouselSlides.length < 10 && (
                  <button
                    type="button"
                    onClick={() => carouselInputRef.current?.click()}
                    className="w-24 aspect-[4/5] rounded-xl border-2 border-dashed border-slate-300 hover:border-primary-500 flex flex-col items-center justify-center gap-1.5 text-slate-400 hover:text-primary-600 shrink-0 bg-slate-50/50 hover:bg-primary-50/20 transition-all cursor-pointer"
                  >
                    <Plus size={20} />
                    <span className="text-[10px] font-extrabold">Add Slide</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              onClick={() => carouselInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary-500 p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-primary-50/30 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Layers size={28} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Upload Carousel Sequence (Up to 10 Slides)</p>
                <p className="text-xs text-slate-500 mt-0.5">Select multiple images or videos. 4:5 Portrait is recommended.</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="xs"
                  icon={UploadCloud}
                  onClick={(e) => {
                    e.stopPropagation();
                    carouselInputRef.current?.click();
                  }}
                >
                  Browse Carousel Files
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  icon={Layers}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLibraryModalOpen(true);
                  }}
                >
                  Select from Library
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FORMAT 3: SINGLE PHOTO */}
      {format === 'image' && (
        <div className="space-y-4">
          {/* Aspect Ratio Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">Aspect Ratio:</span>
            <button
              type="button"
              onClick={() => setImageAspectRatio('4:5')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                imageAspectRatio === '4:5'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              4:5 Portrait (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setImageAspectRatio('1:1')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                imageAspectRatio === '1:1'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              1:1 Classic Square
            </button>
          </div>

          {selectedMediaUrl ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              {/* Active Photo Preview */}
              <div
                className={`relative ${
                  imageAspectRatio === '1:1' ? 'aspect-square' : 'aspect-[4/5]'
                } rounded-xl overflow-hidden bg-slate-950 border border-slate-200 group shadow-xs`}
              >
                <img src={selectedMediaUrl} alt="Single Photo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                  <Button
                    variant="primary"
                    size="xs"
                    icon={UploadCloud}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Photo
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={Trash2}
                    onClick={() => {
                      setSelectedMediaUrl(null);
                      setSelectedMediaAsset(null);
                      setUploadedFileName(null);
                      setActiveImageAspectRatio(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      triggerToast('Photo removed.');
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <span className="absolute bottom-2 left-2 rounded bg-black/75 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white truncate max-w-[180px]">
                  {uploadedFileName || 'Active Photo'}
                </span>
              </div>

              {/* Quick change actions */}
              <div className="sm:col-span-2 space-y-2.5">
                {(() => {
                  const classification = activeImageAspectRatio
                    ? classifyAspectRatio(activeImageAspectRatio)
                    : null;
                  return (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">
                          Photo loaded in {imageAspectRatio} format.
                        </p>
                        {classification && (
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              classification.isFeedCompliant
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}
                          >
                            Ratio: {classification.ratio.toFixed(2)}{' '}
                            {classification.isFeedCompliant ? '✓ Feed Compliant' : `⚠ ${classification.label}`}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          variant="outline"
                          size="xs"
                          icon={UploadCloud}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change Image File
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setIsLibraryModalOpen(true)}
                        >
                          Select from Library
                        </Button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary-500 p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-primary-50/30 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ImageIcon size={28} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Upload High-Res Photo</p>
                <p className="text-xs text-slate-500 mt-0.5">PNG, JPG, WEBP in 1:1 Square or 4:5 Portrait</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="xs"
                  icon={UploadCloud}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Photo File
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  icon={Layers}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLibraryModalOpen(true);
                  }}
                >
                  Select from Library
                </Button>
                <Link
                  href="/image-tools/watermark-remover"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="xs"
                    icon={Sparkles}
                  >
                    Clean Gemini Image
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FORMAT 4: STORY BROADCAST */}
      {format === 'story' && (
        <div className="space-y-4">
          {selectedMediaUrl ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div className="relative aspect-[9/16] max-h-[220px] rounded-xl overflow-hidden bg-slate-950 border border-slate-200 mx-auto sm:mx-0 w-full group shadow-xs">
                {isVideoMedia ? (
                  <video
                    src={selectedMediaUrl}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img src={selectedMediaUrl} alt="Story Media" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 p-2">
                  <Button
                    variant="primary"
                    size="xs"
                    icon={UploadCloud}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Story
                  </Button>
                  <Button
                    variant="secondary"
                    size="xs"
                    icon={Trash2}
                    onClick={() => {
                      setSelectedMediaUrl(null);
                      setSelectedMediaAsset(null);
                      setUploadedFileName(null);
                      setIsVideoMedia(false);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                      triggerToast('Story media removed.');
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <span className="absolute top-2 left-2 rounded bg-rose-600 px-1.5 py-0.5 text-[8px] font-black text-white uppercase">
                  24h Story
                </span>
              </div>

              <div className="sm:col-span-2 space-y-3">
                {/* Interactive Story Link Sticker */}
                <div className="p-3 rounded-xl border border-primary-200 bg-primary-50/50 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-primary-900">
                    <Link2 size={13} /> Interactive Link Sticker
                  </div>
                  <input
                    type="url"
                    value={storyLinkSticker}
                    onChange={(e) => setStoryLinkSticker(e.target.value)}
                    placeholder="https://viralyzer.ai/link"
                    className="w-full text-xs px-3 py-1.5 rounded-lg border border-primary-200 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="rounded-2xl border-2 border-dashed border-slate-300 hover:border-primary-500 p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 bg-slate-50/50 hover:bg-primary-50/30 group"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Film size={28} />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900">Upload 9:16 Fullscreen Story Media</p>
                <p className="text-xs text-slate-500 mt-0.5">Photo or Video (up to 60s)</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="primary"
                  size="xs"
                  icon={UploadCloud}
                  onClick={(e) => {
                    e.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                >
                  Browse Story File
                </Button>
                <Button
                  variant="secondary"
                  size="xs"
                  icon={Layers}
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLibraryModalOpen(true);
                  }}
                >
                  Select from Library
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
