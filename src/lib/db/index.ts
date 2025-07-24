
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';


// Only require DB credentials in production to avoid crashing the dev server
if (process.env.NODE_ENV === 'production' && (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_DATABASE)) {
  throw new Error("Missing database credentials in .env file. Please provide DB_HOST, DB_USER, DB_PASSWORD, and DB_DATABASE.");
}

const connectionConfig = {
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

// The following connection is commented out to prevent crashes when a database is not configured.
// const poolConnection = mysql.createPool(connectionConfig);
// export const db = drizzle(poolConnection, { schema, mode: 'default' });

// Mock db object to prevent application crash.
// Features requiring a database will not work.
export const db = {
    query: {},
    select: () => ({ from: () => Promise.resolve([]) }),
    insert: () => ({ values: () => Promise.resolve() }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    delete: () => ({ where: () => Promise.resolve() }),
    transaction: () => Promise.resolve(),
    execute: () => Promise.resolve(),
} as any;
