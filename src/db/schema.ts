import type { AnySQLiteColumn } from 'drizzle-orm/sqlite-core'

import { sql } from 'drizzle-orm'

import {
    index,
    integer,
    real,
    sqliteTable,
    text,
    uniqueIndex
} from 'drizzle-orm/sqlite-core'

export const timestampNow = sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`

export const members = sqliteTable('members', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    color: text('color').notNull().default('#4f46e5'),
    createdAt: text('created_at').notNull().default(timestampNow),
    updatedAt: text('updated_at').notNull().default(timestampNow),
    email: text('email').unique('members_email_unique'),
    lastProjectId: text('last_project_id').references((): AnySQLiteColumn => projects.id, { onDelete: 'set null' }),
    signedInAt: text('signed_in_at')
})

export const projects = sqliteTable('projects', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text('name').notNull(),
    key: text('key').notNull().unique(),
    description: text('description').notNull().default(''),
    createdAt: text('created_at').notNull().default(timestampNow),
    updatedAt: text('updated_at').notNull().default(timestampNow)
})

export const projectMembers = sqliteTable('project_members', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    invitedBy: text('invited_by').references(() => members.id, { onDelete: 'set null' }),
    createdAt: text('created_at').notNull().default(timestampNow),
    updatedAt: text('updated_at').notNull().default(timestampNow)
}, (table) => [
    uniqueIndex('project_members_project_member_unique').on(table.projectId, table.memberId),
    index('project_members_member_idx').on(table.memberId),
    index('project_members_inviter_idx').on(table.invitedBy, table.createdAt)
])

export const issues = sqliteTable('issues', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
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
    uniqueIndex('issues_project_number_unique').on(table.projectId, table.number),
    index('issues_project_status_position_idx').on(table.projectId, table.status, table.position),
    index('issues_assignee_idx').on(table.assigneeId)
])

export const authSessions = sqliteTable('auth_sessions', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    expiresAt: text('expires_at').notNull(),
    createdAt: text('created_at').notNull().default(timestampNow),
    updatedAt: text('updated_at').notNull().default(timestampNow)
}, (table) => [
    index('auth_sessions_member_idx').on(table.memberId)
])

export const authLoginRequests = sqliteTable('auth_login_requests', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text('email').notNull(),
    memberId: text('member_id').references(() => members.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    codeHash: text('code_hash').notNull(),
    attempts: integer('attempts').notNull().default(0),
    nextPath: text('next_path').notNull().default('/'),
    clientHash: text('client_hash'),
    expiresAt: text('expires_at').notNull(),
    usedAt: text('used_at'),
    createdAt: text('created_at').notNull().default(timestampNow),
    updatedAt: text('updated_at').notNull().default(timestampNow)
}, (table) => [
    index('auth_login_requests_email_idx').on(table.email, table.createdAt),
    index('auth_login_requests_client_idx').on(table.clientHash, table.createdAt)
])

export type MemberRow = typeof members.$inferSelect

export type ProjectRow = typeof projects.$inferSelect

export type IssueRow = typeof issues.$inferSelect

export type LoginRequestRow = typeof authLoginRequests.$inferSelect
