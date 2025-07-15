import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { Hirac } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FilePlus2 } from 'lucide-react';

const hiracData: Hirac[] = [
  { id: 'HIRAC-001', hazard: 'Manual Handling - Lifting heavy objects', consequence: 'Musculoskeletal injuries (sprains, strains)', likelihood: 'Possible', risk_level: 'Medium', control_measures: 'Provide mechanical aids (trolleys), training on proper lifting techniques', residual_risk: 'Low' },
  { id: 'HIRAC-002', hazard: 'Working at Height - Using ladders', consequence: 'Falls from height causing serious injury or fatality', likelihood: 'Unlikely', risk_level: 'High', control_measures: 'Use of scaffolding or EWP, implement fall arrest systems, ladder inspections', residual_risk: 'Medium' },
  { id: 'HIRAC-003', hazard: 'Chemicals - Handling cleaning solvents', consequence: 'Skin irritation, respiratory issues', likelihood: 'Possible', risk_level: 'Medium', control_measures: 'Provide PPE (gloves, masks), ensure good ventilation, use less hazardous chemicals', residual_risk: 'Low' },
  { id: 'HIRAC-004', hazard: 'Electrical - Faulty equipment wiring', consequence: 'Electric shock, burns, fire', likelihood: 'Unlikely', risk_level: 'Critical', control_measures: 'Regular inspection and testing of equipment, use of RCDs, remove faulty equipment from service', residual_risk: 'Low' },
  { id: 'HIRAC-005', hazard: 'Noise - Operating machinery', consequence: 'Hearing loss (long-term exposure)', likelihood: 'Likely', risk_level: 'High', control_measures: 'Use of ear protection, job rotation, acoustic enclosures for machinery', residual_risk: 'Medium' },
];

const riskVariantMap: { [key in Hirac['risk_level']]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
  Low: 'secondary',
  Medium: 'default',
  High: 'outline',
  Critical: 'destructive',
};

export default function HiracPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">HIRAC Register</h1>
            <p className="text-muted-foreground">Hazard Identification, Risk Assessment, and Control</p>
        </div>
        <Button>
            <FilePlus2 className="mr-2 h-4 w-4" />
            New HIRAC Entry
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HIRAC Table</CardTitle>
          <CardDescription>A register of all identified hazards, their risks, and control measures.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hazard</TableHead>
                <TableHead>Consequence</TableHead>
                <TableHead>Likelihood</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Control Measures</TableHead>
                <TableHead>Residual Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hiracData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.hazard}</TableCell>
                  <TableCell>{item.consequence}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{item.likelihood}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={riskVariantMap[item.risk_level]}>{item.risk_level}</Badge>
                  </TableCell>
                   <TableCell>{item.control_measures}</TableCell>
                  <TableCell>
                    <Badge variant={riskVariantMap[item.residual_risk]}>{item.residual_risk}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
