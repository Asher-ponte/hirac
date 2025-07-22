
"use client";

import * as React from 'react';
import Image from 'next/image';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, formatDistanceToNow } from "date-fns"
import { v4 as uuidv4 } from 'uuid';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { HiracEntry, ControlStatus, ControlType, Department, TaskType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { FilePlus2, AlertTriangle, ArrowLeft, ArrowRight, Loader2, MoreHorizontal, FilePenLine, Trash2, Upload, CalendarIcon, PlusCircle, XCircle, BarChart, Camera, Search, ChevronDown, HelpCircle } from 'lucide-react';
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
import { createHiracEntry, getHiracEntries, updateHiracEntry, deleteHiracEntry, updateResidualRisk, getDepartments } from './actions';
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


const statusOptions = ['Implemented', 'For Implementation'] as const;
const hazardClassOptions = ['Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical'] as const;
const taskTypeOptions = ['Routine', 'Non-Routine'] as const;

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
    taskType: z.enum(taskTypeOptions, { required_error: 'Task type is required' }),
    hazard: z.string().min(1, "Hazard is required."),
    hazardPhotoUrl: z.string().nullable().optional(),
    hazardClass: z.enum(hazardClassOptions, { required_error: 'Hazard class is required' }),
    hazardousEvent: z.string().min(1, "Hazardous event is required."),
    impact: z.string().min(1, "Impact is required."),
    initialLikelihood: z.coerce.number().min(1).max(5),
    initialSeverity: z.coerce.number().min(1).max(5),
    nextReviewDate: z.string().optional().nullable(),
    
    controlMeasures: z.array(controlMeasureSchema),

    residualLikelihood: z.coerce.number().min(1).max(5).optional().nullable(),
    residualSeverity: z.coerce.number().min(1).max(5).optional().nullable(),
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
  if (level <= 6) return { label: 'Low Risk', variant: 'secondary', color: 'bg-green-600/80 text-white' } as const;
  if (level <= 12) return { label: 'Medium Risk', variant: 'default', color: 'bg-yellow-500/80 text-black' } as const;
  return { label: 'High Risk', variant: 'destructive', color: 'bg-red-600/80 text-white' } as const;
};

