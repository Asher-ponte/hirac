
import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// =================================================================
// IMPORTANT: Environment Variable Configuration
// =================================================================
// This configuration file, along with your application, relies on
// environment variables to connect to your Google Cloud SQL database.
//
// 1. Create a `.env` file in the root of your project.
//
// 2. Add the following database credentials to your `.env` file,
//    replacing the placeholder values with your actual credentials:
//
//    DB_HOST=your_database_host
//    DB_USER=your_database_user
//    DB_PASSWORD=your_database_password
//    DB_DATABASE=your_database_name
//
// 3. Ensure the `.env` file is listed in your `.gitignore` file
//    to prevent committing sensitive credentials to version control.
// =================================================================

const dbCredentials = {
  host: process.env.DB_HOST,
  port: 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};


export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'mysql',
  dbCredentials,
  verbose: true,
  strict: true,
});
