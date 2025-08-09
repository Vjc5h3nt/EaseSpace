"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Activity, Users, BookOpenCheck } from "lucide-react";
import { ChatInterface } from "@/components/chat-interface";
import { getBookingInsights } from "@/ai/flows/admin-booking-insights";
import type { Booking } from "@/lib/types";

// Static data removed to make the component dynamic
const chartData: any[] = [];
const bookings: Booking[] = [];

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
