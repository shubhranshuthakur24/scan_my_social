import WorkbenchCalendar from '@/Components/common/WorkbenchCalendar';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/Components/ui/tooltip';

const formatDateKey = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    const d = parts.find(p => p.type === 'day').value;
    return `${y}-${m}-${d}`;
};

const formatMonthKey = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const y = parts.find(p => p.type === 'year').value;
    const m = parts.find(p => p.type === 'month').value;
    return `${y}-${m}`;
};

export default function AppointmentCalendar({
    initialDate,
    selectedDate,
    timeZone = 'UTC',
    dailyCounts = {},
    onDateSelect,
    onMonthChange,
    onTodaySelect,
}) {
    const dayNumberFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        day: 'numeric',
    });
    const fullDateFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const selectDate = (dateKey) => {
        if (dateKey !== selectedDate && typeof onDateSelect === 'function') {
            onDateSelect(dateKey);
        }
    };

    return (
        <WorkbenchCalendar
            className="appointment-calendar-shell"
            plugins={[dayGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            initialDate={initialDate}
            timeZone={timeZone}
            height="auto"
            contentHeight="auto"
            fixedWeekCount={false}
            showNonCurrentDates
            headerToolbar={{
                left: 'prev,next appointmentToday',
                center: 'title',
                right: '',
            }}
            customButtons={{
                appointmentToday: {
                    text: 'Today',
                    click: () => {
                        if (typeof onTodaySelect === 'function') {
                            onTodaySelect();
                        }
                    },
                },
            }}
            dateClick={(info) => {
                selectDate(info.dateStr);
            }}
            datesSet={(info) => {
                if (typeof onMonthChange !== 'function') {
                    return;
                }

                onMonthChange(formatMonthKey(info.view.currentStart, timeZone));
            }}
            dayCellClassNames={(info) => {
                const dateKey = formatDateKey(info.date, timeZone);
                const count = dailyCounts[dateKey] ?? 0;

                return [
                    'appointment-calendar-day-interactive',
                    dateKey === selectedDate ? 'appointment-calendar-day-selected' : '',
                    count > 0 ? 'appointment-calendar-day-has-bookings' : '',
                ].filter(Boolean);
            }}
            dayCellDidMount={(info) => {
                const dateKey = formatDateKey(info.date, timeZone);
                const count = dailyCounts[dateKey] ?? 0;

                if (count > 0) {
                    info.el.setAttribute('data-booking-count', String(count));
                    return;
                }

                info.el.removeAttribute('data-booking-count');
            }}
            dayCellContent={(info) => {
                const dateKey = formatDateKey(info.date, timeZone);
                const count = dailyCounts[dateKey] ?? 0;
                const appointmentLabel = count === 1 ? '1 confirmed appointment' : `${count} confirmed appointments`;
                const ariaLabel = `${fullDateFormatter.format(info.date)}, ${appointmentLabel}`;

                const buttonEl = (
                    <button
                        type="button"
                        className="appointment-calendar-day-content"
                        tabIndex={-1}
                        aria-label={ariaLabel}
                        aria-pressed={dateKey === selectedDate}
                        aria-current={info.isToday ? 'date' : undefined}
                        onClick={(event) => {
                            event.stopPropagation();
                            selectDate(dateKey);
                        }}
                        onKeyDown={(event) => {
                            if (event.key !== 'Enter' && event.key !== ' ') {
                                return;
                            }

                            event.preventDefault();
                            event.stopPropagation();
                            selectDate(dateKey);
                        }}
                    >
                        <span className="appointment-calendar-day-number">{dayNumberFormatter.format(info.date)}</span>
                    </button>
                );

                if (count > 0) {
                    return (
                        <TooltipProvider delayDuration={200}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    {buttonEl}
                                </TooltipTrigger>
                                <TooltipContent>
                                    {appointmentLabel}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    );
                }

                return buttonEl;
            }}
        />
    );
}
