import { sql } from 'drizzle-orm'

import {
    index,
    integer,
    real,
    sqliteTable,
    text
} from 'drizzle-orm/sqlite-core'

export const timestampNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

export const members = sqliteTable('members', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    color: text('color').notNull().default('#4f46e5'),
    createdAt: text('created_at').notNull().default(timestampNow),
    updatedAt: text('updated_at').notNull().default(timestampNow)
})

export const issues = sqliteTable('issues', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    number: integer('number').notNull().unique(),
    title: text('title').notNull(),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('todo'),
    type: text('type').notNull().default('task'),
    priority: text('priority').notNull().default('medium'),
    points: integer('points'),
    assigneeId: text('assignee_id').references(() => members.id, { onDelete: 'set null' }),
    labels: text('labels').notNull().default('[]'),
    dueDate: text('due_date'),
    position: real('position').notNull().default(0),
    createdAt: text('created_at').notNull().default(timestampNow),
    updatedAt: text('updated_at').notNull().default(timestampNow)
}, (table) => [
    index('issues_status_position_idx').on(table.status, table.position),
    index('issues_assignee_idx').on(table.assigneeId)
])

export type MemberRow = typeof members.$inferSelect

export type IssueRow = typeof issues.$inferSelect
