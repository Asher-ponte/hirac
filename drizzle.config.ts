
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_NAME) {
  throw new Error("Missing database credentials in .env file. Please provide DB_HOST, DB_USER, DB_PASSWORD, and DB_NAME.");
}

const dbCredentials = {
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};


export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials,
  verbose: true,
  strict: true,
});
