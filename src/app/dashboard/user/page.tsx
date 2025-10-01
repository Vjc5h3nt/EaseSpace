
"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User, Cafeteria, MeetingRoom, TableLayout } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Utensils, Building, ArrowRight, CalendarCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

export default function UserDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSpaces = useCallback(async (org_id: string) => {
    try {
        const { data: cafeteriasData, error: cafeteriasError } = await supabase
            .from('cafeterias')
            .select('*')
            .eq('org_id', org_id);

        if (cafeteriasError) throw cafeteriasError;
        setCafeterias((cafeteriasData || []).map(cafe => ({
            ...cafe,
            layout: (cafe.layout as TableLayout[]) || []
        })));

        const { data: meetingRoomsData, error: meetingRoomsError } = await supabase
            .from('meeting_rooms')
            .select('*')
            .eq('org_id', org_id);
        
        if (meetingRoomsError) throw meetingRoomsError;
        setMeetingRooms(meetingRoomsData || []);

    } catch (error: any) {
        console.error("Error fetching spaces:", error);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initializePage = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: userData, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .limit(1)
          .maybeSingle();

        if (error) {
            console.error("Error fetching user data:", error);
            toast({title: "Error", description: "Could not fetch user data. Please relogin.", variant: "destructive"});
            setLoading(false);
            router.push('/login');
            return;
        }
        
        if (userData) {
          setUser(userData);
          if (userData.org_id) {
            await fetchSpaces(userData.org_id);
          } else {
            setLoading(false);
          }
        }
      } else {
        setLoading(false);
        router.push('/login');
      }
    };

    initializePage();
    
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login');
        }
      }
    );

    return () => authListener.subscription.unsubscribe();
  }, [router, toast, fetchSpaces]);
  
  const handleLogout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
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
            <Link href="/dashboard/user" className="flex items-center gap-3 rounded-md bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-600">
              <Building className="h-5 w-5" />
              <span>Book a Space</span>
            </Link>
             <Link href="/dashboard/user/my-bookings" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-neutral-600 hover:bg-neutral-100">
              <CalendarCheck className="h-5 w-5" />
              <span className="text-sm font-medium">Manage My Booking</span>
            </Link>
            <Link href="/dashboard/user/profile" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-neutral-600 hover:bg-neutral-100">
              <UserIcon className="h-5 w-5" />
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
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Book a Space</h1>
          <p className="text-neutral-600 mt-1">
            Welcome, {user?.full_name || 'User'}! Select a space to make a booking.
          </p>
        </header>

        {loading ? (
            <div className="text-center p-8">Loading spaces...</div>
        ) : (
            <div className="grid gap-8">
                <section>
                    <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                        <Utensils className="h-5 w-5" /> Cafeterias
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cafeterias.length > 0 ? cafeterias.map((cafe) => (
                            <Card key={cafe.id}>
                                <CardHeader>
                                    <CardTitle>{cafe.name}</CardTitle>
                                    <CardDescription>Capacity: {cafe.capacity}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button asChild>
                                        <Link href={`/dashboard/user/book-cafeteria?id=${cafe.id}`}>Book a Seat <ArrowRight className="ml-2 h-4 w-4" /></Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        )) : <p className="text-muted-foreground col-span-full">No cafeterias available in your organization.</p>}
                    </div>
                </section>
                 <section>
                    <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                        <Building className="h-5 w-5" /> Meeting Rooms
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {meetingRooms.length > 0 ? (
                            <Card className="col-span-full">
                                <CardHeader>
                                    <CardTitle>Book a Meeting Room</CardTitle>
                                    <CardDescription>View all available meeting rooms and their schedules in a centralized calendar view.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                     <Button asChild>
                                        <Link href="/dashboard/user/book-meeting-room">
                                            Open Booking Calendar <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : <p className="text-muted-foreground col-span-full">No meeting rooms available in your organization.</p>}
                    </div>
                </section>
            </div>
        )}
      </main>
    </div>
  );
}
