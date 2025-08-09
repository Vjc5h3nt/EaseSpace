"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2, Building, Utensils, Table as TableIcon } from "lucide-react";
import type { Cafeteria, MeetingRoom, TableLayout } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from 'firebase/auth';
import { cn } from '@/lib/utils';

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // State for onboarding data
  const [cafeterias, setCafeterias] = useState<Omit<Cafeteria, 'id' | 'orgId'>[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<Omit<MeetingRoom, 'id' | 'orgId'>[]>([]);
  
  // User and org state
  const [user, setUser] = useState(auth.currentUser);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Input fields for new cafeterias/rooms
  const [newCafeteriaName, setNewCafeteriaName] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("");
  const [newRoomAmenities, setNewRoomAmenities] = useState("");

  // State for cafeteria layout editor
  const [selectedCafeteriaIndex, setSelectedCafeteriaIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggingTable, setDraggingTable] = useState<{ cafeteriaIndex: number; tableIndex: number; } | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // Ensure email is verified before allowing onboarding
        if (!currentUser.emailVerified) {
            toast({
                title: "Email not verified",
                description: "Please verify your email before setting up your organization.",
                variant: "destructive"
            });
            router.push('/login');
            return;
        }
        const userDocRef = doc(db, "users", currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setOrgId(userDocSnap.data().orgId);
        }
      } else {
        router.push('/login');
      }
    });
    return () => unsubscribe();
  }, [router, toast]);
  
  // Cafeteria Management
  const addCafeteria = () => {
    if (newCafeteriaName.trim()) {
      setCafeterias([...cafeterias, { name: newCafeteriaName, layout: [] }]);
      setNewCafeteriaName("");
      // Select the newly added cafeteria for editing
      if (selectedCafeteriaIndex === null || selectedCafeteriaIndex === cafeterias.length) {
        setSelectedCafeteriaIndex(cafeterias.length);
      }
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

  const addTableToCafeteria = () => {
    if (selectedCafeteriaIndex === null) return;
    const newTable: TableLayout = { id: `table-${Date.now()}`, x: 20, y: 20 };
    const updatedCafeterias = [...cafeterias];
    updatedCafeterias[selectedCafeteriaIndex].layout.push(newTable);
    setCafeterias(updatedCafeterias);
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
  
  // Drag and Drop Handlers
  const handleMouseDown = (e: React.MouseEvent, tableIndex: number) => {
    if (selectedCafeteriaIndex === null) return;
    setDraggingTable({ cafeteriaIndex: selectedCafeteriaIndex, tableIndex });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingTable || !canvasRef.current || selectedCafeteriaIndex === null) return;
    
    const canvasRect = canvasRef.current.getBoundingClientRect();
    let x = e.clientX - canvasRect.left - 20; // 20 is half of table width
    let y = e.clientY - canvasRect.top - 20; // 20 is half of table height

    // boundary checks
    x = Math.max(0, Math.min(x, canvasRect.width - 40));
    y = Math.max(0, Math.min(y, canvasRect.height - 40));

    const updatedCafeterias = [...cafeterias];
    updatedCafeterias[selectedCafeteriaIndex].layout[draggingTable.tableIndex] = {
      ...updatedCafeterias[selectedCafeteriaIndex].layout[draggingTable.tableIndex],
      x,
      y,
    };
    setCafeterias(updatedCafeterias);
  };
  
  const handleMouseUp = () => {
    setDraggingTable(null);
  };
  
  // Onboarding Finish
  const finishOnboarding = async () => {
    if (!orgId) {
        toast({ title: "Error", description: "Organization ID not found. Please log in again.", variant: 'destructive' });
        return;
    }

    try {
      const cafeteriasCollectionRef = collection(db, "cafeterias");
      for (const cafe of cafeterias) {
        await addDoc(cafeteriasCollectionRef, { ...cafe, orgId, capacity: cafe.layout.length * 4 });
      }

      const meetingRoomsCollectionRef = collection(db, "meetingRooms");
      for (const room of meetingRooms) {
        await addDoc(meetingRoomsCollectionRef, { ...room, orgId });
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Workspace Setup</CardTitle>
          <CardDescription>Configure your cafeterias and meeting rooms for your organization.</CardDescription>
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
                {/* Cafeteria List and Add Form */}
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

                {/* Layout Editor */}
                <div className="md:col-span-2">
                   {selectedCafeteriaIndex !== null && cafeterias[selectedCafeteriaIndex] ? (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="font-medium text-lg">{cafeterias[selectedCafeteriaIndex].name} Layout</h3>
                            <Button onClick={addTableToCafeteria}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Table
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Drag and drop tables to arrange the layout. Each table has 4 seats.
                        </p>
                        <div ref={canvasRef} className="relative w-full h-96 rounded-md border bg-slate-50 cursor-grab" onMouseDown={(e) => {if(draggingTable) e.currentTarget.style.cursor = 'grabbing'}} onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}>
                             {cafeterias[selectedCafeteriaIndex].layout.map((table, tableIndex) => (
                                <div
                                key={table.id}
                                onMouseDown={(e) => handleMouseDown(e, tableIndex)}
                                className="absolute w-10 h-10 flex items-center justify-center rounded-md bg-primary text-primary-foreground cursor-pointer select-none"
                                style={{ left: table.x, top: table.y, userSelect: 'none' }}
                                >
                                    <TableIcon className="w-6 h-6"/>
                                </div>
                            ))}
                        </div>
                        <div className="text-right font-medium">
                            Total Capacity: {cafeterias[selectedCafeteriaIndex].layout.length * 4} seats
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
