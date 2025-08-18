"use client";

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
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
    const [seatCount, setSeatCount] = useState<number>(1);

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

    const handleTableClick = (table: TableLayout) => {
        setSelectedTable(table);
        setIsBookingDialogOpen(true);
    };

    const handleConfirmBooking = async () => {
        if (!cafeteria || !selectedTable || !bookingDate || !timeSlot || !user) {
            toast({ title: "Booking Error", description: "Please fill all fields.", variant: "destructive" });
            return;
        }

        try {
            // Logic to check for conflicts would go here
            
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
                seatCount: seatCount
            };
            
            await addDoc(collection(db, "bookings"), newBooking);

            toast({ title: "Booking Confirmed!", description: `You have booked ${seatCount} seat(s) at table ${selectedTable.id}.` });
            setIsBookingDialogOpen(false);
            setSelectedTable(null);
            setTimeSlot("");
            setSeatCount(1);
            setBookingDate(new Date());

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
                <p className="text-muted-foreground">Click on a table to start booking.</p>
            </header>
            <div className="relative w-full h-[600px] rounded-md border bg-slate-100 overflow-hidden">
                {cafeteria.layout.map((table) => (
                    <div
                        key={table.id}
                        className="absolute w-12 h-12 flex items-center justify-center rounded-lg bg-primary text-primary-foreground select-none group cursor-pointer hover:bg-primary/80 transition-colors"
                        style={{ left: table.x, top: table.y }}
                        onClick={() => handleTableClick(table)}
                    >
                        <TableIcon className="w-7 h-7" />
                        <span className="absolute -bottom-5 text-xs text-neutral-700 font-medium">{table.id.split('-')[1] || table.id}</span>
                    </div>
                ))}
            </div>

            {selectedTable && (
                 <Dialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Book a Seat at Table {selectedTable.id.split('-')[1] || selectedTable.id}</DialogTitle>
                            <DialogDescription>Select your desired date, time, and number of seats.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div>
                               <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>
                             <div>
                                <Label>Time Slot</Label>
                                <Select onValueChange={setTimeSlot} value={timeSlot}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a time slot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="09:00 - 10:00">09:00 AM - 10:00 AM</SelectItem>
                                        <SelectItem value="10:00 - 11:00">10:00 AM - 11:00 AM</SelectItem>
                                        <SelectItem value="11:00 - 12:00">11:00 AM - 12:00 PM</SelectItem>
                                        <SelectItem value="12:00 - 13:00">12:00 PM - 01:00 PM</SelectItem>
                                        <SelectItem value="13:00 - 14:00">01:00 PM - 02:00 PM</SelectItem>
                                        <SelectItem value="14:00 - 15:00">02:00 PM - 03:00 PM</SelectItem>
                                        <SelectItem value="15:00 - 16:00">03:00 PM - 04:00 PM</SelectItem>
                                        <SelectItem value="16:00 - 17:00">04:00 PM - 05:00 PM</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Number of Seats</Label>
                                <Select onValueChange={(val) => setSeatCount(parseInt(val))} value={seatCount.toString()}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select number of seats" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Seat</SelectItem>
                                        <SelectItem value="2">2 Seats</SelectItem>
                                        <SelectItem value="3">3 Seats</SelectItem>
                                        <SelectItem value="4">4 Seats</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBookingDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleConfirmBooking}>Confirm Booking</Button>
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
