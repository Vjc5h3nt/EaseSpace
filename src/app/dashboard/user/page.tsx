"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChatInterface } from "@/components/chat-interface";
import { userNaturalLanguageBooking } from "@/ai/flows/user-natural-language-booking";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import type { Booking } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

const upcomingBookings: Booking[] = [
    { id: '1', user: 'Current User', space: 'Meeting Room A', date: '2024-05-24', time: '03:00 PM', status: 'Confirmed' },
    { id: '2', user: 'Current User', space: 'Cafeteria Seat 8', date: '2024-05-25', time: '12:00 PM', status: 'Confirmed' },
];

export default function UserDashboardPage() {
    const { toast } = useToast();

    const handleNewBooking = async (query: string) => {
        const result = await userNaturalLanguageBooking({ query });
        if (result.isAvailable) {
            toast({
                title: "Booking Confirmed!",
                description: result.confirmationMessage,
                variant: 'default',
                className: 'bg-accent text-accent-foreground border-green-600',
            });
        } else {
             toast({
                title: "Booking Failed",
                description: result.confirmationMessage,
                variant: "destructive",
            });
        }
        return result.confirmationMessage;
    };


  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle>AI Booking Assistant</CardTitle>
            <CardDescription>Use natural language to book your space.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ChatInterface 
                onSendMessage={handleNewBooking}
                placeholder="e.g., Book a meeting room for 5 people tomorrow at 2 PM"
                emptyStateText="Tell the AI what you need to book."
            />
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Your Upcoming Bookings</CardTitle>
            <CardDescription>Here are your next confirmed bookings.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingBookings.length > 0 ? (
                upcomingBookings.map(booking => (
                    <div key={booking.id} className="p-4 border rounded-lg bg-card">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold">{booking.space}</h4>
                            <Badge className="bg-accent text-accent-foreground">{booking.status}</Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mt-2 space-y-1">
                            <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>{booking.date}</span>
                            </div>
                            <div className="flex items-center">
                                <Clock className="w-4 h-4 mr-2" />
                                <span>{booking.time}</span>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No upcoming bookings.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
