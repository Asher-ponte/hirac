'use server';

import { db } from '@/lib/db';
import { hiracEntries } from '@/lib/db/schema';
import type { HiracEntry } from '@/lib/types';
import { revalidatePath } from 'next/cache';

export async function getHiracEntries(): Promise<HiracEntry[]> {
  try {
    const data = await db.query.hiracEntries.findMany();
    // The database returns id as a number, but our type expects a string.
    // This is a quick fix to map the data to the expected type.
    return data.map(entry => ({
      ...entry,
      id: `HIRAC-${entry.id.toString().padStart(3, '0')}`,
    }));
  } catch (error) {
    console.error("Failed to fetch HIRAC entries:", error);
    // If the table doesn't exist, Drizzle throws an error.
    // We'll return an empty array in that case so the app can still render.
    // The db:push command will create the table on the next run.
    return [];
  }
}

export async function createHiracEntry(formData: Omit<HiracEntry, 'id'>) {
    await db.insert(hiracEntries).values({
        ...formData,
        // Set default residual values as they are not in the form anymore
        residualLikelihood: formData.initialLikelihood,
        residualSeverity: formData.initialSeverity,
    });
    revalidatePath('/hirac');
}
