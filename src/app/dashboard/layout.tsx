"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid,
  Users,
  Calendar,
  BarChart2,
  Settings,
  Home
} from "lucide-react";
import { SeatwiseLogo } from "@/components/logo";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard/admin", icon: Home },
    { name: "Users", href: "#", icon: Users },
    { name: "Bookings", href: "#", icon: Calendar },
    { name: "Analytics", href: "#", icon: BarChart2 },
    { name: "Settings", href: "#", icon: Settings },
  ];

  return (
    <div className="relative flex size-full min-h-screen flex-col">
        <div className="flex h-full grow flex-row">
            <div className="fixed flex h-screen w-64 flex-col justify-between border-r border-neutral-200 bg-white p-4">
                <div className="flex flex-col gap-6">
                    <div className="flex items-center gap-3 px-2">
                        <SeatwiseLogo className="h-8 w-8 text-primary-500" />
                        <h1 className="text-xl font-bold text-neutral-900">SeatWise
                            <span className="text-sm font-medium text-neutral-600"> Admin</span>
                        </h1>
                    </div>
                    <nav className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                                        isActive
                                        ? "bg-primary-50 text-primary-600 font-semibold"
                                        : "text-neutral-600 hover:bg-neutral-100"
                                    }`}
                                >
                                    <item.icon className="h-5 w-5" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </div>
            <main className="ml-64 flex-1 p-8">
                {children}
            </main>
        </div>
    </div>
  );
}
