

"use client";

import * as React from 'react';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow } from "date-fns"
import { v4 as uuidv4 } from 'uuid';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { HiracEntry, ControlStatus, ControlType, Department } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FilePlus2, AlertTriangle, ArrowLeft, ArrowRight, Loader2, MoreHorizontal, FilePenLine, Trash2, Upload, CalendarIcon, PlusCircle, XCircle, BarChart, Camera, Search, ChevronDown } from 'lucide-react';
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { createHiracEntry, getHiracEntries, updateHiracEntry, deleteHiracEntry, updateResidualRisk, getDepartments, uploadHazardPhoto } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';


const likelihoodOptions = [
  { value: 1, label: "🟢 Rare (Level 1)", description: "Hazard is highly unlikely to occur as all safety controls—including engineering, SOPs, and PPE—are active, effective, and fully implemented." },
  { value: 2, label: "🟢 Unlikely (Level 2)", description: "Hazard may occur if there are lapses, but most key safety controls—especially engineering plus either SOPs or PPE—are consistently applied." },
  { value: 3, label: "🟡 Possible (Level 3)", description: "Hazard could occur under normal conditions since only SOPs and PPE are present, with no engineering controls in place." },
  { value: 4, label: "🔴 Likely (Level 4)", description: "Hazard is expected unless immediate action is taken, as only one type of barrier (either SOPs or PPE) is active, and no engineering control is present." },
  { value: 5, label: "🔴 Almost Certain (Level 5)", description: "Hazard will almost certainly occur due to the complete absence of engineering controls, SOPs, and PPE." },
];

const severityOptions = [
    { value: 1, label: "🟢 Negligible / Near Miss (Level 1)", description: "No injuries or health effects expected. Incident leaves no physical impact and causes no interruption to work—everything resumes smoothly." },
    { value: 2, label: "🟢 Minor – First Aid Required (Level 2)", description: "Injury is limited to surface-level effects like cuts or strains requiring only first aid. Health impact is temporary—minor discomfort such as headache, dizziness, or muscle pain." },
    { value: 3, label: "🟡 Minor – Lost Time or Minor Property Damage (Level 3)", description: "Injury may result in short recovery time off work. Health effects include short-term conditions like fever or common infections. Damage to property is limited but noticeable." },
    { value: 4, label: "🔴 Major – Permanent Disability or Major Damage (Level 4)", description: "Incident leads to life-altering injury (e.g., permanent hearing loss, limb damage) or chronic illness. Property damage is extensive, requiring major repair or replacement." },
    { value: 5, label: "🔴 Catastrophic – Fatality or Massive Damage (Level 5)", description: "Hazard results in fatal injury or major incident affecting multiple lives or assets. Damage disrupts operations completely and may have legal or reputational consequences." },
];


const statusOptions: ControlStatus[] = ['Ongoing', 'Implemented', 'For Implementation'];
const hazardClassOptions = ['Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical'];

const controlMeasureSchema = z.object({
    id: z.number().optional(),
    type: z.enum(['Engineering', 'Administrative', 'PPE']),
    description: z.string().min(1, 'Description is required.'),
    pic: z.string().optional().nullable(),
    status: z.enum(statusOptions).optional().nullable(),
    completionDate: z.string().optional().nullable(),
});

const hiracFormSchema = z.object({
    departmentId: z.coerce.number().min(1, "Department is required."),
    task: z.string().min(1, "Task is required."),
    hazard: z.string().min(1, "Hazard is required."),
    hazardPhotoUrl: z.string().nullable().optional(),
    hazardClass: z.string().min(1, "Hazard class is required."),
    hazardousEvent: z.string().min(1, "Hazardous event is required."),
    impact: z.string().min(1, "Impact is required."),
    initialLikelihood: z.coerce.number().min(1).max(5),
    initialSeverity: z.coerce.number().min(1).max(5),
    nextReviewDate: z.string().optional().nullable(),
    
    controlMeasures: z.array(controlMeasureSchema),

    residualLikelihood: z.coerce.number().min(1).max(5).optional(),
    residualSeverity: z.coerce.number().min(1).max(5).optional(),
}).superRefine((data, ctx) => {
    data.controlMeasures.forEach((control, index) => {
        if (control.status === 'For Implementation' && !control.completionDate) {
            ctx.addIssue({
                path: [`controlMeasures.${index}.completionDate`],
                message: "Completion date is required when status is 'For Implementation'",
                code: z.ZodIssueCode.custom,
            });
        }
    });
});

type HiracFormValues = z.infer<typeof hiracFormSchema>;

