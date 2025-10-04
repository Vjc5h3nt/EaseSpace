
"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Pencil, PlusCircle, Upload, X } from "lucide-react";
import type { Booking, Cafeteria, MeetingRoom, TableLayout, User } from "@/lib/types";
import { useAuth, useFirestore } from "@/firebase";
import { collection, doc, getDoc, getDocs, query, where, updateDoc, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { CafeteriaLayoutEditor } from "@/components/cafeteria-layout-editor";
import { useToast } from "@/hooks/use-toast";
import { differenceInMinutes, format, isPast } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

type EnrichedBooking = Booking & { userName: string, spaceName: string };

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const db = useFirestore();
  const [cafeterias, setCafeterias] = useState<Cafeteria[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Data states
  const [stats, setStats] = useState({ totalBookings: 0, activeUsers: 0, avgDuration: "0h 0m", confirmedBookings: 0, cancelledBookings: 0, noShowBookings: 0 });
  const [recentBookings, setRecentBookings] = useState<EnrichedBooking[]>([]);
  const [loading, setLoading] = useState(true);

  // Layout editor state
  const [selectedCafeteria, setSelectedCafeteria] = useState<Cafeteria | null>(null);
  const [currentLayout, setCurrentLayout] = useState<TableLayout[]>([]);

  // Add space dialog states
  const [isAddCafeDialogOpen, setIsAddCafeDialogOpen] = useState(false);
  const [newCafeName, setNewCafeName] = useState("");
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [newRoomCapacity, setNewRoomCapacity] = useState("");
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>([]);
  const [currentAmenity, setCurrentAmenity] = useState("");

  // Edit room dialog state
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);


   useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && db) {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userOrgId = userDocSnap.data().org_id;
          setOrgId(userOrgId);
          fetchDashboardData(userOrgId);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [auth, db]);

  const fetchDashboardData = async (orgId: string) => {
      if (!orgId || !db) return;
      setLoading(true);

      try {
        // Fetch all data in parallel
        const [cafeteriasSnap, meetingRoomsSnap, bookingsSnap, usersSnap] = await Promise.all([
            getDocs(query(collection(db, "cafeterias"), where("org_id", "==", orgId))),
            getDocs(query(collection(db, "meetingRooms"), where("org_id", "==", orgId))),
            getDocs(query(collection(db, "bookings"), where("org_id", "==", orgId))),
            getDocs(query(collection(db, "users"), where("org_id", "==", orgId)))
        ]);

        const fetchedCafeterias = cafeteriasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cafeteria));
        const fetchedMeetingRooms = meetingRoomsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MeetingRoom));
        const allBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
        const allUsers = usersSnap.docs.map(doc => doc.data() as User);

        const usersMap = new Map(allUsers.map(u => [u.uid, u.fullName]));
        const spacesMap = new Map([
            ...fetchedCafeterias.map(c => [c.id, c.name]),
            ...fetchedMeetingRooms.map(r => [r.id, r.name])
        ]);

        setCafeterias(fetchedCafeterias);
        setMeetingRooms(fetchedMeetingRooms);

        // Calculate stats
        const totalBookings = allBookings.length;
        const confirmedBookings = allBookings.filter(b => b.status === 'Confirmed').length;
        const cancelledBookings = allBookings.filter(b => b.status === 'Cancelled').length;
        const activeUsers = new Set(allBookings.map(b => b.userId)).size;
        
        const noShowBookings = allBookings.filter(b => 
            b.spaceType === 'meetingRoom' && 
            b.status !== 'Cancelled' && 
            isPast(new Date(`${b.date}T${b.endTime}`)) && 
            !b.checkedIn
        ).length;

        const totalDuration = allBookings.reduce((acc, b) => {
            const startTime = new Date(`${b.date}T${b.startTime}`);
            const endTime = new Date(`${b.date}T${b.endTime}`);
            return acc + differenceInMinutes(endTime, startTime);
        }, 0);
        const avgDurationMinutes = totalBookings > 0 ? totalDuration / totalBookings : 0;
        const avgDuration = `${Math.floor(avgDurationMinutes / 60)}h ${Math.round(avgDurationMinutes % 60)}m`;
        setStats({ totalBookings, activeUsers, avgDuration, confirmedBookings, cancelledBookings, noShowBookings });

        // Process recent bookings
        const sortedBookings = allBookings.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const enrichedRecentBookings = sortedBookings.slice(0, 5).map(b => ({
            ...b,
            userName: usersMap.get(b.userId) || 'Unknown User',
            spaceName: spacesMap.get(b.spaceId) || 'Unknown Space',
            seat: b.tableId ? `Table ${b.tableId.split('-')[1]}` : 'N/A'
        }));
        setRecentBookings(enrichedRecentBookings);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
        toast({ title: "Error", description: "Could not load dashboard data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
  }


  const handleEditLayout = (cafe: Cafeteria) => {
    setSelectedCafeteria(cafe);
    setCurrentLayout(cafe.layout || []);
  };

  const handleSaveLayout = async () => {
    if (!selectedCafeteria || !db) return;

    try {
        const cafeteriaRef = doc(db, "cafeterias", selectedCafeteria.id);
        await updateDoc(cafeteriaRef, {
            layout: currentLayout,
            capacity: currentLayout.length * 4
        });
        toast({
            title: "Layout Saved!",
            description: `The layout for ${selectedCafeteria.name} has been updated.`,
        });
        fetchDashboardData(orgId!); // Refresh the data
        setSelectedCafeteria(null); // Close dialog implicitly via state change
    } catch (error: any) {
        toast({
            title: "Error Saving Layout",
            description: error.message,
                variant: "destructive",
            });
    }
  };

  const handleAddCafeteria = async () => {
    if (!newCafeName.trim() || !orgId || !db) return;
    try {
        await addDoc(collection(db, "cafeterias"), {
            name: newCafeName,
            org_id: orgId,
            capacity: 0,
            layout: []
        });
        toast({ title: "Cafeteria Added!", description: `${newCafeName} has been created.` });
        setIsAddCafeDialogOpen(false);
        setNewCafeName("");
        fetchDashboardData(orgId);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

  const handleAddAmenity = () => {
    if (currentAmenity && !newRoomAmenities.includes(currentAmenity)) {
        setNewRoomAmenities([...newRoomAmenities, currentAmenity]);
        setCurrentAmenity("");
    }
  };

  const handleRemoveAmenity = (amenityToRemove: string) => {
      setNewRoomAmenities(newRoomAmenities.filter(a => a !== amenityToRemove));
  };
  
  const handleAddMeetingRoom = async () => {
    if (!newRoomName.trim() || !newRoomCapacity || !orgId || !db) return;
    try {
        await addDoc(collection(db, "meetingRooms"), {
            name: newRoomName,
            capacity: parseInt(newRoomCapacity, 10),
            amenities: newRoomAmenities,
            org_id: orgId,
            imageUrls: []
        });
        toast({ title: "Meeting Room Added!", description: `${newRoomName} has been created.` });
        setIsAddRoomDialogOpen(false);
        setNewRoomName("");
        setNewRoomCapacity("");
        setNewRoomAmenities([]);
        setCurrentAmenity("");
        fetchDashboardData(orgId);
    } catch (error: any) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  }

    const handleEditMeetingRoom = (room: MeetingRoom) => {
        setEditingRoom(room);
        setIsEditRoomDialogOpen(true);
    };

    const handleNewImageFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setNewImageFiles(Array.from(e.target.files));
        }
    };

    const handleRemoveExistingImage = (urlToRemove: string) => {
        if (editingRoom) {
            const updatedUrls = editingRoom.imageUrls?.filter(url => url !== urlToRemove);
            setEditingRoom({ ...editingRoom, imageUrls: updatedUrls });
        }
    };

    const handleAddAmenityToEditingRoom = () => {
        if (editingRoom && currentAmenity && !editingRoom.amenities.includes(currentAmenity)) {
            setEditingRoom({
                ...editingRoom,
                amenities: [...editingRoom.amenities, currentAmenity]
            });
            setCurrentAmenity("");
        }
    };

    const handleRemoveAmenityFromEditingRoom = (amenityToRemove: string) => {
        if (editingRoom) {
            setEditingRoom({
                ...editingRoom,
                amenities: editingRoom.amenities.filter(a => a !== amenityToRemove)
            });
        }
    };
    
    const handleUpdateMeetingRoom = async () => {
        if (!editingRoom || !db) return;
    
        try {
            let finalImageUrls = [...(editingRoom.imageUrls || [])];
    
            // Upload new images if any are selected
            if (newImageFiles.length > 0) {
                const uploadPromises = newImageFiles.map(async (file) => {
                    const presignedUrlResponse = await fetch('/api/upload-url', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ fileType: file.type, folder: 'meetingRooms' }),
                    });
                    if (!presignedUrlResponse.ok) throw new Error('Failed to get an upload URL.');
                    const { uploadUrl, publicUrl } = await presignedUrlResponse.json();
    
                    const uploadResponse = await fetch(uploadUrl, {
                        method: 'PUT',
                        body: file,
                        headers: { 'Content-Type': file.type },
                    });
                    if (!uploadResponse.ok) throw new Error('Failed to upload image.');
                    return publicUrl;
                });
    
                const uploadedUrls = await Promise.all(uploadPromises);
                finalImageUrls.push(...uploadedUrls);
            }
    
            // Update Firestore document
            const roomRef = doc(db, "meetingRooms", editingRoom.id);
            await updateDoc(roomRef, {
                name: editingRoom.name,
                capacity: editingRoom.capacity,
                amenities: editingRoom.amenities,
                imageUrls: finalImageUrls,
            });
    
            toast({ title: "Success", description: `${editingRoom.name} updated successfully!` });
            
            // Reset state and close dialog
            setIsEditRoomDialogOpen(false);
            setEditingRoom(null);
            setNewImageFiles([]);
            if (orgId) fetchDashboardData(orgId);
    
        } catch (error: any) {
            toast({ title: "Error Updating Room", description: error.message, variant: "destructive" });
        }
    };
  
  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading dashboard...</div>
  }

  return (
    <div className="flex flex-col gap-8">
        <header>
            <h1 className="text-3xl font-bold text-neutral-900">Dashboard</h1>
        </header>
        <section>
            <h2 className="text-xl font-semibold text-neutral-900 mb-4">Booking Statistics</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-6">
                 <Card className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-neutral-600">Total Bookings</p>
                    <p className="text-3xl font-bold text-neutral-900">{stats.totalBookings}</p>
                </Card>
                 <Card className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-neutral-600">Confirmed</p>
                    <p className="text-3xl font-bold text-neutral-900">{stats.confirmedBookings}</p>
                </Card>
                 <Card className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-neutral-600">Cancelled</p>
                    <p className="text-3xl font-bold text-neutral-900">{stats.cancelledBookings}</p>
                </Card>
                 <Card className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-neutral-600">No-Shows</p>
                    <p className="text-3xl font-bold text-neutral-900">{stats.noShowBookings}</p>
                </Card>
                <Card className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-neutral-600">Active Users</p>
                    <p className="text-3xl font-bold text-neutral-900">{stats.activeUsers}</p>
                </Card>
                <Card className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
                    <p className="text-sm font-medium text-neutral-600">Avg. Duration</p>
                    <p className="text-3xl font-bold text-neutral-900">{stats.avgDuration}</p>
                </Card>
            </div>
        </section>

        <section>
             <Card>
                <CardHeader>
                    <CardTitle className="text-xl font-semibold text-neutral-900">Manage Spaces</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h4 className="font-semibold text-base">Cafeterias</h4>
                            <Dialog open={isAddCafeDialogOpen} onOpenChange={setIsAddCafeDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Cafeteria</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add a New Cafeteria</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="cafe-name" className="text-right">Name</Label>
                                            <Input id="cafe-name" value={newCafeName} onChange={(e) => setNewCafeName(e.target.value)} className="col-span-3" />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                        <Button onClick={handleAddCafeteria}>Save</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="space-y-2">
                            {cafeterias.length > 0 ? cafeterias.map(cafe => (
                            <div key={cafe.id} className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                <p className="font-semibold">{cafe.name}</p>
                                <p className="text-sm text-neutral-600">Capacity: {cafe.capacity}</p>
                                </div>
                                <Dialog open={selectedCafeteria?.id === cafe.id} onOpenChange={(isOpen) => !isOpen && setSelectedCafeteria(null)}>
                                    <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" onClick={() => handleEditLayout(cafe)}><Pencil className="mr-2 h-3 w-3" /> Edit Layout</Button>
                                    </DialogTrigger>
                                    {selectedCafeteria && selectedCafeteria.id === cafe.id && (
                                    <DialogContent className="max-w-4xl">
                                    <DialogHeader>
                                        <DialogTitle>Edit Layout for {cafe.name}</DialogTitle>
                                    </DialogHeader>
                                    <CafeteriaLayoutEditor 
                                        cafeteria={selectedCafeteria}
                                        onLayoutChange={setCurrentLayout} 
                                    />
                                    <DialogFooter>
                                        <DialogClose asChild>
                                           <Button variant="outline">Cancel</Button>
                                        </DialogClose>
                                        <Button onClick={handleSaveLayout}>Save Layout</Button>
                                    </DialogFooter>
                                    </DialogContent>
                                    )}
                                </Dialog>
                            </div>
                            )) : <p className="text-sm text-neutral-600 text-center py-4">No cafeterias found.</p>}
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mt-6 mb-4">
                            <h4 className="font-semibold text-base">Meeting Rooms</h4>
                            <Dialog open={isAddRoomDialogOpen} onOpenChange={setIsAddRoomDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button size="sm"><PlusCircle className="mr-2 h-4 w-4" /> Add Room</Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Add a New Meeting Room</DialogTitle>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="room-name" className="text-right">Name</Label>
                                            <Input id="room-name" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-center gap-4">
                                            <Label htmlFor="room-capacity" className="text-right">Capacity</Label>
                                            <Input id="room-capacity" type="number" value={newRoomCapacity} onChange={(e) => setNewRoomCapacity(e.target.value)} className="col-span-3" />
                                        </div>
                                        <div className="grid grid-cols-4 items-start gap-4">
                                            <Label htmlFor="room-amenities" className="text-right pt-2">Amenities</Label>
                                            <div className="col-span-3 space-y-2">
                                                <div className="flex gap-2">
                                                    <Input id="room-amenities" value={currentAmenity} onChange={(e) => setCurrentAmenity(e.target.value)} placeholder="e.g. Whiteboard" />
                                                    <Button type="button" onClick={handleAddAmenity}>Add</Button>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {newRoomAmenities.map(amenity => (
                                                        <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                                                            {amenity}
                                                            <button onClick={() => handleRemoveAmenity(amenity)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                                        <Button onClick={handleAddMeetingRoom}>Save</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </div>
                        <div className="space-y-2">
                            {meetingRooms.length > 0 ? meetingRooms.map(room => (
                            <div key={room.id} className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                <p className="font-semibold">{room.name}</p>
                                <p className="text-sm text-neutral-600">Capacity: {room.capacity}</p>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => handleEditMeetingRoom(room)}><Pencil className="mr-2 h-3 w-3" /> Edit</Button>
                            </div>
                            )) : <p className="text-sm text-neutral-600 text-center py-4">No meeting rooms found.</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        {/* Edit Meeting Room Dialog */}
        <Dialog open={isEditRoomDialogOpen} onOpenChange={setIsEditRoomDialogOpen}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Edit Meeting Room</DialogTitle>
                </DialogHeader>
                {editingRoom && (
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-room-name" className="text-right">Name</Label>
                            <Input id="edit-room-name" value={editingRoom.name} onChange={(e) => setEditingRoom({...editingRoom, name: e.target.value})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="edit-room-capacity" className="text-right">Capacity</Label>
                            <Input id="edit-room-capacity" type="number" value={editingRoom.capacity} onChange={(e) => setEditingRoom({...editingRoom, capacity: parseInt(e.target.value) || 0})} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="edit-room-amenities" className="text-right pt-2">Amenities</Label>
                            <div className="col-span-3 space-y-2">
                                <div className="flex gap-2">
                                    <Input id="edit-room-amenities" value={currentAmenity} onChange={(e) => setCurrentAmenity(e.target.value)} placeholder="Add an amenity" />
                                    <Button type="button" onClick={handleAddAmenityToEditingRoom}>Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {editingRoom.amenities.map(amenity => (
                                        <Badge key={amenity} variant="secondary" className="flex items-center gap-1">
                                            {amenity}
                                            <button onClick={() => handleRemoveAmenityFromEditingRoom(amenity)} className="rounded-full hover:bg-muted-foreground/20 p-0.5">
                                                <X className="h-3 w-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>
                         <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">Images</Label>
                            <div className="col-span-3 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    {(editingRoom.imageUrls || []).map((url, index) => (
                                        <div key={index} className="relative">
                                            <Image
                                                src={url}
                                                alt={`Room image ${index + 1}`}
                                                width={200}
                                                height={150}
                                                className="rounded-md object-cover w-full h-32"
                                            />
                                            <Button
                                                variant="destructive"
                                                size="icon"
                                                className="absolute top-1 right-1 h-6 w-6"
                                                onClick={() => handleRemoveExistingImage(url)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                                <div>
                                    <Label htmlFor="room-images">Add Images</Label>
                                    <Input
                                        id="room-images"
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        ref={fileInputRef}
                                        onChange={handleNewImageFilesChange}
                                        disabled={(editingRoom.imageUrls?.length || 0) + newImageFiles.length >= 4}
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">
                                        You can upload up to 4 images.
                                        ({(editingRoom.imageUrls?.length || 0) + newImageFiles.length} / 4)
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" onClick={() => setCurrentAmenity("")}>Cancel</Button></DialogClose>
                    <Button onClick={handleUpdateMeetingRoom}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>


        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-900">Recent Bookings</h2>
            </div>
            <div className="overflow-x-auto rounded-lg border border-neutral-200 bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-neutral-50 text-xs uppercase text-neutral-700">
                        <TableRow>
                            <TableHead className="px-6 py-3 font-semibold">User</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Location</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Seat</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Slot</TableHead>
                            <TableHead className="px-6 py-3 font-semibold">Date</TableHead>
                            <TableHead className="px-6 py-3 font-semibold text-center">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentBookings.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center text-neutral-600">
                            No recent bookings.
                            </TableCell>
                        </TableRow>
                        ) : (
                        recentBookings.map((booking) => (
                            <TableRow key={booking.id} className="border-b border-neutral-200 bg-white hover:bg-neutral-50">
                                <TableCell className="px-6 py-4 font-medium text-neutral-900">{booking.userName}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.spaceName}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.seat}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.startTime} - {booking.endTime}</TableCell>
                                <TableCell className="px-6 py-4 text-neutral-600">{booking.date}</TableCell>
                                <TableCell className="px-6 py-4 text-center">
                                    <Badge 
                                        variant={
                                            booking.status === 'Confirmed' ? 'default' :
                                            booking.status === 'Cancelled' ? 'destructive' :
                                            'secondary'
                                        }
                                        className={
                                            booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : ''
                                        }
                                    >
                                    {booking.status}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </section>
    </div>
  );
}

    

    