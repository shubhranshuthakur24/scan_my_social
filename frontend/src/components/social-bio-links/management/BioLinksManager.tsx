'use client';

import React, { useState, useMemo, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { BioCard, BioLink } from '@/lib/api/socialBioLinksService';
import {
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  Clock,
  BarChart2,
  Globe,
  Check,
  SlidersHorizontal,
  Save,
  GripVertical,
} from 'lucide-react';
import { BIO_ICON_MAP } from '@/components/social-bio-links/BioIcons';
import {
  detectPlatform,
  extractHandleFromUrl,
  SocialPlatformConfig,
} from '@/components/social-bio-links/socialPlatforms';
import BioLinkDialog from './BioLinkDialog';
import ConfirmModal from '@/components/ui/ConfirmModal';

export interface BioLinksManagerHandle {
  saveAllDirtyLinks: () => Promise<void>;
  hasDirtyLinks: () => boolean;
}

interface BioLinksManagerProps {
  card: BioCard;
  onAddLink: (payload: Partial<BioLink>) => Promise<void>;
  onAddBatchLinks?: (payloads: Array<Partial<BioLink>>) => Promise<void>;
  onUpdateLink: (linkId: number, payload: Partial<BioLink>) => Promise<void>;
  onDeleteLink: (linkId: number) => Promise<void>;
  onReorderLinks: (linkIds: number[]) => Promise<void>;
  isMutating: boolean;
  onDirtyChange?: (isDirty: boolean) => void;
}

const BioLinksManager = forwardRef<BioLinksManagerHandle, BioLinksManagerProps>(
  function BioLinksManager(
    {
      card,
      onAddLink,
      onAddBatchLinks,
      onUpdateLink,
      onDeleteLink,
      onReorderLinks,
      isMutating,
      onDirtyChange,
    },
    ref
  ) {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLink, setEditingLink] = useState<BioLink | null>(null);
    const [deletingLink, setDeletingLink] = useState<BioLink | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      setMounted(true);
    }, []);

    // Local draft values for inline editing on the page
    const [localValues, setLocalValues] = useState<Record<number, string>>({});
    const [savedStatus, setSavedStatus] = useState<Record<number, boolean>>({});
    const [isSavingAll, setIsSavingAll] = useState(false);

  const links = card.links || [];

  // Compute all dirty link IDs with unsaved changes
  const dirtyLinkIds = useMemo(() => {
    return Object.keys(localValues)
      .map(Number)
      .filter((linkId) => {
        const link = links.find((l) => l.id === linkId);
        if (!link) return false;
        const platform = detectPlatform(link);
        const currentVal = platform ? extractHandleFromUrl(platform, link.url) : link.url;
        const val = localValues[linkId];
        return val !== undefined && val.trim() !== currentVal.trim() && val.trim() !== '';
      });
  }, [localValues, links]);

  const hasUnsavedLinkChanges = dirtyLinkIds.length > 0;

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;

  useEffect(() => {
    onDirtyChangeRef.current?.(hasUnsavedLinkChanges);
  }, [hasUnsavedLinkChanges]);

  const handleOpenAdd = () => {
    setEditingLink(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (link: BioLink) => {
    setEditingLink(link);
    setDialogOpen(true);
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === links.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const newLinks = [...links];
    const temp = newLinks[index];
    newLinks[index] = newLinks[targetIndex];
    newLinks[targetIndex] = temp;

    const newIds = newLinks.map((l) => l.id);
    await onReorderLinks(newIds);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || isMutating) return;
    if (result.destination.index === result.source.index) return;

    const sourceIndex = result.source.index;
    const destIndex = result.destination.index;

    const newLinks = Array.from(links);
    const [movedLink] = newLinks.splice(sourceIndex, 1);
    newLinks.splice(destIndex, 0, movedLink);

    const newIds = newLinks.map((l) => l.id);
    await onReorderLinks(newIds);
  };

  const handleToggleActive = async (link: BioLink) => {
    await onUpdateLink(link.id, {
      title: link.title,
      url: link.url,
      is_active: !link.is_active,
    });
  };

  const handleLocalChange = (linkId: number, val: string) => {
    setLocalValues((prev) => ({
      ...prev,
      [linkId]: val,
    }));
  };

  // Save social link handle
  const handleSaveSocial = async (link: BioLink, platform: SocialPlatformConfig) => {
    const rawVal = localValues[link.id];
    if (rawVal === undefined) return;
    const currentHandle = extractHandleFromUrl(platform, link.url);
    if (rawVal.trim() === currentHandle.trim() || !rawVal.trim()) return;

    const newUrl = platform.buildUrl(rawVal.trim());
    await onUpdateLink(link.id, {
      title: link.title,
      url: newUrl,
      is_active: link.is_active,
    });

    setLocalValues((prev) => {
      const copy = { ...prev };
      delete copy[link.id];
      return copy;
    });

    setSavedStatus((prev) => ({ ...prev, [link.id]: true }));
    setTimeout(() => {
      setSavedStatus((prev) => ({ ...prev, [link.id]: false }));
    }, 2000);
  };

  // Save custom link URL
  const handleSaveCustom = async (link: BioLink) => {
    const rawVal = localValues[link.id];
    if (rawVal === undefined) return;
    if (rawVal.trim() === link.url.trim() || !rawVal.trim()) return;

    let targetUrl = rawVal.trim();
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = `https://${targetUrl}`;
    }

    await onUpdateLink(link.id, {
      title: link.title,
      url: targetUrl,
      is_active: link.is_active,
    });

    setLocalValues((prev) => {
      const copy = { ...prev };
      delete copy[link.id];
      return copy;
    });

    setSavedStatus((prev) => ({ ...prev, [link.id]: true }));
    setTimeout(() => {
      setSavedStatus((prev) => ({ ...prev, [link.id]: false }));
    }, 2000);
  };

  // Master Save Handler for all dirty link inputs (No auto-save!)
  const handleSaveAllDirtyLinks = useCallback(async (): Promise<void> => {
    if (dirtyLinkIds.length === 0 || isSavingAll) return;
    setIsSavingAll(true);
    const errors: Error[] = [];
    const successfulIds: number[] = [];

    try {
      for (const linkId of dirtyLinkIds) {
        const link = links.find((l) => l.id === linkId);
        if (!link) continue;
        const platform = detectPlatform(link);
        const rawVal = localValues[linkId];
        if (rawVal === undefined || !rawVal.trim()) continue;

        let newUrl = rawVal.trim();
        if (platform) {
          newUrl = platform.buildUrl(rawVal.trim());
        } else if (!newUrl.startsWith('http://') && !newUrl.startsWith('https://')) {
          newUrl = `https://${newUrl}`;
        }

        try {
          await onUpdateLink(link.id, {
            title: link.title,
            url: newUrl,
            is_active: link.is_active,
          });
          successfulIds.push(linkId);
        } catch (err) {
          console.error(`Failed to update link ${linkId}:`, err);
          errors.push(err instanceof Error ? err : new Error(String(err)));
        }
      }

      if (successfulIds.length > 0) {
        setLocalValues((prev) => {
          const next = { ...prev };
          for (const id of successfulIds) {
            delete next[id];
          }
          return next;
        });
        setSavedStatus((prev) => {
          const next = { ...prev };
          for (const id of successfulIds) {
            next[id] = true;
          }
          return next;
        });
        setTimeout(() => {
          setSavedStatus((prev) => {
            const next = { ...prev };
            for (const id of successfulIds) {
              delete next[id];
            }
            return next;
          });
        }, 2500);
      }

      if (errors.length > 0) {
        throw new Error(`Failed to save ${errors.length} link(s).`);
      }
    } finally {
      setIsSavingAll(false);
    }
  }, [dirtyLinkIds, isSavingAll, links, localValues, onUpdateLink]);

  useImperativeHandle(
    ref,
    () => ({
      saveAllDirtyLinks: handleSaveAllDirtyLinks,
      hasDirtyLinks: () => dirtyLinkIds.length > 0,
    }),
    [dirtyLinkIds.length, handleSaveAllDirtyLinks]
  );

  const getScheduleBadge = (link: BioLink) => {
    const now = new Date();
    if (link.starts_at && new Date(link.starts_at) > now) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60">
          <Clock size={10} /> Starts soon
        </span>
      );
    }
    if (link.ends_at && new Date(link.ends_at) < now) {
      return (
        <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
          Expired
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-sm font-black text-slate-900">Bio Link Buttons ({links.length})</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add links, edit handles directly on the page, reorder priorities, and track clicks.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {hasUnsavedLinkChanges && (
            <button
              type="button"
              onClick={handleSaveAllDirtyLinks}
              disabled={isMutating || isSavingAll}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 px-4 py-2 text-xs font-bold text-white transition shadow-xs cursor-pointer disabled:opacity-50 animate-in fade-in"
              title="Save all modified link handles"
            >
              <Save size={14} className={isSavingAll ? 'animate-spin' : ''} />
              <span>{isSavingAll ? 'Saving Links...' : `Save Changes (${dirtyLinkIds.length})`}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAdd}
            disabled={isMutating || isSavingAll}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-3.5 py-2 text-xs font-bold text-white transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Plus size={14} />
            <span>Add New Link</span>
          </button>
        </div>
      </div>

      {links.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto">
            <Plus size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-800">No links added to this card yet</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Add your first link button to connect visitors to your funnel, offers, or social profiles.
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-primary-700 transition"
          >
            <Plus size={14} /> Add First Link
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="bio-links-droppable" isDropDisabled={!mounted}>
            {(droppableProvided) => (
              <div
                ref={droppableProvided.innerRef}
                {...droppableProvided.droppableProps}
                className="space-y-3"
              >
                {links.map((link, index) => {
                  const IconComponent = link.icon ? BIO_ICON_MAP[link.icon] || Globe : Globe;
                  const scheduleBadge = getScheduleBadge(link);
                  const platform = detectPlatform(link);
                  const isSaved = savedStatus[link.id];

                  // Value resolution
                  const currentHandle = platform ? extractHandleFromUrl(platform, link.url) : '';
                  const displayVal = platform
                    ? localValues[link.id] ?? currentHandle
                    : localValues[link.id] ?? link.url;
                  const isDirty = platform
                    ? localValues[link.id] !== undefined && localValues[link.id].trim() !== currentHandle.trim()
                    : localValues[link.id] !== undefined && localValues[link.id].trim() !== link.url.trim();

                  return (
                    <Draggable
                      key={String(link.id)}
                      draggableId={String(link.id)}
                      index={index}
                      isDragDisabled={isMutating || !mounted}
                    >
                      {(draggableProvided, snapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={`p-4 rounded-xl border transition-shadow duration-150 ${
                            snapshot.isDragging
                              ? 'border-primary-500 bg-white ring-2 ring-primary-500/25 shadow-xl z-50 scale-[1.01]'
                              : link.is_active
                              ? 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
                              : 'border-slate-200/60 bg-slate-50/70 opacity-65'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Drag Handle, Reorder Buttons & Icon */}
                            <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
                              {/* Drag Handle */}
                              <div
                                {...draggableProvided.dragHandleProps}
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                                title={`Drag to reorder ${link.title}`}
                                aria-label={`Drag to reorder ${link.title}`}
                              >
                                <GripVertical size={16} />
                              </div>

                              <div className="flex items-center gap-0.5 text-slate-400 shrink-0">
                                <button
                                  type="button"
                                  disabled={index === 0 || isMutating}
                                  onClick={() => handleMove(index, 'up')}
                                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
                                  title={`Move ${link.title} up`}
                                  aria-label={`Move ${link.title} up`}
                                >
                                  <ArrowUp size={15} />
                                </button>
                                <button
                                  type="button"
                                  disabled={index === links.length - 1 || isMutating}
                                  onClick={() => handleMove(index, 'down')}
                                  className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
                                  title={`Move ${link.title} down`}
                                  aria-label={`Move ${link.title} down`}
                                >
                                  <ArrowDown size={15} />
                                </button>
                              </div>

                              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                                <IconComponent size={16} />
                              </div>

                              {/* Title & Metadata */}
                              <div className="min-w-0 flex-1 ml-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h3 className="text-xs font-bold text-slate-900 truncate">{link.title}</h3>
                                  {scheduleBadge}
                                  {isSaved && (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200/60 animate-in fade-in">
                                      <Check size={10} /> Saved
                                    </span>
                                  )}
                                </div>
                                {link.description && (
                                  <p className="text-[11px] text-slate-400 truncate">{link.description}</p>
                                )}
                              </div>
                            </div>

                            {/* Clicks & Actions */}
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-slate-100 px-2.5 py-1.5 rounded-lg shrink-0">
                                <BarChart2 size={12} className="text-slate-400" />
                                <span>{link.clicks_count ?? 0}</span>
                              </div>

                              {/* Active Toggle Switch */}
                              <button
                                type="button"
                                role="switch"
                                aria-checked={link.is_active}
                                title={link.is_active ? `Disable ${link.title}` : `Enable ${link.title}`}
                                aria-label={link.is_active ? `Disable ${link.title}` : `Enable ${link.title}`}
                                onClick={() => handleToggleActive(link)}
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500 cursor-pointer"
                              >
                                <span
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                    link.is_active ? 'bg-primary-600' : 'bg-slate-300'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                      link.is_active ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </span>
                              </button>

                              {/* Advanced Settings Action Button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(link)}
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-2xs hover:border-slate-300 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary-500"
                                title={`Advanced settings for ${link.title}`}
                                aria-label={`Advanced settings for ${link.title}`}
                              >
                                <SlidersHorizontal size={15} className="text-slate-500" />
                              </button>

                              {/* Delete Action Button */}
                              <button
                                type="button"
                                onClick={() => setDeletingLink(link)}
                                className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl border border-transparent hover:border-rose-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-rose-500"
                                title={`Delete ${link.title}`}
                                aria-label={`Delete ${link.title}`}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                {/* Inline Editable Handle / Destination URL (Directly on page!) */}
                <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                  {platform ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[11px] font-mono font-bold text-slate-400 select-none bg-slate-100/90 px-2 py-1 rounded-md shrink-0">
                        {platform.prefix || '@'}
                      </span>
                      <input
                        type="text"
                        value={displayVal}
                        onChange={(e) => handleLocalChange(link.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveSocial(link, platform);
                        }}
                        placeholder={platform.placeholder}
                        className="flex-1 min-w-0 text-xs font-medium text-slate-900 px-2.5 py-1 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden transition"
                        title="Edit handle directly"
                      />
                      {isDirty && (
                        <button
                          type="button"
                          onClick={() => handleSaveSocial(link, platform)}
                          disabled={isMutating || isSavingAll}
                          className="px-2.5 py-1 rounded-lg bg-primary-600 text-white text-[11px] font-bold hover:bg-primary-700 transition shrink-0 shadow-2xs cursor-pointer"
                        >
                          Save
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[11px] font-mono text-slate-400 select-none shrink-0">
                        URL:
                      </span>
                      <input
                        type="url"
                        value={displayVal}
                        onChange={(e) => handleLocalChange(link.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveCustom(link);
                        }}
                        placeholder="https://example.com"
                        className="flex-1 min-w-0 text-xs font-mono text-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/90 bg-slate-50/50 hover:bg-white focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 focus:outline-hidden transition"
                        title="Edit destination URL directly"
                      />
                      {isDirty && (
                        <button
                          type="button"
                          onClick={() => handleSaveCustom(link)}
                          disabled={isMutating || isSavingAll}
                          className="px-2.5 py-1 rounded-lg bg-primary-600 text-white text-[11px] font-bold hover:bg-primary-700 transition shrink-0 shadow-2xs cursor-pointer"
                        >
                          Save
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </Draggable>
        );
      })}
      {droppableProvided.placeholder}
    </div>
  )}
</Droppable>
</DragDropContext>
)}

      {/* Add / Edit Dialog (Modal is purely for selecting!) */}
      <BioLinkDialog
        key={editingLink ? editingLink.id : 'new'}
        isOpen={dialogOpen}
        link={editingLink}
        existingLinks={links}
        defaultUsername={card.username}
        onClose={() => setDialogOpen(false)}
        onSave={async (payload) => {
          if (editingLink) {
            await onUpdateLink(editingLink.id, payload);
          } else {
            await onAddLink(payload);
          }
        }}
        onSaveBatch={async (payloads) => {
          if (onAddBatchLinks) {
            await onAddBatchLinks(payloads);
          } else {
            for (const payload of payloads) {
              await onAddLink(payload);
            }
          }
        }}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deletingLink)}
        title="Delete Bio Link"
        description={`Are you sure you want to delete the link "${deletingLink?.title}"? All click tracking history for this link will be lost.`}
        confirmText="Delete Link"
        variant="danger"
        isLoading={isMutating}
        onConfirm={async () => {
          if (!deletingLink) return;
          await onDeleteLink(deletingLink.id);
          setDeletingLink(null);
        }}
        onClose={() => setDeletingLink(null)}
      />
    </div>
  );
});

export default BioLinksManager;
