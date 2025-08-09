"use client";

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { MeetingRoom } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Calendar, Clock, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

function MeetingRoomBookingComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomId = searchParams.get('id');
    const { toast } = useToast();

    const [room, setRoom] = useState<MeetingRoom | null>(null);
    const [loading, setLoading] = useState(true);

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
                            {/* Booking form will go here */}
                             <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-lg">
                                 <p className="text-muted-foreground">Booking Calendar Coming Soon</p>
                             </div>
                             <Button className="w-full" disabled>Select Date & Time</Button>
                         </CardContent>
                    </Card>
                </div>
            </div>
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
