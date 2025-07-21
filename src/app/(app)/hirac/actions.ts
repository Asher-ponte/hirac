
'use server';

import { db } from '@/lib/db';
import { hiracEntries, controlMeasures } from '@/lib/db/schema';
import type { HiracEntry, ControlMeasure } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';


export async function getHiracEntries(department?: string): Promise<HiracEntry[]> {
  try {
    const queryOptions = {
      with: {
        controlMeasures: true,
      },
      orderBy: (hiracEntries: any, { desc }: any) => [desc(hiracEntries.id)],
      where: department ? eq(hiracEntries.department, department) : undefined,
    };

    // @ts-ignore
    const data = await db.query.hiracEntries.findMany(queryOptions);

    return data.map(entry => ({
      ...entry,
      id: `HIRAC-${entry.id.toString().padStart(3, '0')}`,
      controlMeasures: entry.controlMeasures.map(cm => ({
        ...cm,
        id: cm.id,
      })),
      status: entry.status ?? 'Ongoing' // Ensure status is not null
    }));
  } catch (error) {
    console.error("Failed to fetch HIRAC entries:", error);
    return [];
  }
}

type HiracEntryPayload = Omit<HiracEntry, 'id' | 'controlMeasures' | 'status'> & {
  controlMeasures: (Omit<ControlMeasure, 'id'> & { id?: number })[];
};

export async function createHiracEntry(formData: HiracEntryPayload) {
  await db.transaction(async (tx) => {
    const [newHiracEntry] = await tx.insert(hiracEntries).values({
      department: formData.department,
      task: formData.task,
      hazard: formData.hazard,
      hazardPhotoUrl: formData.hazardPhotoUrl,
      hazardClass: formData.hazardClass,
      hazardousEvent: formData.hazardousEvent,
      impact: formData.impact,
      initialLikelihood: formData.initialLikelihood,
      initialSeverity: formData.initialSeverity,
      residualLikelihood: formData.residualLikelihood,
      residualSeverity: formData.residualSeverity,
      // Default status for new entries
      status: 'Ongoing'
    }).returning({ id: hiracEntries.id });

    if (formData.controlMeasures.length > 0) {
      const controlsToInsert = formData.controlMeasures.map(cm => ({
        ...cm,
        hiracEntryId: newHiracEntry.id,
        description: cm.description || "N/A",
      }));
      await tx.insert(controlMeasures).values(controlsToInsert);
    }
  });

  revalidatePath('/hirac');
  revalidatePath('/dashboard');
}

export async function updateHiracEntry(id: number, formData: HiracEntryPayload) {
    await db.transaction(async (tx) => {
        // Recalculate status based on control measures
        const allImplemented = formData.controlMeasures.length > 0 && formData.controlMeasures.every(cm => cm.status === 'Implemented');
        const anyOngoing = formData.controlMeasures.some(cm => cm.status === 'Ongoing');
        
        let newStatus: HiracEntry['status'] = 'For Implementation';
        if (allImplemented) {
            newStatus = 'Implemented';
        } else if (anyOngoing) {
            newStatus = 'Ongoing';
        }


        await tx.update(hiracEntries).set({
            department: formData.department,
            task: formData.task,
            hazard: formData.hazard,
            hazardPhotoUrl: formData.hazardPhotoUrl,
            hazardClass: formData.hazardClass,
            hazardousEvent: formData.hazardousEvent,
            impact: formData.impact,
            initialLikelihood: formData.initialLikelihood,
            initialSeverity: formData.initialSeverity,
            residualLikelihood: formData.residualLikelihood,
            residualSeverity: formData.residualSeverity,
            status: newStatus,
        }).where(eq(hiracEntries.id, id));

        const existingControls = await tx.query.controlMeasures.findMany({
            where: eq(controlMeasures.hiracEntryId, id)
        });

        const controlsToUpdate = formData.controlMeasures.filter(cm => cm.id && existingControls.some(ec => ec.id === cm.id));
        const controlsToInsert = formData.controlMeasures.filter(cm => !cm.id);
        const controlsToDelete = existingControls.filter(ec => !formData.controlMeasures.some(cm => cm.id === ec.id));

        if (controlsToUpdate.length > 0) {
            for (const cm of controlsToUpdate) {
                if(cm.id) {
                    await tx.update(controlMeasures).set({
                        ...cm,
                        description: cm.description || "N/A"
                    }).where(eq(controlMeasures.id, cm.id));
                }
            }
        }
        
        if (controlsToInsert.length > 0) {
            await tx.insert(controlMeasures).values(controlsToInsert.map(cm => ({
                ...cm,
                hiracEntryId: id,
                description: cm.description || "N/A",
            })));
        }

        if (controlsToDelete.length > 0) {
            await tx.delete(controlMeasures).where(inArray(controlMeasures.id, controlsToDelete.map(c => c.id!)));
        }
    });

    revalidatePath('/hirac');
    revalidatePath('/dashboard');
}

export async function deleteHiracEntry(id: number) {
    await db.delete(hiracEntries).where(eq(hiracEntries.id, id));
    revalidatePath('/hirac');
    revalidatePath('/dashboard');
}

export async function updateResidualRisk(id: number, data: { residualLikelihood: number; residualSeverity: number }) {
  await db.update(hiracEntries).set({
    residualLikelihood: data.residualLikelihood,
    residualSeverity: data.residualSeverity,
  }).where(eq(hiracEntries.id, id));

  revalidatePath('/hirac');
  revalidatePath('/dashboard');
}
