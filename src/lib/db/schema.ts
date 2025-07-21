import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';

const controlStatusEnum = ['Ongoing', 'Implemented', 'Not Implemented'] as const;

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
  
  engineeringControls: text('engineering_controls'),
  engineeringControlsPic: text('engineering_controls_pic'),
  engineeringControlsStatus: text('engineering_controls_status', { enum: controlStatusEnum }),
  engineeringControlsCompletionDate: text('engineering_controls_completion_date'),

  administrativeControls: text('administrative_controls'),
  administrativeControlsPic: text('administrative_controls_pic'),
  administrativeControlsStatus: text('administrative_controls_status', { enum: controlStatusEnum }),
  administrativeControlsCompletionDate: text('administrative_controls_completion_date'),

  ppe: text('ppe'),
  ppePic: text('ppe_pic'),
  ppeStatus: text('ppe_status', { enum: controlStatusEnum }),
  ppeCompletionDate: text('ppe_completion_date'),

  residualLikelihood: integer('residual_likelihood').notNull(),
  residualSeverity: integer('residual_severity').notNull(),
});
