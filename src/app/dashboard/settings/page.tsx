
"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth, useFirestore } from '@/firebase';
import { onAuthStateChanged, updateProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';

export default function SettingsPage() {
    const { toast } = useToast();
    const auth = useAuth();
    const db = useFirestore();
    const [user, setUser] = useState<User | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
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
                    setEmail(currentUser.email || '');
                    setProfilePicUrl(currentUser.photoURL || userData.photoURL || '');
                }
            }
        });
        return () => unsubscribe();
    }, [auth, db]);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePic(file);
            setProfilePicUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        if (!auth?.currentUser || !db) return;
        setIsSaving(true);

        try {
            let finalPhotoURL = profilePicUrl;

            // 1. If a new profile picture is selected, upload it to R2
            if (profilePic) {
                // Get the presigned URL from our API route
                const presignedUrlResponse = await fetch('/api/upload-url', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileType: profilePic.type, folder: 'profilePictures' }),
                });

                if (!presignedUrlResponse.ok) {
                    throw new Error('Failed to get an upload URL.');
                }
                const { uploadUrl, publicUrl } = await presignedUrlResponse.json();

                // Upload the file to R2 using the presigned URL
                const uploadResponse = await fetch(uploadUrl, {
                    method: 'PUT',
                    body: profilePic,
                    headers: { 'Content-Type': profilePic.type },
                });

                if (!uploadResponse.ok) {
                    throw new Error('Failed to upload image.');
                }
                
                finalPhotoURL = publicUrl;
            }

            // 2. Update Firebase Auth and Firestore with the new info
            const userDocRef = doc(db, "users", auth.currentUser.uid);

            await updateProfile(auth.currentUser, {
                displayName: displayName,
                photoURL: finalPhotoURL
            });
            
            await updateDoc(userDocRef, { 
                fullName: displayName,
                photoURL: finalPhotoURL
            });

            // Update local state
            setProfilePicUrl(finalPhotoURL);

            // This part for email update is commented out as it requires re-authentication, we can re-add if needed
            // if (email !== auth.currentUser.email) {
            //     await verifyBeforeUpdateEmail(auth.currentUser, email);
            //      toast({
            //         title: "Verification Email Sent",
            //         description: `Please check your new email (${email}) to verify the change.`,
            //     });
            // }

            toast({ title: "Success", description: "Profile updated successfully!" });

        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setIsSaving(false);
            setProfilePic(null);
        }
    };
    
    if (!user) {
        return <div>Loading...</div>;
    }

    return (
        <div className="flex flex-col gap-8">
            <header>
                <h1 className="text-3xl font-bold text-neutral-900">Settings</h1>
                <p className="text-neutral-600 mt-1">Manage your account settings.</p>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>Update your personal information.</CardDescription>
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
                        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                           <Upload className="mr-2 h-4 w-4" /> Change Picture
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled />
                        <p className="text-xs text-muted-foreground">Changing your email is disabled for now.</p>
                    </div>
                     <Button onClick={handleSaveChanges} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                     </Button>
                </CardContent>
            </Card>
        </div>
    );
}
