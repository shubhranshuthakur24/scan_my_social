'use client';

import React from 'react';
import { useBatchCleanMerge } from '@/hooks/useBatchCleanMerge';
import BatchDropzone from './BatchDropzone';
import BatchQueueList from './BatchQueueList';
import BatchDualProgress from './BatchDualProgress';
import BatchResultView from './BatchResultView';
import BatchTrimModal from './BatchTrimModal';
import BatchEditorLayout from './editor/BatchEditorLayout';
import WatermarkCardTabs from '../WatermarkCardTabs';
import WatermarkSidebarInfo from '../WatermarkSidebarInfo';
import { WatermarkHeaderPills, WatermarkBenefitsBar } from '../WatermarkHeaderPills';
import CapabilityNotice from '../CapabilityNotice';
import { checkBaselineBrowserCapabilities, BaselineCapabilities } from '@/lib/watermark/browserCapabilities';
import { BatchVideoItem } from '@/lib/watermark/batch/batchTypes';
import Button from '@/components/ui/Button';
import {
  Layers,
  Lock,
  AlertCircle,
  Play,
  RotateCcw,
  Trash2,
  RefreshCw,
} from 'lucide-react';

export interface BatchCleanMergeProps {
  isPublic?: boolean;
}

export default function BatchCleanMerge({ isPublic = false }: BatchCleanMergeProps = {}) {
  const [baselineCaps] = React.useState<BaselineCapabilities>(() => checkBaselineBrowserCapabilities());
  const [trimmingItem, setTrimmingItem] = React.useState<BatchVideoItem | null>(null);
  const [viewMode, setViewMode] = React.useState<'editor' | 'list'>('editor');

  const {
    items,
    timelineSegments,
    batchStatus,
    activeItemIndex,
    overallProgress,
    activeItemProgress,
    mergedFile,
    mergedUrl,
    preflight,
    isQueueLocked,
    partialFailureError,
    writtenBytes,
    addFiles,
    removeFile,
    reorderQueue,
    moveQueueItem,
    setClipTrimRange,
    resetClipTrim,
    resolveUncertainDecision,
    removeIncompatibleFiles,
    clearQueue,
    splitSegmentAtPlayhead,
    addSourceClipToTimeline,
    removeTimelineSegment,
    reorderTimelineSegments,
    updateSegmentTrim,
    startBatchCleanMerge,
    retryFailedClip,
    cancel,
    reset,
    returnToEditor,
  } = useBatchCleanMerge();

  const isProcessing =
    batchStatus === 'processing' || batchStatus === 'preparing' || batchStatus === 'finalizing';
  const isCompleted = batchStatus === 'completed' && Boolean(mergedFile && mergedUrl);
  const isPartialFailure = batchStatus === 'partial_failure';
  const hasItems = items.length > 0;

  const isStudioMode = hasItems && !isProcessing && !isCompleted && viewMode === 'editor';

  return (
    <div className="w-full space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 shrink-0 shadow-2xs">
            <Layers size={22} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Batch Video Workbench
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Merge multiple videos, automatically remove supported watermarks, and optionally trim each clip — entirely in your browser.
            </p>
          </div>
        </div>

        <WatermarkHeaderPills />
      </div>

      {/* Two-Column / Studio Responsive Layout */}
      <div className={`grid grid-cols-1 ${isStudioMode ? '' : 'lg:grid-cols-12'} gap-6 items-start`}>
        {/* Workbench Column */}
        <div className={`${isStudioMode ? 'w-full' : 'lg:col-span-8'} space-y-5`}>
          <WatermarkCardTabs active="batch" isPublic={isPublic} />

          <CapabilityNotice capabilities={baselineCaps} />

          {/* Workbench Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-xs space-y-5">
            {/* Workbench Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Layers className="h-4.5 w-4.5 text-primary-600" />
                  Batch Video Workbench
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sequential watermark removal and in-browser video stitching.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
                  <Lock size={15} className="text-slate-500 shrink-0" />
                  <div>
                    <span className="text-[11px] font-semibold text-slate-700 block leading-tight">
                      Local Processing
                    </span>
                    <span className="text-[10px] text-slate-500 block leading-tight">
                      Memory-bounded &amp; private
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* View 1: Completed State */}
            {isCompleted && mergedFile && mergedUrl && (
              <BatchResultView
                mergedFile={mergedFile}
                mergedUrl={mergedUrl}
                items={items}
                onReset={reset}
                onReturnToEditor={() => {
                  setViewMode('editor');
                  returnToEditor();
                }}
              />
            )}

            {/* View 2: Processing / Preparing State */}
            {isProcessing && (
              <div className="space-y-5">
                <BatchDualProgress
                  activeItemIndex={activeItemIndex}
                  totalItems={items.length}
                  activeItemName={items[activeItemIndex]?.file.name || 'Processing clip'}
                  overallProgress={overallProgress}
                  activeProgress={activeItemProgress}
                  writtenBytes={writtenBytes}
                  onCancel={cancel}
                />

                <BatchQueueList
                  items={items}
                  isLocked={true}
                  onReorder={reorderQueue}
                  onMoveItem={moveQueueItem}
                  onRemove={removeFile}
                  onAddFiles={addFiles}
                  onClear={clearQueue}
                  onOpenTrimModal={() => {}}
                  onResetTrim={resetClipTrim}
                  onResolveUncertain={resolveUncertainDecision}
                />
              </div>
            )}

            {/* View 3: Partial Failure Banner */}
            {isPartialFailure && partialFailureError && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200/80 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 mt-0.5">
                    <AlertCircle size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-rose-900">
                      Processing Paused: {partialFailureError.itemName}
                    </h4>
                    <p className="text-xs text-rose-700 mt-0.5">
                      {partialFailureError.message}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-rose-200/60">
                  <Button
                    type="button"
                    variant="primary"
                    size="xs"
                    icon={RefreshCw}
                    onClick={retryFailedClip}
                  >
                    Retry Clip
                  </Button>

                  {partialFailureError.itemId !== 'finalize' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      icon={Trash2}
                      onClick={() => removeFile(partialFailureError.itemId)}
                    >
                      Remove Clip &amp; Continue
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={cancel}
                    className="text-rose-700 hover:bg-rose-100/60 ml-auto"
                  >
                    Cancel Batch
                  </Button>
                </div>
              </div>
            )}

            {/* View 4: Incompatible Diagnostic Alert */}
            {!isProcessing && !isCompleted && !preflight.compatible && hasItems && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200/80 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle size={17} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-900">
                      Queue Incompatible for Merging
                    </h4>
                    <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                      {preflight.reason}
                    </p>
                  </div>
                </div>

                {preflight.incompatibleItemIds.length > 0 && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      onClick={removeIncompatibleFiles}
                      className="border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      Remove Incompatible Clips ({preflight.incompatibleItemIds.length})
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* View 5: Empty Queue Dropzone */}
            {!isProcessing && !isCompleted && !hasItems && (
              <BatchDropzone onFilesSelected={addFiles} />
            )}

            {/* View 6: Populated Queue — Studio Editor Mode or Classic List Mode */}
            {!isProcessing && !isCompleted && hasItems && viewMode === 'editor' && (
              <BatchEditorLayout
                items={items}
                timelineSegments={timelineSegments}
                preflight={preflight}
                isLocked={isQueueLocked}
                onAddFiles={addFiles}
                onRemoveFile={removeFile}
                onReorder={reorderQueue}
                onTrimChange={(id, range) => setClipTrimRange(id, range)}
                onResolveUncertain={resolveUncertainDecision}
                onClearQueue={clearQueue}
                onStartMerge={startBatchCleanMerge}
                onSwitchToListView={() => setViewMode('list')}
                onAddToTimeline={addSourceClipToTimeline}
                onSplitSegmentAtPlayhead={splitSegmentAtPlayhead}
                onRemoveTimelineSegment={removeTimelineSegment}
                onReorderTimelineSegments={reorderTimelineSegments}
                onUpdateSegmentTrim={updateSegmentTrim}
              />
            )}

            {!isProcessing && !isCompleted && hasItems && viewMode === 'list' && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Classic List View
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMode('editor')}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 transition-colors"
                  >
                    <Layers size={13} />
                    <span>Switch to Studio Editor</span>
                  </button>
                </div>

                <BatchQueueList
                  items={items}
                  isLocked={isQueueLocked}
                  onReorder={reorderQueue}
                  onMoveItem={moveQueueItem}
                  onRemove={removeFile}
                  onAddFiles={addFiles}
                  onClear={clearQueue}
                  onOpenTrimModal={(item) => setTrimmingItem(item)}
                  onResetTrim={resetClipTrim}
                  onResolveUncertain={resolveUncertainDecision}
                />

                {/* Queue Action Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    icon={RotateCcw}
                    onClick={clearQueue}
                    disabled={isQueueLocked}
                  >
                    Reset Queue
                  </Button>

                  <div className="flex items-center gap-3">
                    {items.length === 1 && (
                      <span className="text-xs text-slate-400">
                        Add at least 2 videos to merge
                      </span>
                    )}

                    <div className="flex flex-col sm:items-end">
                      <Button
                        type="button"
                        variant="primary"
                        size="md"
                        icon={Play}
                        onClick={startBatchCleanMerge}
                        disabled={!preflight.compatible || items.length < 2 || isQueueLocked}
                        className="shadow-xs"
                      >
                        Merge &amp; Clean {items.length} Videos
                      </Button>
                      <span className="text-[11px] text-slate-400 mt-1">
                        Watermarks will be removed automatically when detected
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Trimming Modal */}
            {trimmingItem && (
              <BatchTrimModal
                key={`${trimmingItem.id}_${trimmingItem.trimVersion}`}
                item={trimmingItem}
                isOpen={Boolean(trimmingItem)}
                onClose={() => setTrimmingItem(null)}
                onApply={(id, range) => {
                  setClipTrimRange(id, range);
                  setTrimmingItem(null);
                }}
              />
            )}
          </div>

          <WatermarkBenefitsBar />
        </div>

        {/* Information Sidebar */}
        <div className={isStudioMode ? 'w-full' : 'lg:col-span-4'}>
          <WatermarkSidebarInfo />
        </div>
      </div>
    </div>
  );
}
