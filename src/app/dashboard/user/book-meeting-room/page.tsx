
"use client";

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { MeetingRoom, Booking, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar as CalendarIcon, Clock, Users, Briefcase, User as UserIcon, Building, Phone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, differenceInHours } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onAuthStateChanged } from 'firebase/auth';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';


function MeetingRoomBookingComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get('id');
    const { toast } = useToast();

    const [room, setRoom] = useState<MeetingRoom | null>(null);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // Form State
    const [bookingDate, setBookingDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [duration, setDuration] = useState('');
    const [participants, setParticipants] = useState('');
    const [purpose, setPurpose] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Conflict state
    const [conflictError, setConflictError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUser(userDocSnap.data() as User);
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!roomId) {
            router.push('/dashboard/user');
            return;
        }

        const fetchMeetingRoom = async () => {
            setLoading(true);
            const docRef = doc(db, "meetingRooms", roomId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setRoom({ id: docSnap.id, ...docSnap.data() } as MeetingRoom);
            } else {
                toast({ title: "Error", description: "Meeting room not found.", variant: "destructive" });
                router.push('/dashboard/user');
            }
            setLoading(false);
        };

        fetchMeetingRoom();
    }, [roomId, router, toast]);

    useEffect(() => {
        if (startTime && endTime) {
            const start = new Date(`1970-01-01T${startTime}`);
            const end = new Date(`1970-01-01T${endTime}`);
            if (end > start) {
                const hours = differenceInHours(end, start);
                setDuration(`${hours} hour(s)`);
            } else {
                setDuration('');
            }
        }
    }, [startTime, endTime]);

    const timeOptions = Array.from({ length: 10 }, (_, i) => {
        const hour = i + 9; // 9 AM to 6 PM (18:00)
        return `${hour.toString().padStart(2, '0')}:00`;
    });
    
    const checkForConflicts = async (): Promise<boolean> => {
        if (!roomId || !bookingDate || !startTime || !endTime) return false;

        const q = query(
            collection(db, 'bookings'),
            where('spaceId', '==', roomId),
            where('date', '==', format(bookingDate, 'yyyy-MM-dd')),
            where('status', '==', 'Confirmed')
        );

        const querySnapshot = await getDocs(q);
        const existingBookings = querySnapshot.docs.map(doc => doc.data() as Booking);

        const newBookingStart = new Date(`${format(bookingDate, 'yyyy-MM-dd')}T${startTime}`).getTime();
        const newBookingEnd = new Date(`${format(bookingDate, 'yyyy-MM-dd')}T${endTime}`).getTime();

        for (const booking of existingBookings) {
            const existingStart = new Date(`${booking.date}T${booking.startTime}`).getTime();
            const existingEnd = new Date(`${booking.date}T${booking.endTime}`).getTime();

            if (newBookingStart < existingEnd && newBookingEnd > existingStart) {
                setConflictError(`An existing booking exists from ${booking.startTime} to ${booking.endTime}. Please select a different time.`);
                return true; // Conflict found
            }
        }
        return false; // No conflict
    };

    const handleSubmitBooking = async () => {
        if (!user || !roomId || !bookingDate || !startTime || !endTime || !purpose) {
            toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        
        if (await checkForConflicts()) {
            setIsSubmitting(false);
            return; // Stop submission if conflict exists
        }
        
        try {
            const newBooking = {
                org_id: user.org_id,
                userId: user.uid,
                spaceId: roomId,
                spaceType: 'meetingRoom',
                date: format(bookingDate, 'yyyy-MM-dd'),
                startTime,
                endTime,
                status: 'Requires Approval',
                purpose,
                participants: participants.split(',').map(p => p.trim()).filter(Boolean),
                userName: user.fullName,
                employeeId: user.employeeId || 'N/A',
                contact: user.mobileNumber || 'N/A',
                createdAt: serverTimestamp() as Timestamp,
            };

            await addDoc(collection(db, 'bookings'), newBooking);
            toast({ title: "Booking Submitted!", description: "Your request has been sent for approval." });
            router.push('/dashboard/user/my-bookings');

        } catch (error) {
            console.error(error);
            toast({ title: "Submission Failed", description: "There was an error submitting your booking.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };


    if (loading) return <div className="flex justify-center items-center h-full">Loading...</div>;
    if (!room) return <div className="flex justify-center items-center h-full">Could not load meeting room.</div>;

    return (
        <div className="p-8">
            <Button variant="outline" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
            </Button>
            <div className="grid md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-2xl">{room.name}</CardTitle>
                            <CardDescription>
                                Capacity: {room.capacity} people
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                           <img
                                src={room.imageUrl || "https://placehold.co/600x400.png"}
                                alt={room.name}
                                className="w-full h-auto rounded-lg object-cover"
                                data-ai-hint="meeting room"
                           />
                           <div className="mt-4">
                                <h3 className="font-semibold mb-2">Amenities</h3>
                               <ul className="list-disc list-inside text-muted-foreground">
                                   {room.amenities.map(a => <li key={a}>{a}</li>)}
                               </ul>
                           </div>
                        </CardContent>
                    </Card>
                </div>
                 <div className="md:col-span-1">
                    <Card>
                         <CardHeader>
                             <CardTitle>Book this Room</CardTitle>
                         </CardHeader>
                         <CardContent className="space-y-4">
                            <div>
                                <Label>Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !bookingDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {bookingDate ? format(bookingDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <Calendar mode="single" selected={bookingDate} onSelect={setBookingDate} initialFocus />
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>From</Label>
                                    <Select onValueChange={setStartTime} value={startTime}>
                                        <SelectTrigger><SelectValue placeholder="Start" /></SelectTrigger>
                                        <SelectContent>
                                            {timeOptions.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                 <div>
                                    <Label>To</Label>
                                    <Select onValueChange={setEndTime} value={endTime}>
                                        <SelectTrigger><SelectValue placeholder="End" /></SelectTrigger>
                                        <SelectContent>
                                            {timeOptions.map(t => <SelectItem key={t} value={t} disabled={startTime >= t}>{t}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            {duration && <div className="text-sm text-muted-foreground">Duration: {duration}</div>}

                            <div>
                                <Label htmlFor="purpose">Purpose of Booking</Label>
                                <Textarea id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g., Weekly Team Sync" />
                            </div>

                            <div>
                                <Label htmlFor="participants">Participants (comma-separated, optional)</Label>
                                <Input id="participants" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="e.g., John Doe, Jane Smith" />
                            </div>
                            
                             <div className="border p-4 rounded-md bg-muted/50 space-y-2">
                                <h4 className="font-semibold text-sm">Your Information</h4>
                                <p className="flex items-center text-sm"><UserIcon className="mr-2 h-4 w-4 text-muted-foreground" />{user?.fullName}</p>
                                <p className="flex items-center text-sm"><Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />Employee ID: {user?.employeeId || 'N/A'}</p>
                                <p className="flex items-center text-sm"><Phone className="mr-2 h-4 w-4 text-muted-foreground" />Contact: {user?.mobileNumber || 'N/A'}</p>
                             </div>

                             <Button className="w-full" onClick={handleSubmitBooking} disabled={isSubmitting}>
                                {isSubmitting ? 'Submitting...' : 'Submit Booking'}
                             </Button>
                         </CardContent>
                    </Card>
                </div>
            </div>
             <AlertDialog open={!!conflictError} onOpenChange={() => setConflictError(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Booking Conflict</AlertDialogTitle>
                        <AlertDialogDescription>
                           {conflictError}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setConflictError(null)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function MeetingRoomBookingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <MeetingRoomBookingComponent />
        </Suspense>
    )
}