const RiskDisplay = ({ likelihood, severity, title = "Calculated Risk Level" }: { likelihood?: number | null, severity?: number | null, title?: string }) => {
    const riskLevel = (likelihood && severity) ? likelihood * severity : undefined;
    const riskDetails = riskLevel !== undefined ? getRiskLevelDetails(riskLevel) : null;

    return (
        <div className="flex flex-col items-center justify-center space-y-2 p-2 bg-muted rounded-lg h-full min-h-[180px] md:min-h-[200px]">
            {riskDetails ? (
                <>
                    <div className={cn("p-2 md:p-3 rounded-full", riskDetails.color)}>
                        <AlertTriangle className="h-4 w-4 md:h-6 md:w-6" />
                    </div>
                    <p className="text-xs text-muted-foreground">{title}</p>
                    <h3 className="text-lg md:text-xl font-bold">{riskLevel}</h3>
                    <Badge variant={riskDetails.variant}>{riskDetails.label}</Badge>
                </>
            ) : (
                <div className="text-center text-muted-foreground p-2">
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
                        onClick={() => append({ type: controlType, description: '', pic: '', status: 'For Implementation', completionDate: '' })}
                    >
                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="space-y-2">
                {filteredFields.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No {title.toLowerCase()} added.</p>
                )}
                {filteredFields.map((field) => (
                     <div key={field.id} className="p-2 border rounded-lg space-y-2 relative">
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
                                        <Select onValueChange={field.onChange} value={field.value ?? undefined}>
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


function HiracForm({ setOpen, entryToEdit, onFormSubmit, departments, dialogContentRef }: { setOpen: (open: boolean) => void, entryToEdit?: HiracEntry | null, onFormSubmit: () => void, departments: Department[], dialogContentRef: React.RefObject<HTMLDivElement> }) {
    const [step, setStep] = React.useState(1);
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isUploading, setIsUploading] = React.useState(false);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    const numericId = entryToEdit ? parseInt(entryToEdit.id.replace('HIRAC-', ''), 10) : null;
    
    const getDefaultValues = (entry: HiracEntry | null | undefined): HiracFormValues => ({
        departmentId: entry?.departmentId ?? 0,
        task: entry?.task ?? '',
        taskType: entry?.taskType ?? 'Routine',
        hazard: entry?.hazard ?? '',
        hazardPhotoUrl: entry?.hazardPhotoUrl ?? null,
        hazardClass: entry?.hazardClass ?? 'Physical',
        hazardousEvent: entry?.hazardousEvent ?? '',
        impact: entry?.impact ?? '',
        initialLikelihood: entry?.initialLikelihood ?? 1,
        initialSeverity: entry?.initialSeverity ?? 1,
        nextReviewDate: entry?.nextReviewDate ?? null,
        controlMeasures: entry?.controlMeasures ?? [],
        residualLikelihood: entry?.residualLikelihood,
        residualSeverity: entry?.residualSeverity,
    });


    const form = useForm<HiracFormValues>({
        resolver: zodResolver(hiracFormSchema),
        defaultValues: getDefaultValues(entryToEdit)
    });
    
    React.useEffect(() => {
        const defaultValues = getDefaultValues(entryToEdit);
        form.reset(defaultValues);
        form.setValue('hazardPhotoUrl', defaultValues.hazardPhotoUrl, { shouldValidate: true });
        setStep(1);
    }, [entryToEdit, form]);
    
    React.useEffect(() => {
        if (dialogContentRef.current) {
            dialogContentRef.current.scrollTo(0, 0);
        }
    }, [step, dialogContentRef]);

    const initialLikelihood = form.watch('initialLikelihood');
    const initialSeverity = form.watch('initialSeverity');
    const imagePreview = form.watch('hazardPhotoUrl');

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
    
    const handleStepNavigation = async (targetStep: number) => {
        let fieldsToValidate: (keyof HiracFormValues)[] = [];
        let isValid = true;
        
        if (targetStep > step) {
            if (step === 1) {
                fieldsToValidate = ['departmentId', 'task', 'taskType', 'hazard', 'hazardClass', 'hazardousEvent', 'impact'];
            } else if (step === 2) {
                 fieldsToValidate = ['initialLikelihood', 'initialSeverity'];
            }
            isValid = await form.trigger(fieldsToValidate);
        }

        if (isValid) {
            setStep(targetStep);
        }
    }
    
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsUploading(true);

            const reader = new FileReader();
            reader.onload = (loadEvent) => {
                const dataUrl = loadEvent.target?.result as string;
                if (dataUrl) {
                    form.setValue('hazardPhotoUrl', dataUrl, { shouldValidate: true });
                } else {
                    toast({ variant: 'destructive', title: "Upload Failed", description: "Could not read the image file." });
                    handleRemoveImage();
                }
                setIsUploading(false);
            };
            reader.onerror = () => {
                toast({ variant: 'destructive', title: "Upload Failed", description: "There was an error reading the file." });
                handleRemoveImage();
                setIsUploading(false);
            };
            reader.readAsDataURL(file);
        }
    }
    
    const handleRemoveImage = () => {
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
                            <FormItem><FormLabel>Task/Job</FormLabel><FormControl><Input placeholder="e.g., Pallet Sorting" {...field} /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField
                            control={form.control}
                            name="taskType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Task Type</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="flex flex-col space-y-1"
                                    >
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Routine" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Routine
                                        </FormLabel>
                                    </FormItem>
                                    <FormItem className="flex items-center space-x-3 space-y-0">
                                        <FormControl>
                                        <RadioGroupItem value="Non-Routine" />
                                        </FormControl>
                                        <FormLabel className="font-normal">
                                        Non-Routine
                                        </FormLabel>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="hazard" render={({ field }) => (
                                    <FormItem>
                                        <div className="flex items-center gap-2">
                                            <FormLabel>Hazard</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                                                        <HelpCircle className="h-4 w-4" />
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-80" align="start">
                                                    <div className="space-y-2">
                                                        <h4 className="font-medium leading-none">🔍 What Is a Hazard?</h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            "Source, situation, or act with a potential for harm in terms of human injury or ill health, or a combination of these."
                                                        </p>
                                                        <p className="text-sm text-muted-foreground">
                                                            This means a hazard isn't just a thing—it can be a condition, behavior, or even a circumstance that could lead to harm.
                                                        </p>
                                                    </div>
                                                </PopoverContent>
                                            </Popover>
                                        </div>
                                        <FormControl><Input placeholder="e.g., A stack of unstable pallets is stored too high" {...field} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
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
                                                        <span>Processing...</span>
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
                                                        <span>Processing...</span>
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
                                <div className="flex items-center gap-2">
                                    <FormLabel>Hazardous Event</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                                                <HelpCircle className="h-4 w-4" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" align="start">
                                            <div className="space-y-2">
                                                <h4 className="font-medium leading-none">What is a Hazardous Event?</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    An event that results in harm or ill-health, caused by a specific hazard. It acts as the bridge between a hazard (a potential source of harm) and the actual impact it creates.
                                                </p>
                                                <p className="text-sm font-semibold">⚠️ Examples of Hazardous Events:</p>
                                                <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                    <li>Bump into</li>
                                                    <li>Fall from</li>
                                                    <li>Hit by</li>
                                                    <li>Struck by</li>
                                                    <li>Contact with</li>
                                                    <li>Caught in between</li>
                                                    <li>Inhalation of</li>
                                                    <li>Bitten by</li>
                                                    <li>Fall into</li>
                                                </ul>
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <FormControl><Textarea placeholder="e.g., forklift bump triggers collapse" rows={2} {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="impact" render={({ field }) => (
                            <FormItem><FormLabel>Impact</FormLabel><FormControl><Textarea placeholder="e.g., Physical Injury > shoulder and Head Injury" rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                        )} />
                    </CardContent>
                </Card>
            </div>

            <div className={cn(step === 2 ? 'block' : 'hidden')}>
                 <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle className="text-xl md:text-2xl">Step 2: Risk Assessment</CardTitle>
                        <CardDescription>Assess the initial risk based on probability and severity.</CardDescription>
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
                    </CardContent>
                </Card>
            </div>
            
            <div className={cn(step === 3 ? 'block' : 'hidden')}>
                <Card className="border-none shadow-none">
                    <CardHeader>
                        <CardTitle className="text-xl md:text-2xl">Step 3: Control Measures</CardTitle>
                        <CardDescription>Define control measures to mitigate the identified risk.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold">Engineering Controls</h3>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full"><HelpCircle className="h-4 w-4" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="start">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">🛠️ Engineering Controls</h4>
                                            <p className="text-sm text-muted-foreground">These aim to physically isolate or reduce exposure to hazards at the source.</p>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                <li>Machine guards: Prevent contact with moving parts.</li>
                                                <li>Barriers and railings: Separate pedestrian and forklift pathways.</li>
                                                <li>Ventilation systems: Remove airborne contaminants (e.g., exhaust fumes).</li>
                                                <li>Speed limiters or interlocks: Control vehicle behavior in sensitive zones.</li>
                                                <li>Anti-collision sensors or mirrors: Enhance visibility and reduce blind spots.</li>
                                                <li>Noise enclosures: Minimize exposure to harmful sound levels.</li>
                                            </ul>
                                            <p className="text-sm text-muted-foreground pt-2 italic">These controls are highly effective and require minimal human intervention once implemented.</p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <ControlMeasuresFieldArray form={form} controlType="Engineering" title="Engineering Controls" />
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold">Administrative Controls</h3>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full"><HelpCircle className="h-4 w-4" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="start">
                                         <div className="space-y-2">
                                            <h4 className="font-medium leading-none">📋 Administrative Controls</h4>
                                            <p className="text-sm text-muted-foreground">These modify work practices and procedures to reduce risk.</p>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                <li>Training programs: Forklift operation, pedestrian awareness, emergency response.</li>
                                                <li>Permit-to-work systems: For confined spaces or high-risk zones.</li>
                                                <li>Signage and labeling: Clear visual cues for hazards and safe zones.</li>
                                                <li>Work scheduling: Limit exposure duration or rotate tasks.</li>
                                                <li>Inspections and maintenance protocols: Prevent equipment failure.</li>
                                                <li>Incident reporting systems: Encourage proactive hazard identification.</li>
                                            </ul>
                                            <p className="text-sm text-muted-foreground pt-2 italic">These rely on consistent human behavior and supervision, so reinforcement and engagement strategies are key.</p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <ControlMeasuresFieldArray form={form} controlType="Administrative" title="Administrative Controls" />
                        </div>
                        
                        <div>
                             <div className="flex items-center gap-2 mb-4">
                                <h3 className="text-lg font-semibold">Personal Protective Equipment (PPE)</h3>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full"><HelpCircle className="h-4 w-4" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-80" align="start">
                                        <div className="space-y-2">
                                            <h4 className="font-medium leading-none">🦺 Personal Protective Equipment (PPE)</h4>
                                            <p className="text-sm text-muted-foreground">The last line of defense, used when other controls can't fully eliminate risk.</p>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground">
                                                <li>High-visibility vests: Improve visibility in shared zones.</li>
                                                <li>Hard hats: Protect against falling objects.</li>
                                                <li>Steel-toe boots: Guard against crush injuries.</li>
                                                <li>Hearing protection: For noisy environments.</li>
                                                <li>Gloves: For handling materials or operating controls.</li>
                                                <li>Respirators: If airborne contaminants are present.</li>
                                            </ul>
                                            <p className="text-sm text-muted-foreground pt-2 italic">PPE must be properly selected, fitted, maintained, and used in conjunction with other controls—not as a standalone solution.</p>
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <ControlMeasuresFieldArray form={form} controlType="PPE" title="Personal Protective Equipment (PPE)" />
                        </div>
                    </CardContent>
                </Card>
            </div>


            <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between pt-4 gap-2">
                <div>
                    {step > 1 && <Button variant="outline" type="button" onClick={() => handleStepNavigation(step - 1)} className="w-full sm:w-auto"><ArrowLeft className="mr-2 h-4 w-4" /> Previous</Button>}
                </div>
                <div className="flex flex-col-reverse sm:flex-row gap-2">
                    <DialogClose asChild><Button type="button" variant="secondary" className="w-full sm:w-auto">Cancel</Button></DialogClose>
                     {step < 3 && <Button type="button" onClick={() => handleStepNavigation(step + 1)} className="w-full sm:w-auto">Next <ArrowRight className="ml-2 h-4 w-4" /></Button>}
                    {step === 3 && <Button type="submit" disabled={isSubmitting || isUploading} className="w-full sm:w-auto">
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

const IdentificationDetail = ({ label, value }: { label: string, value: string | undefined | null }) => {
    if (!value) return null;
    return (
        <p className="text-sm">
            <span className="font-semibold">{label}:</span> <span className="text-muted-foreground">{value}</span>
        </p>
    );
};

function HiracCard({ item, onEdit, onReassess, onDelete }: { item: HiracEntry, onEdit: (item: HiracEntry) => void, onReassess: (item: HiracEntry) => void, onDelete: (id: string) => void }) {
    const initialRiskLevel = item.initialLikelihood * item.initialSeverity;
    const initialRiskDetails = getRiskLevelDetails(initialRiskLevel);
    const isReassessed = item.residualLikelihood != null && item.residualSeverity != null;
    const residualRiskLevel = isReassessed ? (item.residualLikelihood!) * (item.residualSeverity!) : null;
    const residualRiskDetails = (isReassessed && residualRiskLevel !== null) ? getRiskLevelDetails(residualRiskLevel) : null;
    
    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-base font-semibold">{item.task}</CardTitle>
                        <CardDescription>{item.department?.name} ({item.taskType})</CardDescription>
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
                                <Image src={item.hazardPhotoUrl} alt={`Photo for ${item.hazard}`} fill className="object-cover" data-ai-hint="hazard"/>
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
                    <IdentificationDetail label="Hazard" value={item.hazard} />
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
                        <p className="text-sm text-muted-foreground">Risk Re-Assessment</p>
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
    );
}

const statusColorMap: { [key in ControlStatus]: string } = {
    'Implemented': 'bg-green-600/80 text-white',
    'For Implementation': 'bg-yellow-500/80 text-black',
};

const HiracControlRow = ({ control }: { control: HiracEntry['controlMeasures'][0] }) => {
    return (
        <>
            <td className="border-r-2 border-border/50 p-1 whitespace-pre-wrap">{control.description}</td>
            <td className="text-center border-r-2 border-border/50 p-1">{control.pic}</td>
            <td className={cn("text-center p-0 border-r-2 border-border/50", control.status && statusColorMap[control.status])}>
                {control.status}
            </td>
            <td className="text-center border-r-2 border-border/50 p-1">
                {control.completionDate ? format(new Date(control.completionDate), "P") : ''}
            </td>
        </>
    );
};

const HiracEntryRow = ({
    item,
    index,
    onEdit,
    onReassess,
    onDelete,
}: {
    item: HiracEntry;
    index: number;
    onEdit: (item: HiracEntry) => void;
    onReassess: (item: HiracEntry) => void;
    onDelete: (id: string) => void;
}) => {
    const initialRiskLevel = item.initialLikelihood * item.initialSeverity;
    const initialRiskDetails = getRiskLevelDetails(initialRiskLevel);
    const isReassessed = item.residualLikelihood != null && item.residualSeverity != null;
    const residualRiskLevel = isReassessed ? item.residualLikelihood! * item.residualSeverity! : null;
    const residualRiskDetails = isReassessed && residualRiskLevel !== null ? getRiskLevelDetails(residualRiskLevel) : null;

    const engControls = item.controlMeasures.filter(c => c.type === 'Engineering');
    const admControls = item.controlMeasures.filter(c => c.type === 'Administrative');
    const ppeControls = item.controlMeasures.filter(c => c.type === 'PPE');

    const maxRows = Math.max(1, engControls.length, admControls.length, ppeControls.length);

    return (
        <>
            {[...Array(maxRows)].map((_, rowIndex) => (
                <tr key={`${item.id}-${rowIndex}`} className={cn("border-b-2 border-border/50", index % 2 === 0 ? "bg-muted/30" : "")}>
                    {rowIndex === 0 && (
                        <>
                            <td rowSpan={maxRows} className="font-medium align-top border-r-2 border-border/50 p-1">{item.department?.name}</td>
                            <td rowSpan={maxRows} className="font-medium align-top border-r-2 border-border/50 p-1">{item.task}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-1">{item.taskType}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-1">{item.hazardClass}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-1 w-[300px]">
                                {item.hazardPhotoUrl && (
                                    <Dialog>
                                        <DialogTrigger asChild>
                                        <div className="mb-1 relative w-full aspect-video cursor-pointer hover:opacity-80 transition-opacity">
                                            <Image src={item.hazardPhotoUrl} alt={`Photo for ${item.hazard}`} width={100} height={75} className="rounded-md object-contain" data-ai-hint="hazard"/>
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
                            </td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 whitespace-pre-wrap p-1 w-[300px]">{item.hazardousEvent}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 whitespace-pre-wrap p-1 w-[300px]">{item.impact}</td>
                            <td rowSpan={maxRows} className="text-center align-top font-mono text-xs border-r-2 border-border/50 p-1">P:{item.initialLikelihood}, S:{item.initialSeverity}</td>
                            <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", initialRiskDetails.color)}>
                                <TooltipProvider><Tooltip><TooltipTrigger className="w-full h-full flex items-center justify-center p-1">{initialRiskLevel}</TooltipTrigger><TooltipContent><p className="font-bold">Risk Level: {initialRiskLevel} ({initialRiskDetails.label})</p></TooltipContent></Tooltip></TooltipProvider>
                            </td>
                        </>
                    )}
                    
                    {engControls[rowIndex] ? <HiracControlRow control={engControls[rowIndex]} /> : <td colSpan={4} className="border-r-2 border-border/50 p-1"></td>}
                    {admControls[rowIndex] ? <HiracControlRow control={admControls[rowIndex]} /> : <td colSpan={4} className="border-r-2 border-border/50 p-1"></td>}
                    {ppeControls[rowIndex] ? <HiracControlRow control={ppeControls[rowIndex]} /> : <td colSpan={4} className="border-r-2 border-border/50 p-1"></td>}

                    {rowIndex === 0 && (
                         <>
                            <td rowSpan={maxRows} className="text-center align-top font-mono text-xs border-r-2 border-border/50 p-1">{isReassessed ? `P:${item.residualLikelihood}, S:${item.residualSeverity}` : 'N/A'}</td>
                            <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", isReassessed && residualRiskDetails ? residualRiskDetails.color : 'bg-muted/30')}>
                                {isReassessed && residualRiskDetails && residualRiskLevel !== null ? (
                                    <TooltipProvider><Tooltip><TooltipTrigger className="w-full h-full flex items-center justify-center p-1">{residualRiskLevel}</TooltipTrigger><TooltipContent><p className="font-bold">Risk Level: {residualRiskLevel} ({residualRiskDetails.label})</p></TooltipContent></Tooltip></TooltipProvider>
                                ) : ('N/A')}
                            </td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-1">{item.createdAt ? format(new Date(item.createdAt), "P") : ''}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-1">{item.reviewedAt ? format(new Date(item.reviewedAt), "P") : <span className="text-muted-foreground">Not yet</span>}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-1">{item.nextReviewDate ? format(new Date(item.nextReviewDate), "P") : <span className="text-muted-foreground">Not set</span>}</td>
                            <td rowSpan={maxRows} className="align-top text-right p-1">
                                <AlertDialog>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open menu</span><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onEdit(item)}><FilePenLine className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onReassess(item)}><BarChart className="mr-2 h-4 w-4" /> Re-assess Risk</DropdownMenuItem>
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
                                            <AlertDialogAction onClick={() => onDelete(item.id)}>Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </td>
                        </>
                    )}
                </tr>
            ))}
        </>
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
  const dialogContentRef = React.useRef<HTMLDivElement>(null);

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
            item.hazardClass.toLowerCase().includes(lowercasedFilter) ||
            item.hazardousEvent.toLowerCase().includes(lowercasedFilter) ||
            item.impact.toLowerCase().includes(lowercasedFilter)
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
    <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
                <h1 className="text-xl md:text-2xl font-bold tracking-tight">HIRAC Register</h1>
                <p className="text-sm text-muted-foreground">A register of all identified hazards, their risks, and control measures.</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative w-full sm:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Filter by task, hazard..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-full max-w-sm pl-9"
                    />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by Department" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(opt => <SelectItem key={opt.id} value={String(opt.id)}>{opt.name}</SelectItem>)}
                    </SelectContent>
                </Select>
                <Button onClick={handleNewEntry} className="w-full sm:w-auto">
                    <FilePlus2 className="mr-2 h-4 w-4" />
                    New HIRAC Entry
                </Button>
            </div>
        </div>
      
      <div className="space-y-4">
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
                <div className="hidden md:block border-2 border-border/50 rounded-lg overflow-y-auto max-h-[calc(130vh-10rem)]">
                    <table className="w-full caption-bottom text-xs relative border-collapse">
                        <thead className="sticky top-0 z-10 bg-primary/90 backdrop-blur-sm">
                            <tr className="border-b-2 border-border/50 hover:bg-primary/95">
                                <th className="w-[120px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Department</th>
                                <th className="w-[120px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Task/Job</th>
                                <th className="w-[100px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Task Type</th>
                                <th className="w-[120px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Hazard Class</th>
                                <th className="w-[300px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Hazard</th>
                                <th className="w-[300px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Hazardous Event</th>
                                <th className="w-[300px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Impact</th>
                                <th colSpan={2} className="text-center border-b-2 border-r-2 border-border/50 text-primary-foreground p-1">Initial Risk</th>
                                <th colSpan={4} className="text-center border-b-2 border-r-2 border-border/50 text-primary-foreground p-1">Engineering Controls</th>
                                <th colSpan={4} className="text-center border-b-2 border-r-2 border-border/50 text-primary-foreground p-1">Administrative Controls</th>
                                <th colSpan={4} className="text-center border-b-2 border-r-2 border-border/50 text-primary-foreground p-1">PPE Controls</th>
                                <th colSpan={2} className="text-center border-b-2 border-r-2 border-border/50 text-primary-foreground p-1">Risk Re-assessment</th>
                                <th className="w-[100px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Created</th>
                                <th className="w-[100px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Last Reviewed</th>
                                <th className="w-[100px] align-bottom border-r-2 border-border/50 text-primary-foreground p-1" rowSpan={2}>Next Review</th>
                                <th className="align-bottom text-primary-foreground p-1" rowSpan={2}><span className="sr-only">Actions</span></th>
                            </tr>
                            <tr className="border-b-2 border-border/50 hover:bg-primary/95">
                                <th className="text-center border-r-2 border-border/50 text-primary-foreground p-1">P,S</th>
                                <th className="text-center border-r-2 border-border/50 text-primary-foreground p-1">RL</th>
                                <th className="w-[300px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Description</th>
                                <th className="w-[100px] text-center border-r-2 border-border/50 text-primary-foreground p-1">PIC</th>
                                <th className="w-[100px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Status</th>
                                <th className="w-[120px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Completion</th>
                                <th className="w-[300px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Description</th>
                                <th className="w-[100px] text-center border-r-2 border-border/50 text-primary-foreground p-1">PIC</th>
                                <th className="w-[100px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Status</th>
                                <th className="w-[120px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Completion</th>
                                <th className="w-[300px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Description</th>
                                <th className="w-[100px] text-center border-r-2 border-border/50 text-primary-foreground p-1">PIC</th>
                                <th className="w-[100px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Status</th>
                                <th className="w-[120px] text-center border-r-2 border-border/50 text-primary-foreground p-1">Completion</th>
                                <th className="text-center border-r-2 border-border/50 text-primary-foreground p-1">P,S</th>
                                <th className="text-center border-r-2 border-border/50 text-primary-foreground p-1">RL</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHiracData.map((item, index) => (
                                <HiracEntryRow 
                                    key={item.id} 
                                    item={item}
                                    index={index}
                                    onEdit={handleEditEntry}
                                    onReassess={handleReassessEntry}
                                    onDelete={handleDeleteEntry}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
         )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent ref={dialogContentRef} className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>{entryToEdit ? 'Edit' : 'New'} HIRAC Entry</DialogTitle>
                <DialogDescription>
                    {entryToEdit ? "Update the details for this HIRAC entry. This will also update the 'Last Reviewed' date." : 'Follow the steps to add a new hazard identification and risk assessment.'}
                </DialogDescription>
            </DialogHeader>
            <HiracForm 
                setOpen={setDialogOpen} 
                entryToEdit={entryToEdit} 
                onFormSubmit={handleFormSubmit} 
                departments={departments}
                dialogContentRef={dialogContentRef}
            />
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

    