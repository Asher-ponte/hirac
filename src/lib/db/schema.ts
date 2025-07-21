import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

export const hiracEntries = sqliteTable('hirac_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  task: text('task').notNull(),
  hazard: text('hazard').notNull(),
  hazardPhotoUrl: text('hazard_photo_url'),
  hazardClass: text('hazard_class', { enum: ['Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical'] }).notNull(),
  hazardousEvent: text('hazardous_event').notNull(),
  impact: text('impact').notNull(),
  initialLikelihood: integer('initial_likelihood').notNull(),
  initialSeverity: integer('initial_severity').notNull(),
  engineeringControls: text('engineering_controls').notNull(),
  administrativeControls: text('administrative_controls').notNull(),
  ppe: text('ppe').notNull(),
  responsiblePerson: text('responsible_person').notNull(),
  residualLikelihood: integer('residual_likelihood').notNull(),
  residualSeverity: integer('residual_severity').notNull(),
  status: text('status', { enum: ['Ongoing', 'Implemented', 'Not Implemented'] }).notNull(),
});
