import { integer, text, sqliteTable } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

const controlStatusEnum = ['Ongoing', 'Implemented', 'For Implementation'] as const;
const controlTypeEnum = ['Engineering', 'Administrative', 'PPE'] as const;
const hazardClassEnum = ['Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical'] as const;
const userRoleEnum = ['Admin', 'Safety Officer', 'Viewer'] as const;

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  role: text('role', { enum: userRoleEnum }).notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  department: one(departments, {
    fields: [users.id],
    references: [departments.supervisorId],
  }),
}));

export const departments = sqliteTable('departments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  supervisorId: integer('supervisor_id').references(() => users.id),
});

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  supervisor: one(users, {
    fields: [departments.supervisorId],
    references: [users.id],
  }),
  hiracEntries: many(hiracEntries),
}));

export const hiracEntries = sqliteTable('hirac_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  departmentId: integer('department_id').notNull().references(() => departments.id, { onDelete: 'cascade' }),
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

export const hiracEntriesRelations = relations(hiracEntries, ({ many, one }) => ({
  controlMeasures: many(controlMeasures),
  department: one(departments, {
    fields: [hiracEntries.departmentId],
    references: [departments.id],
  }),
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
