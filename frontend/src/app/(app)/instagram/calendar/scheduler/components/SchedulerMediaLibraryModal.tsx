'use client';

import React, { RefObject } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { MediaLibraryItem, LibraryCategory, MediaFormat } from '../types';
import { UploadCloud, Search, Plus, Trash2, Check } from 'lucide-react';

export interface SchedulerMediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaLibrary: MediaLibraryItem[];
  selectedMediaUrl: string | null;
  carouselSlides: string[];
  format: MediaFormat;
  librarySearch: string;
  setLibrarySearch: (val: string) => void;
  libraryCategory: LibraryCategory;
  setLibraryCategory: (cat: LibraryCategory) => void;
  modalFileInputRef: RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectMedia: (item: MediaLibraryItem) => void;
  onDeleteMedia: (id: string, title: string) => void;
}

const CATEGORIES: LibraryCategory[] = ['All', 'Reels', 'Carousels', 'Photos'];

export default function SchedulerMediaLibraryModal({
  isOpen,
  onClose,
  mediaLibrary,
  selectedMediaUrl,
  carouselSlides,
  format,
  librarySearch,
  setLibrarySearch,
  libraryCategory,
  setLibraryCategory,
  modalFileInputRef,
  onFileUpload,
  onSelectMedia,
  onDeleteMedia,
}: SchedulerMediaLibraryModalProps) {
  const filteredAssets = mediaLibrary.filter((asset) => {
    const matchesCat = libraryCategory === 'All' || asset.category === libraryCategory;
    const matchesSearch = asset.title.toLowerCase().includes(librarySearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Media from Media Library"
      description="Your personal vault of uploaded videos, carousel slides, and creative assets."
      maxWidth="2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs font-semibold text-slate-500">
            Showing {filteredAssets.length} of {mediaLibrary.length} uploaded files
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={UploadCloud}
              onClick={() => modalFileInputRef.current?.click()}
            >
              Upload File to Library
            </Button>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Hidden File Input for Modal Uploads */}
        <input
          ref={modalFileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={onFileUpload}
        />

        {/* Search, Filter & Quick Upload Toolbar */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={librarySearch}
              onChange={(e) => setLibrarySearch(e.target.value)}
              placeholder="Search uploaded files by name..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary-600 focus:bg-white text-slate-900 transition-all placeholder:text-slate-400 font-medium"
            />
            {librarySearch && (
              <button
                type="button"
                onClick={() => setLibrarySearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {CATEGORIES.map((cat) => {
              const count =
                cat === 'All'
                  ? mediaLibrary.length
                  : mediaLibrary.filter((m) => m.category === cat).length;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setLibraryCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    libraryCategory === cat
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
                  }`}
                >
                  <span>{cat}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      libraryCategory === cat
                        ? 'bg-primary-800 text-primary-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            <Button
              variant="primary"
              size="sm"
              icon={Plus}
              onClick={() => modalFileInputRef.current?.click()}
            >
              Upload
            </Button>
          </div>
        </div>

        {/* User Uploaded Assets Grid */}
        {filteredAssets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 gap-3 max-h-[460px] overflow-y-auto pr-1">
            {filteredAssets.map((asset) => {
              const isSelected =
                selectedMediaUrl === asset.url ||
                (format === 'carousel' && carouselSlides.includes(asset.url));
              return (
                <div
                  key={asset.id}
                  onClick={() => onSelectMedia(asset)}
                  className={`group rounded-2xl border overflow-hidden bg-slate-950 relative aspect-[4/5] cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-primary-600 ring-2 ring-primary-600 shadow-md'
                      : 'border-slate-200 hover:border-primary-400 hover:shadow-md'
                  }`}
                >
                  {/* Asset Media (Video or Image) */}
                  <img
                    src={asset.url}
                    alt={asset.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Top Badges & Trash Button */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between z-10">
                    <span className="rounded bg-black/75 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-black text-white uppercase tracking-wider">
                      {asset.type}
                    </span>

                    <div className="flex items-center gap-1">
                      {asset.duration && (
                        <span className="rounded bg-black/60 backdrop-blur-md px-1.5 py-0.5 text-[8px] font-bold text-slate-200">
                          {asset.duration}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMedia(asset.id, asset.title);
                        }}
                        className="p-1 rounded bg-rose-600/80 hover:bg-rose-600 text-white transition-colors cursor-pointer"
                        title="Delete file from Media Library"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  {/* Selected Checkmark Badge */}
                  {isSelected && (
                    <div className="absolute inset-0 bg-primary-600/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                      <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg animate-in zoom-in-75">
                        <Check size={18} className="stroke-[3]" />
                      </div>
                    </div>
                  )}

                  {/* Bottom Title & Upload Info Overlay */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-2.5 pt-6 flex flex-col justify-end pointer-events-none">
                    <p className="text-[11px] font-bold text-white leading-snug line-clamp-1 drop-shadow-xs">
                      {asset.title}
                    </p>
                    <div className="flex items-center justify-between text-[9px] text-slate-300 font-semibold mt-0.5">
                      <span>{asset.fileSize || 'Uploaded file'}</span>
                      <span>{asset.uploadedAt}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Clean Empty Library State */
          <div className="py-12 px-4 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center">
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">
                {librarySearch ? 'No matching media files' : 'Your Media Library is Empty'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {librarySearch
                  ? `No assets found for "${librarySearch}". Try a different keyword.`
                  : 'Upload your videos, reels, and photos to store and reuse them anytime.'}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              icon={UploadCloud}
              onClick={() => modalFileInputRef.current?.click()}
            >
              Upload Media Now
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
