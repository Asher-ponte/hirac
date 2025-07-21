import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

const controlStatusEnum = ['Ongoing', 'Implemented', 'For Implementation'] as const;
const controlTypeEnum = ['Engineering', 'Administrative', 'PPE'] as const;
const hazardClassEnum = ['Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical'] as const;

export const hiracEntries = sqliteTable('hirac_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  department: text('department').notNull(),
  task: text('task').notNull(),
  hazard: text('hazard').notNull(),
  hazardPhotoUrl: text('hazard_photo_url'),
  hazardClass: text('hazard_class', { enum: hazardClassEnum }).notNull(),
  hazardousEvent: text('hazardous_event').notNull(),
  impact: text('impact').notNull(),
  initialLikelihood: integer('initial_likelihood').notNull(),
  initialSeverity: integer('initial_severity').notNull(),
  residualLikelihood: integer('residual_likelihood'),
  residualSeverity: integer('residual_severity'),
  status: text('status', { enum: ['Ongoing', 'Implemented', 'For Implementation'] }),
});

export const hiracEntriesRelations = relations(hiracEntries, ({ many }) => ({
  controlMeasures: many(controlMeasures),
}));


export const controlMeasures = sqliteTable('control_measures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  hiracEntryId: integer('hirac_entry_id').notNull().references(() => hiracEntries.id, { onDelete: 'cascade' }),
  type: text('type', { enum: controlTypeEnum }).notNull(),
  description: text('description').notNull(),
  pic: text('pic'),
  status: text('status', { enum: controlStatusEnum }),
  completionDate: text('completion_date'),
});

export const controlMeasuresRelations = relations(controlMeasures, ({ one }) => ({
  hiracEntry: one(hiracEntries, {
    fields: [controlMeasures.hiracEntryId],
    references: [hiracEntries.id],
  }),
}));
