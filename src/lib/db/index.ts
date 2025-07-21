import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const client = createClient({
  url: process.env.DATABASE_URL || 'file:./local.db',
  syncUrl: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
  onConnect: async () => {
    if (process.env.NODE_ENV === 'development') {
      try {
        console.log('Synchronizing database schema...');
        await execAsync('npx drizzle-kit push:sqlite');
        console.log('Database schema synchronized.');
      } catch (e) {
        console.error('Failed to sync database schema:', e);
      }
    }
  },
});

export const db = drizzle(client, { schema });
