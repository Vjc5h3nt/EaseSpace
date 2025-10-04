
"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlusCircle, Check, X, Eye, User as UserIcon, UserCheck, UserX, UploadCloud, FileSpreadsheet } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useAuth, useFirestore } from '@/firebase';
import type { User } from '@/lib/types';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import Papa from 'papaparse';

interface InvitedUser {
    fullName: string;
    email: string;
    status: 'Ready to Invite' | 'Processing' | 'Invited';
}

export default function UsersPage() {
    const { toast } = useToast();
    const auth = useAuth();
    const db = useFirestore();
    const [users, setUsers] = useState<User[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [filterStatus, setFilterStatus] = useState('all');

    // CSV Import State
    const [isImporting, setIsImporting] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [invitedUsers, setInvitedUsers] = useState<InvitedUser[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchUsers = async (orgId: string) => {
        if (!orgId || !db) return;
        setLoading(true);
        const usersQuery = query(collection(db, 'users'), where('org_id', '==', orgId));
        const querySnapshot = await getDocs(usersQuery);
        const fetchedUsers = querySnapshot.docs.map(doc => ({...doc.data(), uid: doc.id} as User));
        setUsers(fetchedUsers);
        setLoading(false);
    };

    useEffect(() => {
        if (!auth) return;
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && db) {
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
    }, [auth, db]);

    const handleUserApproval = async (userId: string, newStatus: 'active' | 'rejected') => {
        if (!db) return;
        try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { status: newStatus });
            toast({ title: 'Success', description: `User status has been updated.` });
            if (orgId) fetchUsers(orgId); // Refresh users list
        } catch (error) {
            console.error('Error updating user status:', error);
            toast({ title: 'Error', description: 'Failed to update user status.', variant: 'destructive' });
        }
    };
    
    const handleToggleUserStatus = async (user: User) => {
        if (!db) return;
        const newStatus = user.status === 'active' ? 'disabled' : 'active';
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { status: newStatus });
            toast({ title: 'Success', description: `User has been ${newStatus}.` });
            if (orgId) fetchUsers(orgId); // Refresh users list
        } catch (error) {
            console.error('Error toggling user status:', error);
            toast({ title: 'Error', description: 'Failed to update user status.', variant: 'destructive' });
        }
    }
    
    const handleViewUser = (user: User) => {
        setSelectedUser(user);
        setIsViewModalOpen(true);
    }
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setCsvFile(event.target.files[0]);
            parseCsv(event.target.files[0]);
        }
    };

    const parseCsv = (file: File) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const parsedUsers = results.data.map((row: any) => ({
                    fullName: row.fullName || 'N/A',
                    email: row.email || 'N/A',
                    status: 'Ready to Invite'
                })).filter(u => u.email !== 'N/A');
                setInvitedUsers(parsedUsers);
            },
            error: (error: any) => {
                toast({ title: 'CSV Parse Error', description: error.message, variant: 'destructive' });
            }
        });
    };
    
    const handleProcessInvitations = async () => {
        setIsImporting(true);
        toast({
            title: "Processing Invitations (Simulation)",
            description: "This is a simulation. In a real application, a backend function would now process these users.",
        });

        console.log("--- SIMULATING BACKEND USER IMPORT ---");
        console.log("The following logic would run on a secure server (e.g., a Cloud Function).");
        
        for (let i = 0; i < invitedUsers.length; i++) {
            const user = invitedUsers[i];
            
            // Simulate processing each user
            setInvitedUsers(prev => {
                const newUsers = [...prev];
                newUsers[i].status = 'Processing';
                return newUsers;
            });
            await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay

            console.log(`\nProcessing user: ${user.email}`);
            console.log(`1. Calling Firebase Admin SDK: admin.auth().createUser({ email: '${user.email}', fullName: '${user.fullName}' })`);
            console.log(`2. Calling Firebase Admin SDK: admin.auth().generatePasswordResetLink('${user.email}')`);
            console.log(`3. Sending email to ${user.email} with the password setup link.`);
            
            // Simulate success
            setInvitedUsers(prev => {
                const newUsers = [...prev];
                newUsers[i].status = 'Invited';
                return newUsers;
            });
        }
        
        console.log("\n--- SIMULATION COMPLETE ---");
        setIsImporting(false);
        toast({ title: "Simulation Complete", description: "Check the console for backend process details." });
    };

    const pendingUsers = users.filter(u => u.status === 'pending');
    const admins = users.filter(u => u.role === 'admin');

    const allOtherUsers = useMemo(() => {
        let filteredUsers = users.filter(u => u.role === 'user' && u.status !== 'pending');
        if (filterStatus !== 'all') {
            filteredUsers = filteredUsers.filter(u => u.status === filterStatus);
        }
        return filteredUsers;
    }, [users, filterStatus]);

    return (
        <div className="flex flex-col gap-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Org Users</h1>
                    <p className="text-neutral-600 mt-1">Manage users and approve requests within your organization.</p>
                </div>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle>Invite Users</CardTitle>
                    <CardDescription>Bulk invite users by uploading a CSV file with 'email' and 'fullName' columns.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                         <div>
                            <div 
                                className="flex justify-center w-full rounded-lg border-2 border-dashed border-gray-300 px-6 py-10 cursor-pointer hover:border-primary"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <div className="text-center">
                                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                                    <p className="mt-2 text-sm text-gray-600">
                                       {csvFile ? `Selected: ${csvFile.name}` : 'Click to select a .csv file'}
                                    </p>
                                    <p className="text-xs text-gray-500">Max file size: 2MB</p>
                                </div>
                            </div>
                            <Input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept=".csv"
                                className="hidden"
                            />
                        </div>
                        <div className='space-y-4'>
                            {invitedUsers.length > 0 && (
                                <div className="space-y-4">
                                     <Card className="max-h-60 overflow-y-auto">
                                        <CardContent className="p-0">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Name</TableHead>
                                                        <TableHead>Email</TableHead>
                                                        <TableHead>Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {invitedUsers.map((user, index) => (
                                                        <TableRow key={index}>
                                                            <TableCell>{user.fullName}</TableCell>
                                                            <TableCell>{user.email}</TableCell>
                                                            <TableCell><Badge variant="secondary">{user.status}</Badge></TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                     </Card>
                                    <Button onClick={handleProcessInvitations} disabled={isImporting || invitedUsers.length === 0} className="w-full">
                                        {isImporting ? "Processing..." : `Invite ${invitedUsers.length} Users`}
                                    </Button>
                                </div>
                            )}
                            {invitedUsers.length === 0 && (
                                 <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-8 border rounded-lg h-full">
                                    <FileSpreadsheet className="w-10 h-10 mb-2"/>
                                    <p>CSV data will be previewed here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                 <CardContent className="p-6">
                    <Tabs defaultValue="pending">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                            <TabsTrigger value="users">All Users</TabsTrigger>
                            <TabsTrigger value="admins">Admins</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-4">
                            <UserTable title="Pending Requests" users={pendingUsers} onAction={handleUserApproval} onView={handleViewUser} showActions={true} loading={loading} />
                        </TabsContent>
                        <TabsContent value="users" className="mt-4">
                             <div className="flex items-center gap-4 mb-4">
                                <Select onValueChange={setFilterStatus} value={filterStatus}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Filter by status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="active">Active</SelectItem>
                                        <SelectItem value="disabled">Disabled</SelectItem>
                                        <SelectItem value="rejected">Rejected</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <UserTable title="All Users" users={allOtherUsers} onView={handleViewUser} onToggleStatus={handleToggleUserStatus} loading={loading} />
                        </TabsContent>
                        <TabsContent value="admins" className="mt-4">
                             <UserTable title="Administrators" users={admins} onView={handleViewUser} loading={loading} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>User Profile</DialogTitle>
                    </DialogHeader>
                    {selectedUser && (
                         <div className="flex flex-col items-center gap-4 pt-4">
                            <Avatar className="w-24 h-24">
                                <AvatarImage src={selectedUser.photoURL} alt={selectedUser.fullName} />
                                <AvatarFallback><UserIcon className="w-10 h-10" /></AvatarFallback>
                            </Avatar>
                            <div className="text-center">
                                <h2 className="text-xl font-semibold">{selectedUser.fullName}</h2>
                                <p className="text-muted-foreground">{selectedUser.email}</p>
                            </div>
                            <div className="flex gap-4">
                                <Badge variant="secondary">Role: {selectedUser.role}</Badge>
                                <Badge variant={selectedUser.status === 'active' ? 'default' : ['pending', 'rejected', 'disabled'].includes(selectedUser.status) ? 'destructive' : 'secondary'} className={selectedUser.status === 'active' ? 'bg-green-100 text-green-800' : ''}>
                                    Status: {selectedUser.status}
                                </Badge>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface UserTableProps {
    title: string;
    users: User[];
    loading: boolean;
    showActions?: boolean;
    onAction?: (userId: string, newStatus: 'active' | 'rejected') => void;
    onView: (user: User) => void;
    onToggleStatus?: (user: User) => void;
}

function UserTable({ title, users, loading, showActions = false, onAction, onView, onToggleStatus }: UserTableProps) {
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
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">Loading...</TableCell>
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
                                        } className={cn(
                                            user.status === 'active' && 'bg-green-100 text-green-800',
                                            user.status === 'disabled' && 'bg-red-100 text-red-800'
                                        )}>
                                            {user.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Button variant="outline" size="icon" onClick={() => onView(user)}>
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        {showActions && onAction && user.status === 'pending' && (
                                            <>
                                                <Button variant="outline" size="icon" onClick={() => onAction(user.uid, 'active')}><Check className="h-4 w-4 text-green-600" /></Button>
                                                <Button variant="outline" size="icon" onClick={() => onAction(user.uid, 'rejected')}><X className="h-4 w-4 text-red-600" /></Button>
                                            </>
                                        )}
                                        {onToggleStatus && user.role === 'user' && (user.status === 'active' || user.status === 'disabled') && (
                                            <Button 
                                                variant="outline" 
                                                size="icon" 
                                                onClick={() => onToggleStatus(user)}
                                                title={user.status === 'active' ? 'Disable User' : 'Enable User'}
                                            >
                                                {user.status === 'active' ? <UserX className="h-4 w-4 text-red-600" /> : <UserCheck className="h-4 w-4 text-green-600" />}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
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
