"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

const peakHoursData = [
  { name: '8AM', value: 40 }, { name: '10AM', value: 60 }, { name: '12PM', value: 80 },
  { name: '2PM', value: 100 }, { name: '4PM', value: 70 }, { name: '6PM', value: 50 },
  { name: '8PM', value: 30 },
];

const dailyUsageData = [
    { name: 'Mon', value: 109 }, { name: 'Tue', value: 21 }, { name: 'Wed', value: 41 },
    { name: 'Thu', value: 93 }, { name: 'Fri', value: 33 }, { name: 'Sat', value: 101 },
    { name: 'Sun', value: 61 },
];


export default function AnalyticsPage() {

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
                    <CardContent><p className="text-3xl font-bold">0</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Utilization Rate</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">0%</p></CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>Peak Hour</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">N/A</p></CardContent>
                </Card>
                 <Card>
                    <CardHeader><CardTitle>Most Popular Space</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">N/A</p></CardContent>
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
