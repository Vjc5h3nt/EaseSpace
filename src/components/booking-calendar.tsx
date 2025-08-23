
"use client"

import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { useToast } from './ui/use-toast';
import { differenceInHours } from 'date-fns';

interface BookingCalendarProps {
    events: EventInput[];
    onDateSelect: (selectInfo: DateSelectArg) => void;
    onEventClick: (clickInfo: EventClickArg) => void;
}

const BookingCalendar: React.FC<BookingCalendarProps> = ({ events, onDateSelect, onEventClick }) => {
    const { toast } = useToast();

    return (
        <div className="h-full w-full calendar-container">
            <style jsx>{`
                .calendar-container {
                    position: relative;
                    height: calc(100vh - 10rem); /* Adjust based on your layout */
                }
                .calendar-container :global(.fc) {
                    height: 100%;
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
            />
        </div>
    );
};

function renderEventContent(eventInfo: any) {
    return (
        <div className="p-1 overflow-hidden">
            <b>{eventInfo.timeText}</b>
            <i className="ml-2 truncate">{eventInfo.event.title}</i>
        </div>
    )
}

export default BookingCalendar;

    