"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, X } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { Booking } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';

type EnrichedBooking = Booking & { userName: string, spaceName: string };

export default function ApproveBookingPage() {
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);

    // This would fetch real data in a production app
    useEffect(() => {
        // Mock data fetching
        const fetchBookings = async (orgId: string) => {
            // In a real app, you would fetch bookings from Firestore
            // For now, we use an empty array
            setBookings([]);
        };
        
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
                            <BookingTable title="Pending Bookings" bookings={pendingBookings} showActions={true} />
                        </TabsContent>
                        <TabsContent value="approved" className="mt-4">
                            <BookingTable title="Approved Bookings" bookings={approvedBookings} showActions={false} />
                        </TabsContent>
                    </Tabs>
                </CardHeader>
            </Card>
        </div>
    );
}

function BookingTable({ title, bookings, showActions }: { title: string, bookings: EnrichedBooking[], showActions: boolean }) {
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
                        {bookings.length > 0 ? (
                            bookings.map(booking => (
                                <TableRow key={booking.id}>
                                    <TableCell>{booking.userName}</TableCell>
                                    <TableCell>{booking.spaceName}</TableCell>
                                    <TableCell>{booking.date}</TableCell>
                                    <TableCell>{booking.startTime} - {booking.endTime}</TableCell>
                                    {showActions && (
                                        <TableCell className="flex gap-2">
                                            <Button variant="outline" size="icon"><Check className="h-4 w-4 text-green-600" /></Button>
                                            <Button variant="outline" size="icon"><X className="h-4 w-4 text-red-600" /></Button>
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
