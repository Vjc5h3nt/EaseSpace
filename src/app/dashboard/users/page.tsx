
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Check, X } from 'lucide-react';
import type { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async (orgId: string) => {
        if (!orgId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('org_id', orgId);

        if (error) {
            toast({ title: 'Error fetching users', description: error.message, variant: 'destructive' });
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    };

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
                fetchUsers(user.org_id);
              } else if (error) {
                setLoading(false);
                toast({ title: 'Error', description: 'Could not find user organization.', variant: 'destructive' });
              }
            } else {
              setLoading(false);
            }
          }
        );
        return () => authListener.subscription.unsubscribe();
      }, [toast]);

    const handleUserApproval = async (userId: string, newStatus: 'active' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ status: newStatus })
                .eq('id', userId);
            
            if (error) throw error;

            toast({ title: 'Success', description: `User status has been updated.` });
            if (orgId) fetchUsers(orgId); // Refresh users list
        } catch (error: any) {
            console.error('Error updating user status:', error);
            toast({ title: 'Error', description: error.message || 'Failed to update user status.', variant: 'destructive' });
        }
    };

    const activeUsers = users.filter(u => u.status === 'active' && u.role === 'user');
    const pendingUsers = users.filter(u => u.status === 'pending');
    const admins = users.filter(u => u.role === 'admin');

    return (
        <div className="flex flex-col gap-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Org Users</h1>
                    <p className="text-neutral-600 mt-1">Manage users and approve requests within your organization.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Invite User
                </Button>
            </header>
            <Card>
                 <CardContent className="p-6">
                    <Tabs defaultValue="pending">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                            <TabsTrigger value="users">Active Users</TabsTrigger>
                            <TabsTrigger value="admins">Admins</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-4">
                            <UserTable title="Pending Requests" users={pendingUsers} onAction={handleUserApproval} showActions={true} loading={loading} />
                        </TabsContent>
                        <TabsContent value="users" className="mt-4">
                            <UserTable title="Active Users" users={activeUsers} loading={loading} />
                        </TabsContent>
                        <TabsContent value="admins" className="mt-4">
                             <UserTable title="Administrators" users={admins} loading={loading} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

interface UserTableProps {
    title: string;
    users: User[];
    loading: boolean;
    showActions?: boolean;
    onAction?: (userId: string, newStatus: 'active' | 'rejected') => void;
}

function UserTable({ title, users, loading, showActions = false, onAction }: UserTableProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            {showActions && <TableHead>Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={showActions ? 5 : 4} className="h-24 text-center">Loading...</TableCell>
                            </TableRow>
                        ) : users.length > 0 ? (
                            users.map(user => (
                                <TableRow key={user.id}>
                                    <TableCell>{user.full_name}</TableCell>
                                    <TableCell>{user.email}</TableCell>
                                    <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                                     <TableCell>
                                        <Badge variant={
                                            user.status === 'active' ? 'default' :
                                            user.status === 'pending' ? 'secondary' : 'destructive'
                                        } className={user.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    {showActions && onAction && (
                                        <TableCell className="flex gap-2">
                                            <Button variant="outline" size="icon" onClick={() => onAction(user.id, 'active')}><Check className="h-4 w-4 text-green-600" /></Button>
                                            <Button variant="outline" size="icon" onClick={() => onAction(user.id, 'rejected')}><X className="h-4 w-4 text-red-600" /></Button>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={showActions ? 5 : 4} className="h-24 text-center">
                                    No users found in this category.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
