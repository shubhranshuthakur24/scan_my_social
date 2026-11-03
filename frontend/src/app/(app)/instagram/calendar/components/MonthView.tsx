import React from 'react';
import { Film, Image as ImageIcon, FileText, Pin, Zap } from 'lucide-react';
import { ScheduledPost, SchedulerNote } from '../types';
import { CalendarDayCell, getTodayString, getNoteColorStyle } from '../utils/calendarUtils';

interface MonthViewProps {
  allCalendarDays: CalendarDayCell[];
  filteredPosts: ScheduledPost[];
  filteredNotes: SchedulerNote[];
  onContextMenu: (e: React.MouseEvent, dateStr: string) => void;
  onSelectPost: (post: ScheduledPost) => void;
  onSelectNote: (note: SchedulerNote) => void;
}

export const MonthView: React.FC<MonthViewProps> = ({
  allCalendarDays,
  filteredPosts,
  filteredNotes,
  onContextMenu,
  onSelectPost,
  onSelectNote,
}) => {
  const todayStr = getTodayString();

  return (
    <div>
      {/* Days of Week Header (Sunday Start) */}
      <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/80 text-center py-2.5">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-[11px] font-black uppercase tracking-wider text-slate-400">
            {day}
          </div>
        ))}
      </div>

      {/* Month Day Cells */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 min-h-[640px]">
        {allCalendarDays.map((cell, idx) => {
          const dayPosts = filteredPosts.filter((p) => p.date === cell.dateStr);
          const dayNotes = filteredNotes.filter((n) => n.date === cell.dateStr);
          const isToday = cell.dateStr === todayStr;
          const isPast = cell.dateStr < todayStr;

          return (
            <div
              key={`${cell.dateStr}-${idx}`}
              onContextMenu={(e) => {
                if (!cell.isCurrentMonth) return;
                onContextMenu(e, cell.dateStr);
              }}
              className={`group p-2 min-h-[110px] sm:min-h-[125px] transition-all cursor-pointer flex flex-col justify-between relative ${!cell.isCurrentMonth
                  ? 'bg-slate-100/90 cursor-default select-none'
                  : isToday
                    ? 'bg-primary-50/70 ring-1 ring-inset ring-primary-200/80 shadow-2xs hover:bg-primary-50/90'
                    : isPast
                      ? 'bg-slate-50 hover:bg-slate-100/80'
                      : 'bg-white hover:bg-primary-50/30'
                }`}
            >
              {/* Cell Header: Day Number */}
              <div className="flex items-center mb-1">
                <span
                  className={`inline-flex items-center justify-center w-7.5 h-7.5 sm:w-8 sm:h-8 rounded-full text-sm transition-colors ${!cell.isCurrentMonth
                      ? 'text-slate-300 font-semibold'
                      : isToday
                        ? 'bg-primary-600 text-white font-black shadow-sm ring-2 ring-primary-100'
                        : isPast
                          ? 'text-slate-400 font-bold group-hover:text-slate-600'
                          : 'text-slate-900 font-black group-hover:text-primary-600'
                    }`}
                >
                  {cell.dayNumber}
                </span>
              </div>

              {/* Cell Body: Content Feed */}
              <div className="space-y-1.5 flex-1 overflow-y-auto max-h-[75px] sm:max-h-[85px] pr-0.5">
                {/* Notes in month cell */}
                {dayNotes.map((note) => {
                  const noteStyle = getNoteColorStyle(note.color);
                  return (
                    <div
                      key={note.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNote(note);
                      }}
                      className={`px-1.5 py-1 rounded-md text-[10px] font-bold border transition-all truncate flex items-center gap-1 cursor-pointer ${noteStyle.container}`}
                      title={note.content}
                    >
                      <Pin size={10} className={`shrink-0 ${noteStyle.pin}`} />
                      <span className="truncate">{note.content}</span>
                    </div>
                  );
                })}

                {/* Scheduled/published posts in cell */}
                {dayPosts.map((post) => {
                  const isPublished = post.status === 'published';
                  const isPublishing = post.status === 'publishing';

                  return (
                    <div
                      key={post.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPost(post);
                      }}
                      className={`p-1.5 rounded-lg text-[10px] font-bold border transition-all truncate flex items-center gap-1.5 shadow-2xs cursor-pointer ${isPublished
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100'
                          : isPublishing
                            ? 'bg-amber-50 text-amber-800 border-amber-200/80 hover:bg-amber-100'
                            : 'bg-primary-50 text-primary-800 border-primary-200/80 hover:bg-primary-100'
                        }`}
                      title={`${post.time} - ${post.title}`}
                    >
                      {post.type === 'reel' ? (
                        <Film size={11} className="shrink-0 text-primary-600" />
                      ) : post.type === 'carousel' ? (
                        <ImageIcon size={11} className="shrink-0 text-blue-600" />
                      ) : (
                        <FileText size={11} className="shrink-0 text-slate-600" />
                      )}

                      <span className="font-semibold text-slate-500 shrink-0">{post.time}</span>
                      <span className="truncate flex-1">{post.title}</span>

                      {post.hasAutodm && (
                        <span title="AutoDM Active" className="inline-flex shrink-0">
                          <Zap size={10} className="text-emerald-600 fill-emerald-600" />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Empty cell hint (Only visible on hover) */}
              {dayPosts.length === 0 && dayNotes.length === 0 && cell.isCurrentMonth && (
                <div className="flex-1 flex items-center justify-center p-1 text-center select-none opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                  <span className="text-[10px] font-medium text-slate-400 leading-tight">
                    Right-click to schedule content or create notes
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
