

"use client";

import * as React from 'react';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { HiracEntry } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FilePlus2, AlertTriangle, ArrowLeft, ArrowRight, BrainCircuit, Loader2, MoreHorizontal, FilePenLine, Trash2, ClipboardCheck, Upload } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createHiracEntry, getHiracEntries, updateHiracEntry, deleteHiracEntry, reassessHiracEntry } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';


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
const hazardClassOptions = ['Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical'];

const hiracFormSchema = z.object({
    task: z.string().min(1, "Task is required."),
    hazard: z.string().min(1, "Hazard is required."),
    hazardPhotoUrl: z.string().url().optional().nullable(),
    hazardClass: z.string().min(1, "Hazard class is required."),
    hazardousEvent: z.string().min(1, "Hazardous event is required."),
    impact: z.string().min(1, "Impact is required."),
    initialLikelihood: z.coerce.number().min(1, "Probability is required."),
    initialSeverity: z.coerce.number().min(1, "Severity is required."),
    engineeringControls: z.string().min(1, "Engineering controls are required."),
    administrativeControls: z.string().min(1, "Administrative controls are required."),
    ppe: z.string().min(1, "PPE is required."),
    responsiblePerson: z.string().min(1, "Responsible person is required."),
    status: z.enum(['Ongoing', 'Implemented', 'Not Implemented']),
});

type HiracFormValues = z.infer<typeof hiracFormSchema>;

const reassessmentFormSchema = z.object({
    status: z.enum(['Ongoing', 'Implemented', 'Not Implemented']),
    residualLikelihood: z.coerce.number().min(1, "Residual probability is required."),
    residualSeverity: z.coerce.number().min(1, "Residual severity is required."),
});
type ReassessmentFormValues = z.infer<typeof reassessmentFormSchema>;


const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return { label: 'Low Risk', variant: 'secondary', color: 'bg-green-500 text-green-50' } as const;
  if (level <= 12) return { label: 'Medium Risk', variant: 'default', color: 'bg-yellow-500 text-yellow-50' } as const;
  return { label: 'High Risk', variant: 'destructive', color: 'bg-red-500 text-red-50' } as const;
};

