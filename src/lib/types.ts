export interface Booking {
    id: string;
    user: string;
    space: string;
    date: string;
    time: string;
    status: 'Confirmed' | 'Pending' | 'Cancelled';
}

export interface Cafeteria {
    id: string;
    name: string;
    capacity: number;
}

export interface MeetingRoom {
    id: string;
    name: string;
    capacity: number;
    amenities: string[];
}
