import FullCalendar from '@fullcalendar/react';

function classNames(...classes) {
    return classes.filter(Boolean).join(' ');
}

export default function WorkbenchCalendar({ className = '', ...calendarProps }) {
    return (
        <div className={classNames('workbench-calendar-shell', className)}>
            <FullCalendar {...calendarProps} />
        </div>
    );
}