const RiskDisplay = ({ likelihood, severity, title = "Calculated Risk Level" }: { likelihood?: number, severity?: number, title?: string }) => {
    const riskLevel = (likelihood && severity) ? likelihood * severity : undefined;
    const riskDetails = riskLevel !== undefined ? getRiskLevelDetails(riskLevel) : null;

    return (
        <div className="flex flex-col items-center justify-center space-y-4 p-4 bg-muted rounded-lg h-full min-h-[180px]">
            {riskDetails ? (
                <>
                    <div className={cn("p-4 rounded-full", riskDetails.color)}>
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    <p className="text-sm text-muted-foreground">{title}</p>
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


function HiracForm({ setOpen, entryToEdit, onFormSubmit }: { setOpen: (open: boolean) => void, entryToEdit?: HiracEntry | null, onFormSubmit: () => void }) {
    const [step, setStep] = React.useState(1);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const numericId = entryToEdit ? parseInt(entryToEdit.id.replace('HIRAC-', ''), 10) : null;

    const form = useForm<HiracFormValues>({
        resolver: zodResolver(hiracFormSchema),
        defaultValues: entryToEdit ? {
            ...entryToEdit,
        } : {
            task: '',
            hazard: '',
            hazardPhotoUrl: null,
            hazardClass: '',
            hazardousEvent: '',
            impact: '',
            engineeringControls: '',
            administrativeControls: '',
            ppe: '',
            responsiblePerson: '',
            status: 'Ongoing',
        }
    });
    
    React.useEffect(() => {
        if (entryToEdit) {
            form.reset({
                ...entryToEdit,
            });
            setStep(1);
        } else {
            form.reset({
                task: '',
                hazard: '',
                hazardPhotoUrl: null,
                hazardClass: '',
                hazardousEvent: '',
                impact: '',
                engineeringControls: '',
                administrativeControls: '',
                ppe: '',
                responsiblePerson: '',
                status: 'Ongoing',
            });
            setStep(1);
        }
    }, [entryToEdit, form]);

    const initialLikelihood = form.watch('initialLikelihood');
    const initialSeverity = form.watch('initialSeverity');
    const hazardPhotoUrl = form.watch('hazardPhotoUrl');

    async function onSubmit(data: HiracFormValues) {
        setIsSubmitting(true);
        try {
            if (numericId !== null && entryToEdit) {
                const updateData = {
                    ...data,
                    residualLikelihood: entryToEdit.residualLikelihood,
                    residualSeverity: entryToEdit.residualSeverity,
                };
                await updateHiracEntry(numericId, updateData);
                toast({
                    title: "Success",
                    description: "HIRAC entry updated successfully.",
                });
            } else {
                const createData = {
                    ...data,
                    residualLikelihood: data.initialLikelihood,
                    residualSeverity: data.initialSeverity,
                };
                await createHiracEntry(createData);
                toast({
                    title: "Success",
                    description: "New HIRAC entry created successfully.",
                });
            }

            form.reset();
            setOpen(false);
            onFormSubmit();
        } catch (error) {
             toast({
                variant: 'destructive',
                title: "Error",
                description: `Failed to ${numericId ? 'update' : 'create'} HIRAC entry. Please try again.`,
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const triggerStep2Validation = async () => {
        const isValid = await form.trigger(['task', 'hazard', 'hazardClass', 'hazardousEvent', 'impact', 'initialLikelihood', 'initialSeverity']);
        if (isValid) {
            setStep(2);
        }
    }
    
    // In a real app, this would involve uploading to a service like Cloud Storage
    // and getting back a URL. For this prototype, we'll simulate it.
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            // Using a placeholder service for the prototype
            const placeholderUrl = `https://placehold.co/400x300.png?text=Hazard`;
            form.setValue('hazardPhotoUrl', placeholderUrl);
             toast({
                title: "Image Added",
                description: "A placeholder image has been linked.",
            });
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
                            <FormField control={form.control} name="task" render={({ field }) => (
                                <FormItem><FormLabel>Task/Job</FormLabel><FormControl><Input placeholder="e.g., Transportation Services" {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField control={form.control} name="hazard" render={({ field }) => (
                                        <FormItem><FormLabel>Hazard</FormLabel><FormControl><Input placeholder="e.g., Riding on the Shuttle" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                <FormField control={form.control} name="hazardClass" render={({ field }) => (
                                    <FormItem><FormLabel>Hazard Class</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue placeholder="Select class..." /></SelectTrigger></FormControl>
                                            <SelectContent>{hazardClassOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}</SelectContent>
                                        </Select>
                                    <FormMessage /></FormItem>
                                )} />
                            </div>

                             <FormItem>
                                <FormLabel>Hazard Photo</FormLabel>
                                    <FormControl>
                                    <div className="relative">
                                            <Input
                                            id="hazard-photo-upload"
                                            type="file"
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                        />
                                        <Button type="button" variant="outline" className="w-full" asChild>
                                            <label htmlFor="hazard-photo-upload" className="cursor-pointer flex items-center justify-center">
                                                <Upload className="mr-2 h-4 w-4" />
                                                {hazardPhotoUrl ? 'Change Photo' : 'Upload Photo'}
                                            </label>
                                        </Button>
                                    </div>
                                </FormControl>
                                {hazardPhotoUrl && (
                                    <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                                        <Image src={hazardPhotoUrl} alt="Hazard preview" width={40} height={30} className="rounded-md" data-ai-hint="hazard" />
                                        <span>Image preview</span>
                                    </div>
                                )}
                                </FormItem>

                             <FormField control={form.control} name="hazardousEvent" render={({ field }) => (
                                <FormItem><FormLabel>Hazardous Event</FormLabel><FormControl><Textarea placeholder="e.g., No Maintenance of shuttle service" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="impact" render={({ field }) => (
                                <FormItem><FormLabel>Impact</FormLabel><FormControl><Textarea placeholder="e.g., Car Accident, Death" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                        </div>
                        <div className="space-y-4">
                             <FormField control={form.control} name="initialLikelihood" render={({ field }) => (
                                <FormItem><FormLabel>Probability of Occurrence (P)</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select probability..." /></SelectTrigger></FormControl>
                                        <SelectContent>{likelihoodOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                           <FormField control={form.control} name="initialSeverity" render={({ field }) => (
                                <FormItem><FormLabel>Severity of Hazard (S)</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select severity..." /></SelectTrigger></FormControl>
                                        <SelectContent>{severityOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                            <RiskDisplay likelihood={initialLikelihood} severity={initialSeverity} title="Initial Risk Level" />
                        </div>
                    </CardContent>
                </Card>
            )}

            {step === 2 && (
                 <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle>Step 2: Control Measures</CardTitle>
                        <CardDescription>Define control measures and assign responsibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                             <FormField control={form.control} name="engineeringControls" render={({ field }) => (
                                <FormItem><FormLabel>Engineering Controls</FormLabel><FormControl><Textarea placeholder="e.g., Isolation, guarding..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="administrativeControls" render={({ field }) => (
                                <FormItem><FormLabel>Administrative Controls</FormLabel><FormControl><Textarea placeholder="e.g., Procedures, training..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                             <FormField control={form.control} name="ppe" render={({ field }) => (
                                <FormItem><FormLabel>PPE</FormLabel><FormControl><Textarea placeholder="e.g., Hard hats, gloves..." rows={4} {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                         </div>
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
                        {numericId ? 'Update Entry' : 'Save Entry'}
                    </Button>}
                </div>
            </DialogFooter>
        </form>
      </Form>
    );
}

function ReassessmentForm({ setOpen, entry, onFormSubmit }: { setOpen: (open: boolean) => void, entry: HiracEntry, onFormSubmit: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const numericId = parseInt(entry.id.replace('HIRAC-', ''), 10);

    const form = useForm<ReassessmentFormValues>({
        resolver: zodResolver(reassessmentFormSchema),
        defaultValues: {
            residualLikelihood: entry.residualLikelihood,
            residualSeverity: entry.residualSeverity,
            status: entry.status,
        },
    });

    const residualLikelihood = form.watch('residualLikelihood');
    const residualSeverity = form.watch('residualSeverity');

    async function onSubmit(data: ReassessmentFormValues) {
        setIsSubmitting(true);
        try {
            await reassessHiracEntry(numericId, data);
            toast({ title: "Success", description: "HIRAC entry re-assessed successfully." });
            setOpen(false);
            onFormSubmit();
        } catch (error) {
            toast({ variant: 'destructive', title: "Error", description: "Failed to re-assess HIRAC entry." });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                        <FormField control={form.control} name="residualLikelihood" render={({ field }) => (
                            <FormItem><FormLabel>Residual Probability (P)</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select probability..." /></SelectTrigger></FormControl>
                                    <SelectContent>{likelihoodOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
                        )} />
                        <FormField control={form.control} name="residualSeverity" render={({ field }) => (
                            <FormItem><FormLabel>Residual Severity (S)</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value))} value={String(field.value)}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select severity..." /></SelectTrigger></FormControl>
                                    <SelectContent>{severityOptions.map(opt => <SelectItem key={opt.value} value={String(opt.value)}>{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            <FormMessage /></FormItem>
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
                    <RiskDisplay likelihood={residualLikelihood} severity={residualSeverity} title="Residual Risk Level" />
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Re-assessment
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

export default function HiracPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [reassessmentDialogOpen, setReassessmentDialogOpen] = React.useState(false);
  const [entryToEdit, setEntryToEdit] = React.useState<HiracEntry | null>(null);
  const [entryToReassess, setEntryToReassess] = React.useState<HiracEntry | null>(null);
  const [hiracData, setHiracData] = React.useState<HiracEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();

  const loadData = React.useCallback(async () => {
    setLoading(true);
    const data = await getHiracEntries();
    setHiracData(data);
    setLoading(false);
  }, []);
  
  React.useEffect(() => {
    loadData();
  }, [loadData]);
  
  const handleFormSubmit = () => {
    loadData();
  }
  
  const handleNewEntry = () => {
    setEntryToEdit(null);
    setDialogOpen(true);
  }

  const handleEditEntry = (entry: HiracEntry) => {
    setEntryToEdit(entry);
    setDialogOpen(true);
  }
  
  const handleReassessEntry = (entry: HiracEntry) => {
    setEntryToReassess(entry);
    setReassessmentDialogOpen(true);
  }

  const handleDeleteEntry = async (id: string) => {
    const numericId = parseInt(id.replace('HIRAC-', ''), 10);
    try {
        await deleteHiracEntry(numericId);
        toast({ title: "Success", description: "HIRAC entry deleted." });
        loadData();
    } catch (error) {
        toast({ variant: 'destructive', title: "Error", description: "Failed to delete entry." });
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold tracking-tight">HIRAC Register</h1>
            <p className="text-muted-foreground">Hazard Identification, Risk Assessment, and Control</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <Button onClick={handleNewEntry}>
                <FilePlus2 className="mr-2 h-4 w-4" />
                New HIRAC Entry
            </Button>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{entryToEdit ? 'Edit' : 'New'} HIRAC Entry</DialogTitle>
                    <DialogDescription>
                        {entryToEdit ? 'Update the details for this HIRAC entry.' : 'Follow the steps to add a new hazard identification and risk assessment.'}
                    </DialogDescription>
                </DialogHeader>
                <HiracForm setOpen={setDialogOpen} entryToEdit={entryToEdit} onFormSubmit={handleFormSubmit} />
            </DialogContent>
        </Dialog>

        <Dialog open={reassessmentDialogOpen} onOpenChange={setReassessmentDialogOpen}>
            {entryToReassess && (
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Re-assess Risk for HIRAC-{entryToReassess.id.replace('HIRAC-', '')}</DialogTitle>
                         <DialogDescription>Update the residual risk level and status after implementing control measures.</DialogDescription>
                    </DialogHeader>
                    <ReassessmentForm setOpen={setReassessmentDialogOpen} entry={entryToReassess} onFormSubmit={handleFormSubmit} />
                </DialogContent>
            )}
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>HIRAC Table</CardTitle>
              <CardDescription>A register of all identified hazards, their risks, and control measures.</CardDescription>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground pt-1">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-500"></div>
                <span>High Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                <span>Medium Risk</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
                <span>Low Risk</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative max-h-[600px] overflow-x-auto border rounded-lg">
             {loading && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
             {!loading && hiracData.length === 0 && <div className="flex justify-center items-center h-48"><p className="text-muted-foreground">No HIRAC entries found.</p></div>}
             {!loading && hiracData.length > 0 && (
                <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                    <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Task/Job</TableHead>
                    <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Hazard Class</TableHead>
                    <TableHead className="min-w-[250px] align-bottom border-r" rowSpan={2}>Hazard</TableHead>
                    <TableHead className="min-w-[200px] align-bottom border-r" rowSpan={2}>Hazardous Event</TableHead>
                    <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Impact</TableHead>
                    <TableHead colSpan={2} className="text-center border-b border-r">Initial Risk Assessment</TableHead>
                    <TableHead colSpan={3} className="text-center border-b border-r">Control Measures</TableHead>
                    <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Responsible</TableHead>
                    <TableHead colSpan={2} className="text-center border-b border-r">Risk Re-assessment</TableHead>
                    <TableHead className="align-bottom border-r" rowSpan={2}>Status</TableHead>
                    <TableHead className="align-bottom" rowSpan={2}><span className="sr-only">Actions</span></TableHead>
                    </TableRow>
                    <TableRow>
                        <TableHead className="text-center border-r">P,S</TableHead>
                        <TableHead className="text-center border-r">RL</TableHead>
                        <TableHead className="min-w-[200px] text-center border-r">Engineering</TableHead>
                        <TableHead className="min-w-[200px] text-center border-r">Administrative</TableHead>
                        <TableHead className="min-w-[200px] text-center border-r">PPE</TableHead>
                        <TableHead className="text-center border-r">P,S</TableHead>
                        <TableHead className="text-center border-r">RL</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hiracData.map((item, index) => {
                    const initialRiskLevel = item.initialLikelihood * item.initialSeverity;
                    const initialRiskDetails = getRiskLevelDetails(initialRiskLevel);
                    const residualRiskLevel = item.residualLikelihood * item.residualSeverity;
                    const residualRiskDetails = getRiskLevelDetails(residualRiskLevel);

                    const isReassessed = item.initialLikelihood !== item.residualLikelihood || item.initialSeverity !== item.residualSeverity;

                    return (
                        <TableRow key={item.id} className={cn(index % 2 === 0 ? "bg-muted/30" : "")}>
                        <TableCell className="font-medium align-top border-r">{item.task}</TableCell>
                        <TableCell className="align-top border-r">{item.hazardClass}</TableCell>
                        <TableCell className="align-top border-r">
                           {item.hazardPhotoUrl && (
                                <div className="mb-2">
                                    <Image 
                                        src={item.hazardPhotoUrl} 
                                        alt={`Photo for ${item.hazard}`} 
                                        width={200} 
                                        height={150}
                                        data-ai-hint="hazard"
                                        className="rounded-md object-cover"
                                    />
                                </div>
                            )}
                            {item.hazard}
                        </TableCell>
                        <TableCell className="max-w-xs align-top whitespace-pre-wrap border-r">{item.hazardousEvent}</TableCell>
                        <TableCell className="align-top border-r">{item.impact}</TableCell>
                        <TableCell className="text-center align-top font-mono text-xs border-r">
                            P:{item.initialLikelihood}, S:{item.initialSeverity}
                        </TableCell>
                        <TableCell className="text-center align-top p-2 border-r">
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
                        <TableCell className="max-w-xs align-top whitespace-pre-wrap border-r">{item.engineeringControls}</TableCell>
                        <TableCell className="max-w-xs align-top whitespace-pre-wrap border-r">{item.administrativeControls}</TableCell>
                        <TableCell className="max-w-xs align-top whitespace-pre-wrap border-r">{item.ppe}</TableCell>
                        <TableCell className="align-top border-r">{item.responsiblePerson}</TableCell>
                        <TableCell className="text-center align-top font-mono text-xs border-r">
                            {isReassessed ? `P:${item.residualLikelihood}, S:${item.residualSeverity}` : 'N/A'}
                        </TableCell>
                        <TableCell className="text-center align-top p-2 border-r">
                             {isReassessed ? (
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
                             ) : (
                                 <Badge variant="outline" className="w-full justify-center p-2 text-base">N/A</Badge>
                             )}
                        </TableCell>
                        <TableCell className="align-top border-r">
                            <Badge variant={item.status === 'Implemented' ? 'secondary' : 'default'}>{item.status}</Badge>
                        </TableCell>
                         <TableCell className="align-top text-right">
                             <AlertDialog>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEditEntry(item)}>
                                        <FilePenLine className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                     <DropdownMenuItem onClick={() => handleReassessEntry(item)}>
                                        <ClipboardCheck className="mr-2 h-4 w-4" /> Re-assess Risk
                                    </DropdownMenuItem>
                                    <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                                        </DropdownMenuItem>
                                    </AlertDialogTrigger>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete the HIRAC entry.
                                        </description>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteEntry(item.id)}>Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
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
