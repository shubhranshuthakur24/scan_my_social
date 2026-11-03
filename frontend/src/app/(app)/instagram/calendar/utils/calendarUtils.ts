export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function getTodayString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export interface CalendarDayCell {
  dayNumber: number;
  isCurrentMonth: boolean;
  dateStr: string;
}

export function getMonthCalendarDays(year: number, month: number): CalendarDayCell[] {
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon...
  const daysInCurrentMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const startOffset = firstDayOfMonth;

  const prevMonthPadding: CalendarDayCell[] = Array.from({ length: startOffset }, (_, i) => ({
    dayNumber: daysInPrevMonth - startOffset + i + 1,
    isCurrentMonth: false,
    dateStr: `${month === 0 ? year - 1 : year}-${String(month === 0 ? 12 : month).padStart(2, '0')}-${String(daysInPrevMonth - startOffset + i + 1).padStart(2, '0')}`,
  }));

  const currentMonthDays: CalendarDayCell[] = Array.from({ length: daysInCurrentMonth }, (_, i) => {
    const day = i + 1;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return {
      dayNumber: day,
      isCurrentMonth: true,
      dateStr,
    };
  });

  const totalCells = Math.ceil((prevMonthPadding.length + currentMonthDays.length) / 7) * 7;
  const nextMonthPaddingCount = totalCells - (prevMonthPadding.length + currentMonthDays.length);
  const nextMonthPadding: CalendarDayCell[] = Array.from({ length: nextMonthPaddingCount }, (_, i) => ({
    dayNumber: i + 1,
    isCurrentMonth: false,
    dateStr: `${month === 11 ? year + 1 : year}-${String(month === 11 ? 1 : month + 2).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`,
  }));

  return [...prevMonthPadding, ...currentMonthDays, ...nextMonthPadding];
}

export interface WeekDayItem {
  date: Date;
  dateStr: string;
  dayName: string;
  dayNumber: number;
  monthName: string;
  isToday: boolean;
}

export function getWeekDays(currentDate: Date): WeekDayItem[] {
  const currentDayOfWeek = currentDate.getDay(); // Sun = 0
  const sunday = new Date(currentDate);
  sunday.setDate(currentDate.getDate() - currentDayOfWeek);

  const todayStr = getTodayString();

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return {
      date: d,
      dateStr,
      dayName: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      dayNumber: d.getDate(),
      monthName: MONTH_NAMES[d.getMonth()].slice(0, 3),
      isToday: dateStr === todayStr,
    };
  });
}

export function getCalendarHeaderTitle(
  viewMode: 'month' | 'week' | 'day',
  currentDate: Date,
  weekDays: WeekDayItem[]
): string {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (viewMode === 'month') {
    return `${MONTH_NAMES[month]} ${year}`;
  }
  if (viewMode === 'week') {
    const first = weekDays[0];
    const last = weekDays[6];
    return `${first.monthName} ${first.dayNumber} – ${last.monthName} ${last.dayNumber}, ${year}`;
  }
  return currentDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function getPrevDate(currentDate: Date, viewMode: 'month' | 'week' | 'day'): Date {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (viewMode === 'month') {
    return new Date(year, month - 1, 1);
  } else if (viewMode === 'week') {
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    return prevWeek;
  } else {
    const prevDay = new Date(currentDate);
    prevDay.setDate(currentDate.getDate() - 1);
    return prevDay;
  }
}

export function getNextDate(currentDate: Date, viewMode: 'month' | 'week' | 'day'): Date {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  if (viewMode === 'month') {
    return new Date(year, month + 1, 1);
  } else if (viewMode === 'week') {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    return nextWeek;
  } else {
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    return nextDay;
  }
}

export interface NoteColorStyle {
  container: string;
  text: string;
  pin: string;
  label: string;
}

export const NOTE_COLOR_STYLES: Record<string, NoteColorStyle> = {
  amber: {
    container: 'bg-amber-50 text-amber-900 border-amber-200/90 hover:bg-amber-100',
    text: 'text-amber-800',
    pin: 'text-amber-700 fill-amber-700',
    label: 'Strategy Memo',
  },
  blue: {
    container: 'bg-blue-50 text-blue-900 border-blue-200/90 hover:bg-blue-100',
    text: 'text-blue-800',
    pin: 'text-blue-700 fill-blue-700',
    label: 'Campaign Target',
  },
  purple: {
    container: 'bg-purple-50 text-purple-900 border-purple-200/90 hover:bg-purple-100',
    text: 'text-purple-800',
    pin: 'text-purple-700 fill-purple-700',
    label: 'Content Idea',
  },
  emerald: {
    container: 'bg-emerald-50 text-emerald-900 border-emerald-200/90 hover:bg-emerald-100',
    text: 'text-emerald-800',
    pin: 'text-emerald-700 fill-emerald-700',
    label: 'Growth Goal',
  },
};

export function getNoteColorStyle(color?: string): NoteColorStyle {
  return NOTE_COLOR_STYLES[color || 'amber'] || NOTE_COLOR_STYLES.amber;
}

