
"use client";

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { MeetingRoom, Booking, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, differenceInMinutes, parse } from 'date-fns';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import BookingCalendar from '@/components/booking-calendar';
import type { EventInput, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import { ScrollArea } from '@/components/ui/scroll-area';

type EnrichedBooking = Booking & { userName?: string };

function MeetingRoomBookingComponent() {
    const router = useRouter();
    const { toast } = useToast();

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

    // Form State
    const [bookingDate, setBookingDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState<string>('');
    const [endTime, setEndTime] = useState<string>('');
    const [purpose, setPurpose] = useState('');
    const [participants, setParticipants] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchRooms = useCallback(async (orgId: string) => {
        setLoading(true);
        const { data, error } = await supabase.from('meeting_rooms').select('*').eq('org_id', orgId);
        if (error) {
            toast({ title: "Error", description: "Could not fetch meeting rooms.", variant: "destructive" });
        } else {
            const fetchedRooms = data as MeetingRoom[];
            setRooms(fetchedRooms);
            if (fetchedRooms.length > 0) {
                setSelectedRoom(fetchedRooms[0]);
            }
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        const initializePage = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user;
            if (currentUser) {
              const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', currentUser.id)
                .single();
              if (userData && userData.org_id) {
                setUser(userData);
                await fetchRooms(userData.org_id);
              } else {
                if (error) console.error("Error fetching user data:", error);
                setLoading(false);
                router.push('/login');
              }
            } else {
              setLoading(false);
              router.push('/login');
            }
        };

        initializePage();

        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
             if (event === 'SIGNED_IN' && session?.user) {
                  const fetchUserData = async () => {
                      const { data: user, error } = await supabase
                          .from('users')
                          .select('*')
                          .eq('id', session.user!.id)
                          .single();
                      if (user && user.org_id) {
                          setUser(user);
                          await fetchRooms(user.org_id);
                      }
                  };
                  fetchUserData();
              } else if (event === 'SIGNED_OUT') {
                  setUser(null);
                  setRooms([]);
                  setSelectedRoom(null);
                  setBookings([]);
                  setLoading(false);
                  router.push('/login');
              }
          }
        );
        return () => authListener.subscription.unsubscribe();
      }, []);

    const fetchBookingsAndUsers = useCallback(async () => {
        if (!selectedRoom) return;

        const { data: bookingsData, error: bookingsError } = await supabase
            .from('bookings')
            .select('*')
            .eq('space_id', selectedRoom.id)
            .neq('status', 'Cancelled');

        if (bookingsError) {
            console.error("Error fetching bookings", bookingsError);
            return;
        }

        const userIds = [...new Set(bookingsData.map(b => b.user_id).filter(Boolean))] as string[];
        const usersMap = new Map<string, string>();

        if (userIds.length > 0) {
            const { data: usersData, error: usersError } = await supabase
                .from('users')
                .select('id, full_name')
                .in('id', userIds);
            
            if (usersError) console.error("Error fetching users", usersError);
            else usersData?.forEach(u => usersMap.set(u.id, u.full_name));
        }

        const enrichedBookings = bookingsData.map(b => ({
            ...b,
            userName: usersMap.get(b.user_id || '') || 'A User'
        }));
        
        setBookings(enrichedBookings);
    }, [selectedRoom]);

    useEffect(() => {
        fetchBookingsAndUsers();
    
        if (!selectedRoom) return;
    
        const channel = supabase.channel(`bookings-room-${selectedRoom.id}`)
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bookings',
            filter: `space_id=eq.${selectedRoom.id}`
          }, (payload) => {
            console.log('Change received!', payload)
            // Refetch all bookings for simplicity
            fetchBookingsAndUsers();
          })
          .subscribe();
    
        return () => {
          supabase.removeChannel(channel);
        };
      }, [selectedRoom, fetchBookingsAndUsers]);


    const calendarEvents = useMemo((): EventInput[] => {
        const getColor = (status: Booking['status']) => {
            switch (status) {
                case 'Confirmed': return 'rgba(34, 197, 94, 0.8)';
                case 'Requires Approval': return 'rgba(59, 130, 246, 0.8)';
                default: return 'rgba(107, 114, 128, 0.8)';
            }
        };

        return bookings.map(booking => ({
            id: booking.id,
            title: `${booking.userName || 'User'}: ${booking.purpose || 'Booking'}`,
            start: `${booking.date}T${booking.start_time}`,
            end: `${booking.date}T${booking.end_time}`,
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
        if (!user || !selectedRoom || !bookingDate || !startTime || !endTime || !purpose) {
            toast({ title: "Missing Information", description: "Please fill all required fields.", variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        
        const newBookingStart = parse(startTime, 'HH:mm', bookingDate).getTime();
        const newBookingEnd = parse(endTime, 'HH:mm', bookingDate).getTime();


        const hasConflict = bookings.some(b => {
            if (b.status === 'Cancelled') return false; 
            const existingStart = parse(b.start_time, 'HH:mm:ss', new Date(b.date)).getTime();
            const existingEnd = parse(b.end_time, 'HH:mm:ss', new Date(b.date)).getTime();
            return newBookingStart < existingEnd && newBookingEnd > existingStart;
        });

        if (hasConflict) {
            setIsConflictDialogOpen(true);
            setIsSubmitting(false);
            return;
        }

        try {
            const { error } = await supabase.from('bookings').insert({
                org_id: user.org_id,
                user_id: user.id,
                space_id: selectedRoom.id,
                space_type: 'meetingRoom',
                date: format(bookingDate, 'yyyy-MM-dd'),
                start_time: startTime,
                end_time: endTime,
                status: 'Requires Approval',
                purpose,
                participants: participants.split(',').map(p => p.trim()).filter(Boolean),
                user_name: user.full_name,
                employee_id: user.employee_id || 'N/A',
                contact: user.mobile_number || 'N/A',
            });

            if (error) throw error;
            
            toast({ title: "Booking Submitted!", description: "Your request has been sent for approval." });
            setIsBookingDialogOpen(false);
        } catch (error: any) {
            console.error(error);
            toast({ title: "Submission Failed", description: error.message || "There was an error submitting your booking.", variant: "destructive" });
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
            case 'Cancelled':
                title = "Booking Cancelled";
                description = "This booking has been cancelled.";
                break;
            default:
                description = "This time slot has already been requested.";
        }

        return (
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {description}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-2 text-sm">
                    <p><strong>Purpose:</strong> {eventToShow.purpose}</p>
                    <p><strong>Time:</strong> {eventToShow.start_time} - {eventToShow.end_time}</p>
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
                        <ScrollArea className="h-[calc(100vh-200px)]">
                            <div className="space-y-2">
                                {rooms.map(room => (
                                    <div 
                                        key={room.id} 
                                        className={cn(
                                            "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                                            selectedRoom?.id === room.id ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                                        )}
                                        onClick={() => setSelectedRoom(room)}
                                    >
                                        <div>
                                            <p className="font-semibold">{room.name}</p>
                                            <p className="text-sm opacity-80">Capacity: {room.capacity}</p>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className={cn("hover:bg-primary/10", selectedRoom?.id === room.id && "hover:bg-primary/80")}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedRoom(room);
                                                setIsDetailsDialogOpen(true);
                                            }}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
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

            {/* Booking Dialog */}
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
            
            {/* Details Dialog */}
            {selectedRoom && (
                <AlertDialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{selectedRoom.name}</AlertDialogTitle>
                             <AlertDialogDescription>Capacity: {selectedRoom.capacity} people</AlertDialogDescription>
                        </AlertDialogHeader>
                         <img
                            src={selectedRoom.image_url || "https://placehold.co/600x400.png"}
                            alt={selectedRoom.name}
                            className="w-full h-auto rounded-lg object-cover"
                            data-ai-hint="meeting room"
                         />
                         <div className="mt-4">
                             <h3 className="font-semibold mb-2">Amenities</h3>
                             <ul className="list-disc list-inside text-muted-foreground">
                                 {selectedRoom.amenities?.map(a => <li key={a}>{a}</li>)}
                             </ul>
                         </div>
                        <AlertDialogFooter>
                            <AlertDialogAction onClick={() => setIsDetailsDialogOpen(false)}>Close</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}

            {/* Info Dialog */}
            {eventToShow && (
                <AlertDialog open={isInfoDialogOpen} onOpenChange={() => {setIsInfoDialogOpen(false); setEventToShow(null)}}>
                    <InfoDialogContent />
                </AlertDialog>
            )}

             {/* Conflict Dialog */}
             <AlertDialog open={isConflictDialogOpen} onOpenChange={setIsConflictDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Booking Conflict</AlertDialogTitle>
                        <AlertDialogDescription>
                           This time slot overlaps with an existing confirmed booking. Please choose a different time.
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

    