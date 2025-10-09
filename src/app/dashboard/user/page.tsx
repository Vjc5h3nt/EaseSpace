
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useAuth, useFirestore } from "@/firebase";
import type { User, Cafeteria, MeetingRoom } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Utensils, Building, ArrowRight } from "lucide-react";
import Link from "next/link";
import { UserChatbotPopup } from "@/components/user-chatbot-popup";

export default function UserDashboardPage() {
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser && db) {
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as User;
          setUser(userData);
          // Ensure org_id is present before fetching spaces
          if (userData.org_id) {
            fetchSpaces(userData.org_id);
          } else {
             setLoading(false);
          }
        } else {
          // If no user doc, they might be an unverified admin or something went wrong
          console.log("No such user document!");
          router.push('/login');
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router, auth, db]);

  const fetchSpaces = async (org_id: string) => {
    if (!db) return;
    // This function will only be called if org_id is valid.
    setLoading(true);
    try {
        // Fetch Cafeterias
        const cafeteriasQuery = query(collection(db, "cafeterias"), where("org_id", "==", org_id));
        const cafeteriasSnapshot = await getDocs(cafeteriasQuery);
        setCafeterias(cafeteriasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cafeteria)));
        
        // Fetch Meeting Rooms
        const meetingRoomsQuery = query(collection(db, "meetingRooms"), where("org_id", "==", org_id));
        const meetingRoomsSnapshot = await getDocs(meetingRoomsQuery);
        setMeetingRooms(meetingRoomsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRoom)));
    } catch (error) {
        console.error("Error fetching spaces:", error);
    } finally {
        setLoading(false);
    }
  };
  
  return (
    <div className="relative">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Book a Space</h1>
        <p className="text-neutral-600 mt-1">
          Welcome, {user?.fullName || 'User'}! Select a space to make a booking.
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
                          <p className="text-muted-foreground col-span-full">No cafeterias available for booking in your organization.</p>
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
                          <p className="text-muted-foreground col-span-full">No meeting rooms available for booking in your organization.</p>
                      )}
                  </div>
              </section>
          </div>
      )}
      {user && <UserChatbotPopup user={user} />}
    </div>
  );
}
