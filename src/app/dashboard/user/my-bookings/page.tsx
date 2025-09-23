
"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import type { Booking, User } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building, CalendarCheck, LogOut, User as UserIcon, ArrowUpDown, Calendar as CalendarIcon, X } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

type EnrichedBooking = Booking & { spaceName: string };
type SortConfig = { key: keyof EnrichedBooking | 'slotDateTime' | 'created_at'; direction: 'ascending' | 'descending' } | null;

export default function MyBookingsPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [bookings, setBookings] = useState<EnrichedBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'slotDateTime', direction: 'descending' });
    const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);

    const fetchBookings = useCallback(async (uid: string) => {
        setLoading(true);
        try {
            const { data: bookingsData, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('user_id', uid);

            if (error) throw error;
            if (!bookingsData) return;

            const cafeIds = bookingsData.filter(b => b.space_type === 'cafeteria').map(b => b.space_id);
            const roomIds = bookingsData.filter(b => b.space_type === 'meetingRoom').map(b => b.space_id);
            
            const spacesMap = new Map<string, string>();

            if (cafeIds.length > 0) {
                const { data: cafes, error: cafeError } = await supabase.from('cafeterias').select('id, name').in('id', cafeIds);
                if (cafeError) throw cafeError;
                cafes.forEach(c => spacesMap.set(c.id, c.name));
            }

            if (roomIds.length > 0) {
                const { data: rooms, error: roomError } = await supabase.from('meeting_rooms').select('id, name').in('id', roomIds);
                if (roomError) throw roomError;
                rooms.forEach(r => spacesMap.set(r.id, r.name));
            }
            
            const enrichedBookings = bookingsData.map(b => ({
                ...b,
                spaceName: spacesMap.get(b.space_id) || 'Unknown Space'
            }));
            
            setBookings(enrichedBookings);
        } catch (error: any) {
            console.error("Error fetching bookings:", error);
            toast({ title: 'Error', description: error.message || 'Failed to fetch bookings.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    }, [toast]);
    
    useEffect(() => {
        const initializePage = async () => {
            setLoading(true);
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
                
                if(userData) {
                    setUser(userData);
                    await fetchBookings(userData.id);
                } else {
                    setLoading(false);
                    toast({title: "Error", description: "User not found. Please relogin.", variant: "destructive"});
                    router.push('/login');
                }
            } else {
                setLoading(false);
                router.push('/login');
            }
        };

        initializePage();
    }, [fetchBookings, router, toast]);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_OUT') {
              setUser(null);
              setBookings([]);
              setLoading(false);
              router.push('/login');
            }
          }
        );
        return () => authListener.subscription.unsubscribe();
      }, [router]);

    const handleCancelBooking = async (bookingId: string) => {
        try {
            const { error } = await supabase
                .from('bookings')
                .update({ status: 'Cancelled' })
                .eq('id', bookingId);
            
            if (error) throw error;

            toast({ title: 'Success', description: 'Booking has been cancelled.' });
            if(user) fetchBookings(user.id); // Refresh bookings
        } catch (error: any) {
            console.error("Error cancelling booking:", error);
            toast({ title: 'Error', description: error.message || 'Failed to cancel booking.', variant: 'destructive' });
        }
    };
    
    const handleLogout = async () => {
        try {
          await supabase.auth.signOut();
          router.push("/login");
        } catch (error) {
          console.error("Error signing out:", error);
        }
    };

    const requestSort = (key: keyof EnrichedBooking | 'slotDateTime' | 'created_at') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    
    const sortedAndFilteredBookings = useMemo(() => {
        let sortableItems = [...bookings];
        
        if (filterDate) {
            sortableItems = sortableItems.filter(b => b.date === format(filterDate, "yyyy-MM-dd"));
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue, bValue;

                if (sortConfig.key === 'slotDateTime') {
                    aValue = new Date(`${a.date}T${a.start_time}`).getTime();
                    bValue = new Date(`${b.date}T${b.start_time}`).getTime();
                } else if (sortConfig.key === 'created_at') {
                    aValue = a.created_at ? new Date(a.created_at).getTime() : 0;
                    bValue = b.created_at ? new Date(b.created_at).getTime() : 0;
                } else {
                    const key = sortConfig.key as keyof EnrichedBooking;
                    aValue = a[key];
                    bValue = b[key];
                }
                
                if (aValue === null || aValue === undefined) aValue = sortConfig.direction === 'ascending' ? Infinity : -Infinity;
                if (bValue === null || bValue === undefined) bValue = sortConfig.direction === 'ascending' ? Infinity : -Infinity;


                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [bookings, sortConfig, filterDate]);


    return (
        <div className="flex h-screen bg-neutral-50">
            <aside className="w-64 flex flex-col justify-between border-r border-neutral-200 bg-white p-4">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 px-2">
                        <Logo className="h-8 w-8 text-primary" />
                        <h1 className="text-xl font-bold text-neutral-900">EaseSpace</h1>
                    </div>
                    <nav className="flex flex-col gap-1">
                        <Link href="/dashboard/user" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-neutral-600 hover:bg-neutral-100">
                           <Building className="h-5 w-5" />
                           <span className="text-sm font-medium">Book a Space</span>
                        </Link>
                         <Link href="/dashboard/user/my-bookings" className="flex items-center gap-3 rounded-md bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-600">
                          <CalendarCheck className="h-5 w-5" />
                          <span>Manage My Booking</span>
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
                    <h1 className="text-3xl font-bold text-neutral-900">Manage My Bookings</h1>
                    <p className="text-neutral-600 mt-1">Here are your past and upcoming bookings.</p>
                </header>
                <Card>
                    <CardHeader>
                        <CardTitle>My Bookings</CardTitle>
                        <CardDescription>View your booking history and manage upcoming reservations.</CardDescription>
                        <div className="flex items-center gap-2 pt-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {filterDate ? format(filterDate, "PPP") : <span>Filter by date...</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar
                                        mode="single"
                                        selected={filterDate}
                                        onSelect={setFilterDate}
                                        initialFocus
                                    />
                                </PopoverContent>
                            </Popover>
                            {filterDate && (
                                <Button variant="ghost" size="icon" onClick={() => setFilterDate(undefined)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Space</TableHead>
                                    <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('slotDateTime')}>
                                            Slot Date & Time
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                     <TableHead>
                                        <Button variant="ghost" onClick={() => requestSort('created_at')}>
                                            Booked On
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Seats Booked</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">Loading...</TableCell>
                                    </TableRow>
                                ) : sortedAndFilteredBookings.length > 0 ? (
                                    sortedAndFilteredBookings.map((booking) => (
                                        <TableRow key={booking.id}>
                                            <TableCell className="font-medium">{booking.spaceName}</TableCell>
                                            <TableCell>{booking.date} at {booking.start_time}</TableCell>
                                            <TableCell>
                                                {booking.created_at ? format(new Date(booking.created_at), "PPpp") : 'N/A'}
                                            </TableCell>
                                            <TableCell>{booking.seat_count || 'N/A'}</TableCell>
                                            <TableCell>
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
                                            <TableCell>
                                                {booking.status === 'Confirmed' && new Date(booking.date) >= new Date() && (
                                                    <Button variant="outline" size="sm" onClick={() => handleCancelBooking(booking.id)}>
                                                        Cancel
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            You have no bookings for the selected criteria.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}

    