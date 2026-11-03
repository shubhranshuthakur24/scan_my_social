'use client';

import React, { Suspense } from 'react';
import { Sparkles } from 'lucide-react';
import InstagramNav from '@/components/InstagramNav';
import ImageCropModal from '@/components/ImageCropModal';
import { useScheduler } from './hooks/useScheduler';
import SchedulerHeader from './components/SchedulerHeader';
import SchedulerWorkbench from './components/SchedulerWorkbench';
import SchedulerMediaLibraryModal from './components/SchedulerMediaLibraryModal';
import SchedulerSkeleton from './components/SchedulerSkeleton';

export type { ScheduledQueueItem, MediaLibraryItem } from './types';

function SchedulerContent() {
  const scheduler = useScheduler();

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {scheduler.toast.message && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-xs font-bold text-white shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
          <Sparkles size={16} className="text-primary-400" />
          <span>{scheduler.toast.message}</span>
        </div>
      )}

      {/* 1. Module Navigation Tab Strip */}
      <InstagramNav onSelectAccount={scheduler.account.setSelectedAccountId} />

      {/* 2. Header Actions */}
      <SchedulerHeader
        mediaLibraryCount={scheduler.media.mediaLibrary.length}
        onOpenMediaLibrary={() => scheduler.media.setIsLibraryModalOpen(true)}
      />

      {/* 3. Main Studio Workbench Grid */}
      <SchedulerWorkbench scheduler={scheduler} />

      {/* 4. Media Library Vault Modal */}
      <SchedulerMediaLibraryModal
        isOpen={scheduler.media.isLibraryModalOpen}
        onClose={() => scheduler.media.setIsLibraryModalOpen(false)}
        mediaLibrary={scheduler.media.mediaLibrary}
        selectedMediaUrl={scheduler.form.selectedMediaUrl}
        carouselSlides={scheduler.form.carouselSlides}
        format={scheduler.form.format}
        librarySearch={scheduler.media.librarySearch}
        setLibrarySearch={scheduler.media.setLibrarySearch}
        libraryCategory={scheduler.media.libraryCategory}
        setLibraryCategory={scheduler.media.setLibraryCategory}
        modalFileInputRef={scheduler.media.modalFileInputRef}
        onFileUpload={scheduler.media.handleModalFileUpload}
        onSelectMedia={scheduler.media.handleSelectFromMediaLibrary}
        onDeleteMedia={scheduler.media.handleDeleteMediaLibraryItem}
      />

      {/* 5. Format-Aware Image Crop Modal */}
      <ImageCropModal
        isOpen={scheduler.media.isCropModalOpen}
        onClose={() => {
          scheduler.media.setIsCropModalOpen(false);
          scheduler.media.setCropBatchQueue([]);
          scheduler.media.setCropTargetImage(null);
        }}
        imageUrl={
          scheduler.media.cropBatchQueue.length > 0
            ? scheduler.media.cropBatchQueue[0].url
            : scheduler.media.cropTargetImage?.url || scheduler.form.selectedMediaUrl
        }
        imageName={
          scheduler.media.cropBatchQueue.length > 0
            ? scheduler.media.cropBatchQueue[0].name
            : scheduler.media.cropTargetImage?.name || scheduler.form.uploadedFileName || 'photo.jpg'
        }
        destinationFormat={scheduler.form.format}
        targetRatio={scheduler.media.cropTargetRatio}
        onCropComplete={scheduler.media.handleCropComplete}
        batchQueue={scheduler.media.cropBatchQueue}
        onBatchComplete={scheduler.media.handleBatchCropComplete}
      />
    </div>
  );
}

export default function InstagramSchedulerPage() {
  return (
    <Suspense fallback={<SchedulerSkeleton />}>
      <SchedulerContent />
    </Suspense>
  );
}
