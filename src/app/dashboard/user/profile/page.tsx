"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Upload, ArrowLeft, Building, CalendarCheck, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function UserProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserData = useCallback(async (userId: string) => {
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("Error fetching user data:", error);
            toast({title: "Error", description: "Could not fetch user data. Please relogin.", variant: "destructive"});
            setLoading(false);
            router.push('/login');
            return;
        }
        
        if (userData) {
            setUser(userData);
            setProfilePicUrl(userData.photo_url || '');
        } else {
            setLoading(true);
        }
        
        setLoading(false);
    }, [router, toast]);

    useEffect(() => {
        let isMounted = true;
        const initializePage = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                if (isMounted) {
                    await fetchUserData(session.user.id);
                }
            } else {
                if (isMounted) {
                    setLoading(false);
                    router.push('/login');
                }
            }
        };

        initializePage();
        
        const { data: authListener } = supabase.auth.onAuthStateChange(
          (event, session) => {
             if (event === 'SIGNED_OUT') {
                  router.push('/login');
              }
          }
        );

        return () => {
            isMounted = false;
            authListener.subscription.unsubscribe();
        };
      }, [router, fetchUserData]);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePic(file);
            setProfilePicUrl(URL.createObjectURL(file));
        }
    };

    const handleUpdateProfilePicture = async () => {
        if (!user || !profilePic) return;

        try {
            const fileExt = profilePic.name.split('.').pop();
            const filePath = `${user.id}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, profilePic, { upsert: true });

            if (uploadError) throw uploadError;

            const { data } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);
            
            const publicUrl = data.publicUrl;

            const { error: updateUserError } = await supabase
                .from('users')
                .update({ photo_url: publicUrl })
                .eq('id', user.id);

            if (updateUserError) throw updateUserError;
            
            setProfilePicUrl(publicUrl);
            toast({ title: "Success", description: "Profile picture updated successfully!" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };
    
      const handleLogout = async () => {
        try {
          await supabase.auth.signOut({ scope: 'local' });
          router.push("/login");
        } catch (error) {
          console.error("Error signing out:", error);
        }
      };


    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }
    
    if (!user) {
        return <div className="flex justify-center items-center h-screen">No user data found.</div>;
    }


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
                         <Link href="/dashboard/user/my-bookings" className="flex items-center gap-3 rounded-md px-3 py-2.5 text-neutral-600 hover:bg-neutral-100">
                          <CalendarCheck className="h-5 w-5" />
                          <span className="text-sm font-medium">Manage My Booking</span>
                        </Link>
                        <Link href="/dashboard/user/profile" className="flex items-center gap-3 rounded-md bg-primary-50 px-3 py-2.5 text-sm font-semibold text-primary-600">
                           <UserIcon className="h-5 w-5" />
                           <span>Profile</span>
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
                    <h1 className="text-3xl font-bold text-neutral-900">Your Profile</h1>
                    <p className="text-neutral-600 mt-1">View your account details and manage your profile picture.</p>
                </header>
                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle>Profile Details</CardTitle>
                        <CardDescription>Update your profile picture.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="w-24 h-24">
                                <AvatarImage src={profilePicUrl} alt="Profile Picture" />
                                <AvatarFallback><UserIcon className="w-10 h-10" /></AvatarFallback>
                            </Avatar>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                onChange={handleProfilePicChange}
                                hidden
                            />
                            <div className="flex flex-col gap-2">
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" /> Change Picture
                                </Button>
                                {profilePic && (
                                    <Button onClick={handleUpdateProfilePicture}>Save Picture</Button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="displayName">Full Name</Label>
                            <Input id="displayName" value={user.full_name} readOnly disabled />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" value={user.email} readOnly disabled />
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}