'use server';

import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function checkDbConnection(): Promise<{ ok: boolean; error?: string }> {
  try {
    // Perform a simple query to check the connection
    await db.execute(sql`SELECT 1`);
    return { ok: true };
  } catch (error) {
    console.error("Database connection check failed:", error);
    if (error instanceof Error) {
        // Provide a more user-friendly message for common errors
        if (error.message.includes('ECONNREFUSED')) {
            return { ok: false, error: "Connection Refused: Please ensure the database server is running and accessible." };
        }
        if (error.message.includes('ER_ACCESS_DENIED_ERROR')) {
            return { ok: false, error: "Access Denied: Please check the database username and password in your .env file." };
        }
         if (error.message.includes('ER_DBACCESS_DENIED_ERROR')) {
            return { ok: false, error: `Database Access Denied: User does not have access to the specified database.` };
        }
        if (error.message.includes('ENOTFOUND')) {
            return { ok: false, error: `Host Not Found: The database host could not be found. Check the DB_HOST value.` };
        }
        return { ok: false, error: error.message };
    }
    return { ok: false, error: "An unknown error occurred during DB connection check." };
  }
}
