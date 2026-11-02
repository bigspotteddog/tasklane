import type {
    Issue,
    IssueDraft,
    IssuePatch,
    IssueStatus
} from '@/types'
import type { IssueRow } from '@/db/schema'

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
import { cleanLabels } from '@/lib/labels'
import { isProjectMember } from '@/server/projects'
import { ValidationError } from '@/server/validate'

import {
    issues,
    timestampNow
} from '@/db/schema'

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
        projectId: String(row.projectId),
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

const checkAssignee = async (projectId: string, assigneeId: string | null | undefined): Promise<void> => {
    if (!assigneeId) return

    if (!await isProjectMember(projectId, assigneeId)) {
        throw new ValidationError('Pick someone who is on this project.')
    }
}

export const getProjectIssues = async (projectId: string): Promise<Issue[]> => {
    const rows = await db
        .select()
        .from(issues)
        .where(eq(issues.projectId, projectId))
        .orderBy(asc(issues.position), asc(issues.number))

    return rows.map(toIssue)
}

export const createIssue = async (projectId: string, draft: IssueDraft): Promise<Issue> => {
    await checkAssignee(projectId, draft.assigneeId)

    const [row] = await db.insert(issues).values({
        projectId,
        number: sql`(SELECT COALESCE(MAX(number), 0) + 1 FROM issues WHERE project_id = ${projectId})`,
        title: draft.title,
        description: draft.description,
        status: draft.status,
        type: draft.type,
        priority: draft.priority,
        points: draft.points,
        assigneeId: draft.assigneeId,
        labels: JSON.stringify(draft.labels),
        dueDate: draft.dueDate,
        position: sql`(SELECT COALESCE(MAX(position), 0) + ${POSITION_GAP} FROM issues WHERE project_id = ${projectId} AND status = ${draft.status})`
    }).returning()

    return toIssue(row)
}

export const updateIssue = async (projectId: string, id: string, patch: IssuePatch): Promise<Issue | null> => {
    if (patch.assigneeId !== undefined) await checkAssignee(projectId, patch.assigneeId)

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
        .where(and(eq(issues.id, id), eq(issues.projectId, projectId)))
        .returning()

    return row ? toIssue(row) : null
}

const rebalanceColumn = async (projectId: string, status: IssueStatus): Promise<void> => {
    await db.run(sql`
        UPDATE issues
        SET position = ranked.rank * ${POSITION_GAP}
        FROM (
            SELECT id, ROW_NUMBER() OVER (ORDER BY position, number) AS rank
            FROM issues
            WHERE project_id = ${projectId} AND status = ${status}
        ) AS ranked
        WHERE issues.id = ranked.id
    `)
}

const inColumn = (projectId: string, status: IssueStatus) => and(eq(issues.projectId, projectId), eq(issues.status, status))

const positionAfter = async (projectId: string, id: string, status: IssueStatus, afterId: string | null, attempt = 0): Promise<number> => {
    if (!afterId || afterId === id) {
        const first = await db
            .select({ value: min(issues.position) })
            .from(issues)
            .where(and(inColumn(projectId, status), ne(issues.id, id)))
            .get()

        return first?.value === null || first?.value === undefined ? POSITION_GAP : Number(first.value) - POSITION_GAP
    }

    const anchor = await db
        .select({ position: issues.position })
        .from(issues)
        .where(and(inColumn(projectId, status), eq(issues.id, afterId)))
        .get()

    if (!anchor) return positionAfter(projectId, id, status, null, attempt)

    const next = await db
        .select({ value: min(issues.position) })
        .from(issues)
        .where(and(inColumn(projectId, status), ne(issues.id, id), gt(issues.position, anchor.position)))
        .get()

    const anchorPosition = Number(anchor.position)

    if (next?.value === null || next?.value === undefined) return anchorPosition + POSITION_GAP

    const nextPosition = Number(next.value)

    if (nextPosition - anchorPosition > MIN_GAP || attempt > 0) {
        return (anchorPosition + nextPosition) / 2
    }

    await rebalanceColumn(projectId, status)

    return positionAfter(projectId, id, status, afterId, attempt + 1)
}

export const moveIssue = async (projectId: string, id: string, status: IssueStatus, afterId: string | null): Promise<Issue | null> => {
    const existing = await db
        .select({ id: issues.id })
        .from(issues)
        .where(and(eq(issues.id, id), eq(issues.projectId, projectId)))
        .get()

    if (!existing) return null

    const position = await positionAfter(projectId, id, status, afterId)

    const [row] = await db
        .update(issues)
        .set({ status, position, updatedAt: timestampNow })
        .where(and(eq(issues.id, id), eq(issues.projectId, projectId)))
        .returning()

    return row ? toIssue(row) : null
}

export const deleteIssue = async (projectId: string, id: string): Promise<boolean> => {
    const deleted = await db
        .delete(issues)
        .where(and(eq(issues.id, id), eq(issues.projectId, projectId)))
        .returning({ id: issues.id })

    return deleted.length > 0
}
