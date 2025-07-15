
"use client";

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { HiracEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FilePlus2, AlertTriangle, ChevronsRight, ArrowLeft, ArrowRight, BrainCircuit, Loader2 } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createHiracEntry, getHiracEntries } from './actions';
import { useToast } from '@/hooks/use-toast';


const likelihoodOptions = [
  { value: 5, label: "5 - It may happen every day / week" },
  { value: 4, label: "4 - It may happen every month" },
  { value: 3, label: "3 - It may happen every three months" },
  { value: 2, label: "2 - It may happen every six months" },
  { value: 1, label: "1 - It may happen every year" },
];

const severityOptions = [
  { value: 5, label: "5 - Catastrophic: May result to death or loss of facility" },
  { value: 4, label: "4 - Major: May cause lost time injury, severe occupational illness or massive property damage" },
  { value: 3, label: "3 - Significant: May cause injury or occupational illness that may require medical treatment and may cause major property damage" },
  { value: 2, label: "2 - Minor: May cause minor injury or first aid case or minor damage to property" },
  { value: 1, label: "1 - Insignificant: No harm or impact to people" },
];

const statusOptions = ['Ongoing', 'Implemented', 'Not Implemented'];

const hiracFormSchema = z.object({
    task: z.string().min(1, "Task is required."),
    hazard: z.string().min(1, "Hazard is required."),
    cause: z.string().min(1, "Cause is required."),
    effect: z.string().min(1, "Effect is required."),
    initialLikelihood: z.coerce.number().min(1, "Likelihood is required."),
    initialSeverity: z.coerce.number().min(1, "Severity is required."),
    controlMeasures: z.string().min(1, "Control measures are required."),
    responsiblePerson: z.string().min(1, "Responsible person is required."),
    status: z.enum(['Ongoing', 'Implemented', 'Not Implemented']),
    // The database expects these fields, but they are not in the form.
    // We will provide default values before submitting.
    residualLikelihood: z.coerce.number().optional(),
    residualSeverity: z.coerce.number().optional(),
});

type HiracFormValues = z.infer<typeof hiracFormSchema>;

const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return { label: 'Low Risk', variant: 'secondary', color: 'bg-green-500 text-green-50' } as const;
  if (level <= 12) return { label: 'Medium Risk', variant: 'default', color: 'bg-yellow-500 text-yellow-50' } as const;
  return { label: 'High Risk', variant: 'destructive', color: 'bg-red-500 text-red-50' } as const;
};

const RiskDisplay = ({ likelihood, severity }: { likelihood?: number, severity?: number }) => {
    const riskLevel = (likelihood && severity) ? likelihood * severity : undefined;
    const riskDetails = riskLevel !== undefined ? getRiskLevelDetails(riskLevel) : null;

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4 bg-muted rounded-lg h-full min-h-[180px]">
            {riskDetails ? (
                <>
                    <div className={cn("p-4 rounded-full", riskDetails.color)}>
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <p className="text-sm text-muted-foreground">Calculated Risk Level</p>
                    <h3 className="text-3xl font-bold">{riskLevel}</h3>
                    <Badge variant={riskDetails.variant}>{riskDetails.label}</Badge>
                </>
            ) : (
                <div className="text-center text-muted-foreground">
                     <BrainCircuit className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50"/>
                    <p>Risk Level will be calculated here.</p>
                </div>
            )}
        </div>
    )
};


