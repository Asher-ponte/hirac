import 'dotenv/config';
import {defineConfig} from 'drizzle-kit';

// Runtime connections use @google-cloud/cloud-sql-connector (AuthTypes.PASSWORD
// + mysql2 stream). This file is drizzle-kit only and must not use DB_HOST:3306
// or a 127.0.0.1 Prisma/Auth Proxy.

export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  verbose: true,
  strict: true,
});
