
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Booking, User } from "@/lib/types";
import { useAuth, useFirestore } from "@/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { isPast } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type EnrichedBooking = Booking & { userName: string, spaceName: string };

export default function AnalyticsReportPage() {
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
    const [allBookings, setAllBookings] = useState<EnrichedBooking[]>([]);

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
            
            const totalBookings = fetchedBookings.length;
            const utilizationRate = totalCapacity > 0 ? ((totalBookings * 1) / (totalCapacity * 8 * 30)) * 100 : 0; // Simplified
            
            const noShows = fetchedBookings.filter(b => 
                b.spaceType === 'meetingRoom' &&
                b.status === 'Confirmed' &&
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
            
            setAllBookings(enrichedBookings.slice(0, 10)); // Limit to 10 for the report

            const hours = Array(24).fill(0);
            fetchedBookings.forEach(b => {
                const startHour = parseInt(b.startTime.split(':')[0]);
                hours[startHour]++;
            });
            const peakHourIndex = hours.indexOf(Math.max(...hours));
            const peakHour = `${peakHourIndex}:00 - ${peakHourIndex + 1}:00`;
            
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

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Generating Report...</div>
    }
    
    return (
        <div id="analytics-report-for-pdf" className="bg-white p-8">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-neutral-900">Analytics Report</h1>
                <p className="text-neutral-600 mt-1">A summary of workspace utilization.</p>
            </header>
             <section>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Overall Statistics</h2>
                <div className="grid grid-cols-3 gap-6">
                    <Card><CardHeader><CardTitle>Total Bookings</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalBookings}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>No-Shows</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.noShowCount}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Utilization Rate</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.utilizationRate}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Peak Hour</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.peakHour}</p></CardContent></Card>
                    <Card><CardHeader><CardTitle>Most Popular Space</CardTitle></CardHeader><CardContent><p className="text-3xl font-bold">{stats.popularSpace}</p></CardContent></Card>
                </div>
            </section>
             <section className="grid grid-cols-2 gap-6 mt-8">
                <Card>
                    <CardHeader><CardTitle>Peak Booking Hours</CardTitle></CardHeader>
                    <CardContent className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={peakHoursData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} /><YAxis stroke="#888888" fontSize={12} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#2563eb" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Daily Usage Trends</CardTitle></CardHeader>
                    <CardContent className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={dailyUsageData}>
                                <XAxis dataKey="name" stroke="#888888" fontSize={12} /><YAxis stroke="#888888" fontSize={12} />
                                <Tooltip />
                                <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </section>

             <section className="mt-8">
                <Card>
                    <CardHeader><CardTitle>Recent Bookings</CardTitle></CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Space</TableHead><TableHead>Date & Time</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {allBookings.map(booking => (
                                    <TableRow key={booking.id}>
                                        <TableCell>{booking.userName}</TableCell>
                                        <TableCell>{booking.spaceName}</TableCell>
                                        <TableCell>{booking.date} @ {booking.startTime}</TableCell>
                                        <TableCell><Badge>{booking.status}</Badge></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </section>
        </div>
    )

}
