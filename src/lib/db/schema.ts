import { int, text, mysqlTable, serial, varchar, mysqlEnum, timestamp, foreignKey } from 'drizzle-orm/mysql-core';
import { relations, sql } from 'drizzle-orm';

const controlStatusEnum = ['Implemented', 'For Implementation'] as const;
const controlTypeEnum = ['Engineering', 'Administrative', 'PPE'] as const;
const hazardClassEnum = ['Physical', 'Chemical', 'Biological', 'Mechanical', 'Electrical'] as const;
const userRoleEnum = ['Admin', 'Safety Officer', 'Viewer'] as const;
const taskTypeEnum = ['Routine', 'Non-Routine'] as const;

export const users = mysqlTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: mysqlEnum('role', userRoleEnum).notNull(),
});

export const usersRelations = relations(users, ({ one }) => ({
  department: one(departments, {
    fields: [users.id],
    references: [departments.supervisorId],
  }),
}));

export const departments = mysqlTable('departments', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  supervisorId: int('supervisor_id'),
},
(table) => {
  return {
    supervisorFk: foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [users.id],
    }).onDelete('set null'),
  }
});

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  supervisor: one(users, {
    fields: [departments.supervisorId],
    references: [users.id],
  }),
  hiracEntries: many(hiracEntries),
}));

export const hiracEntries = mysqlTable('hirac_entries', {
  id: serial('id').primaryKey(),
  departmentId: int('department_id').notNull(),
  task: varchar('task', { length: 255 }).notNull(),
  taskType: mysqlEnum('task_type', taskTypeEnum).notNull().default('Routine'),
  hazard: text('hazard').notNull(),
  hazardPhotoUrl: text('hazard_photo_url'),
  hazardClass: mysqlEnum('hazard_class', hazardClassEnum).notNull(),
  hazardousEvent: text('hazardous_event').notNull(),
  impact: text('impact').notNull(),
  initialLikelihood: int('initial_likelihood').notNull(),
  initialSeverity: int('initial_severity').notNull(),
  residualLikelihood: int('residual_likelihood'),
  residualSeverity: int('residual_severity'),
  status: mysqlEnum('status', ['Implemented', 'For Implementation']),
  createdAt: timestamp('created_at').notNull().default(sql`CURRENT_TIMESTAMP`),
  reviewedAt: timestamp('reviewed_at'),
  nextReviewDate: timestamp('next_review_date'),
});

export const hiracEntriesRelations = relations(hiracEntries, ({ many, one }) => ({
  controlMeasures: many(controlMeasures),
  department: one(departments, {
    fields: [hiracEntries.departmentId],
    references: [departments.id],
  }),
}));

export const controlMeasures = mysqlTable('control_measures', {
  id: serial('id').primaryKey(),
  hiracEntryId: int('hirac_entry_id').notNull(),
  type: mysqlEnum('type', controlTypeEnum).notNull(),
  description: text('description').notNull(),
  pic: varchar('pic', { length: 255 }),
  status: mysqlEnum('status', controlStatusEnum),
  completionDate: timestamp('completion_date'),
});

export const controlMeasuresRelations = relations(controlMeasures, ({ one }) => ({
  hiracEntry: one(hiracEntries, {
    fields: [controlMeasures.hiracEntryId],
    references: [hiracEntries.id],
  }),
}));