const reassessmentSchema = z.object({
  residualLikelihood: z.coerce.number().min(1, "Likelihood is required").max(5),
  residualSeverity: z.coerce.number().min(1, "Severity is required").max(5),
});
type ReassessmentValues = z.infer<typeof reassessmentSchema>;

const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return { label: 'Low Risk', variant: 'secondary', color: 'bg-green-500 text-green-50' } as const;
  if (level <= 12) return { label: 'Medium Risk', variant: 'default', color: 'bg-yellow-500 text-yellow-50' } as const;
  return { label: 'High Risk', variant: 'destructive', color: 'bg-red-500 text-red-50' } as const;
};

const RiskDisplay = ({ likelihood, severity, title = "Calculated Risk Level" }: { likelihood?: number, severity?: number, title?: string }) => {
    const riskLevel = (likelihood && severity) ? likelihood * severity : undefined;
    const riskDetails = riskLevel !== undefined ? getRiskLevelDetails(riskLevel) : null;

    return (
        <div className="flex flex-col items-center justify-center space-y-2 p-4 bg-muted rounded-lg h-full min-h-[180px] md:min-h-[200px]">
            {riskDetails ? (
                <>
                    <div className={cn("p-2 md:p-3 rounded-full", riskDetails.color)}>
                        <AlertTriangle className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <p className="text-xs text-muted-foreground">{title}</p>
                    <h3 className="text-xl md:text-2xl font-bold">{riskLevel}</h3>
                    <Badge variant={riskDetails.variant}>{riskDetails.label}</Badge>
                </>
            ) : (
                <div className="text-center text-muted-foreground p-4">
                     <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 mx-auto mb-2 text-muted-foreground/50"/>
                    <p className="text-xs">Risk Level will be calculated here.</p>
                </div>
            )}
        </div>
    )
};

const RiskRadioGroup = ({
  field,
  options,
}: {
  field: any;
  options: { value: number; label: string; description: string }[];
}) => (
  <RadioGroup
    onValueChange={(value) => field.onChange(parseInt(value))}
    value={String(field.value)}
    className="grid grid-cols-1 gap-3"
  >
    {options.map((option) => (
      <FormItem key={option.value}>
        <FormControl>
          <RadioGroupItem value={String(option.value)} id={`${field.name}-${option.value}`} className="peer sr-only" />
        </FormControl>
        <Label
          htmlFor={`${field.name}-${option.value}`}
          className="flex flex-col rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
        >
          <span className="font-semibold mb-1 text-sm md:text-base">{option.label}</span>
          <span className="text-xs md:text-sm text-muted-foreground whitespace-pre-line">{option.description}</span>
        </Label>
      </FormItem>
    ))}
  </RadioGroup>
);

