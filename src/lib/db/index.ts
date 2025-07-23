import 'dotenv/config';
import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_DATABASE) {
  throw new Error("Missing database credentials in .env file. Please provide DB_HOST, DB_USER, DB_PASSWORD, and DB_DATABASE.");
}

const connectionConfig = {
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

const poolConnection = mysql.createPool(connectionConfig);

export const db = drizzle(poolConnection, { schema, mode: 'default' });
