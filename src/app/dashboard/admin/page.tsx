"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, BookOpenCheck, Building, Utensils, Pencil } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import { getBookingInsights } from "@/ai/flows/admin-booking-insights";
import type { Booking, Cafeteria, MeetingRoom } from "@/lib/types";
import { auth, db } from "@/lib/firebase";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CafeteriaLayoutEditor } from "@/components/cafeteria-layout-editor";

// Static data removed to make the component dynamic
const chartData: any[] = [];
const bookings: Booking[] = [];

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
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Space Utilization</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">No data available</p>
          </CardContent>
        </Card>
      </div>

       <div className="grid gap-6 lg:grid-cols-2">
         <Card>
           <CardHeader>
             <CardTitle>Manage Spaces</CardTitle>
             <CardDescription>Edit layouts for cafeterias and manage meeting rooms.</CardDescription>
           </CardHeader>
           <CardContent className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2"><Utensils className="h-4 w-4" /> Cafeterias</h4>
              <div className="space-y-2">
                {cafeterias.length > 0 ? cafeterias.map(cafe => (
                   <div key={cafe.id} className="flex items-center justify-between rounded-md border p-3">
                     <div>
                       <p className="font-medium">{cafe.name}</p>
                       <p className="text-sm text-muted-foreground">Capacity: {cafe.capacity}</p>
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
                )) : <p className="text-sm text-muted-foreground text-center py-4">No cafeterias found.</p>}
              </div>

              <h4 className="font-medium text-sm flex items-center gap-2 mt-6"><Building className="h-4 w-4" /> Meeting Rooms</h4>
               <div className="space-y-2">
                {meetingRooms.length > 0 ? meetingRooms.map(room => (
                   <div key={room.id} className="flex items-center justify-between rounded-md border p-3">
                     <div>
                       <p className="font-medium">{room.name}</p>
                       <p className="text-sm text-muted-foreground">Capacity: {room.capacity}</p>
                     </div>
                      <Button variant="outline" size="sm" disabled><Pencil className="mr-2 h-3 w-3" /> Edit</Button>
                   </div>
                )) : <p className="text-sm text-muted-foreground text-center py-4">No meeting rooms found.</p>}
              </div>
           </CardContent>
         </Card>

         <Card>
           <CardHeader>
             <CardTitle>Weekly Utilization</CardTitle>
             <CardDescription>Cafeteria vs. Meeting Room bookings.</CardDescription>
           </CardHeader>
           <CardContent>
              {chartData.length === 0 ? (
               <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                 No data to display.
               </div>
             ) : (
             <ResponsiveContainer width="100%" height={250}>
               <BarChart data={chartData}>
                 <CartesianGrid strokeDasharray="3 3" />
                 <XAxis dataKey="name" fontSize={12} />
                 <YAxis fontSize={12}/>
                 <Tooltip
                   contentStyle={{
                     backgroundColor: 'hsl(var(--card))',
                     borderColor: 'hsl(var(--border))',
                   }}
                 />
                 <Bar dataKey="cafeteria" fill="hsl(var(--primary))" name="Cafeteria" radius={[4, 4, 0, 0]} />
                 <Bar dataKey="meetingRoom" fill="hsl(var(--accent))" name="Meeting Rooms" radius={[4, 4, 0, 0]} />
               </BarChart>
             </ResponsiveContainer>
             )}
           </CardContent>
         </Card>
      </div>


      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
            <CardDescription>An overview of the latest booking activities.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Space</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No recent bookings.
                    </TableCell>
                  </TableRow>
                ) : (
                  bookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.userId}</TableCell>
                      <TableCell>{booking.spaceId}</TableCell>
                      <TableCell>{booking.date} at {booking.startTime}</TableCell>
                      <TableCell>
                        <Badge variant={booking.status === 'Confirmed' ? 'default' : booking.status === 'Cancelled' ? 'destructive' : 'secondary'} className={booking.status === 'Confirmed' ? 'bg-accent text-accent-foreground' : ''}>
                          {booking.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
           <CardHeader>
            <CardTitle>Admin AI Assistant</CardTitle>
            <CardDescription>Ask questions about booking data and get instant insights.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChatInterface
              onSendMessage={async (message) => {
                const result = await getBookingInsights({ question: message });
                return result.answer;
              }}
              placeholder="e.g., How many users booked Cafeteria 2 at 1 PM?"
              emptyStateText="Ask the AI assistant for insights on your booking data."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
