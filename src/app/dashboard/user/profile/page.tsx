
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Upload, Building, CalendarCheck, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { User, Organization } from '@/lib/types';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/logo';

export default function UserProfilePage() {
    const router = useRouter();
    const { toast } = useToast();
    const auth = useAuth();
    const db = useFirestore();
    const [user, setUser] = useState<User | null>(null);
    const [organizationName, setOrganizationName] = useState('');

    // Form state
    const [displayName, setDisplayName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [employeeId, setEmployeeId] = useState('');
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [profilePicUrl, setProfilePicUrl] = useState('');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser && db) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as User;
                    setUser(userData);
                    setDisplayName(currentUser.displayName || userData.fullName || '');
                    setProfilePicUrl(currentUser.photoURL || userData.photoURL || '');
                    setMobileNumber(userData.mobileNumber || '');
                    setEmployeeId(userData.employeeId || '');

                     if(userData.org_id) {
                        const orgDocRef = doc(db, 'organizations', userData.org_id);
                        const orgDocSnap = await getDoc(orgDocRef);
                        if(orgDocSnap.exists()){
                            setOrganizationName(orgDocSnap.data().name);
                        }
                    }
                } else {
                    router.push('/login');
                }
            } else {
                router.push('/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [router, auth, db]);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePic(file);
            setProfilePicUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        if (!auth?.currentUser || !user || !db) return;
        setIsSaving(true);
        
        try {
            let finalPhotoURL = profilePicUrl;

            if (profilePic) {
                const response = await fetch('/api/upload-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileType: profilePic.type, folder: 'profilePictures' }),
                });
        
                if (!response.ok) throw new Error('Failed to get upload URL.');
                const { uploadUrl, publicUrl } = await response.json();
        
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: profilePic,
                    headers: { 'Content-Type': profilePic.type },
                });
        
                if (!uploadResponse.ok) throw new Error('Image upload failed.');
                finalPhotoURL = publicUrl;
            }
            
            const userDocRef = doc(db, "users", auth.currentUser.uid);
             const updates: Partial<User> = {
                fullName: displayName,
                photoURL: finalPhotoURL,
                mobileNumber: mobileNumber
            };
            
            await updateProfile(auth.currentUser, { 
                displayName: displayName,
                photoURL: finalPhotoURL 
            });
            await updateDoc(userDocRef, updates);

            // Update local state
            setUser(prev => ({...prev!, ...updates}));
            setProfilePicUrl(finalPhotoURL);
            setProfilePic(null); 

            toast({ title: "Success", description: "Profile updated successfully!" });

        } catch (error: any) {
            toast({ title: "Update Failed", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleLogout = async () => {
    if (!auth) return;
    try {
        await auth.signOut();
        router.push("/login");
    } catch (error) {
        console.error("Error signing out:", error);
    }
    };

    if (loading) {
        return <div className="flex justify-center items-center h-screen">Loading...</div>;
    }
    
    if (!user) {
        return <div className="flex justify-center items-center h-screen">No user data found. Redirecting to login...</div>;
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
                <Card className="max-w-4xl">
                    <CardHeader>
                        <CardTitle>Profile Details</CardTitle>
                        <CardDescription>Update your profile information.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center gap-6">
                            <Avatar className="w-24 h-24">
                                <AvatarImage src={profilePicUrl} alt="Profile Picture" />
                                <AvatarFallback><UserIcon className="w-10 h-10" /></AvatarFallback>
                            </Avatar>
                             <div className="flex flex-col gap-2">
                                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                                    <Upload className="mr-2 h-4 w-4" /> Change Picture
                                </Button>
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleProfilePicChange}
                                    hidden
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="displayName">Full Name</Label>
                                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address</Label>
                                <Input id="email" type="email" value={user.email} readOnly disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="employeeId">Employee ID</Label>
                                <Input id="employeeId" value={employeeId} readOnly disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mobileNumber">Mobile Number</Label>
                                <Input id="mobileNumber" value={mobileNumber} onChange={(e) => setMobileNumber(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="orgName">Organization</Label>
                                <Input id="orgName" value={organizationName} readOnly disabled />
                            </div>
                        </div>
                        
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </Button>
                        <p className="text-xs italic text-red-600">Please contact Admin to change any non editable field values.</p>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
