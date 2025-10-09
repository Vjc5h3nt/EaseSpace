
"use client"

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';

interface BookingCalendarProps {
    events: EventInput[];
    onDateSelect: (selectInfo: DateSelectArg) => void;
    onEventClick: (clickInfo: EventClickArg) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ events, onDateSelect, onEventClick }) => {

    return (
        <div className="h-full w-full calendar-container bg-card rounded-lg border shadow-sm p-4">
            <style jsx global>{`
                .calendar-container {
                    position: relative;
                    height: 100%;
                }
                .calendar-container .fc {
                    height: 100%;
                    font-family: inherit;
                }
                .fc .fc-toolbar.fc-header-toolbar {
                    margin-bottom: 1.5em;
                }
                .fc .fc-toolbar-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                .fc .fc-button {
                    background-color: hsl(var(--primary));
                    border-color: hsl(var(--primary));
                    color: hsl(var(--primary-foreground));
                }
                .fc .fc-button:hover {
                     background-color: hsl(var(--primary) / 0.9);
                }
                .fc .fc-button-primary:not(:disabled).fc-button-active, 
                .fc .fc-button-primary:not(:disabled):active {
                    background-color: hsl(var(--accent));
                    color: hsl(var(--accent-foreground));
                    border-color: hsl(var(--border));
                }
                .fc-direction-ltr .fc-button-group > .fc-button:not(:first-child) {
                    border-top-left-radius: 0;
                    border-bottom-left-radius: 0;
                }
                .fc-direction-ltr .fc-button-group > .fc-button:not(:last-child) {
                    border-top-right-radius: 0;
                    border-bottom-right-radius: 0;
                }
                .fc-theme-standard .fc-scrollgrid, .fc-theme-standard th, .fc-theme-standard td {
                    border-color: hsl(var(--border));
                }
                .fc .fc-daygrid-day.fc-day-today {
                     background-color: hsl(var(--primary) / 0.05);
                }
            `}</style>
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'timeGridWeek,timeGridDay,dayGridMonth'
                }}
                initialView="timeGridWeek"
                editable={false}
                selectable={true}
                selectMirror={true}
                dayMaxEvents={true}
                weekends={true}
                events={events}
                select={onDateSelect}
                eventClick={onEventClick}
                selectAllow={(selectInfo) => {
                    const today = new Date();
                    today.setHours(0,0,0,0);
                    return selectInfo.start >= today;
                }}
                eventContent={renderEventContent}
                slotMinTime="07:00:00"
                slotMaxTime="19:00:00"
                allDaySlot={false}
                height="100%"
                nowIndicator={true}
            />
        </div>
    );
};

function renderEventContent(eventInfo: any) {
    return (
        <div className="p-1 overflow-hidden text-xs">
            <b>{eventInfo.timeText}</b>
            <i className="ml-1 truncate">{eventInfo.event.title}</i>
        </div>
    )
}

export default BookingCalendar;

    