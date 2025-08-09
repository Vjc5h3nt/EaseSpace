
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";


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
  const [currentLayout, setCurrentLayout] = useState<TableLayout[]>([]);
  
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
    }
  };

  const removeCafeteria = (index: number) => {
    setCafeterias(cafeterias.filter((_, i) => i !== index));
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
          imageUrl: '',
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
        await addDoc(cafeteriasCollectionRef, { ...cafeData, org_id: orgId });
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


  const handleSaveLayout = () => {
    if (selectedCafeteriaIndex === null) return;
    
    setCafeterias(currentCafes => {
        const updatedCafes = [...currentCafes];
        const cafeToUpdate = updatedCafes[selectedCafeteriaIndex];
        if (cafeToUpdate) {
            cafeToUpdate.layout = currentLayout;
            cafeToUpdate.capacity = currentLayout.length * 4;
        }
        return updatedCafes;
    });

    toast({title: "Layout Updated", description: "Layout changes are saved temporarily. Finish onboarding to save permanently."})
    setSelectedCafeteriaIndex(null);
  }

  const handleEditLayout = (index: number) => {
    setSelectedCafeteriaIndex(index);
    setCurrentLayout(cafeterias[index].layout || []);
  }
  
  const isLayoutEditorOpen = selectedCafeteriaIndex !== null;
  const selectedCafeteria = isLayoutEditorOpen ? cafeterias[selectedCafeteriaIndex!] : null;

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
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="cafeteria-name">New Cafeteria Name</Label>
                    <div className="flex gap-2 mt-1">
                      <Input id="cafeteria-name" value={newCafeteriaName} onChange={(e) => setNewCafeteriaName(e.target.value)} placeholder="e.g., Main Canteen" />
                      <Button onClick={addCafeteria} size="icon"><PlusCircle className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="space-y-2 border rounded-md p-2">
                    <Label>Your Cafeterias</Label>
                    {cafeterias.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No cafeterias added yet.</p>}
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {cafeterias.map((cafe, index) => (
                        <div key={index} className={cn("flex items-center justify-between rounded-md border p-2")} >
                          <span>{cafe.name}</span>
                          <div className='flex items-center gap-2'>
                            <Button variant="outline" size="sm" onClick={() => handleEditLayout(index)}>Edit Layout</Button>
                            <Button variant="ghost" size="icon" onClick={() => removeCafeteria(index)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
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
      
      <Dialog open={isLayoutEditorOpen} onOpenChange={(isOpen) => !isOpen && setSelectedCafeteriaIndex(null)}>
        <DialogContent className="max-w-4xl">
            {selectedCafeteria && (
                <>
                    <DialogHeader>
                        <DialogTitle>Edit Layout for {selectedCafeteria.name}</DialogTitle>
                    </DialogHeader>
                    <CafeteriaLayoutEditor 
                        cafeteria={{...selectedCafeteria, id: `temp-${selectedCafeteriaIndex}`, org_id: '', layout: currentLayout}} 
                        onLayoutChange={setCurrentLayout}
                    />
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSaveLayout}>Save Layout</Button>
                    </DialogFooter>
                </>
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
