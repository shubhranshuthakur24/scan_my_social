import { useState } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { Trash2, Pin, NotebookPen, Tag } from 'lucide-react';
import { SchedulerNote } from '../types';

interface NoteDetailModalProps {
  note: SchedulerNote | null;
  onClose: () => void;
  onDeleteNote: (id: string) => void | Promise<void>;
  onUpdateNote?: (
    id: string,
    updated: { content: string; color?: SchedulerNote['color'] }
  ) => void | Promise<void>;
}

interface NoteColorConfig {
  id: NonNullable<SchedulerNote['color']>;
  label: string;
  containerClass: string;
  textClass: string;
  pinClass: string;
  dotClass: string;
}

const NOTE_COLOR_CONFIG: Record<NonNullable<SchedulerNote['color']>, NoteColorConfig> = {
  amber: {
    id: 'amber',
    label: 'Strategy Memo',
    containerClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-800',
    pinClass: 'text-amber-700 fill-amber-700',
    dotClass: 'bg-amber-500',
  },
  blue: {
    id: 'blue',
    label: 'Campaign Target',
    containerClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-800',
    pinClass: 'text-blue-700 fill-blue-700',
    dotClass: 'bg-blue-500',
  },
  purple: {
    id: 'purple',
    label: 'Content Idea',
    containerClass: 'bg-purple-50 border-purple-200',
    textClass: 'text-purple-800',
    pinClass: 'text-purple-700 fill-purple-700',
    dotClass: 'bg-purple-500',
  },
  emerald: {
    id: 'emerald',
    label: 'Growth Goal',
    containerClass: 'bg-emerald-50 border-emerald-200',
    textClass: 'text-emerald-800',
    pinClass: 'text-emerald-700 fill-emerald-700',
    dotClass: 'bg-emerald-500',
  },
};

export function NoteDetailModal({
  note,
  onClose,
  onDeleteNote,
  onUpdateNote,
}: NoteDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editContent, setEditContent] = useState('');
  const [editColor, setEditColor] = useState<SchedulerNote['color']>('amber');

  if (!note) return null;

  const colorKey = note.color || 'amber';
  const colorConfig = NOTE_COLOR_CONFIG[colorKey] || NOTE_COLOR_CONFIG.amber;

  const handleClose = () => {
    setIsConfirmingDelete(false);
    setIsEditing(false);
    onClose();
  };

  const handleStartEdit = () => {
    setEditContent(note.content);
    setEditColor(note.color || 'amber');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      if (onUpdateNote) {
        await onUpdateNote(note.id, {
          content: editContent.trim(),
          color: editColor,
        });
      }
      setIsEditing(false);
      onClose();
    } catch (err) {
      console.error('Failed to update note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await onDeleteNote(note.id);
      setIsConfirmingDelete(false);
      onClose();
    } catch (error) {
      console.error('Failed to delete note:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const formattedDate = note.date
    ? new Date(`${note.date}T00:00:00`).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : note.date;

  return (
    <Modal
      isOpen={Boolean(note)}
      onClose={handleClose}
      title={
        isEditing
          ? 'Edit Strategy Note'
          : isConfirmingDelete
            ? 'Delete Strategy Note?'
            : 'Editorial Strategy Note'
      }
      description={
        isConfirmingDelete
          ? 'Are you sure you want to delete this planning note? This action cannot be undone.'
          : formattedDate
            ? `Attached to ${formattedDate}`
            : 'Editorial planning memo'
      }
      footer={
        <div className="flex items-center justify-between w-full">
          {isEditing ? (
            <div className="flex items-center justify-end gap-2 w-full">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSaving}
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={NotebookPen}
                loading={isSaving}
                disabled={!editContent.trim() || isSaving}
                onClick={handleSaveEdit}
              >
                Save Changes
              </Button>
            </div>
          ) : isConfirmingDelete ? (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                loading={isDeleting}
                disabled={isDeleting}
                onClick={handleDelete}
              >
                Confirm Delete
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={isDeleting}
                onClick={() => setIsConfirmingDelete(false)}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="danger"
                size="sm"
                icon={Trash2}
                onClick={() => setIsConfirmingDelete(true)}
              >
                Delete Note
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  icon={NotebookPen}
                  onClick={handleStartEdit}
                >
                  Edit Note
                </Button>
                <Button variant="secondary" size="sm" onClick={handleClose}>
                  Close
                </Button>
              </div>
            </>
          )}
        </div>
      }
    >
      {isEditing ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSaveEdit();
          }}
          className="space-y-4"
        >
          {/* Category Color Selector */}
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Tag size={13} className="text-primary-600" />
              <span>Note Category</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {Object.values(NOTE_COLOR_CONFIG).map((cat) => {
                const isSelected = editColor === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setEditColor(cat.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${cat.containerClass
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

          {/* Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Pin size={13} className="text-amber-600" />
                <span>Note Details</span>
              </label>
              <span className="text-[11px] font-bold text-slate-400">
                {editContent.length}/280 characters
              </span>
            </div>
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value.slice(0, 280))}
              rows={4}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-purple-600 focus:ring-2 focus:ring-purple-600/20 text-xs font-medium text-slate-800 outline-none transition-all resize-none"
            />
          </div>
        </form>
      ) : !isConfirmingDelete ? (
        <div className={`p-4 rounded-xl border space-y-2 ${colorConfig.containerClass}`}>
          <div className="flex items-center gap-2 text-xs font-bold">
            <Pin size={14} className={colorConfig.pinClass} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${colorConfig.textClass}`}>
              {colorConfig.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 leading-relaxed whitespace-pre-line">
            {note.content}
          </p>
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-900 text-xs font-medium space-y-1">
          <p className="font-bold text-rose-800">Warning: Permanent Action</p>
          <p>
            Deleting note &quot;
            {note.content.length > 40 ? `${note.content.slice(0, 40)}...` : note.content}
            &quot; will permanently remove it from your calendar.
          </p>
        </div>
      )}
    </Modal>
  );
}
