'use client';

import React, { useRef, useState } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import { BatchVideoItem } from '@/lib/watermark/batch/batchTypes';
import type { TimelineSegment } from '@/lib/watermark/batch/timelineProjection';
import {
  FolderGit2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Volume2,
  VolumeX,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Film,
  GripVertical,
} from 'lucide-react';

export interface EditorMediaBinProps {
  items: BatchVideoItem[];
  timelineSegments?: TimelineSegment[];
  selectedId: string | null;
  onSelectClip: (id: string) => void;
  onAddToTimeline?: (sourceClipId: string) => void;
  onAddFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onReorder: (startIndex: number, endIndex: number) => void;
  onMoveItem: (index: number, direction: 'up' | 'down') => void;
  onDragStart?: () => void;
  isFullscreen?: boolean;
  isLocked: boolean;
}

export default function EditorMediaBin({
  items,
  timelineSegments,
  selectedId,
  onSelectClip,
  onAddToTimeline,
  onAddFiles,
  onRemoveFile,
  onReorder,
  onMoveItem,
  onDragStart,
  isFullscreen,
  isLocked,
}: EditorMediaBinProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
      e.target.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Handle internal dnd reorder
  const handleDragEnd = (result: DropResult) => {
    if (isLocked || !result.destination) return;
    if (result.destination.index === result.source.index) return;
    onReorder(result.source.index, result.destination.index);
  };

  // Handle external desktop file drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLocked && !isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (isLocked) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|mkv)$/i.test(file.name)
      );
      if (files.length > 0) {
        onDragStart?.();
        onAddFiles(files);
      }
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full bg-white rounded-2xl border transition-all overflow-hidden shadow-2xs relative ${isDragOver
        ? 'border-primary-500 ring-2 ring-primary-500/30 bg-primary-50/10'
        : 'border-slate-200/80'
        }`}
    >
      {/* Floating Drag-and-Drop Overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 bg-primary-50/95 backdrop-blur-xs flex flex-col items-center justify-center p-6 border-2 border-dashed border-primary-500 rounded-2xl pointer-events-none">
          <Plus size={36} className="text-primary-600 mb-2 animate-bounce" />
          <p className="text-sm font-bold text-primary-900">Drop videos to add to Master Bin</p>
          <p className="text-xs text-primary-700 mt-0.5">MP4, MOV, WebM automatically validated</p>
        </div>
      )}

      {/* Media Bin Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200/80">
        <div className="flex items-center gap-2">
          <FolderGit2 size={16} className="text-primary-600" />
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Master Bin
          </span>
          <span className="text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 rounded font-medium">
            {items.length} clips
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={handleFileInputChange}
            disabled={isLocked}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLocked}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={13} />
            <span>Add Clips</span>
          </button>
        </div>
      </div>

      {/* Clip Cards List */}
      <DragDropContext onDragStart={onDragStart} onDragEnd={handleDragEnd}>
        <Droppable droppableId="master-bin-clips">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-thin scrollbar-thumb-slate-300 transition-all duration-200 bg-primary-100 ${isFullscreen ? 'max-h-[500px]' : 'max-h-[360px]'
                }`}
            >
              {items.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="h-44 border-2 border-dashed border-slate-200 hover:border-primary-400 bg-slate-50/40 hover:bg-primary-50/10 rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-colors"
                >
                  <Film size={26} className="text-slate-400 mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    Drop videos here or click to import
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    MP4, MOV, WebM supported
                  </p>
                </div>
              ) : (
                items.map((item, index) => {
                  const isSelected = item.id === selectedId;
                  const effectiveDuration = item.trimRange
                    ? Math.max(0.1, item.trimRange.end - item.trimRange.start)
                    : (item.metadata?.duration || 0);

                  const segmentCount = timelineSegments
                    ? timelineSegments.filter((seg) => seg.sourceClipId === item.id).length
                    : 1;
                  const isOffTimeline = segmentCount === 0;

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
                          onClick={() => onSelectClip(item.id)}
                          className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-all border ${snapshot.isDragging
                            ? 'shadow-xl ring-2 ring-primary-500 bg-primary-50/90 border-primary-400 z-50 scale-[1.02]'
                            : isSelected
                              ? 'bg-primary-50/40 border-primary-600 ring-1 ring-primary-500/30 shadow-2xs'
                              : isOffTimeline
                                ? 'bg-slate-50/50 border-dashed border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                                : 'bg-white border-slate-200/80 hover:bg-slate-50/80 hover:border-slate-300'
                            }`}
                        >
                          {/* Drag Handle & Chevrons */}
                          {!isLocked && (
                            <div
                              className="flex items-center gap-0.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div
                                {...draggableProvided.dragHandleProps}
                                className="p-1 cursor-grab active:cursor-grabbing text-slate-400 hover:text-primary-600 rounded transition-colors"
                                title="Drag to reorder"
                              >
                                <GripVertical size={14} />
                              </div>

                              {items.length > 1 && (
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    disabled={index === 0}
                                    onClick={() => onMoveItem(index, 'up')}
                                    className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 transition-colors"
                                    title="Move Up"
                                  >
                                    <ChevronUp size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={index === items.length - 1}
                                    onClick={() => onMoveItem(index, 'down')}
                                    className="p-0.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-20 transition-colors"
                                    title="Move Down"
                                  >
                                    <ChevronDown size={11} />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Thumbnail Preview */}
                          <div className="relative w-14 h-10 rounded bg-slate-900 shrink-0 overflow-hidden border border-slate-200/80">
                            {item.previewUrl ? (
                              <video
                                src={item.previewUrl}
                                muted
                                playsInline
                                preload="metadata"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Film size={14} className="text-slate-400" />
                              </div>
                            )}
                            <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-[9px] font-mono text-white px-1 rounded">
                              {formatDuration(effectiveDuration)}
                            </span>
                          </div>

                          {/* Metadata & Title */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-primary-700 bg-primary-100/90 px-1 rounded shrink-0">
                                #{index + 1}
                              </span>
                              <h4 className="text-xs font-semibold text-slate-800 truncate">
                                {item.file.name}
                              </h4>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                              {/* Watermark Pill */}
                              {item.watermarkDecision === 'pending' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                                  <Loader2 size={9} className="animate-spin" />
                                  Detecting...
                                </span>
                              )}
                              {item.watermarkDecision === 'none' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-emerald-600 font-medium">
                                  <CheckCircle2 size={9} />
                                  Clean
                                </span>
                              )}
                              {item.watermarkDecision === 'detected' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-primary-600 font-medium">
                                  <Sparkles size={9} />
                                  Watermark
                                </span>
                              )}
                              {item.watermarkDecision === 'uncertain' && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] text-amber-600 font-medium">
                                  <AlertTriangle size={9} />
                                  Uncertain
                                </span>
                              )}

                              {/* Timeline Sequence Status Badge */}
                              {isOffTimeline ? (
                                <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/80">
                                  Off Timeline
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-[9px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                                  In Timeline ({segmentCount})
                                </span>
                              )}

                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatFileSize(item.file.size)}
                              </span>

                              {item.audioInfo?.hasAudio ? (
                                <span title="Has Audio">
                                  <Volume2 size={11} className="text-slate-500" />
                                </span>
                              ) : (
                                <span title="Muted">
                                  <VolumeX size={11} className="text-slate-400" />
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions: Add to Timeline & Remove from Bin */}
                          {!isLocked && (
                            <div className="flex items-center gap-1 shrink-0">
                              {onAddToTimeline && (
                                isOffTimeline ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddToTimeline(item.id);
                                    }}
                                    title="Add clip back to timeline sequence"
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-primary-600 hover:bg-primary-700 text-white shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                                  >
                                    <Plus size={13} className="shrink-0" />
                                    <span>Add</span>
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onAddToTimeline(item.id);
                                    }}
                                    title="Add another instance to timeline"
                                    className="p-1 rounded text-slate-400 hover:text-primary-700 hover:bg-primary-50 transition-colors cursor-pointer"
                                  >
                                    <Plus size={13} />
                                  </button>
                                )
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRemoveFile(item.id);
                                }}
                                title="Remove clip from bin"
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </Draggable>
                  );
                })
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
