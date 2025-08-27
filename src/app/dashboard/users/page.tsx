
"use client";

<<<<<<< HEAD
import { useState, useEffect, useCallback } from 'react';
=======
import { useState, useEffect, useMemo } from 'react';
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
<<<<<<< HEAD
import { PlusCircle, Check, X } from 'lucide-react';
=======
import { PlusCircle, Check, X, MoreVertical, Trash2, Edit, UserX, ArrowUpDown } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
import type { User } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
<<<<<<< HEAD
import { useRouter } from 'next/navigation';
=======
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

type SortConfig = { key: keyof User; direction: 'ascending' | 'descending' } | null;
type FilterConfig = { status: 'all' | User['status']; role: 'all' | User['role'] };
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)

export default function UsersPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

<<<<<<< HEAD
    const fetchUsers = useCallback(async (currentOrgId: string) => {
        if (!currentOrgId) return;
=======
    // Dialog states
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<User | null>(null);
    const [newUserName, setNewUserName] = useState('');
    
    // Add user form states
    const [newUserFullName, setNewUserFullName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<'user' | 'admin'>('user');

    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [filters, setFilters] = useState<FilterConfig>({ status: 'all', role: 'all' });


    const fetchUsers = async (orgId: string) => {
        if (!orgId) return;
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
        setLoading(true);
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('org_id', currentOrgId);

        if (error) {
            toast({ title: 'Error fetching users', description: error.message, variant: 'destructive' });
        } else {
            setUsers(data || []);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => {
        const initializePage = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const { data: user, error } = await supabase
                    .from('users')
                    .select('org_id')
                    .eq('id', session.user.id)
                    .limit(1)
                    .maybeSingle();

                if (error) {
                    console.error("Error fetching user data:", error);
                    toast({ title: 'Error', description: 'Could not find user organization.', variant: 'destructive' });
                    setLoading(false);
                    router.push('/login');
                    return;
                }
                
                if (user?.org_id) {
                    setOrgId(user.org_id);
                    await fetchUsers(user.org_id);
                } else if (!user) {
                    setLoading(true);
                } else {
                    toast({ title: 'Error', description: 'Could not find user organization.', variant: 'destructive' });
                    setLoading(false);
                    router.push('/login');
                }
            } else {
                router.push('/login');
                setLoading(false);
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
        return () => authListener.subscription.unsubscribe();
    }, [router, toast, fetchUsers]);

    const handleUserApproval = async (userId: string, newStatus: 'active' | 'rejected') => {
        try {
            const { error } = await supabase
                .from('users')
                .update({ status: newStatus })
                .eq('id', userId);
            
            if (error) throw error;

            toast({ title: 'Success', description: `User status has been updated.` });
<<<<<<< HEAD
            if (orgId) fetchUsers(orgId); // Refresh users list
=======
            if (orgId) fetchUsers(orgId);
        } catch (error) {
            console.error('Error updating user status:', error);
            toast({ title: 'Error', description: 'Failed to update user status.', variant: 'destructive' });
        }
    };

    const handleEditUser = (user: User) => {
        setUserToEdit(user);
        setNewUserName(user.fullName);
        setIsEditUserOpen(true);
    };

    const handleSaveUser = async () => {
        if (!userToEdit || !newUserName.trim()) return;
        try {
            const userRef = doc(db, 'users', userToEdit.uid);
            await updateDoc(userRef, { fullName: newUserName });
            toast({ title: "User Updated", description: "The user's name has been changed." });
            setIsEditUserOpen(false);
            setUserToEdit(null);
            if (orgId) fetchUsers(orgId);
        } catch (error) {
            toast({ title: "Error", description: "Failed to update user.", variant: "destructive" });
        }
    }
    
    const handleDisableUser = async (userId: string) => {
         try {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { status: 'disabled' });
            toast({ title: "User Disabled", description: "The user's account has been disabled." });
            if (orgId) fetchUsers(orgId);
        } catch (error) {
            toast({ title: "Error", description: "Failed to disable user.", variant: "destructive" });
        }
    }
    
    const handleDeleteUser = async (userId: string) => {
        try {
            await deleteDoc(doc(db, "users", userId));
            toast({ title: "User Deleted", description: "The user's record has been removed from the database." });
            if (orgId) fetchUsers(orgId);
        } catch (error) {
            toast({ title: "Error", description: "Failed to delete user.", variant: "destructive" });
        }
    }
    
    const handleAddAccount = async () => {
        if (!newUserFullName || !newUserEmail || !orgId) {
            toast({ title: "Missing fields", description: "Please fill all fields.", variant: "destructive" });
            return;
        }

        try {
            console.warn("User creation in Firebase Auth should be handled by a secure backend function.");
            
            await addDoc(collection(db, "users"), {
                org_id: orgId,
                fullName: newUserFullName,
                email: newUserEmail,
                role: newUserRole,
                status: 'pending' // New users start as pending
            });

            await sendPasswordResetEmail(auth, newUserEmail);

            toast({ title: "Invitation Sent", description: `An invitation email has been sent to ${newUserEmail} to set their password.` });
            setIsAddUserOpen(false);
            setNewUserEmail('');
            setNewUserFullName('');
            setNewUserRole('user');
            if (orgId) fetchUsers(orgId);

>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
        } catch (error: any) {
            console.error('Error updating user status:', error);
            toast({ title: 'Error', description: error.message || 'Failed to update user status.', variant: 'destructive' });
        }
    };
    
    const requestSort = (key: keyof User) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

<<<<<<< HEAD
    const activeUsers = users.filter(u => u.status === 'active' && u.role === 'user');
=======
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
    const pendingUsers = users.filter(u => u.status === 'pending');
    const admins = users.filter(u => u.role === 'admin');
    
    const allOtherUsers = useMemo(() => {
        let sortableItems = users.filter(u => u.status !== 'pending' && u.role !== 'admin');
        
        if(filters.status !== 'all') {
            sortableItems = sortableItems.filter(u => u.status === filters.status);
        }
         if(filters.role !== 'all') {
            sortableItems = sortableItems.filter(u => u.role === filters.role);
        }
        
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;

    }, [users, sortConfig, filters]);

    return (
        <div className="flex flex-col gap-8">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-neutral-900">Org Users</h1>
                    <p className="text-neutral-600 mt-1">Manage users and approve requests within your organization.</p>
                </div>
<<<<<<< HEAD
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Invite User
                </Button>
=======
                <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add New Account
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add a New Account</DialogTitle>
                            <DialogDescription>
                                An email will be sent to the user to set their password. Their account will be pending until their first login.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-name" className="text-right">Full Name</Label>
                                <Input id="new-name" value={newUserFullName} onChange={(e) => setNewUserFullName(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-email" className="text-right">Email</Label>
                                <Input id="new-email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="new-role" className="text-right">Role</Label>
                                <Select onValueChange={(value: 'user' | 'admin') => setNewUserRole(value)} defaultValue={newUserRole}>
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="user">User</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                            <Button onClick={handleAddAccount}>Create & Send Invite</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
            </header>
            <Card>
                 <CardContent className="p-6">
                    <Tabs defaultValue="pending">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="pending">Pending Requests</TabsTrigger>
                            <TabsTrigger value="all_users">All Users</TabsTrigger>
                            <TabsTrigger value="admins">Admins</TabsTrigger>
                        </TabsList>
                        <TabsContent value="pending" className="mt-4">
                            <UserTable title="Pending Requests" users={pendingUsers} onAction={handleUserApproval} showActions={true} loading={loading} />
                        </TabsContent>
<<<<<<< HEAD
                        <TabsContent value="users" className="mt-4">
                            <UserTable title="Active Users" users={activeUsers} loading={loading} />
=======
                        <TabsContent value="all_users" className="mt-4">
                            <UserTable 
                                title="All Users" 
                                users={allOtherUsers} 
                                loading={loading}
                                onEdit={handleEditUser}
                                onDisable={handleDisableUser}
                                onDelete={handleDeleteUser}
                                onSort={requestSort}
                                sortConfig={sortConfig}
                                onFilterChange={setFilters}
                                filters={filters}
                                isFilterable={true}
                            />
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
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
    isFilterable?: boolean;
    onAction?: (userId: string, newStatus: 'active' | 'rejected') => void;
<<<<<<< HEAD
}

function UserTable({ title, users, loading, showActions = false, onAction }: UserTableProps) {
=======
    onEdit?: (user: User) => void;
    onDisable?: (userId: string) => void;
    onDelete?: (userId: string) => void;
    onSort?: (key: keyof User) => void;
    sortConfig?: SortConfig;
    onFilterChange?: (filters: FilterConfig) => void;
    filters?: FilterConfig;
}

function UserTable({ 
    title, users, loading, showActions = false, isFilterable = false, 
    onAction, onEdit, onDisable, onDelete, onSort, sortConfig, onFilterChange, filters
}: UserTableProps) {

    const getSortIcon = (key: keyof User) => {
        if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
        return sortConfig.direction === 'ascending' ? '🔼' : '🔽';
    };

>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle>{title}</CardTitle>
                    {isFilterable && onFilterChange && filters && (
                        <div className="flex gap-2">
                             <Select value={filters.status} onValueChange={(value) => onFilterChange({...filters, status: value as FilterConfig['status']})}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Filter by Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="disabled">Disabled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Full Name</TableHead>
                            <TableHead>Email</TableHead>
<<<<<<< HEAD
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            {showActions && <TableHead>Actions</TableHead>}
=======
                            <TableHead>
                                <Button variant="ghost" onClick={() => onSort && onSort('role')}>
                                    Role {onSort && getSortIcon('role')}
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => onSort && onSort('status')}>
                                    Status {onSort && getSortIcon('status')}
                                </Button>
                            </TableHead>
                            {(showActions || onEdit) && <TableHead>Actions</TableHead>}
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
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
<<<<<<< HEAD
                                    {showActions && onAction && (
                                        <TableCell className="flex gap-2">
                                            <Button variant="outline" size="icon" onClick={() => onAction(user.id, 'active')}><Check className="h-4 w-4 text-green-600" /></Button>
                                            <Button variant="outline" size="icon" onClick={() => onAction(user.id, 'rejected')}><X className="h-4 w-4 text-red-600" /></Button>
                                        </TableCell>
                                    )}
=======
                                    {(showActions || onEdit) &&
                                    <TableCell>
                                        {showActions && onAction && user.status === 'pending' && (
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="icon" onClick={() => onAction(user.uid, 'active')}><Check className="h-4 w-4 text-green-600" /></Button>
                                                <Button variant="outline" size="icon" onClick={() => onAction(user.uid, 'rejected')}><X className="h-4 w-4 text-red-600" /></Button>
                                            </div>
                                        )}
                                        {onEdit && onDisable && onDelete && user.status !== 'pending' && user.role !== 'admin' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={() => onEdit(user)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => onDisable(user.uid)}><UserX className="mr-2 h-4 w-4" /> Disable</DropdownMenuItem>
                                                    
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>This action cannot be undone. This will permanently delete the user's account data.</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => onDelete(user.uid)} className="bg-destructive hover:bg-destructive/90">Delete User</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                    
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </TableCell>
                                    }
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
<<<<<<< HEAD
                                <TableCell colSpan={showActions ? 5 : 4} className="h-24 text-center">
                                    No users found in this category.
=======
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No users found.
>>>>>>> 25b4d51 (reg this point - I will replace it with a single, unified "All Users" ta)
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
