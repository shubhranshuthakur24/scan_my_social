'use client';

import React from 'react';
import Link from 'next/link';
import InstagramNav from '@/components/InstagramNav';
import Button from '@/components/ui/Button';
import CreateNoteModal from '@/components/CreateNoteModal';
import { NotebookPen, Plus } from 'lucide-react';

import { useCalendar } from './hooks/useCalendar';
import { CalendarKpiCards } from './components/CalendarKpiCards';
import { CalendarToolbar } from './components/CalendarToolbar';
import { CalendarSkeleton } from './components/CalendarSkeleton';
import { MonthView } from './components/MonthView';
import { WeekView } from './components/WeekView';
import { DayView } from './components/DayView';
import { CalendarContextMenu } from './components/CalendarContextMenu';
import { PostDetailModal } from './components/PostDetailModal';
import { NoteDetailModal } from './components/NoteDetailModal';

export default function InstagramCalendarPage() {
  const {
    setSelectedAccountId,
    currentDate,
    viewMode,
    setViewMode,
    posts,
    hasLoadedInitial,
    isLoadingCalendar,
    statusCounts,
    filteredPosts,
    filteredNotes,
    allCalendarDays,
    weekDays,
    currentDayStr,
    calendarHeaderTitle,
    handlePrev,
    handleNext,
    handleToday,
    handleContextMenu,
    handleCloseContextMenu,
    contextMenu,
    isNoteModalOpen,
    setIsNoteModalOpen,
    noteModalDateStr,
    selectedPost,
    setSelectedPost,
    selectedNote,
    setSelectedNote,
    handleOpenCreateNoteModal,
    handleDeletePost,
    handleDeleteNote,
    handleAddNote,
    handleUpdateNote,
  } = useCalendar();

  return (
    <div className="space-y-6">
      {/* 1. Module Sub-Navigation Bar */}
      <InstagramNav onSelectAccount={setSelectedAccountId} />

      {/* Header Actions Container */}
      <div className="flex items-center justify-end gap-2 flex-wrap">
        <Button
          variant="secondary"
          size="sm"
          icon={NotebookPen}
          onClick={() => handleOpenCreateNoteModal()}
        >
          Add Note
        </Button>
        <Link href="/instagram/calendar/scheduler">
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
          >
            Schedule Post
          </Button>
        </Link>
      </div>

      {isLoadingCalendar && !hasLoadedInitial ? (
        <CalendarSkeleton />
      ) : (
        <>
          {/* 2. 4 KPI Status Metric Cards */}
          <CalendarKpiCards statusCounts={statusCounts} />

          {/* 3. Unified Calendar Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
            {/* Helper Schedule Banner (Only if 0 posts scheduled after initial API load) */}
            {hasLoadedInitial && posts.length === 0 && (
              <div className="p-4 border-b border-dashed border-slate-200 bg-slate-50/70">
                <h4 className="text-sm font-black text-slate-900">No scheduled posts on this calendar yet</h4>
                <p className="text-xs font-semibold text-slate-500 mt-0.5">
                  Pick a date from the visible calendar or create a scheduled Instagram post.
                </p>
              </div>
            )}

            {/* Toolbar & Navigation */}
            <CalendarToolbar
              calendarHeaderTitle={calendarHeaderTitle}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onPrev={handlePrev}
              onNext={handleNext}
              onToday={handleToday}
            />

            {/* Calendar Content Area */}
            {viewMode === 'month' && (
              <MonthView
                allCalendarDays={allCalendarDays}
                filteredPosts={filteredPosts}
                filteredNotes={filteredNotes}
                onContextMenu={handleContextMenu}
                onSelectPost={setSelectedPost}
                onSelectNote={setSelectedNote}
              />
            )}

            {viewMode === 'week' && (
              <WeekView
                weekDays={weekDays}
                filteredPosts={filteredPosts}
                filteredNotes={filteredNotes}
                onContextMenu={handleContextMenu}
                onSelectPost={setSelectedPost}
                onSelectNote={setSelectedNote}
              />
            )}

            {viewMode === 'day' && (
              <DayView
                currentDate={currentDate}
                currentDayStr={currentDayStr}
                filteredPosts={filteredPosts}
                filteredNotes={filteredNotes}
                onSelectPost={setSelectedPost}
                onSelectNote={setSelectedNote}
                onDeleteNote={handleDeleteNote}
              />
            )}
          </div>
        </>
      )}

      {/* Post Detail / Inspector Modal */}
      <PostDetailModal
        post={selectedPost}
        onClose={() => setSelectedPost(null)}
        onDeletePost={handleDeletePost}
      />

      {/* Strategy Note Detail Modal */}
      <NoteDetailModal
        note={selectedNote}
        onClose={() => setSelectedNote(null)}
        onDeleteNote={handleDeleteNote}
        onUpdateNote={handleUpdateNote}
      />

      {/* Floating Right-Click Context Menu */}
      {contextMenu && (
        <CalendarContextMenu
          contextMenu={contextMenu}
          onClose={handleCloseContextMenu}
          onOpenCreateNoteModal={handleOpenCreateNoteModal}
        />
      )}

      {/* Standalone Create Note Module Modal */}
      <CreateNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        dateStr={noteModalDateStr}
        onSaveNote={handleAddNote}
      />
    </div>
  );
}
