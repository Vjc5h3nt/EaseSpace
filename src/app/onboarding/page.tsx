"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Trash2, Building, Utensils } from "lucide-react";
import type { Cafeteria, MeetingRoom } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);

  const [cafeteriaName, setCafeteriaName] = useState("");
  const [cafeteriaCapacity, setCafeteriaCapacity] = useState("");

  const [roomName, setRoomName] = useState("");
  const [roomCapacity, setRoomCapacity] = useState("");
  const [roomAmenities, setRoomAmenities] = useState("");

  const addCafeteria = () => {
    if (cafeteriaName && cafeteriaCapacity) {
      setCafeterias([
        ...cafeterias,
        { id: Date.now().toString(), name: cafeteriaName, capacity: parseInt(cafeteriaCapacity) },
      ]);
      setCafeteriaName("");
      setCafeteriaCapacity("");
    }
  };

  const addMeetingRoom = () => {
    if (roomName && roomCapacity) {
      setMeetingRooms([
        ...meetingRooms,
        {
          id: Date.now().toString(),
          name: roomName,
          capacity: parseInt(roomCapacity),
          amenities: roomAmenities.split(",").map((a) => a.trim()),
        },
      ]);
      setRoomName("");
      setRoomCapacity("");
      setRoomAmenities("");
    }
  };

  const finishOnboarding = () => {
    toast({
      title: "Onboarding Complete!",
      description: "Your workspace has been configured.",
    });
    router.push("/dashboard/admin");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl font-headline">Workspace Setup</CardTitle>
          <CardDescription>Configure your cafeterias and meeting rooms.</CardDescription>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-2 sm:col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cafeteria-name">Cafeteria Name</Label>
                      <Input id="cafeteria-name" value={cafeteriaName} onChange={(e) => setCafeteriaName(e.target.value)} placeholder="Main Cafeteria" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cafeteria-capacity">Capacity</Label>
                      <Input id="cafeteria-capacity" type="number" value={cafeteriaCapacity} onChange={(e) => setCafeteriaCapacity(e.target.value)} placeholder="100" />
                    </div>
                  </div>
                  <Button onClick={addCafeteria} className="w-full sm:w-auto">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {cafeterias.map((cafe) => (
                    <div key={cafe.id} className="flex items-center justify-between rounded-md border p-3">
                      <p>{cafe.name} (Capacity: {cafe.capacity})</p>
                      <Button variant="ghost" size="icon" onClick={() => setCafeterias(cafeterias.filter(c => c.id !== cafe.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="meeting-rooms" className="mt-4">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:col-span-2">
                        <div className="space-y-2">
                            <Label htmlFor="room-name">Room Name</Label>
                            <Input id="room-name" value={roomName} onChange={(e) => setRoomName(e.target.value)} placeholder="Conference Room A" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="room-capacity">Capacity</Label>
                            <Input id="room-capacity" type="number" value={roomCapacity} onChange={(e) => setRoomCapacity(e.target.value)} placeholder="12" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="room-amenities">Amenities</Label>
                            <Input id="room-amenities" value={roomAmenities} onChange={(e) => setRoomAmenities(e.target.value)} placeholder="TV, Whiteboard" />
                        </div>
                    </div>
                    <Button onClick={addMeetingRoom} className="w-full sm:w-auto">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
                 <div className="space-y-2">
                  {meetingRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p>{room.name} (Capacity: {room.capacity})</p>
                        <p className="text-sm text-muted-foreground">{room.amenities.join(', ')}</p>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => setMeetingRooms(meetingRooms.filter(r => r.id !== room.id))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="mt-6 flex justify-end">
            <Button size="lg" onClick={finishOnboarding}>Finish Onboarding</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
