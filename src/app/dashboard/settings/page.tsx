
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import type { User } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [profilePic, setProfilePic] = useState<File | null>(null);
    const [profilePicUrl, setProfilePicUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [authUser, setAuthUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    const fetchUserData = useCallback(async (currentUserId: string) => {
        setLoading(true);
        const { data: userData, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUserId)
            .limit(1)
            .maybeSingle();

        if (error) {
            toast({ title: 'Error', description: 'Could not fetch your profile data.', variant: 'destructive' });
            router.push('/login');
            setLoading(false);
            return;
        }

        if (userData) {
            setUser(userData);
            setDisplayName(userData.full_name || '');
            setEmail(userData.email || '');
            setProfilePicUrl(userData.photo_url || '');
        } else {
             toast({ title: 'Error', description: 'Could not find your profile data.', variant: 'destructive' });
             router.push('/login');
        }
        setLoading(false);
    }, [toast, router]);

    useEffect(() => {
        const initializePage = async () => {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user;
            setAuthUser(currentUser);
            if (currentUser) {
                await fetchUserData(currentUser.id);
            } else {
                router.push('/login');
                setLoading(false);
            }
        };

        initializePage();
    }, []);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            if (event === 'SIGNED_OUT') {
                router.push('/login');
            }
          }
        );
        return () => authListener.subscription.unsubscribe();
    }, [router]);

    const handleProfilePicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfilePic(file);
            setProfilePicUrl(URL.createObjectURL(file));
        }
    };

    const handleSaveChanges = async () => {
        if (!authUser || !user) return;

        try {
            // Update profile picture if changed
            if (profilePic) {
                // Validate file size (e.g., 5MB limit)
                const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
                if (profilePic.size > MAX_FILE_SIZE) {
                    toast({ title: "Error", description: "File size must be less than 5MB", variant: "destructive" });
                    return;
                }

                // Delete old avatar if it exists
                if (user.photo_url) {
                    const oldFilePath = user.photo_url.split('/').pop();
                    if (oldFilePath) {
                        await supabase.storage.from('avatars').remove([oldFilePath]);
                    }
                }

                const fileExt = profilePic.name.split('.').pop();
                const filePath = `${authUser.id}-${new Date().getTime()}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, profilePic);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath);

                const publicUrl = data.publicUrl;

                const { error: urlError } = await supabase.from('users').update({ photo_url: publicUrl }).eq('id', user.id);
                if (urlError) throw urlError;

                setProfilePicUrl(publicUrl);
            }

            // Update display name
            if (displayName !== user.full_name) {
                const { error: nameError } = await supabase.from('users').update({ full_name: displayName }).eq('id', user.id);
                if (nameError) throw nameError;
            }
            
            // Update email if changed
            if (email !== authUser.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email });
                if(emailError) throw emailError;
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

    if (loading) {
        return <div className="flex justify-center items-center h-full">Loading settings...</div>;
    }
    
    if (!user) {
        return <div className="flex justify-center items-center h-full">Could not load profile. Please try again.</div>;
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

    