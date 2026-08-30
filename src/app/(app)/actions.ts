
'use server';

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function checkDbConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    const db = await getDb();
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error) {
        if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
            return { ok: false, error: "Cloud SQL connector could not reach the instance." };
        }
        if (error.message.includes('ER_ACCESS_DENIED_ERROR') || error.message.includes('ER_DBACCESS_DENIED_ERROR')) {
            return { ok: false, error: "Database access denied." };
        }
        if (error.message.startsWith('DATABASE_ERROR:')) {
            return { ok: false, error: "Cloud SQL connector configuration is missing or invalid." };
        }
        return { ok: false, error: "Database connection check failed." };
    }
    return { ok: false, error: "Database connection check failed." };
  }
}
