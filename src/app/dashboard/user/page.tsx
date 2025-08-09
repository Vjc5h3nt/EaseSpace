"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChatInterface } from "@/components/chat-interface";
import { userNaturalLanguageBooking } from "@/ai/flows/user-natural-language-booking";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Home, LogOut, User } from "lucide-react";
import type { Booking } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";

const upcomingBookings: Booking[] = [];

export default function UserDashboardPage() {
    const { toast } = useToast();
    const router = useRouter();

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

    const handleLogout = async () => {
        try {
          await auth.signOut();
          router.push("/login");
        } catch (error) {
          console.error("Error signing out:", error);
        }
    };


  return (
    <div className="flex h-screen bg-neutral-50">
        <aside className="w-64 flex flex-col justify-between border-r border-neutral-200 bg-white p-4">
             <div className="flex flex-col gap-6">
                 <div className="flex items-center gap-3 px-2">
                    <Logo className="h-8 w-8 text-primary" />
                    <h1 className="text-xl font-bold text-neutral-900">EaseSpace</h1>
                </div>
                <nav className="flex flex-col gap-1">
                     <Link href="/dashboard/user" className="flex items-center gap-3 rounded-md bg-primary-50 px-3 py-2.5 text-primary-600">
                        <Home className="h-5 w-5" />
                        <span className="text-sm font-semibold">Dashboard</span>
                    </Link>
                    <Link href="#" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-neutral-600 hover:bg-neutral-100">
                        <User className="h-5 w-5" />
                        <span className="text-sm font-medium">Profile</span>
                    </Link>
                </nav>
            </div>
             <div>
                <Button variant="ghost" className="w-full justify-start text-neutral-600 hover:bg-neutral-100" onClick={handleLogout}>
                <LogOut className="mr-3 h-5 w-5" />
                <span className="text-sm font-medium">Logout</span>
                </Button>
            </div>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">
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
                                    <h4 className="font-semibold">{booking.spaceId}</h4>
                                    <Badge className="bg-accent text-accent-foreground">{booking.status}</Badge>
                                </div>
                                <div className="text-sm text-muted-foreground mt-2 space-y-1">
                                    <div className="flex items-center">
                                        <Calendar className="w-4 h-4 mr-2" />
                                        <span>{booking.date}</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Clock className="w-4 h-4 mr-2" />
                                        <span>{booking.startTime}</span>
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
        </main>
    </div>
  );
}
