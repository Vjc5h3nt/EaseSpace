
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Booking, User, MeetingRoom, Cafeteria } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from '@/components/ui/alert-dialog';


type EnrichedBooking = Booking & { userName: string, spaceName: string };

export default function ApproveBookingPage() {
    const { toast } = useToast();
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [conflictError, setConflictError] = useState<string | null>(null);


    const fetchBookings = async (orgId: string) => {
        setLoading(true);
        try {
            const bookingsQuery = query(
                collection(db, 'bookings'), 
                where('org_id', '==', orgId),
                where('status', 'in', ['Requires Approval', 'Confirmed', 'Cancelled'])
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            
            if (bookingsSnap.empty) {
                setBookings([]);
                setLoading(false);
                return;
            }

            const userIds = [...new Set(bookingsSnap.docs.map(d => d.data().userId))];
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIds.length ? userIds : ['dummy']));
            const usersSnap = await getDocs(usersQuery);
            const usersMap = new Map(usersSnap.docs.map(d => [d.data().uid, d.data() as User]));

            const spacesMap = new Map<string, string>();
            const cafeteriaQuery = query(collection(db, 'cafeterias'), where('org_id', '==', orgId));
            const meetingRoomQuery = query(collection(db, 'meetingRooms'), where('org_id', '==', orgId));
            const [cafeteriaSnap, meetingRoomSnap] = await Promise.all([getDocs(cafeteriaQuery), getDocs(meetingRoomQuery)]);
            cafeteriaSnap.forEach(doc => spacesMap.set(doc.id, doc.data().name));
            meetingRoomSnap.forEach(doc => spacesMap.set(doc.id, doc.data().name));
            
            const enrichedBookings = bookingsSnap.docs.map(doc => {
                const bookingData = { id: doc.id, ...doc.data() } as Booking;
                return {
                    ...bookingData,
                    userName: usersMap.get(bookingData.userId)?.fullName || 'Unknown User',
                    spaceName: spacesMap.get(bookingData.spaceId) || 'Unknown Space'
                }
            });

            setBookings(enrichedBookings);

        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'Failed to fetch bookings.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const adminUserDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
                if (!adminUserDoc.empty) {
                    const adminOrgId = adminUserDoc.docs[0].data().org_id;
                    setOrgId(adminOrgId);
                    fetchBookings(adminOrgId);
                }
            } else {
                setLoading(false);
            }
        });
        
        return () => unsubscribe();
    }, []);

    const handleBookingAction = async (booking: EnrichedBooking, newStatus: 'Confirmed' | 'Cancelled') => {
        if (newStatus === 'Cancelled') {
            const bookingRef = doc(db, 'bookings', booking.id);
            await updateDoc(bookingRef, { status: newStatus });
            toast({ title: 'Success', description: `Booking has been rejected.` });
            if(orgId) fetchBookings(orgId);
            return;
        }

        // Conflict check for 'Confirmed'
        const q = query(
            collection(db, 'bookings'),
            where('spaceId', '==', booking.spaceId),
            where('date', '==', booking.date),
            where('status', '==', 'Confirmed')
        );

        const querySnapshot = await getDocs(q);
        const existingBookings = querySnapshot.docs.map(doc => doc.data() as Booking);

        const newBookingStart = new Date(`${booking.date}T${booking.startTime}`).getTime();
        const newBookingEnd = new Date(`${booking.date}T${booking.endTime}`).getTime();

        for (const existingBooking of existingBookings) {
            const existingStart = new Date(`${existingBooking.date}T${existingBooking.startTime}`).getTime();
            const existingEnd = new Date(`${existingBooking.date}T${existingBooking.endTime}`).getTime();

            if (newBookingStart < existingEnd && newBookingEnd > existingStart) {
                setConflictError(`This booking overlaps with a confirmed booking from ${existingBooking.startTime} to ${existingBooking.endTime}. Please reject this request.`);
                return; 
            }
        }
        
        try {
            const bookingRef = doc(db, 'bookings', booking.id);
            await updateDoc(bookingRef, { status: newStatus });
            toast({ title: 'Success', description: `Booking has been ${newStatus.toLowerCase()}.` });
            if(orgId) fetchBookings(orgId); // Refresh bookings
        } catch (error) {
            console.error(`Error updating booking:`, error);
            toast({ title: 'Error', description: 'Failed to update booking status.', variant: 'destructive' });
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
                                    <TableCell>{booking.userName}</TableCell>
                                    <TableCell>{booking.spaceName}</TableCell>
                                    <TableCell>{booking.date}</TableCell>
                                    <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
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
