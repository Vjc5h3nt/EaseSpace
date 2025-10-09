
"use client";

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { doc, getDoc, collection, addDoc, query, where, getDocs, serverTimestamp, Timestamp, onSnapshot } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { MeetingRoom, Booking, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, differenceInMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { onAuthStateChanged } from 'firebase/auth';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import BookingCalendar from '@/components/booking-calendar';
import type { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';


type EnrichedBooking = Booking & { userName?: string };

function MeetingRoomBookingComponent() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = useAuth();
    const db = useFirestore();

    const [rooms, setRooms] = useState<MeetingRoom[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<MeetingRoom | null>(null);
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    // Dialog States
    const [isBookingDialogOpen, setIsBookingDialogOpen] = useState(false);
    const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
    const [isConflictDialogOpen, setIsConflictDialogOpen] = useState(false);
    const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);
    const [eventToShow, setEventToShow] = useState<EnrichedBooking | null>(null);
    const [roomForDetails, setRoomForDetails] = useState<MeetingRoom | null>(null);

    // Form State
    const [bookingDate, setBookingDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [purpose, setPurpose] = useState('');
    const [participants, setParticipants] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);


    useEffect(() => {
        if (!auth) return;
        const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && db) {
                const userDocRef = doc(db, 'users', currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as User;
                    setUser(userData);
                    fetchRooms(userData.org_id);
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
        });
        return () => unsubscribeAuth();
    }, [router, auth, db]);

    const fetchRooms = async (orgId: string) => {
        if (!db) return;
        setLoading(true);
        const roomsQuery = query(collection(db, "meetingRooms"), where("org_id", "==", orgId));
        const roomsSnapshot = await getDocs(roomsQuery);
        const fetchedRooms = roomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRoom));
        setRooms(fetchedRooms);
        if (fetchedRooms.length > 0) {
            setSelectedRoom(fetchedRooms[0]);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (!selectedRoom || !db) return;

        const bookingsQuery = query(collection(db, "bookings"), where("spaceId", "==", selectedRoom.id));
        const unsubscribeBookings = onSnapshot(bookingsQuery, async (snapshot) => {
            const userIds = [...new Set(snapshot.docs.map(d => d.data().userId))];
            const usersMap = new Map<string, string>();
            if (userIds.length > 0 && db) {
                 const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIds));
                 const usersSnap = await getDocs(usersQuery);
                 usersSnap.forEach(doc => {
                     const userData = doc.data() as User;
                     usersMap.set(userData.uid, userData.fullName);
                 });
            }

            const fetchedBookings = snapshot.docs
                .map(doc => {
                    const bookingData = { id: doc.id, ...doc.data() } as Booking;
                    return {
                        ...bookingData,
                        userName: usersMap.get(bookingData.userId) || 'A User'
                    }
                })
                .filter(booking => booking.status !== 'Cancelled'); // Exclude cancelled bookings from the list
            setBookings(fetchedBookings);
        });

        return () => unsubscribeBookings();
    }, [selectedRoom, db]);

    const calendarEvents = useMemo((): EventInput[] => {
        const getColor = (status: Booking['status']) => {
            switch (status) {
                case 'Confirmed': return '#10B981'; // Green-500
                case 'Requires Approval': return '#3B82F6'; // Blue-500
                default: return '#6B7280'; // Gray-500
            }
        };

        return bookings.map(booking => ({
            id: booking.id,
            title: `${booking.userName || 'User'}: ${booking.purpose || 'Booking'}`,
            start: `${booking.date}T${booking.startTime}`,
            end: `${booking.date}T${booking.endTime}`,
            backgroundColor: getColor(booking.status),
            borderColor: getColor(booking.status),
            textColor: '#ffffff',
            extendedProps: booking
        }));
    }, [bookings]);
    
    const timeOptions = Array.from({ length: 13 }, (_, i) => { // 7 AM to 7 PM
        const hour = i + 7;
        return `${hour.toString().padStart(2, '0')}:00`;
    });

    const handleDateSelect = (selectInfo: DateSelectArg) => {
        const calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();
        
        if (selectInfo.view.type === 'dayGridMonth') {
            toast({ title: "Action Not Allowed", description: "Please select a specific time slot in the week or day view to book.", variant: "destructive" });
            return;
        }

        const durationMinutes = differenceInMinutes(selectInfo.end, selectInfo.start);
        if (durationMinutes > 180) { // 3 hours = 180 minutes
            toast({ title: "Booking Limit Exceeded", description: "You cannot book a room for more than 3 hours at a time.", variant: "destructive" });
            return;
        }

        const today = new Date();
        today.setHours(0,0,0,0);
        if(selectInfo.start < today){
             toast({ title: "Invalid Date", description: "You cannot book a room on a past date.", variant: "destructive" });
            return;
        }

        setBookingDate(selectInfo.start);
        setStartTime(format(selectInfo.start, 'HH:mm'));
        setEndTime(format(selectInfo.end, 'HH:mm'));
        setIsBookingDialogOpen(true);
    };

    const handleEventClick = (clickInfo: EventClickArg) => {
        const booking = clickInfo.event.extendedProps as EnrichedBooking;
        setEventToShow(booking);
        setIsInfoDialogOpen(true);
    };

    const handleSubmitBooking = async () => {
        if (!user || !selectedRoom || !bookingDate || !startTime || !endTime || !purpose || !db) {
            toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        const newBookingStart = new Date(`${format(bookingDate, 'yyyy-MM-dd')}T${startTime}`).getTime();
        const newBookingEnd = new Date(`${format(bookingDate, 'yyyy-MM-dd')}T${endTime}`).getTime();

        const hasConflict = bookings.some(b => {
            if (b.status === 'Cancelled') return false; 
            const existingStart = new Date(`${b.date}T${b.startTime}`).getTime();
            const existingEnd = new Date(`${b.date}T${b.endTime}`).getTime();
            return newBookingStart < existingEnd && newBookingEnd > existingStart;
        });

        if (hasConflict) {
            setIsConflictDialogOpen(true);
            setIsSubmitting(false);
            return;
        }

        try {
            const newBooking: Partial<EnrichedBooking> = {
                org_id: user.org_id,
                userId: user.uid,
                spaceId: selectedRoom.id,
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
            setIsBookingDialogOpen(false);
        } catch (error) {
            console.error(error);
            toast({ title: "Submission Failed", description: "There was an error submitting your booking.", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (loading || !user) return <div className="flex justify-center items-center h-screen">Loading...</div>;

    const InfoDialogContent = () => {
        if (!eventToShow) return null;

        let title = "Booking Details";
        let description = "";

        switch (eventToShow.status) {
            case 'Confirmed':
                title = "Slot Booked";
                description = `This slot is booked by ${eventToShow.userName || 'a user'}.`;
                break;
            case 'Requires Approval':
                title = "Booking Request Pending";
                description = `This slot is requested by ${eventToShow.userName || 'a user'} and is pending approval.`;
                break;
            default:
                description = "This time slot has already been requested.";
        }

        return (
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 text-sm">
                    <p><strong>Purpose:</strong> {eventToShow.purpose}</p>
                    <p><strong>Time:</strong> {eventToShow.startTime} - {eventToShow.endTime}</p>
                </div>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => {setIsInfoDialogOpen(false); setEventToShow(null)}}>OK</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        );
    };

    return (
        <div className="flex h-screen bg-background">
            <aside className="w-80 border-r p-4 flex flex-col gap-4">
                <Button variant="outline" onClick={() => router.back()} className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Spaces
                </Button>
                <Card>
                    <CardHeader>
                        <CardTitle>Meeting Rooms</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[calc(100vh-12rem)]">
                            <div className="space-y-2 pr-4">
                                {rooms.map(room => (
                                    <div 
                                        key={room.id} 
                                        className={cn(
                                            "p-3 rounded-lg border cursor-pointer transition-all shadow-sm hover:shadow-md",
                                            selectedRoom?.id === room.id ? "bg-primary text-primary-foreground shadow-lg" : "bg-card hover:bg-accent"
                                        )}
                                        onClick={() => setSelectedRoom(room)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold">{room.name}</p>
                                                <p className={cn("text-sm", selectedRoom?.id === room.id ? "text-primary-foreground/80" : "text-muted-foreground")}>Capacity: {room.capacity}</p>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className={cn("h-8 w-8", selectedRoom?.id === room.id ? "hover:bg-primary/80" : "hover:bg-accent")}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setRoomForDetails(room);
                                                    setIsDetailsDialogOpen(true);
                                                }}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            </aside>
            <main className="flex-1 p-6 overflow-hidden">
                {selectedRoom ? (
                    <div className="h-full">
                        <BookingCalendar
                            events={calendarEvents}
                            onDateSelect={handleDateSelect}
                            onEventClick={handleEventClick}
                        />
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                        <p>Select a meeting room to view its schedule.</p>
                    </div>
                )}
            </main>

            <AlertDialog open={isBookingDialogOpen} onOpenChange={setIsBookingDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Book {selectedRoom?.name}</AlertDialogTitle>
                        <AlertDialogDescription>
                            Please confirm the details for your booking request. Bookings cannot exceed 3 hours.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
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
                        <div>
                            <Label htmlFor="purpose">Purpose of Booking</Label>
                            <Textarea id="purpose" value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g., Weekly Team Sync" />
                        </div>
                        <div>
                            <Label htmlFor="participants">Participants (comma-separated)</Label>
                            <Input id="participants" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="e.g., John Doe, Jane Smith" />
                        </div>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSubmitBooking} disabled={isSubmitting}>
                            {isSubmitting ? 'Submitting...' : 'Submit Booking'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
             <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                {roomForDetails && (
                    <DialogContent className="sm:max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>{roomForDetails.name}</DialogTitle>
                             <DialogDescription>Capacity: {roomForDetails.capacity} people</DialogDescription>
                        </DialogHeader>
                        <div className="my-4">
                            <Carousel className="w-full max-w-lg mx-auto">
                                <CarouselContent>
                                    {roomForDetails.imageUrls && roomForDetails.imageUrls.length > 0 ? (
                                        roomForDetails.imageUrls.map((url, index) => (
                                            <CarouselItem key={index}>
                                                <div className="p-1">
                                                    <Card>
                                                        <CardContent className="flex aspect-video items-center justify-center p-0">
                                                            <Image
                                                                src={url}
                                                                alt={`${roomForDetails.name} image ${index + 1}`}
                                                                width={600}
                                                                height={400}
                                                                className="rounded-lg object-cover w-full h-full"
                                                            />
                                                        </CardContent>
                                                    </Card>
                                                </div>
                                            </CarouselItem>
                                        ))
                                    ) : (
                                        <CarouselItem>
                                             <div className="p-1">
                                                <Card>
                                                    <CardContent className="flex aspect-video items-center justify-center p-6 bg-muted rounded-lg">
                                                        <span className="text-muted-foreground">No Image Available</span>
                                                    </CardContent>
                                                </Card>
                                            </div>
                                        </CarouselItem>
                                    )}
                                </CarouselContent>
                                <CarouselPrevious />
                                <CarouselNext />
                            </Carousel>
                        </div>
                         <div className="mt-4">
                             <h3 className="font-semibold mb-2">Amenities</h3>
                             <div className="flex flex-wrap gap-2">
                                 {roomForDetails.amenities.map(a => (
                                     <Badge key={a} variant="secondary">{a}</Badge>
                                 ))}
                             </div>
                         </div>
                    </DialogContent>
                )}
            </Dialog>

            {eventToShow && (
                <AlertDialog open={isInfoDialogOpen} onOpenChange={() => {setIsInfoDialogOpen(false); setEventToShow(null)}}>
                    <InfoDialogContent />
                </AlertDialog>
            )}

             <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Booking Conflict</AlertDialogTitle>
                        <AlertDialogDescription>
                           This time slot overlaps with an existing booking. Please choose a different time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogAction onClick={() => setIsConflictDialogOpen(false)}>OK</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default function MeetingRoomBookingPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
            <MeetingRoomBookingComponent />
        </Suspense>
    )
}

    