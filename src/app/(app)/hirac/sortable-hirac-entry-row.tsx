"use client";

import * as React from 'react';
import Image from 'next/image';
import { format } from "date-fns";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, FilePenLine, Trash2, BarChart, GripVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { HiracEntry, ControlStatus } from '@/lib/types';

const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const Highlight = ({ text, highlight }: { text: string | null | undefined; highlight: string }) => {
    if (!text) return null;
    if (!highlight.trim()) {
        return <>{text}</>;
    }
    const escapedHighlight = escapeRegExp(highlight);
    const regex = new RegExp(`(${escapedHighlight})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                regex.test(part) ? (
                    <mark key={i} className="bg-yellow-400 text-black rounded">
                        {part}
                    </mark>
                ) : (
                    part
                )
            )}
        </>
    );
};

const getRiskLevelDetails = (level: number) => {
  if (level <= 6) return { label: 'Low Risk', variant: 'secondary', color: 'bg-green-600/80 text-white' } as const;
  if (level <= 12) return { label: 'Medium Risk', variant: 'default', color: 'bg-yellow-500/80 text-black' } as const;
  return { label: 'High Risk', variant: 'destructive', color: 'bg-red-600/80 text-white' } as const;
};

const getScoreBgColor = (score: number | null | undefined) => {
    if (!score) return 'bg-muted/30';
    if (score <= 2) return 'bg-green-600/80 text-white';
    if (score === 3) return 'bg-yellow-500/80 text-black';
    if (score >= 4) return 'bg-red-600/80 text-white';
    return 'bg-muted/30';
};

const statusColorMap: { [key in ControlStatus]: string } = {
    'Implemented': 'bg-green-600/80 text-white',
    'For Implementation': 'bg-yellow-500/80 text-black',
};

export function SortableHiracEntryRow({
    item,
    index,
    onEdit,
    onReassess,
    onDelete,
    highlight,
}: {
    item: HiracEntry;
    index: number;
    onEdit: (item: HiracEntry) => void;
    onReassess: (item: HiracEntry) => void;
    onDelete: (id: string) => void;
    highlight: string;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({id: item.id});

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
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
        <tbody ref={setNodeRef} style={style} className="group">
            {[...Array(maxRows)].map((_, rowIndex) => (
                <tr key={`${item.id}-${rowIndex}`} className={cn("border-b-2 border-border/50 group-active:bg-muted", index % 2 === 0 ? "bg-muted/30" : "")}>
                    {rowIndex === 0 && (
                        <td rowSpan={maxRows} className="align-middle border-r-2 border-border/50 p-0 text-center">
                            <Button variant="ghost" size="icon" {...attributes} {...listeners} data-dnd-handle="true" className="cursor-grab p-2 w-full h-full rounded-none"><GripVertical className="h-5 w-5 text-muted-foreground" /></Button>
                        </td>
                    )}
                    {rowIndex === 0 && (
                        <>
                            <td rowSpan={maxRows} className="font-medium align-top border-r-2 border-border/50 p-2 px-3"><Highlight text={item.id} highlight={highlight} /></td>
                            <td rowSpan={maxRows} className="font-medium align-top border-r-2 border-border/50 p-2 px-3"><Highlight text={item.department?.name} highlight={highlight} /></td>
                            <td rowSpan={maxRows} className="font-medium align-top border-r-2 border-border/50 p-2 px-3"><Highlight text={item.task} highlight={highlight} /></td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-2 px-3"><Highlight text={item.taskType} highlight={highlight} /></td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-2 px-3"><Highlight text={item.hazardClass} highlight={highlight} /></td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-2 px-3 w-[300px]">
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
                                <Highlight text={item.hazard} highlight={highlight} />
                            </td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 whitespace-pre-wrap p-2 px-3 w-[300px]"><Highlight text={item.hazardousEvent} highlight={highlight} /></td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 whitespace-pre-wrap p-2 px-3 w-[300px]"><Highlight text={item.personsHarmed} highlight={highlight} /></td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 whitespace-pre-wrap p-2 px-3 w-[300px]"><Highlight text={item.impact} highlight={highlight} /></td>
                            
                            {/* Initial Risk Cells - S / P / RL */}
                            <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", getScoreBgColor(item.initialSeverity))}>
                                {item.initialSeverity}
                            </td>
                            <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", getScoreBgColor(item.initialLikelihood))}>
                                {item.initialLikelihood}
                            </td>
                            <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", initialRiskDetails.color)}>
                                <TooltipProvider><Tooltip><TooltipTrigger className="w-full h-full flex items-center justify-center p-2 px-3">{initialRiskLevel}</TooltipTrigger><TooltipContent><p className="font-bold">Risk Level: {initialRiskLevel} ({initialRiskDetails.label})</p></TooltipContent></Tooltip></TooltipProvider>
                            </td>
                        </>
                    )}
                    
                    {[
                        {controls: engControls, type: 'Engineering'}, 
                        {controls: admControls, type: 'Administrative'}, 
                        {controls: ppeControls, type: 'PPE'}
                    ].map(({controls, type}, typeIndex) => {
                        const control = controls[rowIndex];
                        if(control) {
                            return (
                                <React.Fragment key={`${type}-${control.id || rowIndex}-${rowIndex}`}>
                                    <td key={`desc-${type}-${rowIndex}`} className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 w-[300px]"><Highlight text={control.description} highlight={highlight} /></td>
                                    <td key={`pic-${type}-${rowIndex}`} className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 text-center w-[100px]"><Highlight text={control.pic} highlight={highlight} /></td>
                                    <td key={`status-${type}-${rowIndex}`} className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 p-0 w-[100px]"><div className={cn("text-center p-1 h-full", control.status && statusColorMap[control.status])}><Highlight text={control.status} highlight={highlight} /></div></td>
                                    <td key={`date-${type}-${rowIndex}`} className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 text-center w-[120px]">{control.completionDate ? format(new Date(control.completionDate), "P") : ''}</td>
                                </React.Fragment>
                            );
                        }
                        // Render empty cells to maintain table structure
                        return (
                            <React.Fragment key={`${type}-${rowIndex}-empty`}>
                                <td className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 w-[300px]" key={`desc-empty-${type}-${rowIndex}`}></td>
                                <td className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 text-center w-[100px]" key={`pic-empty-${type}-${rowIndex}`}></td>
                                <td className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 p-0 w-[100px]" key={`status-empty-${type}-${rowIndex}`}></td>
                                <td className="p-2 whitespace-pre-wrap border-r-2 border-border/50 px-3 text-center w-[120px]" key={`date-empty-${type}-${rowIndex}`}></td>
                            </React.Fragment>
                        )
                    })}
                   

                    {rowIndex === 0 && (
                         <>
                            {/* Reassessment Risk Cells - S / P / RL */}
                            <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", getScoreBgColor(isReassessed ? item.residualSeverity : null))}>
                                {isReassessed ? item.residualSeverity : 'N/A'}
                            </td>
                             <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", getScoreBgColor(isReassessed ? item.residualLikelihood : null))}>
                                {isReassessed ? item.residualLikelihood : 'N/A'}
                            </td>
                            <td rowSpan={maxRows} className={cn("text-center align-middle p-0 border-r-2 border-border/50 font-bold", isReassessed && residualRiskDetails ? residualRiskDetails.color : 'bg-muted/30')}>
                                {isReassessed && residualRiskDetails && residualRiskLevel !== null ? (
                                    <TooltipProvider><Tooltip><TooltipTrigger className="w-full h-full flex items-center justify-center p-2 px-3">{residualRiskLevel}</TooltipTrigger><TooltipContent><p className="font-bold">Risk Level: {residualRiskLevel} ({residualRiskDetails.label})</p></TooltipContent></Tooltip></TooltipProvider>
                                ) : ('N/A')}
                            </td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-2 px-3">{item.createdAt ? format(new Date(item.createdAt), "P") : ''}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-2 px-3">{item.reviewedAt ? format(new Date(item.reviewedAt), "P") : <span className="text-muted-foreground">Not yet</span>}</td>
                            <td rowSpan={maxRows} className="align-top border-r-2 border-border/50 p-2 px-3">{item.nextReviewDate ? format(new Date(item.nextReviewDate), "P") : <span className="text-muted-foreground">Not set</span>}</td>
                            <td rowSpan={maxRows} className="align-top text-right p-2 px-3">
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
        </tbody>
    );
}
