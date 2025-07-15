import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, FilePenLine, Trash2, Download } from 'lucide-react';
import type { User } from '@/lib/types';

const users: User[] = [
  { id: 'USR-001', name: 'John Doe', email: 'john.doe@example.com', role: 'Safety Officer', last_login: '2023-10-26 10:00 AM' },
  { id: 'USR-002', name: 'Jane Smith', email: 'jane.smith@example.com', role: 'Safety Officer', last_login: '2023-10-26 09:30 AM' },
  { id: 'USR-003', name: 'Admin User', email: 'admin@example.com', role: 'Admin', last_login: '2023-10-25 02:00 PM' },
  { id: 'USR-004', name: 'Emily White', email: 'emily.white@example.com', role: 'Viewer', last_login: '2023-10-24 11:00 AM' },
];

const reports = [
    { id: 'REP-001', title: 'Q3 Hazard Summary - All Locations', date: '2023-10-01', type: 'PDF' },
    { id: 'REP-002', title: 'Warehouse A - Critical Issues', date: '2023-09-28', type: 'CSV' },
    { id: 'REP-003', title: 'Monthly Safety Report - September', date: '2023-09-30', type: 'PDF' },
];

const roleVariantMap: { [key in User['role']]: 'default' | 'secondary' | 'outline' } = {
  Admin: 'default',
  'Safety Officer': 'outline',
  Viewer: 'secondary',
};

export default function AdminPage() {
  return (
    <Tabs defaultValue="users" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
        <p className="text-muted-foreground">Manage users, roles, and system-wide settings.</p>
      </div>
      <TabsList>
        <TabsTrigger value="users">User Management</TabsTrigger>
        <TabsTrigger value="reports">Reports</TabsTrigger>
      </TabsList>
      
      <TabsContent value="users">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Manage your team members and their account permissions.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell><Badge variant={roleVariantMap[user.role]}>{user.role}</Badge></TableCell>
                    <TableCell>{user.last_login}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem><FilePenLine className="mr-2 h-4 w-4" /> Edit User</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete User</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="reports">
        <Card>
          <CardHeader>
            <CardTitle>Generated Reports</CardTitle>
            <CardDescription>View and download system-generated reports.</CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Report Title</TableHead>
                  <TableHead>Date Generated</TableHead>
                  <TableHead>File Type</TableHead>
                  <TableHead><span className="sr-only">Actions</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.title}</TableCell>
                    <TableCell>{report.date}</TableCell>
                    <TableCell><Badge variant="secondary">{report.type}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" /> Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
