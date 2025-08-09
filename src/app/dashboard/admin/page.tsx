"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Pencil, Utensils, Building } from "lucide-react";
import type { Booking, Cafeteria, MeetingRoom } from "@/lib/types";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CafeteriaLayoutEditor } from "@/components/cafeteria-layout-editor";

const peakHoursData = [
  { name: '8AM', value: 40 },
  { name: '10AM', value: 60 },
  { name: '12PM', value: 80 },
  { name: '2PM', value: 100 },
  { name: '4PM', value: 70 },
  { name: '6PM', value: 50 },
  { name: '8PM', value: 30 },
];

const dailyUsageData = [
  { name: 'Mon', value: 109 },
  { name: 'Tue', value: 21 },
  { name: 'Wed', value: 41 },
  { name: 'Thu', value: 93 },
  { name: 'Fri', value: 33 },
  { name: 'Sat', value: 101 },
  { name: 'Sun', value: 61 },
];

const recentBookings: (Booking & {userName: string, spaceName: string, seat: string})[] = [];

export default function AdminDashboardPage() {
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userOrgId = userDocSnap.data().orgId;
          setOrgId(userOrgId);
          fetchSpaces(userOrgId);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchSpaces = async (orgId: string) => {
    if (!orgId) return;
    
    // Fetch Cafeterias
    const cafeteriasQuery = query(collection(db, "cafeterias"), where("orgId", "==", orgId));
    const cafeteriasSnapshot = await getDocs(cafeteriasQuery);
    const fetchedCafeterias = cafeteriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cafeteria));
    setCafeterias(fetchedCafeterias);

    // Fetch Meeting Rooms
    const meetingRoomsQuery = query(collection(db, "meetingRooms"), where("orgId", "==", orgId));
    const meetingRoomsSnapshot = await getDocs(meetingRoomsQuery);
    const fetchedMeetingRooms = meetingRoomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRoom));
    setMeetingRooms(fetchedMeetingRooms);
  };
  
  return (
    <div className="flex flex-col gap-8">
        <header>
            <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
        </header>
        <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Booking Statistics</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                        <p className="text-3xl font-bold text-neutral-900">0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-neutral-600">Active Users</p>
                        <p className="text-3xl font-bold text-neutral-900">0</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm font-medium text-neutral-600">Avg. Booking Duration</p>
                        <p className="text-3xl font-bold text-neutral-900">0</p>
                    </CardContent>
                </Card>
            </div>
        </section>

        <section>
             <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-neutral-900">Manage Spaces</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <h4 className="font-semibold text-base flex items-center gap-2"><Utensils className="h-5 w-5" /> Cafeterias</h4>
                    <div className="space-y-2">
                        {cafeterias.length > 0 ? cafeterias.map(cafe => (
                        <div key={cafe.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                            <p className="font-semibold">{cafe.name}</p>
                            <p className="text-sm text-neutral-600">Capacity: {cafe.capacity}</p>
                            </div>
                            <Dialog>
                                <DialogTrigger asChild>
                                <Button variant="outline" size="sm"><Pencil className="mr-2 h-3 w-3" /> Edit Layout</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-4xl">
                                <DialogHeader>
                                    <DialogTitle>Edit Layout for {cafe.name}</DialogTitle>
                                </DialogHeader>
                                <CafeteriaLayoutEditor 
                                    cafeteria={cafe} 
                                    onSave={() => fetchSpaces(orgId!)}
                                />
                                </DialogContent>
                            </Dialog>
                        </div>
                        )) : <p className="text-sm text-neutral-600 text-center py-4">No cafeterias found.</p>}
                    </div>

                    <h4 className="font-semibold text-base flex items-center gap-2 mt-6"><Building className="h-5 w-5" /> Meeting Rooms</h4>
                    <div className="space-y-2">
                        {meetingRooms.length > 0 ? meetingRooms.map(room => (
                        <div key={room.id} className="flex items-center justify-between rounded-lg border p-4">
                            <div>
                            <p className="font-semibold">{room.name}</p>
                            <p className="text-sm text-neutral-600">Capacity: {room.capacity}</p>
                            </div>
                            <Button variant="outline" size="sm" disabled><Pencil className="mr-2 h-3 w-3" /> Edit</Button>
                        </div>
                        )) : <p className="text-sm text-neutral-600 text-center py-4">No meeting rooms found.</p>}
                    </div>
                </CardContent>
            </Card>
        </section>

        <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Booking Trends</h2>
             <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-neutral-700 mb-4">Peak Booking Hours</h3>
                    <div className="h-60">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHoursData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} hide />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <h3 className="text-base font-semibold text-neutral-700 mb-4">Daily Usage</h3>
                     <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                             <LineChart data={dailyUsageData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis fontSize={12} tickLine={false} axisLine={false} hide/>
                                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={3} dot={false}/>
                             </LineChart>
                         </ResponsiveContainer>
                    </div>
                 </div>
            </div>
        </section>

        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-900">Recent Bookings</h2>
            </div>
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-neutral-50 text-xs uppercase text-neutral-700">
                        <TableRow>
                            <TableHead className="px-6 py-3 font-semibold">User</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Location</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Seat</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Slot</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Date</TableHead>
                            <TableHead className="px-6 py-3 font-semibold text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentBookings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-neutral-600">
                            No recent bookings.
                            </TableCell>
                        </TableRow>
                        ) : (
                        recentBookings.map((booking) => (
                            <TableRow key={booking.id} className="border-b border-neutral-200 bg-white hover:bg-neutral-50">
                                <TableCell className="px-6 py-4 font-medium text-neutral-900">{booking.userName}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.spaceName}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.seat}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.startTime} - {booking.endTime}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.date}</TableCell>
                                <TableCell className="px-6 py-4 text-center">
                                    <Badge 
                                        className={
                                            booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                                            booking.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-blue-100 text-blue-800'
                                        }
                                    >
                                    {booking.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </section>
    </div>
  );
}
