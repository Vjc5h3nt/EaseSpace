
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
        <div className="h-full w-full">
            <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
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
                eventContent={renderEventContent}
                contentHeight="auto"
                slotMinTime="08:00:00"
                slotMaxTime="19:00:00"
            />
        </div>
    );
};

function renderEventContent(eventInfo: any) {
    return (
        <div className="p-1">
            <b>{eventInfo.timeText}</b>
            <i className="ml-2">{eventInfo.event.title}</i>
        </div>
    )
}

export default BookingCalendar;
