'use client';

import React, { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { NotebookPen, Pin, Tag } from 'lucide-react';

import type { SchedulerNote } from '@/app/(app)/instagram/calendar/types';

export type NoteColor = 'amber' | 'blue' | 'purple' | 'emerald';

export interface NoteCategory {
  id: NoteColor;
  label: string;
  bgClass: string;
  borderClass: string;
  textClass: string;
  dotClass: string;
}

const NOTE_CATEGORIES: NoteCategory[] = [
  {
    id: 'amber',
    label: 'Strategy Memo',
    bgClass: 'bg-amber-50',
    borderClass: 'border-amber-200 text-amber-900',
    textClass: 'text-amber-800',
    dotClass: 'bg-amber-500',
  },
  {
    id: 'blue',
    label: 'Campaign Target',
    bgClass: 'bg-blue-50',
    borderClass: 'border-blue-200 text-blue-900',
    textClass: 'text-blue-800',
    dotClass: 'bg-blue-500',
  },
  {
    id: 'purple',
    label: 'Content Idea',
    bgClass: 'bg-purple-50',
    borderClass: 'border-purple-200 text-purple-900',
    textClass: 'text-purple-800',
    dotClass: 'bg-purple-500',
  },
  {
    id: 'emerald',
    label: 'Growth Goal',
    bgClass: 'bg-emerald-50',
    borderClass: 'border-emerald-200 text-emerald-900',
    textClass: 'text-emerald-800',
    dotClass: 'bg-emerald-500',
  },
];

export interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateStr: string;
  onSaveNote: (note: SchedulerNote) => void;
}

export default function CreateNoteModal({
  isOpen,
  onClose,
  dateStr,
  onSaveNote,
}: CreateNoteModalProps) {
  const [content, setContent] = useState('');
  const [color, setColor] = useState<NoteColor>('amber');

  const handleClose = () => {
    setContent('');
    setColor('amber');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    onSaveNote({
      id: `note-${Date.now()}`,
      date: dateStr,
      content: content.trim(),
      color,
    });

    handleClose();
  };

  const formattedDate = dateStr
    ? new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Editorial Strategy Note"
      description={formattedDate ? `Attached to ${formattedDate}` : 'Editorial planning memo'}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-2.5 w-full">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={NotebookPen}
            disabled={!content.trim()}
            onClick={handleSubmit}
          >
            Save Note
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Color Selector */}
        <div>
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Tag size={13} className="text-primary-600" />
            <span>Note Category</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {NOTE_CATEGORIES.map((cat) => {
              const isSelected = color === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setColor(cat.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${cat.bgClass
                    } ${isSelected
                      ? `ring-2 ring-purple-600 border-purple-500 shadow-2xs`
                      : `border-slate-200 hover:border-slate-300 opacity-80 hover:opacity-100`
                    }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${cat.dotClass}`} />
                  <span className={cat.textClass}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Note Content Textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Pin size={13} className="text-amber-600" />
              <span>Note Details</span>
            </label>
            <span className="text-[11px] font-bold text-slate-400">
              {content.length}/280 characters
            </span>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, 280))}
            placeholder="Write strategy notes, campaign objectives, or editorial memos for this date..."
            rows={4}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 text-xs font-medium text-slate-800 placeholder:text-slate-400 outline-none transition-all resize-none"
          />
        </div>
      </form>
    </Modal>
  );
}
