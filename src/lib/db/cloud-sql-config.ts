/** Runtime Cloud SQL env names. Never log or commit the values. */
export const CLOUD_SQL_ENV_NAMES = [
  'DB_INSTANCE_CONNECTION_NAME',
  'GOOGLE_SERVICE_ACCOUNT_KEY_BASE64',
  'DB_USER',
  'DB_PASSWORD',
  'DB_DATABASE',
] as const;

export type CloudSqlEnv = {
  instanceConnectionName: string;
  serviceAccountKeyBase64: string;
  user: string;
  password: string;
  database: string;
};

export function readCloudSqlEnv(env: NodeJS.ProcessEnv = process.env): CloudSqlEnv | null {
  const instanceConnectionName = (env.DB_INSTANCE_CONNECTION_NAME || '').trim();
  const serviceAccountKeyBase64 = (env.GOOGLE_SERVICE_ACCOUNT_KEY_BASE64 || '').trim();
  const user = (env.DB_USER || '').trim();
  const password = env.DB_PASSWORD ?? '';
  const database = (env.DB_DATABASE || '').trim();

  if (!instanceConnectionName || !serviceAccountKeyBase64 || !user || !password || !database) {
    return null;
  }

  return {instanceConnectionName, serviceAccountKeyBase64, user, password, database};
}

/**
 * Decode the service-account JSON from base64. Throws a generic error —
 * never includes the input or private key.
 */
export function decodeServiceAccountKey(base64: string): Record<string, unknown> {
  try {
    const decoded = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid');
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error('DATABASE_ERROR: Cloud SQL connector configuration is invalid');
  }
}

/**
 * mysql2 pool options for the Cloud SQL connector.
 * Pass the connector `stream` only — no host, no port 3306, no 127.0.0.1 proxy.
 */
export function mysqlPoolOptionsFromConnectorStream(args: {
  stream: () => unknown;
  user: string;
  password: string;
  database: string;
}) {
  return {
    user: args.user,
    password: args.password,
    database: args.database,
    stream: args.stream,
  };
}
