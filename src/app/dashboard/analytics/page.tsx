
"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Booking, User, Organization } from "@/lib/types";
import { useAuth, useFirestore } from "@/firebase";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { isPast, format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ArrowUpDown, Calendar as CalendarIcon, X } from 'lucide-react';


type EnrichedBooking = Booking & { userName: string, spaceName: string };
type SortConfig = { key: keyof EnrichedBooking | 'slotDateTime' | 'createdAt'; direction: 'ascending' | 'descending' } | null;

export default function AnalyticsPage() {
    const { toast } = useToast();
    const auth = useAuth();
    const db = useFirestore();
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        totalBookings: 0,
        utilizationRate: "0%",
        peakHour: "N/A",
        popularSpace: "N/A",
        noShowCount: 0,
    });
    const [peakHoursData, setPeakHoursData] = useState<{ name: string; value: number }[]>([]);
    const [dailyUsageData, setDailyUsageData] = useState<{ name: string; value: number }[]>([]);
    
    // New state for all bookings and filters
    const [allBookings, setAllBookings] = useState<EnrichedBooking[]>([]);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'slotDateTime', direction: 'descending' });


    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && db) {
                const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
                if (!userDoc.empty) {
                    const userOrgId = userDoc.docs[0].data().org_id;
                    setOrgId(userOrgId);
                    fetchAnalyticsData(userOrgId);
                }
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, [auth, db]);

    const fetchAnalyticsData = async (orgId: string) => {
        if (!orgId || !db) return;
        setLoading(true);

        try {
            const [bookingsSnap, cafeteriasSnap, meetingRoomsSnap, usersSnap] = await Promise.all([
                getDocs(query(collection(db, "bookings"), where("org_id", "==", orgId))),
                getDocs(query(collection(db, "cafeterias"), where("org_id", "==", orgId))),
                getDocs(query(collection(db, "meetingRooms"), where("org_id", "==", orgId))),
                getDocs(query(collection(db, 'users'), where('org_id', '==', orgId))),
            ]);
            
            const fetchedBookings = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EnrichedBooking));
            const allSpacesDocs = [...cafeteriasSnap.docs, ...meetingRoomsSnap.docs];
            const allUsers = usersSnap.docs.map(doc => doc.data() as User);

            const usersMap = new Map(allUsers.map(u => [u.uid, u.fullName]));
            const spacesMap = new Map<string, string>();
            allSpacesDocs.forEach(doc => spacesMap.set(doc.id, doc.data().name));
            
            const totalCapacity = allSpacesDocs.reduce((acc, doc) => acc + (doc.data().capacity || 0), 0);
            
            // Stats
            const totalBookings = fetchedBookings.length;
            const utilizationRate = totalCapacity > 0 ? ((totalBookings * 1) / (totalCapacity * 8 * 30)) * 100 : 0; // Simplified
            
            // No-Shows
            const noShows = fetchedBookings.filter(b => 
                b.spaceType === 'meetingRoom' &&
                b.status === 'Confirmed' && // Only confirmed bookings can be no-shows
                isPast(new Date(`${b.date}T${b.endTime}`)) &&
                !b.checkedIn
            );
            const noShowCount = noShows.length;

            const enrichedBookings = fetchedBookings.map(b => ({
                ...b,
                userName: usersMap.get(b.userId) || 'Unknown User',
                spaceName: spacesMap.get(b.spaceId) || 'Unknown Space',
                status: (b.spaceType === 'meetingRoom' && b.status === 'Confirmed' && isPast(new Date(`${b.date}T${b.endTime}`)) && !b.checkedIn) ? 'No-Show' : b.status,
            }));
            
            setAllBookings(enrichedBookings);

            // Peak Hour
            const hours = Array(24).fill(0);
            fetchedBookings.forEach(b => {
                const startHour = parseInt(b.startTime.split(':')[0]);
                hours[startHour]++;
            });
            const peakHourIndex = hours.indexOf(Math.max(...hours));
            const peakHour = `${peakHourIndex}:00 - ${peakHourIndex + 1}:00`;
            
            // Popular Space
            const spaceCounts: { [key: string]: number } = {};
            fetchedBookings.forEach(b => {
                spaceCounts[b.spaceId] = (spaceCounts[b.spaceId] || 0) + 1;
            });
            const popularSpaceId = Object.keys(spaceCounts).sort((a,b) => spaceCounts[b] - spaceCounts[a])[0];
            const popularSpace = spacesMap.get(popularSpaceId) || 'N/A';
            
            setStats({
                totalBookings,
                utilizationRate: `${utilizationRate.toFixed(1)}%`,
                peakHour,
                popularSpace,
                noShowCount,
            });

            // Chart Data
            setPeakHoursData(hours.map((count, i) => ({ name: `${i}h`, value: count })).filter(h => h.value > 0));
            
            const days = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            fetchedBookings.forEach(b => {
                const dayOfWeek = dayNames[new Date(b.date).getDay()];
                if (days.hasOwnProperty(dayOfWeek)) {
                     days[dayOfWeek as keyof typeof days]++;
                }
            });
            setDailyUsageData(Object.entries(days).map(([name, value]) => ({ name, value: Number(value) })));


        } catch (error) {
            console.error("Failed to fetch analytics data:", error);
            toast({ title: "Error", description: "Could not load analytics.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    const requestSort = (key: keyof EnrichedBooking | 'slotDateTime' | 'createdAt') => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

     const sortedAndFilteredBookings = useMemo(() => {
        let sortableItems = [...allBookings];
        
        if (filterStatus !== 'all') {
            sortableItems = sortableItems.filter(b => b.status === filterStatus);
        }
        
        if (filterDate) {
            sortableItems = sortableItems.filter(b => b.date === format(filterDate, "yyyy-MM-dd"));
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue, bValue;

                if (sortConfig.key === 'slotDateTime') {
                    aValue = new Date(`${a.date}T${a.startTime}`).getTime();
                    bValue = new Date(`${b.date}T${b.startTime}`).getTime();
                } else if (sortConfig.key === 'createdAt') {
                    aValue = a.createdAt instanceof Timestamp ? a.createdAt.toMillis() : 0;
                    bValue = b.createdAt instanceof Timestamp ? b.createdAt.toMillis() : 0;
                } else {
                    aValue = a[sortConfig.key as keyof EnrichedBooking] as any;
                    bValue = b[sortConfig.key as keyof EnrichedBooking] as any;
                }

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
    }, [allBookings, sortConfig, filterDate, filterStatus]);


    if (loading) {
      return <div className="flex justify-center items-center h-full">Loading analytics...</div>
    }

    const getSortIndicator = (key: keyof EnrichedBooking | 'slotDateTime' | 'createdAt') => {
        if (sortConfig?.key === key) {
            return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
        }
        return <ArrowUpDown className="ml-2 h-4 w-4 inline" />;
    };

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">Analytics</h1>
                <p className="text-neutral-600 mt-1">Insights into your workspace utilization.</p>
            </header>

            <section>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Overall Statistics</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                    <Card>
                        <CardHeader><CardTitle>Total Bookings</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{stats.totalBookings}</p></CardContent>
                    </Card>
                     <Card>
                        <CardHeader><CardTitle>No-Shows</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{stats.noShowCount}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Utilization Rate</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{stats.utilizationRate}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Peak Hour</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{stats.peakHour}</p></CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Most Popular Space</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{stats.popularSpace}</p></CardContent>
                    </Card>
                </div>
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Peak Booking Hours</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHoursData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Daily Usage Trends</CardTitle>
                    </CardHeader>
                    <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyUsageData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <Tooltip />
                                <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </section>
             <section>
                <Card>
                    <CardHeader>
                        <CardTitle>All Bookings</CardTitle>
                         <div className="flex items-center gap-4 pt-4">
                            <Select onValueChange={setFilterStatus} value={filterStatus}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                                    <SelectItem value="No-Show">No-Show</SelectItem>
                                    <SelectItem value="Requires Approval">Requires Approval</SelectItem>
                                </SelectContent>
                            </Select>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant={"outline"} className="w-[280px] justify-start text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {filterDate ? format(filterDate, "PPP") : <span>Filter by date...</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0">
                                    <Calendar mode="single" selected={filterDate} onSelect={setFilterDate} initialFocus />
                                </PopoverContent>
                            </Popover>
                            {(filterDate || filterStatus !== 'all') && (
                                <Button variant="ghost" onClick={() => { setFilterDate(undefined); setFilterStatus('all'); }}>
                                    Clear Filters
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('userName')}>User {getSortIndicator('userName')}</Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('spaceName')}>Space {getSortIndicator('spaceName')}</Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('slotDateTime')}>Date &amp; Time {getSortIndicator('slotDateTime')}</Button></TableHead>
                                    <TableHead><Button variant="ghost" onClick={() => requestSort('status')}>Status {getSortIndicator('status')}</Button></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedAndFilteredBookings.length > 0 ? (
                                    sortedAndFilteredBookings.map(booking => (
                                        <TableRow key={booking.id}>
                                            <TableCell>{booking.userName}</TableCell>
                                            <TableCell>{booking.spaceName}</TableCell>
                                            <TableCell>{booking.date} @ {booking.startTime}</TableCell>
                                            <TableCell>
                                                <Badge 
                                                    variant={
                                                        booking.status === 'Confirmed' ? 'default' :
                                                        booking.status === 'Cancelled' ? 'destructive' :
                                                        booking.status === 'No-Show' ? 'destructive' : // Reusing destructive for color
                                                        'secondary'
                                                    }
                                                     className={
                                                        booking.status === 'No-Show' ? 'bg-orange-100 text-orange-800 hover:bg-orange-100/80' : 
                                                        booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' : ''
                                                    }
                                                >
                                                    {booking.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">No bookings match the current filters.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>
        </div>
    );
}
