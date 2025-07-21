
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FilePenLine, Trash2 } from 'lucide-react';
import type { Inspection } from '@/lib/types';

const inspectionsData: Inspection[] = [
  { id: 'INS-001', hazard_description: 'Slippery floor near entrance due to recent spill. Needs immediate attention.', location: 'Warehouse A', risk_level: 'Medium', status: 'In Progress', inspection_date: '2023-10-26', assigned_user: 'John Doe', control_measures: 'Clean spill, put up wet floor sign.' },
  { id: 'INS-002', hazard_description: 'Exposed electrical wiring in the main office area, posing a shock hazard.', location: 'Office Wing B', risk_level: 'High', status: 'Open', inspection_date: '2023-10-25', assigned_user: 'Jane Smith', control_measures: 'Cover wiring, schedule electrician.' },
  { id: 'INS-003', hazard_description: 'The primary fire exit on the factory floor is blocked by pallets of materials.', location: 'Factory Floor', risk_level: 'Critical', status: 'Resolved', inspection_date: '2023-10-24', assigned_user: 'John Doe', control_measures: 'Pallets moved, area cleared.' },
  { id: 'INS-004', hazard_description: 'Lack of adequate safety signage in the new loading bay area.', location: 'Loading Bay', risk_level: 'Low', status: 'Resolved', inspection_date: '2023-10-23', assigned_user: 'Emily White', control_measures: 'New signs ordered and installed.' },
  { id: 'INS-005', hazard_description: 'Faulty smoke detector in the break room. It fails self-test procedure.', location: 'Staff Break Room', risk_level: 'High', status: 'Open', inspection_date: '2023-10-22', assigned_user: 'Jane Smith', control_measures: 'Replace smoke detector unit.' },
  { id: 'INS-006', hazard_description: 'Chemicals stored without proper labeling in Lab 3.', location: 'Research Lab 3', risk_level: 'Medium', status: 'In Progress', inspection_date: '2023-10-21', assigned_user: 'John Doe', control_measures: 'Relabel all containers according to protocol.' },
];

const riskVariantMap: { [key in Inspection['risk_level']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Low: 'secondary',
  Medium: 'default',
  High: 'outline',
  Critical: 'destructive',
};

const statusVariantMap: { [key in Inspection['status']]: 'default' | 'secondary' | 'outline' } = {
    Open: 'default',
    'In Progress': 'outline',
    Resolved: 'secondary',
};

export default function InspectionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Inspections</h1>
        <p className="text-muted-foreground">Manage and review all workplace safety inspections.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {inspectionsData.map((inspection) => (
          <Card key={inspection.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1 pr-4">
                  <CardTitle className="text-lg">{inspection.location}</CardTitle>
                  <CardDescription>{`ID: ${inspection.id} - ${inspection.inspection_date}`}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 -mt-1 -mr-2">
                      <MoreHorizontal className="h-4 w-4" />
                       <span className="sr-only">More options</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem><FilePenLine className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="flex-grow space-y-4">
              <p className="text-sm text-foreground">{inspection.hazard_description}</p>
              <div>
                <h4 className="mb-1 text-sm font-semibold">Control Measures</h4>
                <p className="text-sm text-muted-foreground">{inspection.control_measures}</p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Badge variant={riskVariantMap[inspection.risk_level]}>{inspection.risk_level}</Badge>
              <Badge variant={statusVariantMap[inspection.status]}>{inspection.status}</Badge>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