const ControlMeasuresFieldArray = ({ form, controlType, title }: { form: any, controlType: ControlType, title: string }) => {
    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "controlMeasures"
    });

    const filteredFields = fields.map((field, index) => ({...field, originalIndex: index})).filter(field => (field as any).type === controlType);
    
    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">{title}</CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => append({ type: controlType, description: '', pic: '', status: 'Ongoing', completionDate: '' })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {filteredFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()} added.</p>
                )}
                {filteredFields.map((field, index) => (
                    <div key={field.id} className="p-4 border rounded-lg space-y-4 relative">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-2 right-2 h-6 w-6" 
                            onClick={() => remove(field.originalIndex)}
                        >
                            <XCircle className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <FormField
                            control={form.control}
                            name={`controlMeasures.${field.originalIndex}.description`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Describe the control measure..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name={`controlMeasures.${field.originalIndex}.pic`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Person-in-Charge</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., A. Exparas, HR" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name={`controlMeasures.${field.originalIndex}.status`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Select status..." /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {statusOptions.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name={`controlMeasures.${field.originalIndex}.completionDate`}
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Completion Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(new Date(field.value), "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value ? new Date(field.value) : undefined}
                                                onSelect={(date) => field.onChange(date?.toISOString())}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormDescription>Required if status is 'For Implementation'.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                ))}
            </CardContent>
        </Card>
    );
};


function HiracForm({ setOpen, entryToEdit, onFormSubmit, departments }: { setOpen: (open: boolean) => void, entryToEdit?: HiracEntry | null, onFormSubmit: () => void, departments: Department[] }) {
    const [step, setStep] = React.useState(1);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const [imagePreview, setImagePreview] = React.useState<string | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const numericId = entryToEdit ? parseInt(entryToEdit.id.replace('HIRAC-', ''), 10) : null;
    
    const getDefaultValues = (entry: HiracEntry | null | undefined): HiracFormValues => ({
        departmentId: entry?.departmentId ?? 0,
        task: entry?.task ?? '',
        hazard: entry?.hazard ?? '',
        hazardPhotoUrl: entry?.hazardPhotoUrl ?? null,
        hazardClass: entry?.hazardClass ?? '',
        hazardousEvent: entry?.hazardousEvent ?? '',
        impact: entry?.impact ?? '',
        initialLikelihood: entry?.initialLikelihood ?? undefined,
        initialSeverity: entry?.initialSeverity ?? undefined,
        nextReviewDate: entry?.nextReviewDate ?? null,
        controlMeasures: entry?.controlMeasures ?? [],
        residualLikelihood: entry?.residualLikelihood ?? undefined,
        residualSeverity: entry?.residualSeverity ?? undefined,
    });


    const form = useForm<HiracFormValues>({
        resolver: zodResolver(hiracFormSchema),
        defaultValues: getDefaultValues(entryToEdit)
    });
    
    React.useEffect(() => {
        const defaultValues = getDefaultValues(entryToEdit);
        form.reset(defaultValues);
        setImagePreview(defaultValues.hazardPhotoUrl ?? null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
        form.setValue('hazardPhotoUrl', defaultValues.hazardPhotoUrl, { shouldValidate: true });
        setStep(1);
    }, [entryToEdit, form]);

    const initialLikelihood = form.watch('initialLikelihood');
    const initialSeverity = form.watch('initialSeverity');

    async function onSubmit(data: HiracFormValues) {
        setIsSubmitting(true);
        try {
            if (numericId !== null && entryToEdit) {
                await updateHiracEntry(numericId, data);
                toast({
                    title: "Success",
                    description: "HIRAC entry updated successfully.",
                });
            } else {
                await createHiracEntry(data);
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
                description: `Failed to ${numericId ? 'update' : 'create'} HIRAC entry. ${(error as Error).message}`,
            });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const triggerStep2Validation = async () => {
        const isValid = await form.trigger(['departmentId', 'task', 'hazard', 'hazardClass', 'hazardousEvent', 'impact']);
        if (isValid) {
            setStep(2);
        }
    }
    
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Set preview
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            // Upload the file and get the URL
            setIsUploading(true);
            try {
                const formData = new FormData();
                formData.append('file', file);
                const result = await uploadHazardPhoto(formData);

                if (result.error) {
                    throw new Error(result.error);
                }
                // Set the permanent URL in the form
                form.setValue('hazardPhotoUrl', result.url, { shouldValidate: true });
            } catch (error) {
                toast({ variant: 'destructive', title: "Upload Failed", description: (error as Error).message });
                // Reset on failure
                handleRemoveImage();
            } finally {
                setIsUploading(false);
            }
        }
    }
    
    const handleRemoveImage = () => {
        setImagePreview(null);
        form.setValue('hazardPhotoUrl', null, { shouldValidate: true });
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className={cn(step === 1 ? 'block' : 'hidden')}>
                <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle className="text-xl md:text-2xl">Step 1: Hazard Identification</CardTitle>
                        <CardDescription>Identify the department, task, hazard, cause, and effect.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="departmentId" render={({ field }) => (
                                <FormItem><FormLabel>Department</FormLabel>
                                    <Select onValueChange={field.onChange} value={String(field.value)}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Select department..." /></SelectTrigger></FormControl>
                                        <SelectContent>{departments.map(opt => <SelectItem key={opt.id} value={String(opt.id)}>{opt.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                <FormMessage /></FormItem>
                            )} />
                             <FormField
                                control={form.control}
                                name="nextReviewDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Next Review Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full pl-3 text-left font-normal",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(new Date(field.value), "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value ? new Date(field.value) : undefined}
                                                    onSelect={(date) => field.onChange(date?.toISOString())}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormDescription>Defaults to 1 year. Set for early review.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

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

                        <FormField
                            control={form.control}
                            name="hazardPhotoUrl"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hazard Photo</FormLabel>
                                <FormControl>
                                    <div className="w-full">
                                        <Input
                                            id="hazard-photo-upload"
                                            type="file"
                                            className="hidden"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handleImageUpload}
                                            ref={fileInputRef}
                                            disabled={isUploading}
                                        />
                                        {imagePreview ? (
                                            <div className="relative group w-full aspect-video rounded-md border border-dashed flex items-center justify-center">
                                                <Image 
                                                    src={imagePreview} 
                                                    alt="Hazard preview" 
                                                    fill 
                                                    className="object-contain rounded-md"
                                                    data-ai-hint="hazard"
                                                />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                                    <Button type="button" size="sm" variant="destructive" onClick={handleRemoveImage} disabled={isUploading}>
                                                        Remove
                                                    </Button>
                                                </div>
                                                 {isUploading && (
                                                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white rounded-md">
                                                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                                        <span>Uploading...</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <label 
                                                htmlFor="hazard-photo-upload" 
                                                className={cn(
                                                    "cursor-pointer w-full aspect-video rounded-md border-2 border-dashed border-muted-foreground/50 bg-muted/20 flex flex-col items-center justify-center text-muted-foreground hover:bg-muted/40 transition-colors",
                                                    isUploading && "cursor-not-allowed opacity-50"
                                                )}
                                            >
                                                {isUploading ? (
                                                    <>
                                                        <Loader2 className="h-10 w-10 mb-2 animate-spin" />
                                                        <span>Uploading...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Camera className="h-10 w-10 mb-2" />
                                                        <span>Tap to upload or take a photo</span>
                                                    </>
                                                )}
                                            </label>
                                        )}
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="hazardousEvent" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Hazardous Event</FormLabel>
                                <FormControl><Textarea placeholder="e.g., No Maintenance of shuttle service" rows={2} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="impact" render={({ field }) => (
                            <FormItem><FormLabel>Impact</FormLabel><FormControl><Textarea placeholder="e.g., Car Accident, Death" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
            </div>

            <div className={cn(step === 2 ? 'block' : 'hidden')}>
                 <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle className="text-xl md:text-2xl">Step 2: Risk Assessment &amp; Control Measures</CardTitle>
                        <CardDescription>Assess the initial risk, define control measures, and assign responsibility.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormField
                                    control={form.control}
                                    name="initialLikelihood"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-base font-semibold">Probability (P)</FormLabel>
                                            <FormControl>
                                                <RiskRadioGroup field={field} options={likelihoodOptions} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="initialSeverity"
                                    render={({ field }) => (
                                        <FormItem className="space-y-3">
                                            <FormLabel className="text-base font-semibold">Severity (S)</FormLabel>
                                            <FormControl>
                                                <RiskRadioGroup field={field} options={severityOptions} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="sticky top-4">
                                <RiskDisplay likelihood={initialLikelihood} severity={initialSeverity} title="Initial Risk Level" />
                            </div>
                        </div>

                        <Separator />
                        <h3 className="text-xl font-semibold tracking-tight">Control Measures</h3>
                        
                        <div className="space-y-6">
                           <ControlMeasuresFieldArray form={form} controlType="Engineering" title="Engineering Controls" />
                           <ControlMeasuresFieldArray form={form} controlType="Administrative" title="Administrative Controls" />
                           <ControlMeasuresFieldArray form={form} controlType="PPE" title="Personal Protective Equipment (PPE)" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between pt-4 gap-2">
                <div>
                    {step > 1 && <Button variant="outline" type="button" onClick={() => setStep(step - 1)} className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <DialogClose asChild><Button type="button" variant="secondary" className="w-full sm:w-auto">Cancel</Button></DialogClose>
                     {step < 2 && <Button type="button" onClick={triggerStep2Validation} className="w-full sm:w-auto">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                    {step === 2 && <Button type="submit" disabled={isSubmitting || isUploading} className="w-full sm:w-auto">
                        {(isSubmitting || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {numericId ? 'Update Entry' : 'Save Entry'}
                    </Button>}
                </div>
            </DialogFooter>
        </form>
      </Form>
    );
}

function ReassessmentForm({ entry, setOpen, onFormSubmit }: { entry: HiracEntry, setOpen: (open: boolean) => void, onFormSubmit: () => void }) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const numericId = parseInt(entry.id.replace('HIRAC-', ''), 10);

    const form = useForm<ReassessmentValues>({
        resolver: zodResolver(reassessmentSchema),
        defaultValues: {
            residualLikelihood: entry.residualLikelihood ?? entry.initialLikelihood,
            residualSeverity: entry.residualSeverity ?? entry.initialSeverity,
        },
    });

    const residualLikelihood = form.watch('residualLikelihood');
    const residualSeverity = form.watch('residualSeverity');

    async function onSubmit(data: ReassessmentValues) {
        setIsSubmitting(true);
        try {
            await updateResidualRisk(numericId, data);
            toast({
                title: "Success",
                description: "Risk re-assessment saved successfully.",
            });
            onFormSubmit();
            setOpen(false);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: "Error",
                description: "Failed to save re-assessment. Please try again.",
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <Form {...form}>
             <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="residualLikelihood"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-semibold">Residual Probability (P)</FormLabel>
                                    <FormControl>
                                        <RiskRadioGroup field={field} options={likelihoodOptions} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="residualSeverity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-base font-semibold">Residual Severity (S)</FormLabel>
                                    <FormControl>
                                        <RiskRadioGroup field={field} options={severityOptions} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="sticky top-4">
                        <RiskDisplay likelihood={residualLikelihood} severity={residualSeverity} title="Residual Risk Level" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancel</Button></DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Assessment
                    </Button>
                </DialogFooter>
            </form>
        </Form>
    );
}

const ControlMeasuresDetails = ({ controls, type }: { controls: HiracEntry['controlMeasures'], type: ControlType }) => {
    const filteredControls = controls.filter(c => c.type === type);
    if (filteredControls.length === 0) return <TableCell colSpan={4} className="text-center text-muted-foreground border-r py-2">No {type.toLowerCase()} controls.</TableCell>;

    return (
        <React.Fragment>
            <TableCell className="max-w-xs align-top whitespace-pre-wrap border-r p-0">
                {filteredControls.map((c, i) => <div key={i} className={cn("p-2", i < filteredControls.length -1 && "border-b")}>{c.description}</div>)}
            </TableCell>
            <TableCell className="align-top border-r p-0">
                {filteredControls.map((c, i) => <div key={i} className={cn("p-2", i < filteredControls.length -1 && "border-b")}>{c.pic}</div>)}
            </TableCell>
            <TableCell className="align-top border-r p-0">
                {filteredControls.map((c, i) => <div key={i} className={cn("p-2", i < filteredControls.length -1 && "border-b")}>{c.status && <Badge variant={c.status === 'Implemented' ? 'secondary' : 'default'}>{c.status}</Badge>}</div>)}
            </TableCell>
            <TableCell className="align-top border-r p-0">
                {filteredControls.map((c, i) => <div key={i} className={cn("p-2", i < filteredControls.length -1 && "border-b")}>{c.completionDate ? format(new Date(c.completionDate), "P") : ''}</div>)}
            </TableCell>
        </React.Fragment>
    );
};


export default function HiracPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [reassessDialogOpen, setReassessDialogOpen] = React.useState(false);
  const [entryToEdit, setEntryToEdit] = React.useState<HiracEntry | null>(null);
  const [entryToReassess, setEntryToReassess] = React.useState<HiracEntry | null>(null);
  const [hiracData, setHiracData] = React.useState<HiracEntry[]>([]);
  const [filteredHiracData, setFilteredHiracData] = React.useState<HiracEntry[]>([]);
  const [departments, setDepartments] = React.useState<Department[]>([]);
  const [loading, setLoading] = React.useState(true);
  const { toast } = useToast();
  const [departmentFilter, setDepartmentFilter] = React.useState<string>('all');
  const [searchFilter, setSearchFilter] = React.useState('');

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
        const departmentId = departmentFilter === 'all' ? undefined : parseInt(departmentFilter, 10);
        const [data, deptData] = await Promise.all([
            getHiracEntries(departmentId),
            getDepartments()
        ]);
        setHiracData(data);
        setDepartments(deptData);
    } catch(e) {
        toast({ variant: 'destructive', title: "Error", description: "Failed to load HIRAC data. The database might be initializing." });
    }
    setLoading(false);
  }, [toast, departmentFilter]);
  
  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    const lowercasedFilter = searchFilter.toLowerCase();
    const filtered = hiracData.filter(item => {
        return (
            item.task.toLowerCase().includes(lowercasedFilter) ||
            item.hazard.toLowerCase().includes(lowercasedFilter) ||
            item.hazardClass.toLowerCase().includes(lowercasedFilter)
        );
    });
    setFilteredHiracData(filtered);
  }, [searchFilter, hiracData]);
  
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
    setReassessDialogOpen(true);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
            <h1 className="text-xl md:text-3xl font-bold tracking-tight">HIRAC Register</h1>
            <p className="text-muted-foreground">Hazard Identification, Risk Assessment, and Control</p>
        </div>
        <Button onClick={handleNewEntry} className="w-full md:w-auto">
            <FilePlus2 className="mr-2 h-4 w-4" />
            New HIRAC Entry
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
            <div className="flex-1">
              <CardTitle className="text-xl md:text-2xl">HIRAC Table</CardTitle>
              <CardDescription>A register of all identified hazards, their risks, and control measures.</CardDescription>
            </div>
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-auto">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                      placeholder="Filter by task, hazard..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="w-full max-w-sm pl-9"
                  />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Filter by Department" />
                  </SelectTrigger>
                  <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(opt => <SelectItem key={opt.id} value={String(opt.id)}>{opt.name}</SelectItem>)}
                  </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
             {loading && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}
             {!loading && filteredHiracData.length === 0 && <div className="flex justify-center items-center h-48"><p className="text-muted-foreground">No HIRAC entries found.</p></div>}
             {!loading && filteredHiracData.length > 0 && (
                <>
                  {/* Mobile View */}
                  <div className="md:hidden space-y-4">
                      {filteredHiracData.map((item) => (
                          <HiracCard 
                            key={item.id} 
                            item={item} 
                            onEdit={handleEditEntry} 
                            onReassess={handleReassessEntry}
                            onDelete={handleDeleteEntry} 
                          />
                      ))}
                  </div>

                  {/* Desktop View */}
                  <div className="hidden md:block relative max-h-[600px] overflow-x-auto border rounded-lg">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                              <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Department</TableHead>
                              <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Task/Job</TableHead>
                              <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Hazard Class</TableHead>
                              <TableHead className="min-w-[250px] align-bottom border-r" rowSpan={2}>Hazard</TableHead>
                              <TableHead colSpan={2} className="text-center border-b border-r">Initial Risk</TableHead>
                              <TableHead colSpan={4} className="text-center border-b border-r">Engineering Controls</TableHead>
                              <TableHead colSpan={4} className="text-center border-b border-r">Administrative Controls</TableHead>
                              <TableHead colSpan={4} className="text-center border-b border-r">PPE Controls</TableHead>
                              <TableHead colSpan={2} className="text-center border-b border-r">Risk Re-assessment</TableHead>
                              <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Created</TableHead>
                              <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Last Reviewed</TableHead>
                              <TableHead className="min-w-[150px] align-bottom border-r" rowSpan={2}>Next Review</TableHead>
                              <TableHead className="align-bottom" rowSpan={2}><span className="sr-only">Actions</span></TableHead>
                          </TableRow>
                          <TableRow>
                              <TableHead className="text-center border-r">P,S</TableHead>
                              <TableHead className="text-center border-r">RL</TableHead>
                              <TableHead className="min-w-[200px] text-center border-r">Description</TableHead>
                              <TableHead className="text-center border-r">PIC</TableHead>
                              <TableHead className="text-center border-r">Status</TableHead>
                              <TableHead className="text-center border-r">Completion</TableHead>
                              <TableHead className="min-w-[200px] text-center border-r">Description</TableHead>
                              <TableHead className="text-center border-r">PIC</TableHead>
                              <TableHead className="text-center border-r">Status</TableHead>
                              <TableHead className="text-center border-r">Completion</TableHead>
                              <TableHead className="min-w-[200px] text-center border-r">Description</TableHead>
                              <TableHead className="text-center border-r">PIC</TableHead>
                              <TableHead className="text-center border-r">Status</TableHead>
                              <TableHead className="text-center border-r">Completion</TableHead>
                              <TableHead className="text-center border-r">P,S</TableHead>
                              <TableHead className="text-center border-r">RL</TableHead>
                          </TableRow>
                      </TableHeader>
                      <TableBody>
                          {filteredHiracData.map((item, index) => {
                          const initialRiskLevel = item.initialLikelihood * item.initialSeverity;
                          const initialRiskDetails = getRiskLevelDetails(initialRiskLevel);
                          const isReassessed = item.residualLikelihood != null && item.residualSeverity != null;
                          const residualRiskLevel = isReassessed ? (item.residualLikelihood!) * (item.residualSeverity!) : null;
                          const residualRiskDetails = (isReassessed && residualRiskLevel !== null) ? getRiskLevelDetails(residualRiskLevel) : null;
                          return (
                              <TableRow key={item.id} className={cn(index % 2 === 0 ? "bg-muted/30" : "")}>
                                  <TableCell className="font-medium align-top border-r">{item.department?.name}</TableCell>
                                  <TableCell className="font-medium align-top border-r">{item.task}</TableCell>
                                  <TableCell className="align-top border-r">{item.hazardClass}</TableCell>
                                  <TableCell className="align-top border-r">
                                    {item.hazardPhotoUrl && (
                                          <Dialog>
                                            <DialogTrigger asChild>
                                              <div className="mb-2 relative w-full aspect-video cursor-pointer hover:opacity-80 transition-opacity">
                                                  <Image src={item.hazardPhotoUrl} alt={`Photo for ${item.hazard}`} width={100} height={75} data-ai-hint="hazard" className="rounded-md object-contain"/>
                                              </div>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Hazard Photo: {item.hazard}</DialogTitle>
                                                    <DialogDescription>{item.task} - {item.department?.name}</DialogDescription>
                                                </DialogHeader>
                                                <div className="relative w-full aspect-video">
                                                    <Image src={item.hazardPhotoUrl} alt={`Photo for ${item.hazard}`} fill className="rounded-md object-contain" />
                                                </div>
                                            </DialogContent>
                                          </Dialog>
                                      )}
                                      {item.hazard}
                                  </TableCell>
                                  <TableCell className="text-center align-top font-mono text-xs border-r">P:{item.initialLikelihood}, S:{item.initialSeverity}</TableCell>
                                  <TableCell className="text-center align-top p-2 border-r">
                                      <TooltipProvider><Tooltip><TooltipTrigger className="w-full"><Badge variant={initialRiskDetails.variant} className={cn("cursor-pointer w-full justify-center p-2 text-base", initialRiskDetails.color)}>{initialRiskLevel}</Badge></TooltipTrigger><TooltipContent><p className="font-bold">Risk Level: {initialRiskLevel} ({initialRiskDetails.label})</p></TooltipContent></Tooltip></TooltipProvider>
                                  </TableCell>
                                  <ControlMeasuresDetails controls={item.controlMeasures} type="Engineering" />
                                  <ControlMeasuresDetails controls={item.controlMeasures} type="Administrative" />
                                  <ControlMeasuresDetails controls={item.controlMeasures} type="PPE" />
                                  <TableCell className="text-center align-top font-mono text-xs border-r">{isReassessed ? `P:${item.residualLikelihood}, S:${item.residualSeverity}` : 'N/A'}</TableCell>
                                  <TableCell className="text-center align-top p-2 border-r">
                                      {isReassessed && residualRiskDetails && residualRiskLevel !== null ? (
                                          <TooltipProvider><Tooltip><TooltipTrigger className="w-full"><Badge variant={residualRiskDetails.variant} className={cn("cursor-pointer w-full justify-center p-2 text-base", residualRiskDetails.color)}>{residualRiskLevel}</Badge></TooltipTrigger><TooltipContent><p className="font-bold">Risk Level: {residualRiskLevel} ({residualRiskDetails.label})</p></TooltipContent></Tooltip></TooltipProvider>
                                      ) : (<Badge variant="outline" className="w-full justify-center p-2 text-base">N/A</Badge>)}
                                  </TableCell>
                                  <TableCell className="align-top border-r">{item.createdAt ? format(new Date(item.createdAt), "P") : ''}</TableCell>
                                  <TableCell className="align-top border-r">{item.reviewedAt ? format(new Date(item.reviewedAt), "P") : <span className="text-muted-foreground">Not yet</span>}</TableCell>
                                  <TableCell className="align-top border-r">{item.nextReviewDate ? format(new Date(item.nextReviewDate), "P") : <span className="text-muted-foreground">Not set</span>}</TableCell>
                                  <TableCell className="align-top text-right">
                                      <AlertDialog>
                                          <DropdownMenu>
                                              <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
                                                  <DropdownMenuItem onClick={() => handleEditEntry(item)}><FilePenLine className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => handleReassessEntry(item)}><BarChart className="mr-2 h-4 w-4" /> Re-assess Risk</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <AlertDialogTrigger asChild><DropdownMenuItem className="text-destructive focus:text-destructive-foreground focus:bg-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem></AlertDialogTrigger>
                                              </DropdownMenuContent>
                                          </DropdownMenu>
                                          <AlertDialogContent>
                                              <AlertDialogHeader>
                                                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                  <AlertDialogDescription>This action cannot be undone. This will permanently delete the HIRAC entry.</AlertDialogDescription>
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
                  </div>
                </>
             )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{entryToEdit ? 'Edit' : 'New'} HIRAC Entry</DialogTitle>
                <DialogDescription>
                    {entryToEdit ? "Update the details for this HIRAC entry. This will also update the 'Last Reviewed' date." : 'Follow the steps to add a new hazard identification and risk assessment.'}
                </DialogDescription>
            </DialogHeader>
            <HiracForm setOpen={setDialogOpen} entryToEdit={entryToEdit} onFormSubmit={handleFormSubmit} departments={departments} />
        </DialogContent>
      </Dialog>
      
      {entryToReassess && (
          <Dialog open={reassessDialogOpen} onOpenChange={setReassessDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                   <DialogHeader>
                        <DialogTitle>Risk Re-assessment for {entryToReassess.id}</DialogTitle>
                        <DialogDescription>
                            After implementing control measures, re-assess the risk level. This will also update the 'Last Reviewed' date.
                        </DialogDescription>
                    </DialogHeader>
                    <ReassessmentForm 
                      entry={entryToReassess} 
                      setOpen={setReassessDialogOpen}
                      onFormSubmit={handleFormSubmit}
                  />
              </DialogContent>
          </Dialog>
      )}

    </div>
  );
}


function HiracCard({ item, onEdit, onReassess, onDelete }: { item: HiracEntry, onEdit: (item: HiracEntry) => void, onReassess: (item: HiracEntry) => void, onDelete: (id: string) => void }) {
    const initialRiskLevel = item.initialLikelihood * item.initialSeverity;
    const initialRiskDetails = getRiskLevelDetails(initialRiskLevel);
    const isReassessed = item.residualLikelihood != null && item.residualSeverity != null;
    const residualRiskLevel = isReassessed ? (item.residualLikelihood!) * (item.residualSeverity!) : null;
    const residualRiskDetails = (isReassessed && residualRiskLevel !== null) ? getRiskLevelDetails(residualRiskLevel) : null;
    
    const IdentificationDetail = ({ label, value }: { label: string, value: string | undefined | null }) => (
        value ? <p className="text-sm"><span className="font-semibold">{label}:</span> <span className="text-muted-foreground">{value}</span></p> : null
    );
    
    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-semibold">{item.hazard}</CardTitle>
                        <CardDescription>{item.department?.name} &bull; {item.task}</CardDescription>
                    </div>
                    <AlertDialog>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="-mt-2 -mr-2">
                                    <MoreHorizontal className="h-5 w-5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit(item)}>
                                    <FilePenLine className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onReassess(item)}>
                                    <BarChart className="mr-2 h-4 w-4" /> Re-assess Risk
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="text-destructive focus:text-destructive">
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
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onDelete(item.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                 {item.hazardPhotoUrl && (
                    <Dialog>
                        <DialogTrigger asChild>
                            <div className="relative w-full aspect-video cursor-pointer hover:opacity-80 transition-opacity rounded-md overflow-hidden">
                                <Image src={item.hazardPhotoUrl} alt={`Photo for ${item.hazard}`} fill data-ai-hint="hazard" className="object-cover"/>
                            </div>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Hazard Photo: {item.hazard}</DialogTitle>
                            </DialogHeader>
                            <div className="relative w-full aspect-video">
                                <Image src={item.hazardPhotoUrl} alt={`Photo for ${item.hazard}`} fill className="rounded-md object-contain"/>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                <div className="space-y-2 border-t pt-4">
                    <h4 className="text-sm font-semibold tracking-tight">Identification Details</h4>
                    <IdentificationDetail label="Hazard Class" value={item.hazardClass} />
                    <IdentificationDetail label="Hazardous Event" value={item.hazardousEvent} />
                    <IdentificationDetail label="Impact" value={item.impact} />
                </div>


                <div className="flex justify-around gap-4 text-center border-t pt-4">
                    <div>
                        <p className="text-sm text-muted-foreground">Initial Risk</p>
                        <Badge variant={initialRiskDetails.variant} className={cn("mt-1 text-base px-3", initialRiskDetails.color)}>
                            {initialRiskLevel}
                        </Badge>
                    </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Residual Risk</p>
                         {residualRiskDetails && residualRiskLevel !== null ? (
                            <Badge variant={residualRiskDetails.variant} className={cn("mt-1 text-base px-3", residualRiskDetails.color)}>
                                {residualRiskLevel}
                            </Badge>
                         ) : (
                             <Badge variant="outline" className="mt-1 text-base px-3">N/A</Badge>
                         )}
                    </div>
                </div>

                <Collapsible>
                    <CollapsibleTrigger asChild>
                        <Button variant="ghost" className="w-full justify-center">
                            Show Controls <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-3 pt-2">
                        {(['Engineering', 'Administrative', 'PPE'] as ControlType[]).map(type => {
                            const controls = item.controlMeasures.filter(c => c.type === type);
                            if (controls.length === 0) return null;
                            return (
                                <div key={type}>
                                    <h4 className="font-semibold text-sm">{type} Controls</h4>
                                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                                        {controls.map((c, i) => <p key={i}>- {c.description}</p>)}
                                    </div>
                                </div>
                            )
                        })}
                        {item.controlMeasures.length === 0 && <p className="text-sm text-muted-foreground text-center">No control measures defined.</p>}
                    </CollapsibleContent>
                </Collapsible>
                
            </CardContent>
            <CardFooter className="flex justify-between text-xs text-muted-foreground">
                <span>
                    Next Review: {item.nextReviewDate ? format(new Date(item.nextReviewDate), "P") : 'N/A'}
                </span>
                <span>
                    Updated: {item.reviewedAt ? formatDistanceToNow(new Date(item.reviewedAt), { addSuffix: true }) : 'Never'}
                </span>
            </CardFooter>
        </Card>
    )
}

