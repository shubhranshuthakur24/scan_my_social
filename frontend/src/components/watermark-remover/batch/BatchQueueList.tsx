'use client';

import React, { useRef } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { BatchVideoItem } from '@/lib/watermark/batch/batchTypes';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2,
  Plus,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Lock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Scissors,
  AlertTriangle,
} from 'lucide-react';

export interface BatchQueueListProps {
  items: BatchVideoItem[];
  isLocked: boolean;
  onReorder: (startIndex: number, endIndex: number) => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
  onRemove: (id: string) => void;
  onAddFiles: (files: File[]) => void;
  onClear: () => void;
  onOpenTrimModal: (item: BatchVideoItem) => void;
  onResetTrim: (id: string) => void;
  onResolveUncertain: (id: string, resolution: 'force_clean' | 'keep_original') => void;
}

export default function BatchQueueList({
  items,
  isLocked,
  onReorder,
  onMoveItem,
  onRemove,
  onAddFiles,
  onClear,
  onOpenTrimModal,
  onResetTrim,
  onResolveUncertain,
}: BatchQueueListProps) {
  const addInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnd = (result: DropResult) => {
    if (isLocked || !result.destination) return;
    if (result.destination.index === result.source.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const totalEffectiveDuration = items.reduce((acc, i) => {
    if (i.trimRange) {
      return acc + Math.max(0, i.trimRange.end - i.trimRange.start);
    }
    return acc + (i.metadata?.duration || 0);
  }, 0);

  const totalSize = items.reduce((acc, i) => acc + i.file.size, 0);

  return (
    <div className="space-y-3.5">
      <input
        ref={addInputRef}
        type="file"
        multiple
        accept="video/mp4,video/quicktime,video/webm"
        className="sr-only"
        disabled={isLocked}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddFiles(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Queue Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Playback Order ({items.length} clips)
          </span>
          <span className="text-xs text-slate-400">•</span>
          <span className="text-xs font-medium text-slate-600">
            Total Selected: {formatDuration(totalEffectiveDuration)} ({formatFileSize(totalSize)})
          </span>
          {isLocked && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              <Lock size={10} />
              Locked
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="xs"
            icon={Plus}
            onClick={() => addInputRef.current?.click()}
            disabled={isLocked}
          >
            Add Clips
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            icon={RotateCcw}
            onClick={onClear}
            disabled={isLocked}
            className="text-slate-400 hover:text-rose-600"
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Reorderable List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="batch-video-queue">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2.5"
            >
              {items.map((item, index) => {
                const isAnalyzing = item.status === 'validating' || item.status === 'analyzing';
                const isCleaning = item.status === 'cleaning';
                const isFeeding = item.status === 'feeding';
                const isCompleted = item.status === 'completed';
                const isFailed = item.status === 'failed';

                const effectiveDuration = item.trimRange
                  ? Math.max(0, item.trimRange.end - item.trimRange.start)
                  : item.metadata?.duration || 0;

                const isTrimmed = item.trimRange !== null;

                return (
                  <Draggable
                    key={item.id}
                    draggableId={item.id}
                    index={index}
                    isDragDisabled={isLocked}
                  >
                    {(draggableProvided, snapshot) => (
                      <div
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        className={`flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border bg-white transition-shadow duration-150 ${
                          snapshot.isDragging
                            ? 'shadow-lg border-primary-400 ring-2 ring-primary-500/20 z-10'
                            : 'border-slate-200/90 shadow-2xs hover:border-slate-300'
                        } ${isFailed ? 'border-rose-300 bg-rose-50/20' : ''}`}
                      >
                        {/* Rearrange Stepwise Buttons + Drag Handle */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <div
                            {...draggableProvided.dragHandleProps}
                            className={`p-1 rounded-md text-slate-400 transition-colors ${
                              isLocked
                                ? 'cursor-not-allowed opacity-30'
                                : 'hover:text-slate-700 hover:bg-slate-100 cursor-grab active:cursor-grabbing'
                            }`}
                            title={isLocked ? 'Queue locked during processing' : 'Drag to reorder clip'}
                          >
                            <GripVertical size={16} />
                          </div>

                          <div className="flex flex-col -space-y-1">
                            <button
                              type="button"
                              onClick={() => onMoveItem(index, 'up')}
                              disabled={isLocked || index === 0}
                              className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="Move clip up"
                            >
                              <ChevronUp size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onMoveItem(index, 'down')}
                              disabled={isLocked || index === items.length - 1}
                              className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                              title="Move clip down"
                            >
                              <ChevronDown size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Order Index */}
                        <span className="w-5 text-center text-xs font-bold text-slate-400 shrink-0">
                          {index + 1}
                        </span>

                        {/* Video Thumbnail */}
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-slate-900 overflow-hidden shrink-0 border border-slate-200/80">
                          <video
                            src={item.previewUrl}
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          {effectiveDuration > 0 && (
                            <span className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/75 text-[10px] font-medium text-white tracking-tight">
                              {formatDuration(effectiveDuration)}
                            </span>
                          )}
                        </div>

                        {/* Item Details */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4
                              className="text-xs sm:text-sm font-semibold text-slate-900 truncate"
                              title={item.file.name}
                            >
                              {item.file.name}
                            </h4>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {formatFileSize(item.file.size)}
                            </span>
                          </div>

                          {/* Pills / Badges */}
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                            {/* Processing Phases */}
                            {isAnalyzing && (
                              <Badge variant="subtle" color="slate" size="sm" className="gap-1">
                                <Loader2 size={10} className="animate-spin text-slate-500" />
                                Analyzing...
                              </Badge>
                            )}

                            {isCleaning && (
                              <Badge variant="warning" size="sm" className="gap-1 animate-pulse">
                                <Sparkles size={10} />
                                Cleaning... ({Math.round((item.progress || 0) * 100)}%)
                              </Badge>
                            )}

                            {isFeeding && (
                              <Badge variant="info" size="sm" className="gap-1">
                                <Loader2 size={10} className="animate-spin" />
                                Feeding Output...
                              </Badge>
                            )}

                            {isCompleted && (
                              <Badge variant="success" size="sm" className="gap-1">
                                <CheckCircle2 size={10} />
                                Merged
                              </Badge>
                            )}

                            {isFailed && (
                              <Badge variant="danger" size="sm" className="gap-1">
                                <AlertCircle size={10} />
                                Failed
                              </Badge>
                            )}

                            {/* Watermark Status (Independent Badge) */}
                            {!isAnalyzing && !isCleaning && !isFeeding && !isCompleted && !isFailed && (
                              <>
                                {item.watermarkDecision === 'detected' && (
                                  <Badge variant="purple" size="sm" className="gap-1">
                                    <Sparkles size={10} />
                                    {item.detection?.watermarkType === 'veo_text' ? 'Veo Watermark' : 'Gemini Logo'}
                                    {item.watermarkDecisionSource === 'user_override' ? ' (Clean forced)' : ''}
                                  </Badge>
                                )}

                                {item.watermarkDecision === 'none' && (
                                  <Badge variant="success" size="sm" className="gap-1">
                                    <CheckCircle2 size={10} />
                                    No watermark
                                  </Badge>
                                )}

                                {item.watermarkDecision === 'uncertain' && (
                                  <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 px-2 py-0.5 rounded-md text-[11px] font-medium">
                                    <AlertTriangle size={11} className="text-amber-600" />
                                    <span>Watermark uncertain:</span>
                                    <button
                                      type="button"
                                      onClick={() => onResolveUncertain(item.id, 'force_clean')}
                                      disabled={isLocked}
                                      className="font-bold underline hover:text-amber-950 ml-0.5"
                                    >
                                      Clean this clip
                                    </button>
                                    <span>•</span>
                                    <button
                                      type="button"
                                      onClick={() => onResolveUncertain(item.id, 'keep_original')}
                                      disabled={isLocked}
                                      className="font-bold underline hover:text-amber-950"
                                    >
                                      Keep original
                                    </button>
                                  </div>
                                )}
                              </>
                            )}

                            {/* Trim Badge (Independent Pill) */}
                            {isTrimmed ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                                <Scissors size={10} />
                                <span>
                                  {item.trimRange!.start.toFixed(1)}s → {item.trimRange!.end.toFixed(1)}s ({effectiveDuration.toFixed(1)}s)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onOpenTrimModal(item)}
                                  disabled={isLocked}
                                  className="underline font-bold hover:text-primary-900 ml-1"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onResetTrim(item.id)}
                                  disabled={isLocked}
                                  className="text-slate-400 hover:text-rose-600 ml-0.5"
                                  title="Reset trim to full duration"
                                >
                                  ✕
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onOpenTrimModal(item)}
                                disabled={isLocked}
                                className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 hover:text-primary-600 bg-slate-100 hover:bg-primary-50 px-2 py-0.5 rounded border border-slate-200/80 transition-colors"
                              >
                                <Scissors size={10} />
                                Trim
                              </button>
                            )}

                            {/* Resolution */}
                            {item.metadata?.width ? (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60 font-mono">
                                {item.metadata.width}x{item.metadata.height}
                              </span>
                            ) : null}

                            {/* Audio Info */}
                            {item.audioInfo ? (
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ${
                                  item.audioInfo.hasAudio
                                    ? 'text-slate-600 bg-slate-50 border-slate-200'
                                    : 'text-slate-400 bg-slate-50/50 border-slate-200/50'
                                }`}
                              >
                                {item.audioInfo.hasAudio ? (
                                  <>
                                    <Volume2 size={10} className="text-emerald-600" />
                                    AAC
                                  </>
                                ) : (
                                  <>
                                    <VolumeX size={10} />
                                    Muted
                                  </>
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          type="button"
                          onClick={() => onRemove(item.id)}
                          disabled={isLocked}
                          className={`p-1.5 rounded-lg text-slate-400 transition-colors ${
                            isLocked
                              ? 'cursor-not-allowed opacity-20'
                              : 'hover:text-rose-600 hover:bg-rose-50'
                          }`}
                          title="Remove clip from queue"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}

