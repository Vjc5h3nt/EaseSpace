"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, BookOpenCheck } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import { getBookingInsights } from "@/ai/flows/admin-booking-insights";
import type { Booking } from "@/lib/types";

const chartData = [
  { name: 'Mon', cafeteria: 40, meetingRoom: 24 },
  { name: 'Tue', cafeteria: 30, meetingRoom: 13 },
  { name: 'Wed', cafeteria: 20, meetingRoom: 98 },
  { name: 'Thu', cafeteria: 27, meetingRoom: 39 },
  { name: 'Fri', cafeteria: 18, meetingRoom: 48 },
  { name: 'Sat', cafeteria: 23, meetingRoom: 38 },
  { name: 'Sun', cafeteria: 34, meetingRoom: 43 },
];

const bookings: Booking[] = [
  { id: '1', user: 'Alice Johnson', space: 'Meeting Room A', date: '2024-05-20', time: '10:00 AM', status: 'Confirmed' },
  { id: '2', user: 'Bob Williams', space: 'Cafeteria Seat 12', date: '2024-05-20', time: '12:30 PM', status: 'Confirmed' },
  { id: '3', user: 'Charlie Brown', space: 'Meeting Room B', date: '2024-05-21', time: '02:00 PM', status: 'Pending' },
  { id: '4', user: 'Diana Prince', space: 'Cafeteria Seat 5', date: '2024-05-21', time: '01:00 PM', status: 'Confirmed' },
  { id: '5', user: 'Ethan Hunt', space: 'Meeting Room A', date: '2024-05-22', time: '11:00 AM', status: 'Cancelled' },
];

export default function AdminDashboardPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <BookOpenCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+20.1% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Space Utilization</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">73.5%</div>
            <p className="text-xs text-muted-foreground">+5.2% from last week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+235</div>
            <p className="text-xs text-muted-foreground">+180.1% from last month</p>
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
                {bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.user}</TableCell>
                    <TableCell>{booking.space}</TableCell>
                    <TableCell>{booking.date} at {booking.time}</TableCell>
                    <TableCell>
                      <Badge variant={booking.status === 'Confirmed' ? 'default' : booking.status === 'Cancelled' ? 'destructive' : 'secondary'} className={booking.status === 'Confirmed' ? 'bg-accent text-accent-foreground' : ''}>
                        {booking.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Utilization</CardTitle>
            <CardDescription>Cafeteria vs. Meeting Room bookings.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
       <Card className="lg:col-span-5">
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
  );
}
