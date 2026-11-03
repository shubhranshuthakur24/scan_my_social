import { useState, useMemo, useEffect, useCallback } from 'react';
import { useInstagramStore } from '@/lib/store/useInstagramStore';
import {
  getScheduledCalendar,
  createSchedulerNote,
  updateSchedulerNote,
  deleteSchedulerNote,
} from '@/lib/api/instagramService';
import { ScheduledPost, SchedulerNote } from '../types';
import { mapScheduledPost } from '../services/calendarMapper';
import {
  getTodayString,
  getMonthCalendarDays,
  getWeekDays,
  getCalendarHeaderTitle,
  getPrevDate,
  getNextDate,
} from '../utils/calendarUtils';
import { ContextMenuState } from '../components/CalendarContextMenu';

export function useCalendar() {
  const storeAccounts = useInstagramStore((state) => state.accounts);
  const storeSelectedId = useInstagramStore((state) => state.selectedAccountId);
  const setSelectedAccountId = useInstagramStore((state) => state.setSelectedAccountId);

  const displayAccounts = useMemo(() => {
    return storeAccounts.map((a) => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName || a.username,
      avatar: a.avatar || '',
      followers: a.followers ? `${(a.followers / 1000).toFixed(1)}K` : '0',
      status: a.status || 'active',
    }));
  }, [storeAccounts]);

  const selectedAccountId = storeSelectedId || displayAccounts[0]?.id || '';

  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [filterType, setFilterType] = useState<'all' | 'reels' | 'carousels' | 'published' | 'notes'>('all');

  // Posts & Notes State (Dynamic from Laravel API)
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [notes, setNotes] = useState<SchedulerNote[]>([]);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(true);
  const [hasLoadedInitial, setHasLoadedInitial] = useState(false);

  const isHydrated = useInstagramStore((state) => state.isHydrated);

  useEffect(() => {
    let isCancelled = false;

    async function loadData() {
      if (!isHydrated || !selectedAccountId) return;
      setIsLoadingCalendar(true);
      try {
        const calendarData = await getScheduledCalendar(selectedAccountId);
        if (!isCancelled) {
          setPosts(calendarData.posts.map(mapScheduledPost));
          setNotes(
            calendarData.notes.map((n) => ({
              id: n.id,
              date: n.date,
              content: n.content,
              color: (n.color as SchedulerNote['color']) || 'amber',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load scheduled calendar from API:', err);
      } finally {
        if (!isCancelled) {
          setIsLoadingCalendar(false);
          setHasLoadedInitial(true);
        }
      }
    }

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [isHydrated, selectedAccountId]);

  // Modals state
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteModalDateStr, setNoteModalDateStr] = useState<string>(() => getTodayString());

  // Post & Note Detail Modal state
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);
  const [selectedNote, setSelectedNote] = useState<SchedulerNote | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // Status Counts
  const statusCounts = useMemo(() => {
    const scheduled = posts.filter((p) => p.status === 'scheduled').length;
    const publishing = posts.filter((p) => p.status === 'publishing').length;
    const published = posts.filter((p) => p.status === 'published').length;
    const failed = posts.filter((p) => p.status === 'failed').length;
    return { scheduled, publishing, published, failed };
  }, [posts]);

  // Filtered Events
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (filterType === 'reels') return post.type === 'reel';
      if (filterType === 'carousels') return post.type === 'carousel';
      if (filterType === 'published') return post.status === 'published';
      if (filterType === 'notes') return false;
      return true;
    });
  }, [posts, filterType]);

  const filteredNotes = useMemo(() => {
    if (filterType === 'reels' || filterType === 'carousels' || filterType === 'published') return [];
    return notes;
  }, [notes, filterType]);

  // Calendar calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const allCalendarDays = useMemo(() => {
    return getMonthCalendarDays(year, month);
  }, [year, month]);

  const weekDays = useMemo(() => {
    return getWeekDays(currentDate);
  }, [currentDate]);

  const currentDayStr = useMemo(() => {
    return getTodayString(currentDate);
  }, [currentDate]);

  const calendarHeaderTitle = useMemo(() => {
    return getCalendarHeaderTitle(viewMode, currentDate, weekDays);
  }, [viewMode, currentDate, weekDays]);

  // Navigation handlers
  const handlePrev = useCallback(() => {
    setCurrentDate((prev) => getPrevDate(prev, viewMode));
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((prev) => getNextDate(prev, viewMode));
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  // Context Menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();
    const todayStr = getTodayString();
    const isPast = dateStr < todayStr;

    const menuWidth = 240;
    const menuHeight = 220;
    let posX = e.clientX;
    let posY = e.clientY;

    if (posX + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 16;
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 16;
    }

    setContextMenu({ x: posX, y: posY, dateStr, isPast });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  const handleOpenCreateNoteModal = useCallback((dateStr?: string) => {
    setNoteModalDateStr(dateStr || getTodayString());
    setIsNoteModalOpen(true);
  }, []);

  const handleDeletePost = useCallback((id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id));
    setSelectedPost(null);
  }, []);

  const handleDeleteNote = useCallback(async (id: string) => {
    try {
      await deleteSchedulerNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setSelectedNote(null);
    } catch (err) {
      console.error('Failed to delete note via API:', err);
    }
  }, []);

  const handleAddNote = useCallback(async (newNote: SchedulerNote) => {
    try {
      const created = await createSchedulerNote({
        date: newNote.date,
        content: newNote.content,
        color: newNote.color,
      });
      setNotes((prev) => [
        ...prev,
        {
          id: created.id,
          date: created.date || newNote.date,
          content: created.content || newNote.content,
          color: newNote.color || 'amber',
        },
      ]);
    } catch (err) {
      console.error('Failed to create note via API:', err);
    }
  }, []);

  const handleUpdateNote = useCallback(
    async (
      id: string,
      updatedData: { content: string; color?: SchedulerNote['color'] }
    ) => {
      try {
        const updated = await updateSchedulerNote(id, updatedData);
        setNotes((prev) =>
          prev.map((n) =>
            n.id === id
              ? {
                  ...n,
                  content: updated.content || updatedData.content,
                  color: (updated.color as SchedulerNote['color']) || updatedData.color || n.color,
                }
              : n
          )
        );
        setSelectedNote(null);
      } catch (err) {
        console.error('Failed to update note via API:', err);
      }
    },
    []
  );

  return {
    selectedAccountId,
    setSelectedAccountId,
    currentDate,
    viewMode,
    setViewMode,
    filterType,
    setFilterType,
    posts,
    notes,
    isLoadingCalendar,
    hasLoadedInitial,
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
  };
}
