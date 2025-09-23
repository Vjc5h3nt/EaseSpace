"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from 'lucide-react';
import type { Booking, User, MeetingRoom, Cafeteria } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';
import { useRouter } from 'next/navigation';


type EnrichedBooking = Booking & { user_name: string, space_name: string };

export default function ApproveBookingPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [conflictError, setConflictError] = useState<string | null>(null);


    const fetchBookings = useCallback(async (currentOrgId: string) => {
        setLoading(true);
        try {
            const { data: bookingsData, error: bookingsError } = await supabase
                .from('bookings')
                .select(`
                    *,
                    users (full_name)
                `)
                .eq('org_id', currentOrgId)
                .in('status', ['Requires Approval', 'Confirmed', 'Cancelled']);

            if (bookingsError) throw bookingsError;
            
            if (!bookingsData) {
                setBookings([]);
                setLoading(false);
                return;
            }
            
            const spaceIds = [...new Set(bookingsData.map(b => b.space_id))];
            const spacesMap = new Map<string, string>();

            if (spaceIds.length > 0) {
                const { data: cafeteriasData, error: cafeError } = await supabase.from('cafeterias').select('id, name').in('id', spaceIds);
                if(cafeError) throw cafeError;
                cafeteriasData?.forEach(c => spacesMap.set(c.id, c.name));

                const { data: meetingRoomsData, error: roomError } = await supabase.from('meeting_rooms').select('id, name').in('id', spaceIds);
                if(roomError) throw roomError;
                meetingRoomsData?.forEach(r => spacesMap.set(r.id, r.name));
            }
            
            const enrichedBookings = bookingsData.map(b => {
                const booking = b as any;
                return {
                    ...booking,
                    user_name: booking.users?.full_name || 'Unknown User',
                    space_name: spacesMap.get(booking.space_id) || 'Unknown Space'
                }
            });

            setBookings(enrichedBookings);

        } catch (error: any) {
            console.error(error);
            toast({ title: 'Error', description: error.message || 'Failed to fetch bookings.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const initializePage = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { data: user, error } = await supabase
                .from('users')
                .select('org_id')
                .eq('id', session.user.id)
                .limit(1)
                .maybeSingle();

              if (error) {
                console.error("Error fetching user data:", error);
                toast({title: "Error", description: "Could not fetch user data. Please relogin.", variant: "destructive"});
                setLoading(false);
                router.push('/login');
                return;
              }
              
              if (user?.org_id) {
                setOrgId(user.org_id);
                await fetchBookings(user.org_id);
              } else if (!user) {
                setLoading(true);
              } else {
                setLoading(false);
                toast({title: "Error", description: "User organization not found. Please relogin.", variant: "destructive"});
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
             if (event === 'SIGNED_OUT') {
                  router.push('/login');
              }
          }
        );
        return () => authListener.subscription.unsubscribe();
    }, [router, toast, fetchBookings]);

    const handleBookingAction = async (booking: EnrichedBooking, newStatus: 'Confirmed' | 'Cancelled') => {
        if (!orgId) return;
        
        if (newStatus === 'Cancelled') {
            const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
            if (error) {
                toast({ title: 'Error', description: error.message, variant: 'destructive' });
            } else {
                toast({ title: 'Success', description: `Booking has been rejected.` });
                fetchBookings(orgId);
            }
            return;
        }

        // Conflict check for 'Confirmed'
        const { data: existingBookings, error: conflictError } = await supabase
            .from('bookings')
            .select('*')
            .eq('space_id', booking.space_id)
            .eq('date', booking.date)
            .eq('status', 'Confirmed');

        if (conflictError) {
             toast({ title: 'Error', description: 'Could not check for booking conflicts.', variant: 'destructive' });
             return;
        }
       
        if (existingBookings) {
             const newBookingStart = new Date(`${booking.date}T${booking.start_time}`).getTime();
            const newBookingEnd = new Date(`${booking.date}T${booking.end_time}`).getTime();

            for (const existingBooking of existingBookings) {
                const existingStart = new Date(`${existingBooking.date}T${existingBooking.start_time}`).getTime();
                const existingEnd = new Date(`${existingBooking.date}T${existingBooking.end_time}`).getTime();

                if (newBookingStart < existingEnd && newBookingEnd > existingStart) {
                    setConflictError(`This booking overlaps with a confirmed booking from ${existingBooking.start_time} to ${existingBooking.end_time}. Please reject this request.`);
                    return; 
                }
            }
        }
        
        try {
            const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', booking.id);
            if (error) throw error;

            toast({ title: 'Success', description: `Booking has been ${newStatus.toLowerCase()}.` });
            fetchBookings(orgId); // Refresh bookings
        } catch (error: any) {
            console.error(`Error updating booking:`, error);
            toast({ title: 'Error', description: error.message || 'Failed to update booking status.', variant: 'destructive' });
        }
    };

    const pendingBookings = bookings.filter(b => b.status === 'Requires Approval');
    const confirmedBookings = bookings.filter(b => b.status === 'Confirmed');
    const rejectedBookings = bookings.filter(b => b.status === 'Cancelled');


    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">Approve Bookings</h1>
                <p className="text-neutral-600 mt-1">Review and manage meeting room booking requests.</p>
            </header>
            <Card>
                <CardHeader>
                    <Tabs defaultValue="pending">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
                            <TabsTrigger value="approved">Approved</TabsTrigger>
                            <TabsTrigger value="rejected">Rejected</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-4">
                            <BookingTable title="Pending Bookings" bookings={pendingBookings} onAction={handleBookingAction} showActions={true} loading={loading} />
                        </TabsContent>
                        <TabsContent value="approved" className="mt-4">
                            <BookingTable title="Approved Bookings" bookings={confirmedBookings} onAction={handleBookingAction} showActions={false} loading={loading} />
                        </TabsContent>
                        <TabsContent value="rejected" className="mt-4">
                            <BookingTable title="Rejected Bookings" bookings={rejectedBookings} onAction={handleBookingAction} showActions={false} loading={loading} />
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>
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

interface BookingTableProps {
    title: string;
    bookings: EnrichedBooking[];
    showActions: boolean;
    onAction: (booking: EnrichedBooking, status: 'Confirmed' | 'Cancelled') => void;
    loading: boolean;
}

function BookingTable({ title, bookings, showActions, onAction, loading }: BookingTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Space</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            {showActions && <TableHead>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                             <TableRow>
                                <TableCell colSpan={showActions ? 5 : 4} className="h-24 text-center">
                                    Loading bookings...
                                </TableCell>
                            </TableRow>
                        ) : bookings.length > 0 ? (
                            bookings.map(booking => (
                                <TableRow key={booking.id}>
                                    <TableCell>{booking.user_name}</TableCell>
                                    <TableCell>{booking.space_name}</TableCell>
                                    <TableCell>{booking.date}</TableCell>
                                    <TableCell>{booking.start_time} - {booking.end_time}</TableCell>
                                    {showActions && (
                                        <TableCell className="flex gap-2">
                                            <Button variant="outline" size="icon" onClick={() => onAction(booking, 'Confirmed')}><Check className="h-4 w-4 text-green-600" /></Button>
                                            <Button variant="outline" size="icon" onClick={() => onAction(booking, 'Cancelled')}><X className="h-4 w-4 text-red-600" /></Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={showActions ? 5 : 4} className="h-24 text-center">
                                    No bookings found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
