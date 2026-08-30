import 'dotenv/config';
import {AuthTypes, Connector} from '@google-cloud/cloud-sql-connector';
import {GoogleAuth, type JWTInput} from 'google-auth-library';
import {drizzle} from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';
import {
  decodeServiceAccountKey,
  mysqlPoolOptionsFromConnectorStream,
  readCloudSqlEnv,
} from './cloud-sql-config';

type AppDb = ReturnType<typeof drizzle<typeof schema>>;

const createMockDb = () =>
  ({
    query: {
      users: {findMany: async () => [], findFirst: async () => undefined},
      departments: {findMany: async () => [], findFirst: async () => undefined},
      hiracEntries: {findMany: async () => [], findFirst: async () => undefined},
      controlMeasures: {findMany: async () => [], findFirst: async () => undefined},
    },
    select: () => ({from: () => Promise.resolve([])}),
    insert: (_table: unknown) => ({
      values: (_values: unknown) => Promise.resolve({insertId: Math.floor(Math.random() * 1000)}),
    }),
    update: () => ({set: () => ({where: () => Promise.resolve()})}),
    delete: () => ({where: () => Promise.resolve()}),
    transaction: async (callback: (tx: AppDb) => Promise<unknown>) => callback(createMockDb() as AppDb),
    execute: () => Promise.resolve(),
  }) as unknown as AppDb;

async function createCloudSqlDb(): Promise<AppDb> {
  const cfg = readCloudSqlEnv();
  if (!cfg) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATABASE_ERROR: Cloud SQL connector configuration is missing');
    }
    return createMockDb();
  }

  const credentials = decodeServiceAccountKey(cfg.serviceAccountKeyBase64);
  const connector = new Connector({
    auth: new GoogleAuth({
      credentials: credentials as JWTInput,
      scopes: ['https://www.googleapis.com/auth/sqlservice.admin'],
    }),
  });

  const {stream} = await connector.getOptions({
    instanceConnectionName: cfg.instanceConnectionName,
    authType: AuthTypes.PASSWORD,
  });

  const pool = mysql.createPool(
    mysqlPoolOptionsFromConnectorStream({
      stream,
      user: cfg.user,
      password: cfg.password,
      database: cfg.database,
    })
  );

  return drizzle(pool, {schema, mode: 'default'});
}

let dbPromise: Promise<AppDb> | null = null;

/** Lazy Cloud SQL pool via connector stream. Not a 127.0.0.1 / Prisma proxy. */
export async function getDb(): Promise<AppDb> {
  if (!dbPromise) {
    dbPromise = createCloudSqlDb();
  }
  return dbPromise;
}
