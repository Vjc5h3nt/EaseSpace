
import type { Timestamp } from "firebase/firestore";

export interface Organization {
    id: string;
    name: string;
}

export interface User {
  uid: string;
  org_id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'user';
  mobileNumber?: string;
  employeeId?: string;
}

export interface TableLayout {
    id: string;
    x: number;
    y: number;
}

export interface Cafeteria {
    id: string;
    org_id: string;
    name: string;
    capacity: number;
    layout: TableLayout[];
}

export interface MeetingRoom {
    id: string;
    org_id: string;
    name: string;
    capacity: number;
    amenities: string[];
    floor?: number;
    location?: string; // e.g. "Tower B"
    imageUrl?: string;
}

export interface Booking {
    id: string;
    org_id: string;
    userId: string;
    spaceId: string;
    spaceType: 'cafeteria' | 'meetingRoom';
    date: string; // YYYY-MM-DD
    startTime: string; // HH:mm
    endTime: string; // HH:mm
    status: 'Confirmed' | 'Pending' | 'Cancelled' | 'Requires Approval';
    tableId?: string; // For cafeteria bookings
    seatCount?: number; // For cafeteria bookings
    createdAt: Timestamp;
    purpose?: string;
    userName?: string;
    participants?: string[];
    employeeId?: string;
    contact?: string;
}

export interface Analytics {
    id: string;
    org_id: string;
    date: string; // YYYY-MM-DD
    utilization: {
        cafeteria: number; // percentage
        meetingRoom: number; // percentage
    };
    noShowCount: number;
}

    