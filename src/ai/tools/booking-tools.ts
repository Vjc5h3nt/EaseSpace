
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import type { Booking, MeetingRoom } from '@/lib/types';
import { format } from 'date-fns';

// Schema for finding available rooms
const FindRoomsSchema = z.object({
    orgId: z.string().describe("The user's organization ID."),
    capacity: z.number().optional().describe('The number of people the room should hold.'),
    amenities: z.array(z.string()).optional().describe('A list of required amenities, like "whiteboard" or "projector".'),
    date: z.string().describe('The desired date for the booking in YYYY-MM-DD format.'),
    startTime: z.string().describe('The desired start time in HH:mm format.'),
    endTime: z.string().describe('The desired end time in HH:mm format.'),
});

// Schema for the output of the find rooms tool
const FindRoomsOutputSchema = z.object({
    availableRooms: z.array(z.object({
        id: z.string(),
        name: z.string(),
        capacity: z.number(),
        amenities: z.array(z.string()),
    })).describe('A list of rooms that are available and meet the criteria.')
});


export const findAvailableMeetingRoomsTool = ai.defineTool(
    {
        name: 'findAvailableMeetingRoomsTool',
        description: 'Finds available meeting rooms based on capacity, amenities, and time. Use this before attempting to book a room.',
        inputSchema: FindRoomsSchema,
        outputSchema: FindRoomsOutputSchema,
    },
    async (input) => {
        console.log('Finding available rooms with input:', input);

        // 1. Get all rooms for the organization
        const roomsQuery = query(
            collection(db, 'meetingRooms'),
            where('org_id', '==', input.orgId)
        );
        const roomsSnapshot = await getDocs(roomsQuery);
        let potentialRooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRoom));

        // 2. Filter rooms by capacity and amenities
        if (input.capacity) {
            potentialRooms = potentialRooms.filter(room => room.capacity >= input.capacity);
        }
        if (input.amenities && input.amenities.length > 0) {
            potentialRooms = potentialRooms.filter(room =>
                input.amenities!.every(amenity => room.amenities.includes(amenity))
            );
        }

        if (potentialRooms.length === 0) {
            return { availableRooms: [] };
        }

        // 3. Find conflicting bookings for the potential rooms on the given date
        const potentialRoomIds = potentialRooms.map(room => room.id);
        const bookingsQuery = query(
            collection(db, 'bookings'),
            where('spaceId', 'in', potentialRoomIds),
            where('date', '==', input.date),
            where('status', '!=', 'Cancelled')
        );

        const bookingsSnapshot = await getDocs(bookingsQuery);
        const conflictingBookings = bookingsSnapshot.docs.map(doc => doc.data() as Booking);

        const requestStart = new Date(`${input.date}T${input.startTime}`).getTime();
        const requestEnd = new Date(`${input.date}T${input.endTime}`).getTime();
        
        const bookedRoomIds = new Set<string>();

        for (const booking of conflictingBookings) {
            const existingStart = new Date(`${booking.date}T${booking.startTime}`).getTime();
            const existingEnd = new Date(`${booking.date}T${booking.endTime}`).getTime();

            // Check for overlap
            if (requestStart < existingEnd && requestEnd > existingStart) {
                bookedRoomIds.add(booking.spaceId);
            }
        }
        
        // 4. Filter out rooms that have conflicts
        const availableRooms = potentialRooms.filter(room => !bookedRoomIds.has(room.id));

        console.log('Found available rooms:', availableRooms);
        return { availableRooms };
    }
);


// Schema for booking a room
const BookRoomSchema = z.object({
    userId: z.string().describe('The ID of the user making the booking.'),
    orgId: z.string().describe("The user's organization ID."),
    roomId: z.string().describe('The ID of the meeting room to book.'),
    date: z.string().describe('The date for the booking in YYYY-MM-DD format.'),
    startTime: z.string().describe('The start time in HH:mm format.'),
    endTime: z.string().describe('The end time in HH:mm format.'),
    purpose: z.string().optional().describe('The purpose of the meeting.'),
    participants: z.array(z.string()).optional().describe('A list of participant names or emails.'),
});


export const bookMeetingRoomTool = ai.defineTool(
    {
        name: 'bookMeetingRoomTool',
        description: 'Books a specific meeting room for a user after availability has been confirmed.',
        inputSchema: BookRoomSchema,
        outputSchema: z.object({
            bookingId: z.string().describe('The ID of the newly created booking.'),
            status: z.string().describe('The status of the new booking.'),
        }),
    },
    async (input) => {
        console.log('Booking room with input:', input);
        const newBooking: Omit<Booking, 'id'> = {
            userId: input.userId,
            org_id: input.orgId,
            spaceId: input.roomId,
            spaceType: 'meetingRoom',
            date: input.date,
            startTime: input.startTime,
            endTime: input.endTime,
            purpose: input.purpose || 'Booking from AI Assistant',
            participants: input.participants || [],
            status: 'Requires Approval', // All AI bookings should require approval
            createdAt: serverTimestamp() as any,
        };

        const docRef = await addDoc(collection(db, 'bookings'), newBooking);

        return {
            bookingId: docRef.id,
            status: newBooking.status,
        };
    }
);

// Tool to count all meeting rooms
export const countAllMeetingRoomsTool = ai.defineTool(
    {
        name: 'countAllMeetingRoomsTool',
        description: 'Counts the total number of meeting rooms in the organization.',
        inputSchema: z.object({
            orgId: z.string().describe("The user's organization ID."),
        }),
        outputSchema: z.object({
            count: z.number().describe('The total number of meeting rooms.'),
        }),
    },
    async (input) => {
        console.log('Counting all meeting rooms for orgId:', input.orgId);
        const roomsQuery = query(
            collection(db, 'meetingRooms'),
            where('org_id', '==', input.orgId)
        );
        const roomsSnapshot = await getDocs(roomsQuery);
        return { count: roomsSnapshot.size };
    }
);
