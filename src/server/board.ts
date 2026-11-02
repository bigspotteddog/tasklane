import type {
    BoardData,
    Issue,
    IssueDraft,
    IssuePatch,
    IssueStatus,
    Member,
    MemberDraft
} from '@/types'
import type { IssueRow, MemberRow } from '@/db/schema'

import {
    and,
    asc,
    eq,
    gt,
    min,
    ne,
    sql
} from 'drizzle-orm'
import { db } from '@/db/client'
import { issues, members, timestampNow } from '@/db/schema'
import { cleanLabels } from '@/lib/labels'

import {
    ISSUE_TYPE_IDS,
    POSITION_GAP,
    PRIORITY_IDS,
    STATUS_IDS
} from '@/constants/board'

const MIN_GAP = 0.000001

const asEnum = <T extends string>(value: string, allowed: readonly T[], fallback: T): T => {
    return (allowed as readonly string[]).includes(value) ? value as T : fallback
}

const parseStoredLabels = (value: string | null): string[] => {
    if (!value) return []

    try {
        const parsed: unknown = JSON.parse(value)
        return Array.isArray(parsed) ? cleanLabels(parsed.filter((item): item is string => typeof item === 'string')) : []
    }
    catch {
        return []
    }
}

const toIssue = (row: IssueRow): Issue => {
    return {
        id: String(row.id),
        number: Number(row.number),
        title: row.title ?? '',
        description: row.description ?? '',
        status: asEnum(row.status, STATUS_IDS, 'backlog'),
        type: asEnum(row.type, ISSUE_TYPE_IDS, 'task'),
        priority: asEnum(row.priority, PRIORITY_IDS, 'medium'),
        points: typeof row.points === 'number' && Number.isFinite(row.points) ? Math.round(row.points) : null,
        assigneeId: row.assigneeId ? String(row.assigneeId) : null,
        labels: parseStoredLabels(row.labels),
        dueDate: typeof row.dueDate === 'string' && /^\d{4}-\d{2}-\d{2}/.test(row.dueDate) ? row.dueDate.slice(0, 10) : null,
        position: Number(row.position) || 0,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    }
}

const toMember = (row: MemberRow): Member => {
    return {
        id: String(row.id),
        name: row.name ?? '',
        color: /^#[0-9a-f]{6}$/i.test(row.color ?? '') ? row.color : '#475569',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    }
}

export const getBoard = async (): Promise<BoardData> => {
    const [issueRows, memberRows] = await Promise.all([
        db.select().from(issues).orderBy(asc(issues.position), asc(issues.number)),
        db.select().from(members).orderBy(asc(members.createdAt), asc(members.name))
    ])

    return {
        issues: issueRows.map(toIssue),
        members: memberRows.map(toMember)
    }
}

export const createIssue = async (draft: IssueDraft): Promise<Issue> => {
    const [row] = await db.insert(issues).values({
        number: sql`(SELECT COALESCE(MAX(number), 0) + 1 FROM issues)`,
        title: draft.title,
        description: draft.description,
        status: draft.status,
        type: draft.type,
        priority: draft.priority,
        points: draft.points,
        assigneeId: draft.assigneeId,
        labels: JSON.stringify(draft.labels),
        dueDate: draft.dueDate,
        position: sql`(SELECT COALESCE(MAX(position), 0) + ${POSITION_GAP} FROM issues WHERE status = ${draft.status})`
    }).returning()

    return toIssue(row)
}

export const updateIssue = async (id: string, patch: IssuePatch): Promise<Issue | null> => {
    const values: Partial<typeof issues.$inferInsert> = {}

    if (patch.title !== undefined) values.title = patch.title
    if (patch.description !== undefined) values.description = patch.description
    if (patch.type !== undefined) values.type = patch.type
    if (patch.priority !== undefined) values.priority = patch.priority
    if (patch.points !== undefined) values.points = patch.points
    if (patch.assigneeId !== undefined) values.assigneeId = patch.assigneeId
    if (patch.labels !== undefined) values.labels = JSON.stringify(patch.labels)
    if (patch.dueDate !== undefined) values.dueDate = patch.dueDate

    const [row] = await db
        .update(issues)
        .set({ ...values, updatedAt: timestampNow })
        .where(eq(issues.id, id))
        .returning()

    return row ? toIssue(row) : null
}

const rebalanceColumn = async (status: IssueStatus): Promise<void> => {
    await db.run(sql`
        UPDATE issues
        SET position = ranked.rank * ${POSITION_GAP}
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY position, number) AS rank
            FROM issues
            WHERE status = ${status}
        ) AS ranked
        WHERE issues.id = ranked.id
    `)
}

const positionAfter = async (id: string, status: IssueStatus, afterId: string | null, attempt = 0): Promise<number> => {
    if (!afterId || afterId === id) {
        const first = await db
            .select({ value: min(issues.position) })
            .from(issues)
            .where(and(eq(issues.status, status), ne(issues.id, id)))
            .get()

        return first?.value === null || first?.value === undefined ? POSITION_GAP : Number(first.value) - POSITION_GAP
    }

    const anchor = await db
        .select({ position: issues.position })
        .from(issues)
        .where(and(eq(issues.id, afterId), eq(issues.status, status)))
        .get()

    if (!anchor) return positionAfter(id, status, null, attempt)

    const next = await db
        .select({ value: min(issues.position) })
        .from(issues)
        .where(and(eq(issues.status, status), ne(issues.id, id), gt(issues.position, anchor.position)))
        .get()

    const anchorPosition = Number(anchor.position)

    if (next?.value === null || next?.value === undefined) return anchorPosition + POSITION_GAP

    const nextPosition = Number(next.value)

    if (nextPosition - anchorPosition > MIN_GAP || attempt > 0) {
        return (anchorPosition + nextPosition) / 2
    }

    await rebalanceColumn(status)

    return positionAfter(id, status, afterId, attempt + 1)
}

export const moveIssue = async (id: string, status: IssueStatus, afterId: string | null): Promise<Issue | null> => {
    const existing = await db.select({ id: issues.id }).from(issues).where(eq(issues.id, id)).get()

    if (!existing) return null

    const position = await positionAfter(id, status, afterId)

    const [row] = await db
        .update(issues)
        .set({ status, position, updatedAt: timestampNow })
        .where(eq(issues.id, id))
        .returning()

    return row ? toIssue(row) : null
}

export const deleteIssue = async (id: string): Promise<boolean> => {
    const deleted = await db.delete(issues).where(eq(issues.id, id)).returning({ id: issues.id })
    return deleted.length > 0
}

export const createMember = async (draft: MemberDraft): Promise<Member> => {
    const [row] = await db.insert(members).values({ name: draft.name, color: draft.color }).returning()
    return toMember(row)
}

export const updateMember = async (id: string, patch: Partial<MemberDraft>): Promise<Member | null> => {
    const [row] = await db
        .update(members)
        .set({ ...patch, updatedAt: timestampNow })
        .where(eq(members.id, id))
        .returning()

    return row ? toMember(row) : null
}

export const deleteMember = async (id: string): Promise<boolean> => {
    const existing = await db.select({ id: members.id }).from(members).where(eq(members.id, id)).get()

    if (!existing) return false

    await db.batch([
        db.update(issues).set({ assigneeId: null, updatedAt: timestampNow }).where(eq(issues.assigneeId, id)),
        db.delete(members).where(eq(members.id, id))
    ])

    return true
}
