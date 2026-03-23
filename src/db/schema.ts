import { pgTable, text, integer, real, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'OWNER' | 'ADMIN' | 'OPERATOR'
});

export const machines = pgTable('machines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  status: text('status').notNull().default('OFF'), // 'OFF' | 'ON' | 'DOWNTIME'
  currentOperatorId: text('current_operator_id').references(() => users.id),
  downtimeReason: text('downtime_reason'),
  toolLifePercent: real('tool_life_percent').notNull().default(100.0),
  totalCycles: integer('total_cycles').notNull().default(0),
  lastStatusChange: timestamp('last_status_change').notNull().defaultNow()
});

export const jobs = pgTable('jobs', {
  id: text('id').primaryKey(),
  machineId: text('machine_id').notNull().references(() => machines.id),
  operatorId: text('operator_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  companyName: text('company_name').notNull(),
  componentName: text('component_name').notNull(),
  quantity: integer('quantity').notNull(),
  okParts: integer('ok_parts').notNull().default(0),
  castingRejection: integer('casting_rejection').notNull().default(0),
  machineRejection: integer('machine_rejection').notNull().default(0),
  blowHole: integer('blow_hole').notNull().default(0),
  rework: integer('rework').notNull().default(0)
});

export const downtimes = pgTable('downtimes', {
  id: text('id').primaryKey(),
  machineId: text('machine_id').notNull().references(() => machines.id),
  operatorId: text('operator_id').notNull().references(() => users.id),
  reason: text('reason').notNull(),
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  durationMinutes: integer('duration_minutes')
});

export const attendances = pgTable('attendances', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id),
  loginTime: timestamp('login_time').notNull().defaultNow(),
  logoutTime: timestamp('logout_time')
});

// Relations
export const machineRelations = relations(machines, ({ one }) => ({
  operator: one(users, {
    fields: [machines.currentOperatorId],
    references: [users.id],
  }),
}));
