
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

type EnrichedBooking = Booking & { userName: string, spaceName: string };

export default function ApproveBookingPage() {
    const { toast } = useToast();
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async (orgId: string) => {
        setLoading(true);
        try {
            const bookingsQuery = query(
                collection(db, 'bookings'), 
                where('org_id', '==', orgId),
                where('status', 'in', ['Requires Approval', 'Confirmed'])
            );
            const bookingsSnap = await getDocs(bookingsQuery);
            
            if (bookingsSnap.empty) {
                setBookings([]);
                setLoading(false);
                return;
            }

            // Get all user and space info needed for enrichment
            const userIds = [...new Set(bookingsSnap.docs.map(d => d.data().userId))];
            const spaceIds = [...new Set(bookingsSnap.docs.map(d => d.data().spaceId))];

            const usersQuery = query(collection(db, 'users'), where('uid', 'in', userIds));
            const usersSnap = await getDocs(usersQuery);
            const usersMap = new Map(usersSnap.docs.map(d => [d.id, d.data() as User]));

            const spacesMap = new Map<string, string>();
            // Fetch from both cafeterias and meeting rooms
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
            }
        });
        
        return () => unsubscribe();
    }, []);

    const handleBookingAction = async (bookingId: string, newStatus: 'Confirmed' | 'Cancelled') => {
        try {
            const bookingRef = doc(db, 'bookings', bookingId);
            await updateDoc(bookingRef, { status: newStatus });
            toast({ title: 'Success', description: `Booking has been ${newStatus.toLowerCase()}.` });
            if(orgId) fetchBookings(orgId); // Refresh bookings
        } catch (error) {
            console.error(`Error updating booking:`, error);
            toast({ title: 'Error', description: 'Failed to update booking status.', variant: 'destructive' });
        }
    };

    const pendingBookings = bookings.filter(b => b.status === 'Requires Approval');
    const approvedBookings = bookings.filter(b => b.status === 'Confirmed');

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">Approve Bookings</h1>
                <p className="text-neutral-600 mt-1">Review and manage meeting room booking requests.</p>
            </header>
            <Card>
                <CardHeader>
                    <Tabs defaultValue="pending">
                        <TabsList>
                            <TabsTrigger value="pending">Pending Approval</TabsTrigger>
                            <TabsTrigger value="approved">Approved</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-4">
                            <BookingTable title="Pending Bookings" bookings={pendingBookings} onAction={handleBookingAction} showActions={true} loading={loading} />
                        </TabsContent>
                        <TabsContent value="approved" className="mt-4">
                            <BookingTable title="Approved Bookings" bookings={approvedBookings} onAction={handleBookingAction} showActions={false} loading={loading} />
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>
        </div>
    );
}

interface BookingTableProps {
    title: string;
    bookings: EnrichedBooking[];
    showActions: boolean;
    onAction: (bookingId: string, status: 'Confirmed' | 'Cancelled') => void;
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
                                            <Button variant="outline" size="icon" onClick={() => onAction(booking.id, 'Confirmed')}><Check className="h-4 w-4 text-green-600" /></Button>
                                            <Button variant="outline" size="icon" onClick={() => onAction(booking.id, 'Cancelled')}><X className="h-4 w-4 text-red-600" /></Button>
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

    