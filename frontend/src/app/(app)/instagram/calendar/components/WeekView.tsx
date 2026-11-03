import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Pin, Zap } from 'lucide-react';
import { ScheduledPost, SchedulerNote } from '../types';
import { WeekDayItem, getTodayString, getNoteColorStyle } from '../utils/calendarUtils';

interface WeekViewProps {
  weekDays: WeekDayItem[];
  filteredPosts: ScheduledPost[];
  filteredNotes: SchedulerNote[];
  onContextMenu: (e: React.MouseEvent, dateStr: string) => void;
  onSelectPost: (post: ScheduledPost) => void;
  onSelectNote: (note: SchedulerNote) => void;
}

export const WeekView: React.FC<WeekViewProps> = ({
  weekDays,
  filteredPosts,
  filteredNotes,
  onContextMenu,
  onSelectPost,
  onSelectNote,
}) => {
  const router = useRouter();
  const todayStr = getTodayString();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 min-h-[600px]">
      {weekDays.map((dayItem) => {
        const dayPosts = filteredPosts.filter((p) => p.date === dayItem.dateStr);
        const dayNotes = filteredNotes.filter((n) => n.date === dayItem.dateStr);
        const isPastWeekDay = dayItem.dateStr < todayStr;

        return (
          <div
            key={dayItem.dateStr}
            onContextMenu={(e) => onContextMenu(e, dayItem.dateStr)}
            className={`flex flex-col justify-between p-3 transition-colors ${dayItem.isToday
                ? 'bg-primary-50/60 ring-1 ring-inset ring-primary-200/80 shadow-2xs'
                : isPastWeekDay
                  ? 'bg-slate-100/70'
                  : 'bg-white'
              }`}
          >
            {/* Column Header */}
            <div className="pb-3 border-b border-slate-100">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {dayItem.dayName}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-base transition-colors ${dayItem.isToday
                      ? 'bg-primary-600 text-white font-black shadow-sm ring-2 ring-primary-100'
                      : isPastWeekDay
                        ? 'text-slate-400 font-bold'
                        : 'text-slate-900 font-black'
                    }`}
                >
                  {dayItem.dayNumber}
                </span>
                <span className="text-xs font-bold text-slate-500">{dayItem.monthName}</span>
              </div>
            </div>

            {/* Day Content Feed */}
            <div className="py-3 space-y-2.5 flex-1 overflow-y-auto max-h-[520px]">
              {/* Notes in week column */}
              {dayNotes.map((note) => {
                const noteStyle = getNoteColorStyle(note.color);
                return (
                  <div
                    key={note.id}
                    onClick={() => onSelectNote(note)}
                    className={`p-2.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all cursor-pointer space-y-1 ${noteStyle.container}`}
                  >
                    <div className={`flex items-center gap-1 text-[10px] font-black uppercase ${noteStyle.text}`}>
                      <Pin size={11} className={noteStyle.pin} />
                      <span>{noteStyle.label}</span>
                    </div>
                    <p className="line-clamp-3">{note.content}</p>
                  </div>
                );
              })}

              {/* Posts in week column */}
              {dayPosts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => onSelectPost(post)}
                  className="group p-2 rounded-xl border border-slate-200/80 bg-white hover:border-primary-300 hover:shadow-md transition-all cursor-pointer space-y-2"
                >
                  {/* Thumbnail & Format tag */}
                  <div className="relative aspect-[4/5] w-full rounded-lg overflow-hidden bg-slate-900">
                    <img
                      src={post.thumbnail}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
                      <span className="rounded-full bg-black/60 backdrop-blur-md px-2 py-0.5 text-[9px] font-bold text-white uppercase">
                        {post.type}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase ${post.status === 'published'
                            ? 'bg-emerald-500 text-white'
                            : post.status === 'publishing'
                              ? 'bg-amber-500 text-white'
                              : 'bg-primary-600 text-white'
                          }`}
                      >
                        {post.time}
                      </span>
                    </div>
                  </div>

                  {/* Title & AutoDM */}
                  <div>
                    <p className="text-xs font-black text-slate-900 line-clamp-2 leading-snug">
                      {post.title}
                    </p>
                    {post.hasAutodm && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                        <Zap size={11} className="fill-emerald-600 text-emerald-600" />
                        <span>AutoDM: {post.autodmKeyword}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {dayPosts.length === 0 && dayNotes.length === 0 && (
                <div
                  onClick={() => router.push(`/instagram/calendar/scheduler?date=${dayItem.dateStr}&type=post`)}
                  className="h-28 rounded-xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:text-primary-600 hover:border-primary-300 hover:bg-primary-50/20 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  <span className="text-[11px] font-bold mt-1">Schedule</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
