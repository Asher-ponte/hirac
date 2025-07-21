
"use client";

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, FilePenLine, Trash2, UserPlus, Building, Loader2, PlusCircle } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { User, UserRole, Department } from '@/lib/types';
import { getUsers, upsertUser, deleteUser, getDepartments, upsertDepartment, deleteDepartment } from './actions';


// Schemas
const userRoleOptions: UserRole[] = ['Admin', 'Safety Officer', 'Viewer'];

const userSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(userRoleOptions, { required_error: 'Role is required' }),
});
type UserFormValues = z.infer<typeof userSchema>;

const departmentSchema = z.object({
    id: z.number().optional(),
    name: z.string().min(1, 'Department name is required'),
    supervisorId: z.coerce.number().optional().nullable(),
});
type DepartmentFormValues = z.infer<typeof departmentSchema>;

// User Form
function UserForm({ user, users, onFinished }: { user?: User | null, users: User[], onFinished: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: {
            id: user?.id,
            name: user?.name ?? '',
            email: user?.email ?? '',
            role: user?.role ?? undefined,
        },
    });

    async function onSubmit(data: UserFormValues) {
        setIsSubmitting(true);
        try {
            await upsertUser(data);
            toast({ title: "Success", description: `User ${user ? 'updated' : 'created'} successfully.` });
            onFinished();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="role" render={({ field }) => (
                    <FormItem><FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                            <SelectContent>{userRoleOptions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

// Department Form
function DepartmentForm({ department, users, onFinished }: { department?: Department | null, users: User[], onFinished: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<DepartmentFormValues>({
        resolver: zodResolver(departmentSchema),
        defaultValues: {
            id: department?.id,
            name: department?.name ?? '',
            supervisorId: department?.supervisorId ?? null,
        },
    });

    async function onSubmit(data: DepartmentFormValues) {
        setIsSubmitting(true);
        try {
            await upsertDepartment(data);
            toast({ title: "Success", description: `Department ${department ? 'updated' : 'created'} successfully.` });
            onFinished();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: (error as Error).message });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Department Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="supervisorId" render={({ field }) => (
                    <FormItem><FormLabel>Supervisor</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ? String(field.value) : undefined}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select a supervisor" /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="null">None</SelectItem>
                                {users.filter(u => u.role === 'Safety Officer' || u.role === 'Admin').map(u => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    <FormMessage /></FormItem>
                )} />
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export default function AdminPage() {
    const { toast } = useToast();
    const [loading, setLoading] = React.useState(true);
    const [users, setUsers] = React.useState<User[]>([]);
    const [departments, setDepartments] = React.useState<Department[]>([]);
    
    // User Dialog
    const [userDialogOpen, setUserDialogOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

    // Department Dialog
    const [departmentDialogOpen, setDepartmentDialogOpen] = React.useState(false);
    const [selectedDepartment, setSelectedDepartment] = React.useState<Department | null>(null);
    
    const roleVariantMap: { [key in User['role']]: 'default' | 'secondary' | 'outline' } = {
        Admin: 'default',
        'Safety Officer': 'outline',
        Viewer: 'secondary',
    };

    const loadData = React.useCallback(async () => {
        setLoading(true);
        try {
            const [usersData, departmentsData] = await Promise.all([getUsers(), getDepartments({ withSupervisor: true })]);
            setUsers(usersData);
            setDepartments(departmentsData);
        } catch (error) {
            toast({ variant: 'destructive', title: "Error loading data", description: (error as Error).message });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const onFormFinished = () => {
        setUserDialogOpen(false);
        setDepartmentDialogOpen(false);
        loadData();
    };

    // User actions
    const handleNewUser = () => {
        setSelectedUser(null);
        setUserDialogOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setUserDialogOpen(true);
    };

    const handleDeleteUser = async (userId: number) => {
        try {
            await deleteUser(userId);
            toast({ title: "Success", description: "User deleted." });
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: (error as Error).message });
        }
    };

    // Department actions
    const handleNewDepartment = () => {
        setSelectedDepartment(null);
        setDepartmentDialogOpen(true);
    };

    const handleEditDepartment = (department: Department) => {
        setSelectedDepartment(department);
        setDepartmentDialogOpen(true);
    };

    const handleDeleteDepartment = async (departmentId: number) => {
        try {
            await deleteDepartment(departmentId);
            toast({ title: "Success", description: "Department deleted." });
            loadData();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: (error as Error).message });
        }
    };

    return (
    <>
        <Tabs defaultValue="users" className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
                <p className="text-muted-foreground">Manage users, roles, and system-wide settings.</p>
            </div>
            <TabsList>
                <TabsTrigger value="users">User Management</TabsTrigger>
                <TabsTrigger value="departments">Department Management</TabsTrigger>
            </TabsList>
            
            <TabsContent value="users">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Users</CardTitle>
                                <CardDescription>Manage your team members and their account permissions.</CardDescription>
                            </div>
                            <Button onClick={handleNewUser}><UserPlus className="mr-2 h-4 w-4" /> Add User</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.name}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell><Badge variant={roleVariantMap[user.role]}>{user.role}</Badge></TableCell>
                                        <TableCell>
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditUser(user)}><FilePenLine className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will permanently delete the user.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteUser(user.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>

            <TabsContent value="departments">
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Departments</CardTitle>
                                <CardDescription>Manage organizational departments and their assigned supervisors.</CardDescription>
                            </div>
                            <Button onClick={handleNewDepartment}><Building className="mr-2 h-4 w-4" /> Add Department</Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" /> : (
                            <Table>
                                <TableHeader><TableRow><TableHead>Department Name</TableHead><TableHead>Supervisor</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {departments.map((dept) => (
                                    <TableRow key={dept.id}>
                                        <TableCell className="font-medium">{dept.name}</TableCell>
                                        <TableCell>{dept.supervisor?.name ?? <span className="text-muted-foreground">None</span>}</TableCell>
                                        <TableCell>
                                             <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleEditDepartment(dept)}><FilePenLine className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone and will permanently delete the department.</AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteDepartment(dept.id)}>Delete</AlertDialogAction></AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>

        {/* User Dialog */}
        <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedUser ? 'Edit User' : 'Add New User'}</DialogTitle>
                </DialogHeader>
                <UserForm user={selectedUser} users={users} onFinished={onFormFinished} />
            </DialogContent>
        </Dialog>

        {/* Department Dialog */}
        <Dialog open={departmentDialogOpen} onOpenChange={setDepartmentDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{selectedDepartment ? 'Edit Department' : 'Add New Department'}</DialogTitle>
                </DialogHeader>
                <DepartmentForm department={selectedDepartment} users={users} onFinished={onFormFinished} />
            </DialogContent>
        </Dialog>
    </>
    );

    