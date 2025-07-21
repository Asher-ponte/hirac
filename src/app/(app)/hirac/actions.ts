
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
        ...formData
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

export async function resetHiracSequence() {
  await db.run(sql`DELETE FROM sqlite_sequence WHERE name='hirac_entries';`);
}
