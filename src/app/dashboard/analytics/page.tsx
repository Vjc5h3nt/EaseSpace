
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Booking, User } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

export default function AnalyticsPage() {
    const { toast } = useToast();
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        totalBookings: 0,
        utilizationRate: "0%",
        peakHour: "N/A",
        popularSpace: "N/A",
    });
    const [peakHoursData, setPeakHoursData] = useState<{ name: string; value: number }[]>([]);
    const [dailyUsageData, setDailyUsageData] = useState<{ name: string; value: number }[]>([]);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (session?.user) {
              const { data: user, error } = await supabase
                .from('users')
                .select('org_id')
                .eq('id', session.user.id)
                .single();
              if (user && user.org_id) {
                setOrgId(user.org_id);
                fetchAnalyticsData(user.org_id);
              }
            } else {
              setLoading(false);
            }
          }
        );
        return () => authListener.subscription.unsubscribe();
      }, []);

    const fetchAnalyticsData = async (orgId: string) => {
        if (!orgId) return;
        setLoading(true);

        try {
            const [bookingsRes, cafeteriasRes, meetingRoomsRes] = await Promise.all([
                supabase.from("bookings").select('*').eq("org_id", orgId),
                supabase.from("cafeterias").select('id, name, capacity').eq("org_id", orgId),
                supabase.from("meeting_rooms").select('id, name, capacity').eq("org_id", orgId),
            ]);

            if (bookingsRes.error) throw bookingsRes.error;
            if (cafeteriasRes.error) throw cafeteriasRes.error;
            if (meetingRoomsRes.error) throw meetingRoomsRes.error;
            
            const allBookings = bookingsRes.data as Booking[];
            const allSpaces = [...(cafeteriasRes.data || []), ...(meetingRoomsRes.data || [])];
            
            const totalCapacity = allSpaces.reduce((acc, space) => acc + (space.capacity || 0), 0);
            
            // Stats
            const totalBookings = allBookings.length;
            const utilizationRate = totalCapacity > 0 ? ((totalBookings * 1) / (totalCapacity * 8 * 30)) * 100 : 0; // Simplified
            
            // Peak Hour
            const hours = Array(24).fill(0);
            allBookings.forEach(b => {
                const startHour = parseInt(b.start_time.split(':')[0]);
                hours[startHour]++;
            });
            const peakHourIndex = hours.indexOf(Math.max(...hours));
            const peakHour = `${peakHourIndex}:00 - ${peakHourIndex + 1}:00`;
            
            // Popular Space
            const spaceCounts: { [key: string]: number } = {};
            const spaceNames: { [key: string]: string } = {};
             allSpaces.forEach(space => {
                spaceNames[space.id] = space.name;
            });
            allBookings.forEach(b => {
                spaceCounts[b.space_id] = (spaceCounts[b.space_id] || 0) + 1;
            });
            const popularSpaceId = Object.keys(spaceCounts).sort((a,b) => spaceCounts[b] - spaceCounts[a])[0];
            const popularSpace = spaceNames[popularSpaceId] || 'N/A';
            
            setStats({
                totalBookings,
                utilizationRate: `${utilizationRate.toFixed(1)}%`,
                peakHour,
                popularSpace
            });

            // Chart Data
            setPeakHoursData(hours.map((count, i) => ({ name: `${i}h`, value: count })).filter(h => h.value > 0));
            
            const days: { [key: string]: number } = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
            const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            allBookings.forEach(b => {
                const dayOfWeek = dayNames[new Date(b.date).getUTCDay()];
                if (days.hasOwnProperty(dayOfWeek)) {
                     days[dayOfWeek as keyof typeof days]++;
                }
            });
            setDailyUsageData(Object.entries(days).map(([name, value]) => ({ name, value: Number(value) })));


        } catch (error: any) {
            console.error("Failed to fetch analytics data:", error);
            toast({ title: "Error", description: error.message || "Could not load analytics.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }
    
    if (loading) {
      return <div className="flex justify-center items-center h-full">Loading analytics...</div>
    }

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">Analytics</h1>
                <p className="text-neutral-600 mt-1">Insights into your workspace utilization.</p>
            </header>

            <section>
                <h2 className="text-xl font-semibold text-neutral-900 mb-4">Overall Statistics</h2>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader><CardTitle>Total Bookings</CardTitle></CardHeader>
                        <CardContent><p className="text-3xl font-bold">{stats.totalBookings}</p></CardContent>
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

            <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>
    );
}

    