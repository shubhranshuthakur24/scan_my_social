'use client';

import React from 'react';
import SchedulerFormatCard from './SchedulerFormatCard';
import SchedulerMediaManagerCard from './SchedulerMediaManagerCard';
import SchedulerCaptionCard from './SchedulerCaptionCard';
import SchedulerPublishTimingCard from './SchedulerPublishTimingCard';
import SchedulerDeviceMockup from './SchedulerDeviceMockup';
import SchedulerQueueDrawer from './SchedulerQueueDrawer';
import { UseSchedulerReturn } from '../hooks/useScheduler';

export interface SchedulerWorkbenchProps {
  scheduler: UseSchedulerReturn;
  queueDrawer?: React.ReactNode;
  className?: string;
}

export default function SchedulerWorkbench({
  scheduler,
  queueDrawer,
  className = '',
}: SchedulerWorkbenchProps) {
  const { form, media, submit, account, queue, toast } = scheduler;

  return (
    <div className={`grid grid-cols-1 xl:grid-cols-12 gap-8 items-start ${className}`}>
      {/* LEFT COLUMN: CREATOR WORKBENCH (7 Cols) */}
      <div className="xl:col-span-7 space-y-6">
        {/* Card 1: Format Selector */}
        <SchedulerFormatCard
          format={form.format}
          setFormat={form.setFormat}
        />

        {/* Card 2: Adaptive Media Upload & Management */}
        <SchedulerMediaManagerCard
          format={form.format}
          selectedMediaUrl={form.selectedMediaUrl}
          selectedMediaAsset={form.selectedMediaAsset}
          uploadedFileName={form.uploadedFileName}
          isVideoMedia={form.isVideoMedia}
          reelCoverUrl={form.reelCoverUrl}
          carouselSlides={form.carouselSlides}
          carouselAssets={form.carouselAssets}
          carouselConsistency={form.carouselConsistency}
          imageAspectRatio={form.imageAspectRatio}
          activeImageAspectRatio={form.activeImageAspectRatio}
          storyLinkSticker={form.storyLinkSticker}
          activeSlideIndex={form.activeSlideIndex}
          setActiveSlideIndex={form.setActiveSlideIndex}
          fileInputRef={media.fileInputRef}
          carouselInputRef={media.carouselInputRef}
          reelCoverInputRef={media.reelCoverInputRef}
          handleFileInputChange={media.handleFileInputChange}
          handleAddCarouselFiles={media.handleAddCarouselFiles}
          handleReelCoverUpload={media.handleReelCoverUpload}
          handleRemoveSlide={form.handleRemoveSlide}
          handleMoveSlide={form.handleMoveSlide}
          setIsLibraryModalOpen={media.setIsLibraryModalOpen}
          setSelectedMediaUrl={form.setSelectedMediaUrl}
          setSelectedMediaAsset={form.setSelectedMediaAsset}
          setUploadedFileName={form.setUploadedFileName}
          setReelCoverUrl={form.setReelCoverUrl}
          setReelCoverAsset={form.setReelCoverAsset}
          setIsVideoMedia={form.setIsVideoMedia}
          setImageAspectRatio={form.setImageAspectRatio}
          setActiveImageAspectRatio={form.setActiveImageAspectRatio}
          setCropTargetRatio={media.setCropTargetRatio}
          setCropBatchQueue={media.setCropBatchQueue}
          setIsCropModalOpen={media.setIsCropModalOpen}
          setStoryLinkSticker={form.setStoryLinkSticker}
          setFormat={form.setFormat}
          triggerToast={toast.trigger}
        />

        {/* Card 3: Caption & Hashtags */}
        <SchedulerCaptionCard
          format={form.format}
          caption={form.caption}
          setCaption={form.setCaption}
          hashtags={form.hashtags}
          setHashtags={form.setHashtags}
          customTagInput={form.customTagInput}
          setCustomTagInput={form.setCustomTagInput}
          handleAddHashtag={form.handleAddHashtag}
          handleRemoveHashtag={form.handleRemoveHashtag}
          triggerToast={toast.trigger}
        />

        {/* Card 4: Publishing Timing & Submission */}
        <SchedulerPublishTimingCard
          scheduleMode={form.scheduleMode}
          setScheduleMode={form.setScheduleMode}
          selectedRecommendation={form.selectedRecommendation}
          setSelectedRecommendation={form.setSelectedRecommendation}
          customDate={form.customDate}
          setCustomDate={form.setCustomDate}
          customTime={form.customTime}
          setCustomTime={form.setCustomTime}
          isSubmitting={submit.isSubmitting}
          isUploading={media.isUploading}
          handleScheduleSubmit={submit.handleScheduleSubmit}
        />
      </div>

      {/* RIGHT COLUMN: LIVE DEVICE PREVIEW & QUEUE (5 Cols) */}
      <div className="xl:col-span-5 space-y-6 xl:sticky xl:top-6">
        {/* Live Instagram Device Mockup */}
        <SchedulerDeviceMockup
          format={form.format}
          selectedMediaUrl={form.selectedMediaUrl}
          isVideoMedia={form.isVideoMedia}
          carouselSlides={form.carouselSlides}
          activeSlideIndex={form.activeSlideIndex}
          setActiveSlideIndex={form.setActiveSlideIndex}
          imageAspectRatio={form.imageAspectRatio}
          caption={form.caption}
          activeAccount={account.activeAccount}
          hasAutodm={form.hasAutodm}
          autodmKeyword={form.autodmKeyword}
          storyLinkSticker={form.storyLinkSticker}
        />

        {/* Pipeline Queue Drawer */}
        {queueDrawer || (
          <SchedulerQueueDrawer
            queue={queue.queue}
            queueTab={queue.queueTab}
            setQueueTab={queue.setQueueTab}
            onDeleteQueueItem={queue.handleDeleteQueueItem}
          />
        )}
      </div>
    </div>
  );
}
