-- STATUS: PENDING — NOT APPLIED.
-- Do not run until Florante gives an explicit go (Cloud SQL work is on hold).
-- This table is intentionally absent from src/lib/db/schema.ts so that
-- `npm run db:push` cannot create it implicitly.
--
-- Purpose: one-time use of iScout portal SSO handoff token ids (jti).
-- Used by CloudSqlSsoJtiStore (src/lib/sso-jti-store.ts) only when the
-- deployment sets SSO_JTI_STORE=cloudsql. Apply this migration first, then set
-- the env var; the reverse order makes every portal sign-in fail closed.
--
-- Rollback: db/migrations/pending/0001_sso_consumed_jti.down.sql

CREATE TABLE IF NOT EXISTS `sso_consumed_jti` (
    `jti` varchar(128) NOT NULL,
    `app_id` varchar(64) NOT NULL,
    `expires_at` datetime NOT NULL,
    `consumed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT `sso_consumed_jti_pk` PRIMARY KEY (`jti`),
    KEY `sso_consumed_jti_expires_at_idx` (`expires_at`)
);

-- Housekeeping (run periodically; rows are useless once the token has expired):
-- DELETE FROM `sso_consumed_jti` WHERE `expires_at` < (NOW() - INTERVAL 1 DAY);
