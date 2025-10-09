
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Home,
  Users,
  CalendarCheck,
  BarChart2,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ChatbotPopup } from "@/components/chatbot-popup";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/firebase";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const auth = useAuth();
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);


  // Hide layout for the report page
  if (pathname === '/dashboard/analytics/report') {
    return <>{children}</>;
  }

  // This layout is now only for admin pages. 
  if (!pathname.startsWith('/dashboard/admin') && pathname !== '/dashboard/users' && pathname !== '/dashboard/approve-booking' && pathname !== '/dashboard/analytics' && pathname !== '/dashboard/settings') {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard/admin", icon: Home },
    { name: "Org Users", href: "/dashboard/users", icon: Users },
    { name: "Approve Booking", href: "/dashboard/approve-booking", icon: CalendarCheck },
    { name: "Analytics", href: "/dashboard/analytics", icon: BarChart2 },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ];

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col justify-between p-4 bg-white">
      <div className="flex flex-col gap-6">
        <div className={cn("flex items-center gap-3 px-2", isCollapsed && !isMobile ? "justify-center" : "")}>
          <Logo className="h-8 w-8 text-primary" />
          <div className={cn("transition-opacity duration-300", isCollapsed && !isMobile ? "opacity-0 w-0" : "opacity-100")}>
            <h1 className="text-xl font-bold text-neutral-900 whitespace-nowrap">EaseSpace</h1>
            <p className="text-sm font-medium text-neutral-500 -mt-1 whitespace-nowrap">Admin</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium",
                  isCollapsed && !isMobile ? "justify-center" : "",
                  isActive
                    ? "bg-primary-50 text-primary-600 font-semibold"
                    : "text-neutral-600 hover:bg-neutral-100"
                )}
                title={isCollapsed ? item.name : ""}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className={cn("truncate transition-all", isCollapsed && !isMobile ? "w-0 opacity-0" : "w-auto opacity-100")}>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
      <div>
        <Button variant="ghost" className={cn("w-full justify-start text-neutral-600 hover:bg-neutral-100", isCollapsed && !isMobile ? "justify-center" : "")} onClick={handleLogout}>
          <LogOut className="mr-3 h-5 w-5 shrink-0" />
           <span className={cn("truncate transition-all", isCollapsed && !isMobile ? "w-0 opacity-0" : "w-auto opacity-100")}>Logout</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen w-full">
      {!isMobile && (
        <div className={cn(
          "relative border-r border-neutral-200 bg-white transition-all duration-300 ease-in-out",
          isCollapsed ? "w-20" : "w-64"
        )}>
          <SidebarContent />
           <Button
              variant="ghost"
              size="icon"
              className="absolute top-1/2 -right-4 transform -translate-y-1/2 bg-white border rounded-full h-8 w-8 hover:bg-neutral-100"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
        </div>
      )}
      
      <main className="flex-1 bg-neutral-50">
         {isMobile && (
          <header className="flex items-center justify-between p-4 border-b bg-white md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-64">
                <SidebarContent />
              </SheetContent>
            </Sheet>
             <div className="flex items-center gap-2">
                <Logo className="h-6 w-6 text-primary" />
                <h1 className="text-lg font-bold text-neutral-900">EaseSpace</h1>
            </div>
          </header>
        )}
        <div className="p-8">
            {children}
        </div>
      </main>

      <ChatbotPopup />
    </div>
  );
}

    