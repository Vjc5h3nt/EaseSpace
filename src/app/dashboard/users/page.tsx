"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import type { User } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Fetch the admin's orgId
                const adminUserDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
                if (!adminUserDoc.empty) {
                    const adminOrgId = adminUserDoc.docs[0].data().org_id;
                    setOrgId(adminOrgId);
                    fetchUsers(adminOrgId);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const fetchUsers = async (orgId: string) => {
        if (!orgId) return;
        const usersQuery = query(collection(db, 'users'), where('org_id', '==', orgId));
        const querySnapshot = await getDocs(usersQuery);
        const fetchedUsers = querySnapshot.docs.map(doc => doc.data() as User);
        setUsers(fetchedUsers);
    };

    return (
        <div className="flex flex-col gap-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Org Users</h1>
                    <p className="text-neutral-600 mt-1">Manage users within your organization.</p>
                </div>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add User
                </Button>
            </header>
            <Card>
                <CardHeader>
                    <CardTitle>All Users</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Full Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Employee ID</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.length > 0 ? (
                                users.map(user => (
                                    <TableRow key={user.uid}>
                                        <TableCell>{user.fullName}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell><Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>{user.role}</Badge></TableCell>
                                        <TableCell>{user.employeeId || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm">Edit</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No users found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
