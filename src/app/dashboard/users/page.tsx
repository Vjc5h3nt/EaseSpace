
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Check, X } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';

export default function UsersPage() {
    const { toast } = useToast();
    const [users, setUsers] = useState<User[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUsers = async (orgId: string) => {
        if (!orgId) return;
        setLoading(true);
        const usersQuery = query(collection(db, 'users'), where('org_id', '==', orgId));
        const querySnapshot = await getDocs(usersQuery);
        const fetchedUsers = querySnapshot.docs.map(doc => ({...doc.data(), uid: doc.id} as User));
        setUsers(fetchedUsers);
        setLoading(false);
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const adminUserDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
                if (!adminUserDoc.empty) {
                    const adminOrgId = adminUserDoc.docs[0].data().org_id;
                    setOrgId(adminOrgId);
                    fetchUsers(adminOrgId);
                }
            } else {
                setLoading(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleUserApproval = async (userId: string, newStatus: 'active' | 'rejected') => {
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { status: newStatus });
            toast({ title: 'Success', description: `User has been ${newStatus}.` });
            if (orgId) fetchUsers(orgId); // Refresh users list
        } catch (error) {
            console.error('Error updating user status:', error);
            toast({ title: 'Error', description: 'Failed to update user status.', variant: 'destructive' });
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
                                <TableRow key={user.uid}>
                                    <TableCell>{user.fullName}</TableCell>
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
                                            <Button variant="outline" size="icon" onClick={() => onAction(user.uid, 'active')}><Check className="h-4 w-4 text-green-600" /></Button>
                                            <Button variant="outline" size="icon" onClick={() => onAction(user.uid, 'rejected')}><X className="h-4 w-4 text-red-600" /></Button>
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
