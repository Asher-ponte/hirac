
'use server';

import { getDb } from '@/lib/db';
import { hiracEntries, controlMeasures, departments } from '@/lib/db/schema';
import type { HiracEntry, ControlMeasure, TaskType } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { eq, inArray, sql, desc, asc } from 'drizzle-orm';
import { addYears } from 'date-fns';

export async function getHiracEntries(departmentId?: number): Promise<HiracEntry[]> {
  try {
    const db = await getDb();
    const queryOptions = {
      with: {
        controlMeasures: true,
        department: true,
      },
      orderBy: [asc(hiracEntries.displayOrder), desc(hiracEntries.id)],
      where: departmentId ? eq(hiracEntries.departmentId, departmentId) : undefined,
    };

    // @ts-ignore
    const data = await db.query.hiracEntries.findMany(queryOptions);

    return data.map(entry => ({
      ...entry,
      id: `HIRAC-${entry.id.toString().padStart(3, '0')}`,
      controlMeasures: (entry.controlMeasures || []).map((cm: ControlMeasure) => ({
        ...cm,
        id: cm.id,
      })),
      status: entry.status ?? 'For Implementation',
      taskType: entry.taskType ?? 'Routine',
      createdAt: entry.createdAt ? new Date(entry.createdAt).toISOString() : '',
      reviewedAt: entry.reviewedAt ? new Date(entry.reviewedAt).toISOString() : null,
      nextReviewDate: entry.nextReviewDate ? new Date(entry.nextReviewDate).toISOString() : null,
    }));
  } catch (error) {
    console.error("Failed to fetch HIRAC entries:", error);
    return [];
  }
}

type HiracEntryPayload = Omit<HiracEntry, 'id' | 'controlMeasures' | 'status' | 'department' | 'createdAt' | 'reviewedAt' | 'nextReviewDate' | 'displayOrder'> & {
  controlMeasures: (Omit<ControlMeasure, 'id'> & { id?: number })[];
  nextReviewDate?: string | null;
};

export async function createHiracEntry(formData: HiracEntryPayload) {
  if (!formData.departmentId || formData.departmentId === 0) {
    throw new Error("A valid department must be selected.");
  }
  
  const db = await getDb();
  await db.transaction(async (tx) => {
    
    const nextReviewDate = formData.nextReviewDate 
        ? new Date(formData.nextReviewDate)
        : addYears(new Date(), 1);
    
    const [maxOrderResult] = await tx.select({ maxValue: sql<number>`max(${hiracEntries.displayOrder})` }).from(hiracEntries);
    const newDisplayOrder = (maxOrderResult.maxValue || 0) + 1;


    const [insertResult] = await tx.insert(hiracEntries).values({
      departmentId: formData.departmentId,
      task: formData.task,
      taskType: formData.taskType,
      hazard: formData.hazard,
      hazardPhotoUrl: formData.hazardPhotoUrl,
      hazardClass: formData.hazardClass,
      hazardousEvent: formData.hazardousEvent,
      personsHarmed: formData.personsHarmed,
      impact: formData.impact,
      initialLikelihood: formData.initialLikelihood,
      initialSeverity: formData.initialSeverity,
      residualLikelihood: null,
      residualSeverity: null,
      nextReviewDate: nextReviewDate,
      status: 'For Implementation',
      displayOrder: newDisplayOrder,
    });
    
    const newHiracEntryId = insertResult.insertId;

    if (formData.controlMeasures.length > 0) {
      const controlsToInsert = formData.controlMeasures.map((cm: any) => ({
        ...cm,
        hiracEntryId: newHiracEntryId,
        description: cm.description || "N/A",
        completionDate: cm.status === 'Implemented' ? null : (cm.completionDate ? new Date(cm.completionDate) : null),
      }));
      await tx.insert(controlMeasures).values(controlsToInsert);
    }
  });

  revalidatePath('/hirac');
  revalidatePath('/dashboard');
}

export async function updateHiracEntry(id: number, formData: HiracEntryPayload) {
    const db = await getDb();
    await db.transaction(async (tx) => {
        const allImplemented = formData.controlMeasures.length > 0 && formData.controlMeasures.every(cm => cm.status === 'Implemented');
        
        let newStatus: HiracEntry['status'] = 'For Implementation';
        if (allImplemented) {
            newStatus = 'Implemented';
        }

        await tx.update(hiracEntries).set({
            departmentId: formData.departmentId,
            task: formData.task,
            taskType: formData.taskType,
            hazard: formData.hazard,
            hazardPhotoUrl: formData.hazardPhotoUrl,
            hazardClass: formData.hazardClass,
            hazardousEvent: formData.hazardousEvent,
            personsHarmed: formData.personsHarmed,
            impact: formData.impact,
            initialLikelihood: formData.initialLikelihood,
            initialSeverity: formData.initialSeverity,
            residualLikelihood: formData.residualLikelihood,
            residualSeverity: formData.residualSeverity,
            nextReviewDate: formData.nextReviewDate ? new Date(formData.nextReviewDate) : null,
            reviewedAt: new Date(),
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
                        description: cm.description || "N/A",
                        completionDate: cm.status === 'Implemented' ? null : (cm.completionDate ? new Date(cm.completionDate) : null),
                    }).where(eq(controlMeasures.id, cm.id));
                }
            }
        }
        
        if (controlsToInsert.length > 0) {
            await tx.insert(controlMeasures).values(controlsToInsert.map((cm: any) => ({
                ...cm,
                hiracEntryId: id,
                description: cm.description || "N/A",
                completionDate: cm.status === 'Implemented' ? null : (cm.completionDate ? new Date(cm.completionDate) : null),
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
    const db = await getDb();
    await db.delete(hiracEntries).where(eq(hiracEntries.id, id));
    revalidatePath('/hirac');
    revalidatePath('/dashboard');
}

export async function updateResidualRisk(id: number, data: { residualLikelihood: number; residualSeverity: number }) {
  const db = await getDb();
  await db.update(hiracEntries).set({
    residualLikelihood: data.residualLikelihood,
    residualSeverity: data.residualSeverity,
    reviewedAt: new Date(),
  }).where(eq(hiracEntries.id, id));

  revalidatePath('/hirac');
  revalidatePath('/dashboard');
}

export async function updateHiracOrder(orderedIds: number[]) {
    const db = await getDb();
    await db.transaction(async (tx) => {
        for (let i = 0; i < orderedIds.length; i++) {
            await tx.update(hiracEntries)
                .set({ displayOrder: i + 1 })
                .where(eq(hiracEntries.id, orderedIds[i]));
        }
    });
    revalidatePath('/hirac');
}

export async function getDepartments() {
    const db = await getDb();
    return await db.query.departments.findMany();
}
