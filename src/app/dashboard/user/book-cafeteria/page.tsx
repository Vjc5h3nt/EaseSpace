
"use client";

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { Cafeteria, TableLayout, Booking } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, ArrowLeft, Users, Clock, CheckCircle2, XCircle, MinusCircle, UserCheck } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isToday, isBefore, startOfToday } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { onAuthStateChanged } from 'firebase/auth';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

type BookingsForSlot = {
    [tableId: string]: {
        bookedSeats: number;
        userHasBooking: boolean;
    };
}

function CafeteriaBookingComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const cafeteriaId = searchParams.get('id');
    const { toast } = useToast();
    const auth = useAuth();
    const db = useFirestore();

    const [cafeteria, setCafeteria] = useState<Cafeteria | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedTable, setSelectedTable] = useState<TableLayout | null>(null);
    const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
    
    // Booking form state
    const [bookingDate, setBookingDate] = useState<Date | undefined>(new Date());
    const [timeSlot, setTimeSlot] = useState<string>("");
    const [seatCount, setSeatCount] = useState<number>(0);
    
    const [bookingsBySlot, setBookingsBySlot] = useState<BookingsForSlot>({});
    const [userTotalBookedSeats, setUserTotalBookedSeats] = useState(0);

    const [user, setUser] = useState<{uid: string, org_id: string} | null>(null);

    const timeSlots = ["11:00 - 12:00", "12:00 - 13:00", "13:00 - 14:00"];

    useEffect(() => {
      if (!auth) return;
      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if(currentUser && db){
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
    }, [router, auth, db])

    useEffect(() => {
        if (!cafeteriaId) {
            router.push('/dashboard/user');
            return;
        }

        const fetchCafeteria = async () => {
            if (!db) return;
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
    }, [cafeteriaId, router, toast, db]);

    useEffect(() => {
        if (!cafeteriaId || !bookingDate || !timeSlot || !user || !db) {
            setBookingsBySlot({});
            setUserTotalBookedSeats(0);
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

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const newBookingsBySlot: BookingsForSlot = {};
            let totalUserSeats = 0;

            querySnapshot.forEach(doc => {
                const booking = doc.data() as Booking;
                const tableId = booking.tableId;
                if (tableId && booking.seatCount) {
                    if (!newBookingsBySlot[tableId]) {
                        newBookingsBySlot[tableId] = { bookedSeats: 0, userHasBooking: false };
                    }
                    newBookingsBySlot[tableId].bookedSeats += booking.seatCount;

                    if (booking.userId === user.uid) {
                        totalUserSeats += booking.seatCount;
                        newBookingsBySlot[tableId].userHasBooking = true;
                    }
                }
            });
            
            setBookingsBySlot(newBookingsBySlot);
            setUserTotalBookedSeats(totalUserSeats);
        });

        return () => unsubscribe();
    }, [cafeteriaId, bookingDate, timeSlot, user, db]);

    const handleTableClick = (table: TableLayout) => {
        if (seatsUserCanStillBook <= 0) {
            toast({
                title: "Booking Limit Reached",
                description: "You have already booked the maximum of 3 seats for this time slot.",
                variant: "destructive"
            });
            return;
        }

        const bookedSeats = bookingsBySlot[table.id]?.bookedSeats || 0;
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
        if (!cafeteria || !selectedTable || !bookingDate || !timeSlot || !user || seatCount === 0 || !db) {
            toast({ title: "Booking Error", description: "Please select number of seats.", variant: "destructive" });
            return;
        }
        
        const availableSeats = 4 - (bookingsBySlot[selectedTable.id]?.bookedSeats || 0);
        if(seatCount > availableSeats) {
             toast({ title: "Booking Error", description: `Only ${availableSeats} seat(s) are available at this table.`, variant: "destructive" });
            return;
        }
        
        if(seatCount > seatsUserCanStillBook) {
            toast({ title: "Booking Limit Exceeded", description: `You can only book ${seatsUserCanStillBook} more seat(s) for this time slot.`, variant: "destructive" });
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

            setIsBookingDialogOpen(false);
            setSelectedTable(null);
            setSeatCount(0);

        } catch (error: any) {
             toast({ title: "Booking Failed", description: error.message, variant: "destructive" });
        }
    };
    
    const availableSeatsAtSelectedTable = useMemo(() => {
        if (!selectedTable) return 0;
        const bookedSeats = bookingsBySlot[selectedTable.id]?.bookedSeats || 0;
        return 4 - bookedSeats;
    }, [selectedTable, bookingsBySlot]);
    
    const seatsUserCanStillBook = useMemo(() => {
        return Math.max(0, 3 - userTotalBookedSeats);
    }, [userTotalBookedSeats]);

    if (loading) return <div className="flex justify-center items-center h-full">Loading...</div>;
    if (!cafeteria) return <div className="flex justify-center items-center h-full">Could not load cafeteria.</div>;

    return (
        <div className="p-4 sm:p-8 space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-2 pl-0">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
            </Button>
            <header className="mb-4">
                <h1 className="text-3xl font-bold tracking-tight">{cafeteria.name}</h1>
                <p className="text-muted-foreground mt-1">Select a date and time, then choose a table to book. You can book a maximum of 3 seats per slot.</p>
            </header>
            
            <Card>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">1. Select Date</Label>
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
                                        disabled={(date) => isBefore(date, startOfToday()) || isBefore(date, new Date('1900-01-01'))}
                                        initialFocus 
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-sm font-medium">2. Select Time Slot</Label>
                            <div className="flex flex-wrap gap-2">
                                {timeSlots.map(slot => (
                                     <Button 
                                        key={slot}
                                        variant={timeSlot === slot ? "default" : "outline"}
                                        onClick={() => setTimeSlot(slot)}
                                        className="flex-grow sm:flex-grow-0"
                                     >
                                        <Clock className="mr-2 h-4 w-4" />
                                        {slot}
                                    </Button>
                                ))}
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div>
                <h2 className="text-xl font-semibold tracking-tight mb-4">3. Choose a Table</h2>
                {!timeSlot ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 h-64 text-center p-4">
                        <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                        <h3 className="text-lg font-semibold text-foreground">Select a Time Slot</h3>
                        <p className="text-muted-foreground text-sm">Please select a time to view table availability.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {cafeteria.layout.map((table) => {
                            const bookingInfo = bookingsBySlot[table.id];
                            const bookedSeats = bookingInfo?.bookedSeats || 0;
                            const availableSeats = 4 - bookedSeats;
                            const isFull = availableSeats <= 0;
                            const userHasBooking = bookingInfo?.userHasBooking || false;

                            return (
                                <Card 
                                    key={table.id}
                                    className={cn(
                                        "transition-all hover:shadow-md",
                                        isFull && !userHasBooking ? "bg-muted/50 cursor-not-allowed opacity-70" : "cursor-pointer",
                                        userHasBooking && "border-primary ring-2 ring-primary"
                                    )}
                                    onClick={() => !isFull && handleTableClick(table)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-lg font-bold">Table {table.id.split('-')[1]}</CardTitle>
                                        {userHasBooking ? (
                                            <UserCheck className="h-5 w-5 text-primary" />
                                        ) : isFull ? (
                                            <XCircle className="h-5 w-5 text-destructive" />
                                        ) : (
                                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                                        )}
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex items-center text-sm font-medium">
                                            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
                                            {isFull && !userHasBooking ? "Fully Booked" : `${availableSeats} of 4 seats available`}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {selectedTable && (
                 <Dialog open={isBookingDialogOpen} onOpenChange={(isOpen) => { if (!isOpen) setSeatCount(0); setIsBookingDialogOpen(isOpen); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Book a Seat at Table {selectedTable.id.split('-')[1]}</DialogTitle>
                            <DialogDescription>
                                There are <span className="font-bold text-foreground">{availableSeatsAtSelectedTable}</span> seat(s) available. 
                                You can book up to <span className="font-bold text-foreground">{seatsUserCanStillBook}</span> more seat(s) in this time slot.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                                <Label htmlFor="seat-count">Number of Seats</Label>
                                <Select onValueChange={(val) => setSeatCount(parseInt(val))} value={seatCount > 0 ? seatCount.toString() : ""}>
                                    <SelectTrigger id="seat-count">
                                        <SelectValue placeholder="Select number of seats" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableSeatsAtSelectedTable > 0 && seatsUserCanStillBook > 0 ? (
                                            [...Array(Math.min(seatsUserCanStillBook, availableSeatsAtSelectedTable))].map((_, i) => (
                                                 <SelectItem key={i+1} value={(i+1).toString()}>{i+1} Seat{i > 0 ? 's' : ''}</SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm text-muted-foreground">No seats available to book.</div>
                                        )}
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
        <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
            <CafeteriaBookingComponent />
        </Suspense>
    )
}

    