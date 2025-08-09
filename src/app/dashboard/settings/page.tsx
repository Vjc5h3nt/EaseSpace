"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { auth, db, storage } from '@/lib/firebase';
import { onAuthStateChanged, updateProfile, verifyBeforeUpdateEmail } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { User } from '@/lib/types';

export default function SettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data() as User;
                    setUser(userData);
                    setDisplayName(currentUser.displayName || userData.fullName || '');
                    setEmail(currentUser.email || '');
                    setProfilePicUrl(currentUser.photoURL || '');
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePic(file);
            setProfilePicUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        if (!auth.currentUser) return;

        try {
            // Update profile picture if changed
            if (profilePic) {
                const storageRef = ref(storage, `profilePictures/${auth.currentUser.uid}`);
                await uploadBytes(storageRef, profilePic);
                const downloadURL = await getDownloadURL(storageRef);
                await updateProfile(auth.currentUser, { photoURL: downloadURL });
                setProfilePicUrl(downloadURL);
            }

            // Update display name
            if (displayName !== auth.currentUser.displayName) {
                await updateProfile(auth.currentUser, { displayName });
                const userDocRef = doc(db, "users", auth.currentUser.uid);
                await updateDoc(userDocRef, { fullName: displayName });
            }
            
            // Update email if changed
            if (email !== auth.currentUser.email) {
                await verifyBeforeUpdateEmail(auth.currentUser, email);
                 toast({
                    title: "Verification Email Sent",
                    description: `Please check your new email (${email}) to verify the change.`,
                });
            }

            toast({ title: "Success", description: "Profile updated successfully!" });
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
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
                        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                     <Button onClick={handleSaveChanges}>Save Changes</Button>
                </CardContent>
            </Card>
        </div>
    );
}
