"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  CalendarCheck,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { SeatwiseLogo } from "@/components/logo";
import { ChatbotPopup } from "@/components/chatbot-popup";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/firebase";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // This layout is now only for admin pages.
  // We can remove user-specific checks here if any were added.
  // Let's check if the current path is an admin path. 
  // A simple way is to check if it's NOT a user path to be safe.
  if (pathname.startsWith('/dashboard/user')) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard/admin", icon: Home },
    { name: "Users", href: "/dashboard/users", icon: Users },
    { name: "Approve Booking", href: "/dashboard/approve-booking", icon: CalendarCheck },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="relative flex size-full min-h-screen flex-col">
      <div className="flex h-full grow flex-row">
        <div className="fixed flex h-screen w-64 flex-col justify-between border-r border-neutral-200 bg-white p-4">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-3 px-2">
              <SeatwiseLogo className="h-8 w-8 text-primary" />
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
          <div>
            <Button variant="ghost" className="w-full justify-start text-neutral-600 hover:bg-neutral-100" onClick={handleLogout}>
              <LogOut className="mr-3 h-5 w-5" />
              <span className="text-sm font-medium">Logout</span>
            </Button>
          </div>
        </div>
        <main className="ml-64 flex-1 bg-neutral-50 p-8">
          {children}
        </main>
      </div>
      <ChatbotPopup />
    </div>
  );
}