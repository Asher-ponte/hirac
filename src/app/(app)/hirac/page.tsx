
"use client";

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { HiracEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FilePlus2, AlertTriangle, ShieldCheck, ChevronsRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const likelihoodOptions = [
  { value: 5, label: "It may happen every day / week" },
  { value: 4, label: "It may happen every month" },
  { value: 3, label: "It may happen every three months" },
  { value: 2, label: "It may happen every six months" },
  { value: 1, label: "It may happen every year" },
];

const severityOptions = [
  { value: 5, label: "Catastrophic: May result to death or loss of facility" },
  { value: 4, label: "Major: May cause lost time injury, severe occupational illness or massive property damage" },
  { value: 3, label: "Significant: May cause injury or occupational illness that may require medical treatment and may cause major property damage" },
  { value: 2, label: "Minor: May cause minor injury or first aid case or minor damage to property" },
  { value: 1, label: "Insignificant: No harm or impact to people" },
];

const hiracData: HiracEntry[] = [
  { id: 'HIRAC-001', task: 'Manual Handling', hazard: 'Lifting heavy objects', likelihood: 3, severity: 3, riskLevel: 9, controlMeasures: 'Provide mechanical aids (trolleys), training on proper lifting techniques', residualRisk: 3 },
  { id: 'HIRAC-002', task: 'Working at Height', hazard: 'Using ladders', likelihood: 2, severity: 5, riskLevel: 10, controlMeasures: 'Use of scaffolding or EWP, implement fall arrest systems, ladder inspections', residualRisk: 5 },
  { id: 'HIRAC-003', task: 'Chemical Handling', hazard: 'Handling cleaning solvents', likelihood: 3, severity: 2, riskLevel: 6, controlMeasures: 'Provide PPE (gloves, masks), ensure good ventilation, use less hazardous chemicals', residualRisk: 2 },
  { id: 'HIRAC-004', task: 'Electrical Work', hazard: 'Faulty equipment wiring', likelihood: 2, severity: 5, riskLevel: 10, controlMeasures: 'Regular inspection and testing of equipment, use of RCDs, remove faulty equipment from service', residualRisk: 2 },
  { id: 'HIRAC-005', task: 'Machine Operation', hazard: 'Operating noisy machinery', likelihood: 4, severity: 4, riskLevel: 16, controlMeasures: 'Use of ear protection, job rotation, acoustic enclosures for machinery', residualRisk: 8 },
];

const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return { label: 'Low Risk', variant: 'secondary', color: 'bg-green-500' } as const;
  if (level <= 12) return { label: 'Medium Risk', variant: 'default', color: 'bg-yellow-500' } as const;
  return { label: 'High Risk', variant: 'destructive', color: 'bg-red-500' } as const;
};

function HiracForm() {
    const [likelihood, setLikelihood] = React.useState<number | undefined>();
    const [severity, setSeverity] = React.useState<number | undefined>();
    const [riskLevel, setRiskLevel] = React.useState<number | undefined>();

    React.useEffect(() => {
        if(likelihood && severity) {
            setRiskLevel(likelihood * severity);
        } else {
            setRiskLevel(undefined);
        }
    }, [likelihood, severity])
    
    const riskDetails = riskLevel !== undefined ? getRiskLevelDetails(riskLevel) : null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label htmlFor="task">Task/Job/Activity</Label>
                <Input id="task" placeholder="e.g., Manual Handling" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="hazard">Hazard</Label>
                <Input id="hazard" placeholder="e.g., Lifting heavy objects" />
            </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
                <CardDescription>Determine the risk level by selecting the likelihood and severity.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                 <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="likelihood">Likelihood of Occurrence</Label>
                        <Select onValueChange={(val) => setLikelihood(Number(val))}>
                            <SelectTrigger id="likelihood">
                                <SelectValue placeholder="Select likelihood..." />
                            </SelectTrigger>
                            <SelectContent>
                                {likelihoodOptions.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="severity">Severity of Hazard</Label>
                        <Select onValueChange={(val) => setSeverity(Number(val))}>
                            <SelectTrigger id="severity">
                                <SelectValue placeholder="Select severity..." />
                            </SelectTrigger>
                            <SelectContent>
                                {severityOptions.map(opt => (
                                    <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-4 p-4 bg-muted rounded-lg h-full">
                    {riskDetails ? (
                        <>
                            <div className={`p-4 rounded-full ${riskDetails.color}`}>
                                <AlertTriangle className="h-8 w-8 text-white" />
                            </div>
                            <p className="text-sm text-muted-foreground">Calculated Risk Level</p>
                            <h3 className="text-3xl font-bold">{riskLevel}</h3>
                            <Badge variant={riskDetails.variant}>{riskDetails.label}</Badge>
                        </>
                    ) : (
                        <div className="text-center text-muted-foreground">
                            <p>Risk Level will be calculated here.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
        
        <div className="space-y-2">
            <Label htmlFor="control-measures">Control Measures</Label>
            <Textarea id="control-measures" placeholder="Describe the control measures to be implemented..." rows={4} />
        </div>
      </div>
    );
}

export default function HiracPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">HIRAC Register</h1>
            <p className="text-muted-foreground">Hazard Identification, Risk Assessment, and Control</p>
        </div>
        <Dialog>
            <DialogTrigger asChild>
                <Button>
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    New HIRAC Entry
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>New HIRAC Entry</DialogTitle>
                    <DialogDescription>
                        Complete the form to add a new hazard identification and risk assessment.
                    </DialogDescription>
                </DialogHeader>
                <HiracForm />
                <DialogFooter>
                    <DialogClose asChild>
                      <Button type="button" variant="secondary">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save Entry</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
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
                <TableHead>Task/Job</TableHead>
                <TableHead>Hazard</TableHead>
                <TableHead>Initial Risk</TableHead>
                <TableHead className="text-center">Control Measures</TableHead>
                <TableHead>Residual Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {hiracData.map((item) => {
                const initialRiskDetails = getRiskLevelDetails(item.riskLevel);
                const residualRiskDetails = getRiskLevelDetails(item.residualRisk);
                const likelihoodLabel = likelihoodOptions.find(o => o.value === item.likelihood)?.label;
                const severityLabel = severityOptions.find(o => o.value === item.severity)?.label;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.task}</TableCell>
                    <TableCell>{item.hazard}</TableCell>
                    <TableCell>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Badge variant={initialRiskDetails.variant} className="cursor-pointer">
                                        {item.riskLevel} - {initialRiskDetails.label}
                                    </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Likelihood: {item.likelihood} ({likelihoodLabel})</p>
                                    <p>Severity: {item.severity} ({severityLabel})</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </TableCell>
                    <TableCell className="max-w-xs">{item.controlMeasures}</TableCell>
                    <TableCell>
                        <Badge variant={residualRiskDetails.variant}>{item.residualRisk} - {residualRiskDetails.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// Minimal Tooltip components for use in this page
// This avoids needing to pass props down from a page-level provider
const TooltipProvider = React.lazy(() => import('@/components/ui/tooltip').then(m => ({ default: m.TooltipProvider })));
const Tooltip = React.lazy(() => import('@/components/ui/tooltip').then(m => ({ default: m.Tooltip })));
const TooltipTrigger = React.lazy(() => import('@/components/ui/tooltip').then(m => ({ default: m.TooltipTrigger })));
const TooltipContent = React.lazy(() => import('@/components/ui/tooltip').then(m => ({ default: m.TooltipContent })));

