"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2, Building, Utensils, AlertTriangle } from "lucide-react";
import type { Cafeteria, MeetingRoom, TableLayout } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { onAuthStateChanged, sendEmailVerification } from 'firebase/auth';
import { cn } from '@/lib/utils';
import { CafeteriaLayoutEditor } from '@/components/cafeteria-layout-editor';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';


export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State for onboarding data
  const [cafeterias, setCafeterias] = useState<(Omit<Cafeteria, 'id' | 'org_id'> & {id?: string})[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<Omit<MeetingRoom, 'id' | 'org_id'>[]>([]);
  
  // User and org state
  const [user, setUser] = useState(auth.currentUser);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Input fields for new cafeterias/rooms
  const [newCafeteriaName, setNewCafeteriaName] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("");
  const [newRoomAmenities, setNewRoomAmenities] = useState("");

  const [selectedCafeteriaIndex, setSelectedCafeteriaIndex] = useState<number | null>(null);
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setOrgId(userDocSnap.data().org_id);
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router, toast]);
  
  const addCafeteria = () => {
    if (newCafeteriaName.trim()) {
      const newCafe = { name: newCafeteriaName, layout: [], capacity: 0 };
      setCafeterias([...cafeterias, newCafe]);
      setNewCafeteriaName("");
      setSelectedCafeteriaIndex(cafeterias.length);
    }
  };

  const removeCafeteria = (index: number) => {
    setCafeterias(cafeterias.filter((_, i) => i !== index));
    if (selectedCafeteriaIndex === index) {
      setSelectedCafeteriaIndex(null);
    } else if (selectedCafeteriaIndex && selectedCafeteriaIndex > index) {
      setSelectedCafeteriaIndex(selectedCafeteriaIndex - 1);
    }
  };
  
  // Meeting Room Management
  const addMeetingRoom = () => {
    if (newRoomName && newRoomCapacity) {
      setMeetingRooms([
        ...meetingRooms,
        {
          name: newRoomName,
          capacity: parseInt(newRoomCapacity),
          amenities: newRoomAmenities.split(",").map((a) => a.trim()),
        },
      ]);
      setNewRoomName("");
      setNewRoomCapacity("");
      setNewRoomAmenities("");
    }
  };
  
  const removeMeetingRoom = (index: number) => {
    setMeetingRooms(meetingRooms.filter((_, i) => i !== index));
  };
  
  const finishOnboarding = async () => {
    if (!orgId) {
        toast({ title: "Error", description: "Organization ID not found. Please log in again.", variant: 'destructive' });
        return;
    }

    try {
      const cafeteriasCollectionRef = collection(db, "cafeterias");
      for (const cafe of cafeterias) {
        const { id, ...cafeData } = cafe;
        await addDoc(cafeteriasCollectionRef, { ...cafeData, org_id: orgId, capacity: cafe.layout.length * 4 });
      }

      const meetingRoomsCollectionRef = collection(db, "meetingRooms");
      for (const room of meetingRooms) {
        await addDoc(meetingRoomsCollectionRef, { ...room, org_id: orgId });
      }
      
      if(user && !user.emailVerified) {
         await sendEmailVerification(user);
         toast({
            title: "Verification Email Sent",
            description: "Please check your inbox to verify your email address.",
          });
      }

      toast({
        title: "Onboarding Complete!",
        description: "Your workspace has been configured.",
      });

      router.push("/dashboard/admin");
    } catch (error: any) {
        toast({
            title: "Error finishing onboarding",
            description: error.message,
            variant: "destructive"
        })
    }
  };
  
  const handleLayoutChange = (index: number, newLayout: TableLayout[]) => {
      const updatedCafes = [...cafeterias];
      updatedCafes[index].layout = newLayout;
      updatedCafes[index].capacity = newLayout.length * 4;
      setCafeterias(updatedCafes);
  };

  const handleSaveLayout = () => {
    toast({title: "Layout Updated", description: "Layout changes are saved temporarily. Finish onboarding to save permanently."})
    // Here you could add logic to close a dialog if this was in one.
  }

  const selectedCafeteria = selectedCafeteriaIndex !== null ? cafeterias[selectedCafeteriaIndex] : null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Workspace Setup</CardTitle>
          <CardDescription>Configure your cafeterias and meeting rooms for your organization.</CardDescription>
           {user && !user.emailVerified && (
             <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Email Verification Required</AlertTitle>
                <AlertDescription>
                   Please verify your email address to ensure full access to your account features. A verification link will be sent when you finish onboarding.
                </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="cafeterias" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cafeterias">
                <Utensils className="mr-2 h-4 w-4" /> Cafeterias
              </TabsTrigger>
              <TabsTrigger value="meeting-rooms">
                <Building className="mr-2 h-4 w-4" /> Meeting Rooms
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="cafeterias" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-4">
                  <div>
                    <Label htmlFor="cafeteria-name">New Cafeteria Name</Label>
                    <div className="flex gap-2 mt-1">
                      <Input id="cafeteria-name" value={newCafeteriaName} onChange={(e) => setNewCafeteriaName(e.target.value)} placeholder="e.g., Main Canteen" />
                      <Button onClick={addCafeteria} size="icon"><PlusCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Your Cafeterias</Label>
                    {cafeterias.length === 0 && <p className="text-xs text-muted-foreground">No cafeterias added yet.</p>}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {cafeterias.map((cafe, index) => (
                        <div key={index} className={cn("flex items-center justify-between rounded-md border p-2 cursor-pointer", selectedCafeteriaIndex === index ? 'bg-accent text-accent-foreground' : 'hover:bg-muted')} >
                          <span className="flex-grow" onClick={() => setSelectedCafeteriaIndex(index)}>{cafe.name}</span>
                          <Button variant="ghost" size="icon" onClick={() => removeCafeteria(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                   {selectedCafeteria && selectedCafeteriaIndex !== null ? (
                     <div className="space-y-4">
                       <h3 className="font-medium text-lg">{selectedCafeteria.name} Layout</h3>
                        <CafeteriaLayoutEditor 
                          cafeteria={{...selectedCafeteria, id: `temp-${selectedCafeteriaIndex}`, org_id: ''}} 
                          onLayoutChange={(newLayout) => handleLayoutChange(selectedCafeteriaIndex, newLayout)}
                          onSave={handleSaveLayout}
                        />
                        <div className="flex justify-end">
                            <Button onClick={handleSaveLayout}>Save Layout</Button>
                        </div>
                     </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-slate-50 rounded-md border text-center p-4">
                        <Utensils className="w-12 h-12 mb-4 text-gray-400" />
                        <p className="font-semibold">Select or create a cafeteria</p>
                        <p className="text-sm">Once a cafeteria is selected, you can edit its table layout here.</p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="meeting-rooms" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-4 items-end">
                    <div className="space-y-1">
                        <Label htmlFor="room-name">Room Name</Label>
                        <Input id="room-name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} placeholder="Conference Room A" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="room-capacity">Capacity</Label>
                        <Input id="room-capacity" type="number" value={newRoomCapacity} onChange={(e) => setNewRoomCapacity(e.target.value)} placeholder="12" />
                    </div>
                    <div className="space-y-1 sm:col-span-2 md:col-span-1">
                        <Label htmlFor="room-amenities">Amenities (comma-separated)</Label>
                        <Input id="room-amenities" value={newRoomAmenities} onChange={(e) => setNewRoomAmenities(e.target.value)} placeholder="TV, Whiteboard" />
                    </div>
                    <Button onClick={addMeetingRoom} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add Room
                    </Button>
                </div>
                 <div className="space-y-2 border rounded-md p-2 max-h-80 overflow-y-auto">
                  {meetingRooms.length === 0 && <p className="text-sm text-muted-foreground p-4 text-center">No meeting rooms added yet.</p>}
                  {meetingRooms.map((room, index) => (
                    <div key={index} className="flex items-center justify-between rounded-md border bg-card p-3">
                      <div>
                        <p className="font-medium">{room.name} (Capacity: {room.capacity})</p>
                        <p className="text-sm text-muted-foreground">{room.amenities.join(', ')}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeMeetingRoom(index)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={finishOnboarding} disabled={!orgId || (cafeterias.length === 0 && meetingRooms.length === 0)}>Finish Onboarding</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
