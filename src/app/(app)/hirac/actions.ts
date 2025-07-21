
'use server';

import { db } from '@/lib/db';
import { hiracEntries, controlMeasures } from '@/lib/db/schema';
import type { HiracEntry, ControlMeasure } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { eq, inArray } from 'drizzle-orm';
import { sql } from 'drizzle-orm';


export async function getHiracEntries(): Promise<HiracEntry[]> {
  try {
    const data = await db.query.hiracEntries.findMany({
      with: {
        controlMeasures: true,
      },
      orderBy: (hiracEntries, { desc }) => [desc(hiracEntries.id)],
    });

    return data.map(entry => ({
      ...entry,
      id: `HIRAC-${entry.id.toString().padStart(3, '0')}`,
      controlMeasures: entry.controlMeasures.map(cm => ({
        ...cm,
        id: cm.id,
      })),
    }));
  } catch (error) {
    console.error("Failed to fetch HIRAC entries:", error);
    return [];
  }
}

type HiracEntryPayload = Omit<HiracEntry, 'id' | 'controlMeasures'> & {
  controlMeasures: (Omit<ControlMeasure, 'id'> & { id?: number })[];
};

export async function createHiracEntry(formData: HiracEntryPayload) {
  await db.transaction(async (tx) => {
    const [newHiracEntry] = await tx.insert(hiracEntries).values({
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
        await tx.update(hiracEntries).set({
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
        }).where(eq(hiracEntries.id, id));

        const existingControls = await tx.query.controlMeasures.findMany({
            where: eq(controlMeasures.hiracEntryId, id)
        });

        const controlsToUpdate = formData.controlMeasures.filter(cm => cm.id && existingControls.some(ec => ec.id === cm.id));
        const controlsToInsert = formData.controlMeasures.filter(cm => !cm.id);
        const controlsToDelete = existingControls.filter(ec => !formData.controlMeasures.some(cm => cm.id === ec.id));

        if (controlsToUpdate.length > 0) {
            for (const cm of controlsToUpdate) {
                await tx.update(controlMeasures).set({
                    ...cm,
                    description: cm.description || "N/A"
                }).where(eq(controlMeasures.id, cm.id!));
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
            await tx.delete(controlMeasures).where(inArray(controlMeasures.id, controlsToDelete.map(c => c.id)));
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

export async function resetHiracSequence() {
  await db.run(sql`DELETE FROM sqlite_sequence WHERE name='hirac_entries';`);
}