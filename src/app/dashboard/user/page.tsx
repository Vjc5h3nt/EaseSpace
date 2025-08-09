"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import type { User, Cafeteria, MeetingRoom } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, User as UserIcon, Utensils, Building, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import Link from "next/link";

export default function UserDashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          setUser(userData);
          fetchSpaces(userData.org_id);
        } else {
          // Handle case where user doc doesn't exist but is authenticated
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const fetchSpaces = async (orgId: string) => {
    // Fetch Cafeterias
    const cafeteriasQuery = query(collection(db, "cafeterias"), where("org_id", "==", orgId));
    const cafeteriasSnapshot = await getDocs(cafeteriasQuery);
    setCafeterias(cafeteriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cafeteria)));
    
    // Fetch Meeting Rooms
    const meetingRoomsQuery = query(collection(db, "meetingRooms"), where("org_id", "==", orgId));
    const meetingRoomsSnapshot = await getDocs(meetingRoomsQuery);
    setMeetingRooms(meetingRoomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRoom)));
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
            <Link href="/dashboard/user" className="flex items-center gap-3 rounded-md bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-600">
              <Utensils className="h-5 w-5" />
              <span>Book a Space</span>
            </Link>
            <Link href="#" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-neutral-600 hover:bg-neutral-100">
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
            Welcome, {user?.fullName || 'User'}! Select a space to make a booking.
          </p>
        </header>

        <div className="grid gap-8">
            <section>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <Utensils className="h-5 w-5" /> Cafeterias
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cafeterias.length > 0 ? cafeterias.map(cafe => (
                        <Card key={cafe.id}>
                            <CardHeader>
                                <CardTitle>{cafe.name}</CardTitle>
                                <CardDescription>Capacity: {cafe.capacity} seats</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild className="w-full">
                                    <Link href={`/dashboard/user/book-cafeteria?id=${cafe.id}`}>
                                        View Layout & Book <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )) : (
                        <p className="text-muted-foreground col-span-full">No cafeterias available for booking.</p>
                    )}
                </div>
            </section>
            
            <section>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center gap-2">
                    <Building className="h-5 w-5" /> Meeting Rooms
                </h2>
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetingRooms.length > 0 ? meetingRooms.map(room => (
                        <Card key={room.id}>
                            <CardHeader>
                                <CardTitle>{room.name}</CardTitle>
                                <CardDescription>Capacity: {room.capacity} people</CardDescription>
                            </CardHeader>
                            <CardContent>
                                 <Button asChild className="w-full">
                                    <Link href={`/dashboard/user/book-meeting-room?id=${room.id}`}>
                                        View Availability <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )) : (
                        <p className="text-muted-foreground col-span-full">No meeting rooms available for booking.</p>
                    )}
                </div>
            </section>
        </div>
      </main>
    </div>
  );
}
