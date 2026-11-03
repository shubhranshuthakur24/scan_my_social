import React from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { Plus, Pin, Trash2, Clock, Zap, Eye, CalendarRange } from 'lucide-react';
import { ScheduledPost, SchedulerNote } from '../types';
import { getNoteColorStyle } from '../utils/calendarUtils';

interface DayViewProps {
  currentDate: Date;
  currentDayStr: string;
  filteredPosts: ScheduledPost[];
  filteredNotes: SchedulerNote[];
  onSelectPost: (post: ScheduledPost) => void;
  onSelectNote: (note: SchedulerNote) => void;
  onDeleteNote: (id: string) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  currentDate,
  currentDayStr,
  filteredPosts,
  filteredNotes,
  onSelectPost,
  onSelectNote,
  onDeleteNote,
}) => {
  const router = useRouter();
  const dayPosts = filteredPosts.filter((p) => p.date === currentDayStr);
  const dayNotes = filteredNotes.filter((n) => n.date === currentDayStr);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-black text-slate-900">
            Scheduled Agenda for {currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {dayPosts.length} posts and {dayNotes.length} notes scheduled
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={Plus}
          onClick={() => router.push(`/instagram/calendar/scheduler?date=${currentDayStr}&type=post`)}
        >
          Schedule Post for Today
        </Button>
      </div>

      {/* Timeline Slots */}
      <div className="space-y-4">
        {/* Notes for this day */}
        {dayNotes.map((note) => {
          const noteStyle = getNoteColorStyle(note.color);
          return (
            <div
              key={note.id}
              onClick={() => onSelectNote(note)}
              className={`p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-2xs transition-colors cursor-pointer ${noteStyle.container}`}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/60 flex items-center justify-center shrink-0 mt-0.5">
                  <Pin size={16} className={noteStyle.pin} />
                </div>
                <div>
                  <span className={`text-[10px] font-black uppercase tracking-wider ${noteStyle.text}`}>
                    {noteStyle.label}
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">{note.content}</p>
                </div>
              </div>
              <Button variant="ghost" size="xs" onClick={(e) => { e.stopPropagation(); onDeleteNote(note.id); }}>
                <Trash2 size={13} className="text-rose-600" />
              </Button>
            </div>
          );
        })}

        {/* Posts for this day */}
        {dayPosts.map((post) => (
          <div
            key={post.id}
            onClick={() => onSelectPost(post)}
            className="p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-purple-300 hover:shadow-md transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-20 rounded-xl overflow-hidden bg-slate-950 shrink-0 relative">
                <img src={post.thumbnail} alt={post.title} className="w-full h-full object-cover" />
                <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.2 text-[8px] font-black text-white uppercase">
                  {post.type}
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-black text-purple-700 border border-purple-200">
                    <Clock size={11} /> {post.time}
                  </span>
                  <span className="text-[10px] font-black uppercase text-slate-400">• {post.status}</span>
                </div>
                <h4 className="text-sm font-black text-slate-900">{post.title}</h4>
                <p className="text-xs text-slate-500 line-clamp-1">{post.caption}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {post.hasAutodm && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                  <Zap size={12} className="fill-emerald-600" />
                  {post.autodmKeyword}
                </span>
              )}
              <Button variant="secondary" size="xs" icon={Eye}>
                Inspect
              </Button>
            </div>
          </div>
        ))}

        {dayPosts.length === 0 && dayNotes.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-primary-600 mx-auto flex items-center justify-center">
              <CalendarRange size={24} />
            </div>
            <h4 className="text-sm font-black text-slate-900">No scheduled posts for this date</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Pick a target dispatch time and schedule your Reels or Carousels to publish automatically.
            </p>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => router.push(`/instagram/calendar/scheduler?date=${currentDayStr}&type=post`)}>
              Schedule Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
