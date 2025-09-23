
import type { Timestamp } from "firebase/firestore";
import type { Database } from "./database.types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];

export type User = Database["public"]["Tables"]["users"]["Row"];

export type TableLayout = {
    id: string;
    x: number;
    y: number;
};

export type Cafeteria = Omit<Database["public"]["Tables"]["cafeterias"]["Row"], "layout"> & {
  layout: TableLayout[];
};

export type MeetingRoom = Database["public"]["Tables"]["meeting_rooms"]["Row"];

export type Booking = Database["public"]["Tables"]["bookings"]["Row"];

export type Analytics = Database["public"]["Tables"]["analytics"]["Row"];

    