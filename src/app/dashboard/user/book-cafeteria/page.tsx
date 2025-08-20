
"use client";

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Cafeteria, TableLayout, Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Table as TableIcon, ArrowLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type BookingsForSlot = {
    [tableId: string]: number; // Stores number of seats booked for a given table
}

function CafeteriaBookingComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cafeteriaId = searchParams.get('id');
    const { toast } = useToast();

    const [cafeteria, setCafeteria] = useState<Cafeteria | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<TableLayout | null>(null);
    const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
    
    // Booking form state
    const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
    const [timeSlot, setTimeSlot] = useState<string>("");
    const [seatCount, setSeatCount] = useState<number>(0);
    
    const [bookingsBySlot, setBookingsBySlot] = useState<BookingsForSlot>({});

    const [user, setUser] = useState<{uid: string, org_id: string} | null>(null);

    useEffect(() => {
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if(currentUser){
            const userDocRef = doc(db, 'users', currentUser.uid);
            const userDoc = await getDoc(userDocRef);
            if(userDoc.exists()) {
                setUser({ uid: currentUser.uid, org_id: userDoc.data().org_id });
            }
        } else {
            router.push('/login');
        }
      });
      return () => unsubscribe();
    }, [router])

    useEffect(() => {
        if (!cafeteriaId) {
            router.push('/dashboard/user');
            return;
        }

        const fetchCafeteria = async () => {
            setLoading(true);
            const docRef = doc(db, "cafeterias", cafeteriaId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setCafeteria({ id: docSnap.id, ...docSnap.data() } as Cafeteria);
            } else {
                toast({ title: "Error", description: "Cafeteria not found.", variant: "destructive" });
                router.push('/dashboard/user');
            }
            setLoading(false);
        };

        fetchCafeteria();
    }, [cafeteriaId, router, toast]);

    const availableSeats = useMemo(() => {
        if (!selectedTable) return 0;
        const bookedSeats = bookingsBySlot[selectedTable.id] || 0;
        return 4 - bookedSeats;
    }, [selectedTable, bookingsBySlot]);

    useEffect(() => {
        const fetchBookingsForSlot = async () => {
            if (!cafeteriaId || !bookingDate || !timeSlot) {
                setBookingsBySlot({});
                return;
            }

            const [startTime] = timeSlot.split(' - ');
            const q = query(
                collection(db, "bookings"),
                where("spaceId", "==", cafeteriaId),
                where("date", "==", format(bookingDate, "yyyy-MM-dd")),
                where("startTime", "==", startTime.trim()),
                where("status", "==", "Confirmed")
            );

            const querySnapshot = await getDocs(q);
            const bookingsForSlot: BookingsForSlot = {};

            querySnapshot.forEach(doc => {
                const booking = doc.data() as Booking;
                if (booking.tableId && booking.seatCount) {
                    bookingsForSlot[booking.tableId] = (bookingsForSlot[booking.tableId] || 0) + booking.seatCount;
                }
            });
            
            setBookingsBySlot(bookingsForSlot);
        };

        fetchBookingsForSlot();
    }, [cafeteriaId, bookingDate, timeSlot]);


    const handleTableClick = (table: TableLayout) => {
        const bookedSeats = bookingsBySlot[table.id] || 0;
        if (bookedSeats >= 4) {
             toast({
                title: "Table Fully Booked",
                description: "All seats at this table are occupied for the selected time slot.",
                variant: "destructive"
            });
            return;
        }
        setSelectedTable(table);
        setIsBookingDialogOpen(true);
    };

    const handleConfirmBooking = async () => {
        if (!cafeteria || !selectedTable || !bookingDate || !timeSlot || !user || seatCount === 0) {
            toast({ title: "Booking Error", description: "Please select number of seats.", variant: "destructive" });
            return;
        }
        
        if(seatCount > availableSeats) {
             toast({ title: "Booking Error", description: `Only ${availableSeats} seat(s) are available at this table.`, variant: "destructive" });
            return;
        }

        try {
            const newBooking: Omit<Booking, 'id'> = {
                org_id: user.org_id,
                userId: user.uid,
                spaceId: cafeteria.id,
                spaceType: 'cafeteria',
                date: format(bookingDate, "yyyy-MM-dd"),
                startTime: timeSlot.split('-')[0].trim(),
                endTime: timeSlot.split('-')[1].trim(),
                status: 'Confirmed',
                tableId: selectedTable.id,
                seatCount: seatCount,
                createdAt: serverTimestamp() as any
            };
            
            await addDoc(collection(db, "bookings"), newBooking);

            toast({ title: "Booking Confirmed!", description: `You have booked ${seatCount} seat(s) at table ${selectedTable.id.split('-')[1]}.` });
            
            // Manually update local state to reflect new booking immediately
            setBookingsBySlot(prev => ({
                ...prev,
                [selectedTable.id]: (prev[selectedTable.id] || 0) + seatCount
            }));

            setIsBookingDialogOpen(false);
            setSelectedTable(null);
            setSeatCount(0);

        } catch (error: any) {
             toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
        }
    };

    if (loading) return <div className="flex justify-center items-center h-full">Loading...</div>;
    if (!cafeteria) return <div className="flex justify-center items-center h-full">Could not load cafeteria.</div>;

    return (
        <div className="p-8">
            <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
            </Button>
            <header className="mb-6">
                <h1 className="text-3xl font-bold">{cafeteria.name}</h1>
                <p className="text-muted-foreground">Select a date and time, then click a table to book.</p>
            </header>
            
            <div className="flex gap-4 mb-6">
                <div className="flex-1">
                    <Label>Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                             <Calendar 
                                mode="single" 
                                selected={bookingDate} 
                                onSelect={setBookingDate} 
                                disabled={(date) => {
                                    const today = new Date();
                                    today.setHours(0, 0, 0, 0); // Set to start of today for comparison
                                    return date < today || date > today;
                                }}
                                initialFocus 
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="flex-1">
                    <Label>Time Slot</Label>
                     <Select onValueChange={setTimeSlot} value={timeSlot}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a time slot" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="11:00 - 12:00">11:00 AM - 12:00 PM</SelectItem>
                            <SelectItem value="12:00 - 13:00">12:00 PM - 01:00 PM</SelectItem>
                            <SelectItem value="13:00 - 14:00">01:00 PM - 02:00 PM</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="relative w-full h-[600px] rounded-md border bg-slate-100 overflow-hidden">
                {!timeSlot && <div className="absolute inset-0 flex items-center justify-center bg-gray-500/10 backdrop-blur-sm z-10"><p className="text-lg font-semibold text-neutral-700">Please select a time slot to see table availability.</p></div>}
                {cafeteria.layout.map((table) => {
                    const bookedSeats = bookingsBySlot[table.id] || 0;
                    const isFull = bookedSeats >= 4;
                    return (
                        <div
                            key={table.id}
                            className={cn(
                                "absolute w-12 h-12 flex items-center justify-center rounded-lg bg-primary text-primary-foreground select-none group transition-colors",
                                isFull ? "bg-neutral-400 cursor-not-allowed" : "cursor-pointer hover:bg-primary/80",
                                !timeSlot && "blur-sm"
                            )}
                            style={{ left: table.x, top: table.y }}
                            onClick={() => timeSlot && handleTableClick(table)}
                        >
                            <TableIcon className="w-7 h-7" />
                            <span className="absolute -bottom-5 text-xs text-neutral-700 font-medium">{table.id.split('-')[1] || table.id}</span>
                            {!isFull && timeSlot && (
                                <div className="absolute -top-2 -right-2 text-xs bg-green-500 text-white rounded-full h-5 w-5 flex items-center justify-center font-bold">
                                    {4 - bookedSeats}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {selectedTable && (
                 <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Book a Seat at Table {selectedTable.id.split('-')[1] || selectedTable.id}</DialogTitle>
                            <DialogDescription>There are {availableSeats} seat(s) available. Select how many you need.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label>Number of Seats</Label>
                                <Select onValueChange={(val) => setSeatCount(parseInt(val))} value={seatCount > 0 ? seatCount.toString() : ""}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select number of seats" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[...Array(Math.min(3, availableSeats))].map((_, i) => (
                                             <SelectItem key={i+1} value={(i+1).toString()}>{i+1} Seat{i > 0 ? 's' : ''}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => {setIsBookingDialogOpen(false); setSeatCount(0)}}>Cancel</Button>
                            <Button onClick={handleConfirmBooking} disabled={seatCount === 0}>Confirm Booking</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}


export default function CafeteriaBookingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CafeteriaBookingComponent />
        </Suspense>
    )
}
