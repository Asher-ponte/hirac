import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error("Missing database credentials in .env file. Please provide DB_USER, DB_PASSWORD, and DB_NAME.");
}

if (!process.env.DB_HOST && !process.env.DB_SOCKET_PATH) {
    throw new Error("Missing database connection details in .env file. Please provide either DB_HOST or DB_SOCKET_PATH.");
}

const connectionConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ...(process.env.DB_SOCKET_PATH
    ? { socketPath: process.env.DB_SOCKET_PATH }
    : { host: process.env.DB_HOST, port: 3306 }),
};

const poolConnection = mysql.createPool(connectionConfig);

export const db = drizzle(poolConnection, { schema, mode: 'default' });