function HiracForm({ setOpen }: { setOpen: (open: boolean) => void }) {
    const [step, setStep] = React.useState(1);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<HiracFormValues>({
        resolver: zodResolver(hiracFormSchema),
        defaultValues: {
            task: '',
            hazard: '',
            cause: '',
            effect: '',
            controlMeasures: '',
            responsiblePerson: '',
            status: 'Ongoing',
        }
    });

    const initialLikelihood = form.watch('initialLikelihood');
    const initialSeverity = form.watch('initialSeverity');

    async function onSubmit(data: HiracFormValues) {
        setIsSubmitting(true);
        try {
            // Since residual values are not in the form, we set them to the initial values by default.
            const submissionData = {
                ...data,
                residualLikelihood: data.initialLikelihood,
                residualSeverity: data.initialSeverity,
            };
            await createHiracEntry(submissionData);
            toast({
                title: "Success",
                description: "New HIRAC entry created successfully.",
            });
            form.reset();
            setOpen(false);
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to create HIRAC entry. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const triggerStep2Validation = async () => {
        const isValid = await form.trigger(['task', 'hazard', 'cause', 'effect', 'initialLikelihood', 'initialSeverity']);
        if (isValid) {
            setStep(2);
        }
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {step === 1 && (
                <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle>Step 1: Hazard Identification &amp; Initial Risk Assessment</CardTitle>
                        <CardDescription>Identify the task, hazard, cause, and effect, then assess the initial risk.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="task" render={({ field }) => (
                                    <FormItem><FormLabel>Task/Job</FormLabel><FormControl><Input placeholder="e.g., Transportation Services" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="hazard" render={({ field }) => (
                                    <FormItem><FormLabel>Hazard</FormLabel><FormControl><Input placeholder="e.g., Riding on the Shuttle" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                             <FormField control={form.control} name="cause" render={({ field }) => (
                                <FormItem><FormLabel>Cause</FormLabel><FormControl><Textarea placeholder="e.g., No Maintenance of shuttle service" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="effect" render={({ field }) => (
                                <FormItem><FormLabel>Effect</FormLabel><FormControl><Textarea placeholder="e.g., Car Accident, Death" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="space-y-4">
                             <FormField control={form.control} name="initialLikelihood" render={({ field }) => (
                                <FormItem><FormLabel>Likelihood of Occurrence (L)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select likelihood..." /></SelectTrigger></FormControl>
                                        <SelectContent>{likelihoodOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                           <FormField control={form.control} name="initialSeverity" render={({ field }) => (
                                <FormItem><FormLabel>Severity of Hazard (S)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select severity..." /></SelectTrigger></FormControl>
                                        <SelectContent>{severityOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                            <RiskDisplay likelihood={initialLikelihood} severity={initialSeverity} />
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                 <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle>Step 2: Control Measures &amp; Details</CardTitle>
                        <CardDescription>Define the control measures and assign responsibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <FormField control={form.control} name="controlMeasures" render={({ field }) => (
                            <FormItem><FormLabel>Control Measures</FormLabel><FormControl><Textarea placeholder="Describe existing or additional controls..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <FormField control={form.control} name="responsiblePerson" render={({ field }) => (
                                <FormItem><FormLabel>Responsible / Target</FormLabel><FormControl><Input placeholder="e.g., A. Exparas, HR" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                           <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem><FormLabel>Status</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger></FormControl>
                                        <SelectContent>{statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                        </div>
                    </CardContent>
                </Card>
            )}

            <DialogFooter className="justify-between pt-4">
                <div>
                    {step > 1 && <Button variant="outline" type="button" onClick={() => setStep(step - 1)}><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>}
                </div>
                <div className="flex gap-2">
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                     {step < 2 && <Button type="button" onClick={triggerStep2Validation}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                    {step === 2 && <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Entry
                    </Button>}
                </div>
            </DialogFooter>
        </form>
      </Form>
    );
}

export default function HiracPage() {
  const [open, setOpen] = React.useState(false);
  const [hiracData, setHiracData] = React.useState<HiracEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function loadData() {
        setLoading(true);
        const data = await getHiracEntries();
        setHiracData(data);
        setLoading(false);
    }
    loadData();
  }, [open]);


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">HIRAC Register</h1>
            <p className="text-muted-foreground">Hazard Identification, Risk Assessment, and Control</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    New HIRAC Entry
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>New HIRAC Entry</DialogTitle>
                    <DialogDescription>
                        Follow the steps to add a new hazard identification and risk assessment.
                    </DialogDescription>
                </DialogHeader>
                <HiracForm setOpen={setOpen} />
            </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>HIRAC Table</CardTitle>
          <CardDescription>A register of all identified hazards, their risks, and control measures.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative max-h-[600px] overflow-x-auto">
             {loading && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
             {!loading && hiracData.length === 0 && <div className="flex justify-center items-center h-48"><p className="text-muted-foreground">No HIRAC entries found.</p></div>}
             {!loading && hiracData.length > 0 && (
                <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                    <TableHead className="min-w-[150px] align-bottom" rowSpan={2}>Task/Job</TableHead>
                    <TableHead className="min-w-[150px] align-bottom" rowSpan={2}>Hazard</TableHead>
                    <TableHead className="min-w-[200px] align-bottom" rowSpan={2}>Cause</TableHead>
                    <TableHead className="min-w-[150px] align-bottom" rowSpan={2}>Effect</TableHead>
                    <TableHead colSpan={2} className="text-center border-b">Initial Risk Assessment</TableHead>
                    <TableHead className="min-w-[250px] align-bottom" rowSpan={2}>Control Measures</TableHead>
                    <TableHead className="min-w-[150px] align-bottom" rowSpan={2}>Responsible</TableHead>
                    <TableHead colSpan={2} className="text-center border-b">Risk Re-assessment</TableHead>
                    <TableHead className="align-bottom" rowSpan={2}>Status</TableHead>
                    </TableRow>
                    <TableRow>
                        <TableHead className="text-center">L,S</TableHead>
                        <TableHead className="text-center">RL</TableHead>
                        <TableHead className="text-center">L,S</TableHead>
                        <TableHead className="text-center">RL</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hiracData.map((item, index) => {
                    const initialRiskLevel = item.initialLikelihood * item.initialSeverity;
                    const initialRiskDetails = getRiskLevelDetails(initialRiskLevel);
                    const residualRiskLevel = item.residualLikelihood * item.residualSeverity;
                    const residualRiskDetails = getRiskLevelDetails(residualRiskLevel);

                    return (
                        <TableRow key={item.id} className={cn(index % 2 === 0 ? "bg-muted/30" : "")}>
                        <TableCell className="font-medium align-top">{item.task}</TableCell>
                        <TableCell className="align-top">{item.hazard}</TableCell>
                        <TableCell className="max-w-xs align-top whitespace-pre-wrap">{item.cause}</TableCell>
                        <TableCell className="align-top">{item.effect}</TableCell>
                        <TableCell className="text-center align-top font-mono text-xs">
                            L:{item.initialLikelihood}, S:{item.initialSeverity}
                        </TableCell>
                        <TableCell className="text-center align-top p-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className="w-full">
                                        <Badge variant={initialRiskDetails.variant} className={cn("cursor-pointer w-full justify-center p-2 text-base", initialRiskDetails.color)}>
                                            {initialRiskLevel}
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-bold">Risk Level: {initialRiskLevel} ({initialRiskDetails.label})</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                        <TableCell className="max-w-xs align-top whitespace-pre-wrap">{item.controlMeasures}</TableCell>
                        <TableCell className="align-top">{item.responsiblePerson}</TableCell>
                        <TableCell className="text-center align-top font-mono text-xs">
                            L:{item.residualLikelihood}, S:{item.residualSeverity}
                        </TableCell>
                        <TableCell className="text-center align-top p-2">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger className="w-full">
                                        <Badge variant={residualRiskDetails.variant} className={cn("cursor-pointer w-full justify-center p-2 text-base", residualRiskDetails.color)}>
                                            {residualRiskLevel}
                                        </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p className="font-bold">Risk Level: {residualRiskLevel} ({residualRiskDetails.label})</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </TableCell>
                        <TableCell className="align-top">
                            <Badge variant={item.status === 'Implemented' ? 'secondary' : 'default'}>{item.status}</Badge>
                        </TableCell>
                        </TableRow>
                    );
                    })}
                </TableBody>
                </Table>
             )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
