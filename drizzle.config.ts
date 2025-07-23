
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const dbCredentials = {
  host: process.env.DB_HOST!,
  port: 3306,
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_DATABASE!,
};


export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials,
  verbose: true,
  strict: true,
});
