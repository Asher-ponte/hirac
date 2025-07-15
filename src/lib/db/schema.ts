import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const hiracEntries = sqliteTable('hirac_entries', {
  id: integer('id').primaryKey(),
  task: text('task').notNull(),
  hazard: text('hazard').notNull(),
  cause: text('cause').notNull(),
  effect: text('effect').notNull(),
  initialLikelihood: integer('initial_likelihood').notNull(),
  initialSeverity: integer('initial_severity').notNull(),
  controlMeasures: text('control_measures').notNull(),
  responsiblePerson: text('responsible_person').notNull(),
  residualLikelihood: integer('residual_likelihood').notNull(),
  residualSeverity: integer('residual_severity').notNull(),
  status: text('status', { enum: ['Ongoing', 'Implemented', 'Not Implemented'] }).notNull(),
});
