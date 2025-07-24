
import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const connectionConfig = {
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectTimeout: 10000,
};

// Check for credentials and provide a clear error message if they are missing.
if (!connectionConfig.host || !connectionConfig.user || !connectionConfig.password || !connectionConfig.database) {
    if (process.env.NODE_ENV === 'production') {
        throw new Error("DATABASE_ERROR: Missing database credentials in .env file. Please provide DB_HOST, DB_USER, DB_PASSWORD, and DB_DATABASE for the production environment.");
    } else {
        console.warn("DATABASE_WARNING: Missing or incomplete database credentials in .env file. The application will use a mock database. Please provide DB_HOST, DB_USER, DB_PASSWORD, and DB_DATABASE to connect to a real database.");
    }
}

// Function to create a connection. It will be used to establish the real connection.
const createConnection = () => {
    // Only attempt to connect if all credentials are provided
    if (connectionConfig.host && connectionConfig.user && connectionConfig.password && connectionConfig.database) {
        try {
            const poolConnection = mysql.createPool(connectionConfig);
            return drizzle(poolConnection, { schema, mode: 'default' });
        } catch (error) {
             console.error("DATABASE_ERROR: Failed to connect to the database.", error);
             // Fallback to mock in case of connection failure
             return createMockDb();
        }
    }
    // If credentials are not set (in dev mode), return mock
    return createMockDb();
};

// Helper function to create a mock DB. This prevents the app from crashing when DB is not configured.
const createMockDb = () => ({
    query: {
        users: { findMany: async () => [], findFirst: async () => undefined },
        departments: { findMany: async () => [], findFirst: async () => undefined },
        hiracEntries: { findMany: async () => [], findFirst: async () => undefined },
        controlMeasures: { findMany: async () => [], findFirst: async () => undefined },
    },
    select: () => ({ from: () => Promise.resolve([]) }),
    insert: (table: any) => ({ values: (values: any) => Promise.resolve({ insertId: Math.floor(Math.random() * 1000) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
    delete: () => ({ where: () => Promise.resolve() }),
    transaction: async (callback: (tx: any) => Promise<any>) => callback(createMockDb()),
    execute: () => Promise.resolve(),
});

export const db = createConnection();
