
'use server';

import { db } from '@/lib/db';
import { hiracEntries } from '@/lib/db/schema';
import type { HiracEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';


export async function getHiracEntries(): Promise<HiracEntry[]> {
  try {
    const data = await db.query.hiracEntries.findMany({
        orderBy: (hiracEntries, { desc }) => [desc(hiracEntries.id)],
    });
    return data.map(entry => ({
      ...entry,
      id: `HIRAC-${entry.id.toString().padStart(3, '0')}`,
    }));
  } catch (error) {
    console.error("Failed to fetch HIRAC entries:", error);
    return [];
  }
}

export async function createHiracEntry(formData: Omit<HiracEntry, 'id'>) {
    await db.insert(hiracEntries).values({
        task: formData.task,
        hazard: formData.hazard,
        hazardPhotoUrl: formData.hazardPhotoUrl,
        hazardClass: formData.hazardClass,
        hazardousEvent: formData.hazardousEvent,
        impact: formData.impact,
        initialLikelihood: formData.initialLikelihood,
        initialSeverity: formData.initialSeverity,
        engineeringControls: formData.engineeringControls,
        administrativeControls: formData.administrativeControls,
        ppe: formData.ppe,
        responsiblePerson: formData.responsiblePerson,
        residualLikelihood: formData.residualLikelihood,
        residualSeverity: formData.residualSeverity,
        status: formData.status,
    });
    revalidatePath('/hirac');
    revalidatePath('/dashboard');
}

export async function updateHiracEntry(id: number, formData: Omit<HiracEntry, 'id'>) {
    await db.update(hiracEntries).set(formData).where(eq(hiracEntries.id, id));
    revalidatePath('/hirac');
    revalidatePath('/dashboard');
}

export async function deleteHiracEntry(id: number) {
    await db.delete(hiracEntries).where(eq(hiracEntries.id, id));
    revalidatePath('/hirac');
    revalidatePath('/dashboard');
}

export async function reassessHiracEntry(id: number, data: { residualLikelihood: number; residualSeverity: number; status: 'Ongoing' | 'Implemented' | 'Not Implemented' }) {
    await db.update(hiracEntries).set({
        residualLikelihood: data.residualLikelihood,
        residualSeverity: data.residualSeverity,
        status: data.status,
    }).where(eq(hiracEntries.id, id));
    revalidatePath('/hirac');
    revalidatePath('/dashboard');
}

export async function resetHiracSequence() {
  await db.run(sql`DELETE FROM sqlite_sequence WHERE name='hirac_entries';`);
}
