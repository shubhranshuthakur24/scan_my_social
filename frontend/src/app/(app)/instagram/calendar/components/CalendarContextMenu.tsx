import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { NotebookPen, Calendar as CalendarIcon, Layers, Film, AlertTriangle } from 'lucide-react';

export interface ContextMenuState {
  x: number;
  y: number;
  dateStr: string;
  isPast: boolean;
}

interface CalendarContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
  onOpenCreateNoteModal: (dateStr: string) => void;
}

export const CalendarContextMenu: React.FC<CalendarContextMenuProps> = ({
  contextMenu,
  onClose,
  onOpenCreateNoteModal,
}) => {
  const router = useRouter();

  useEffect(() => {
    const handleCloseMenu = () => onClose();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
      className="fixed z-50 w-60 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-slate-800 text-white shadow-2xl p-1.5 space-y-1 animate-in fade-in zoom-in-95 duration-100 select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-1.5 border-b border-slate-800/80 mb-1 flex items-center justify-between">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
          {contextMenu.dateStr}
        </span>
        {contextMenu.isPast && (
          <span className="text-[9px] font-bold text-rose-300 bg-rose-950/80 border border-rose-800/60 px-1.5 py-0.5 rounded-md">
            Past Date
          </span>
        )}
      </div>

      {/* 1. Create Note */}
      <button
        type="button"
        onClick={() => {
          const d = contextMenu.dateStr;
          onClose();
          onOpenCreateNoteModal(d);
        }}
        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:bg-primary-600 hover:text-white transition-colors cursor-pointer"
      >
        <NotebookPen size={15} className="text-amber-400 shrink-0" />
        <span>Create Note</span>
      </button>

      {/* 2. Schedule Post */}
      <button
        type="button"
        disabled={contextMenu.isPast}
        onClick={() => {
          if (contextMenu.isPast) return;
          const d = contextMenu.dateStr;
          onClose();
          router.push(`/instagram/calendar/scheduler?date=${d}&type=post`);
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
          contextMenu.isPast
            ? 'text-slate-500 opacity-40 cursor-not-allowed'
            : 'text-slate-200 hover:bg-primary-600 hover:text-white cursor-pointer'
        }`}
      >
        <CalendarIcon size={15} className="text-blue-400 shrink-0" />
        <span>Schedule Post</span>
      </button>

      {/* 3. Schedule Story */}
      <button
        type="button"
        disabled={contextMenu.isPast}
        onClick={() => {
          if (contextMenu.isPast) return;
          const d = contextMenu.dateStr;
          onClose();
          router.push(`/instagram/calendar/scheduler?date=${d}&type=story`);
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
          contextMenu.isPast
            ? 'text-slate-500 opacity-40 cursor-not-allowed'
            : 'text-slate-200 hover:bg-primary-600 hover:text-white cursor-pointer'
        }`}
      >
        <Layers size={15} className="text-emerald-400 shrink-0" />
        <span>Schedule Story</span>
      </button>

      {/* 4. Schedule Reel */}
      <button
        type="button"
        disabled={contextMenu.isPast}
        onClick={() => {
          if (contextMenu.isPast) return;
          const d = contextMenu.dateStr;
          onClose();
          router.push(`/instagram/calendar/scheduler?date=${d}&type=reel`);
        }}
        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
          contextMenu.isPast
            ? 'text-slate-500 opacity-40 cursor-not-allowed'
            : 'text-slate-200 hover:bg-primary-600 hover:text-white cursor-pointer'
        }`}
      >
        <Film size={15} className="text-primary-400 shrink-0" />
        <span>Schedule Reel</span>
      </button>

      {/* Past date footnote */}
      {contextMenu.isPast && (
        <div className="mt-1 pt-2 border-t border-slate-800/80 px-2.5 py-1.5 text-[11px] font-medium text-slate-300 bg-slate-800/60 rounded-xl flex items-center gap-2">
          <AlertTriangle size={13} className="text-amber-400 shrink-0" />
          <span>Cannot schedule posts for past dates</span>
        </div>
      )}
    </div>
  );
};
