type TestGlobals = {__dbCalls?: number};

/** Counts getDb() calls; any query on the returned object rejects, so no real DB is touched. */
export async function getDb(): Promise<never> {
  const g = globalThis as TestGlobals;
  g.__dbCalls = (g.__dbCalls ?? 0) + 1;
  throw new Error('TEST_DB_REACHED');
}
