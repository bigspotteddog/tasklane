import type { ActivityAction, ActivityEntry } from '@/types'

import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { issueActivity, issues, members } from '@/db/schema'

type Detail = { from: string | null, to: string | null }

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const parseDetail = (value: string): Detail => {
    try {
        const parsed: unknown = JSON.parse(value || '{}')

        if (typeof parsed === 'object' && parsed !== null) {
            const detail = parsed as { from?: unknown; to?: unknown }

            return {
                from: typeof detail.from === 'string' ? detail.from : null,
                to: typeof detail.to === 'string' ? detail.to : null
            }
        }
    }
    catch {
        // Fall through to the empty detail below.
    }

    return { from: null, to: null }
}

const asAction = (value: string): ActivityAction | null => {
    return value === 'created'
        || value === 'status'
        || value === 'assignee'
        || value === 'priority'
        || value === 'due_date'
        ? value
        : null
}

/**
 * Records one activity entry for an issue. Failures are logged but never
 * surface to the caller, so recording never breaks the main mutation.
 */
export const recordActivity = async (
    projectId: string,
    issueId: string,
    actorId: string | null,
    action: ActivityAction,
    detail: Detail = { from: null, to: null }
): Promise<void> => {
    try {
        await db.insert(issueActivity).values({
            projectId,
            issueId,
            actorId,
            action,
            detail: JSON.stringify(detail)
        })
    }
    catch (error) {
        console.error(`[activity] Could not record "${action}": ${error instanceof Error ? error.message : String(error)}`)
    }
}

export const listActivity = async (projectId: string, issueId: string): Promise<ActivityEntry[] | null> => {
    const issue = await db
        .select({ id: issues.id })
        .from(issues)
        .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
        .get()

    if (!issue) return null

    const rows = await db
        .select({
            id: issueActivity.id,
            issueId: issueActivity.issueId,
            projectId: issueActivity.projectId,
            actorId: issueActivity.actorId,
            actorName: members.name,
            actorColor: members.color,
            action: issueActivity.action,
            detail: issueActivity.detail,
            createdAt: issueActivity.createdAt
        })
        .from(issueActivity)
        .leftJoin(members, eq(issueActivity.actorId, members.id))
        .where(and(eq(issueActivity.projectId, projectId), eq(issueActivity.issueId, issueId)))
        .orderBy(asc(issueActivity.createdAt), asc(issueActivity.id))

    return rows.flatMap((row) => {
        const action = asAction(row.action)

        if (!action) return []

        const actorId = row.actorId ? String(row.actorId) : null

        return [{
            id: String(row.id),
            issueId: String(row.issueId),
            projectId: String(row.projectId),
            actor: actorId ? {
                id: actorId,
                name: row.actorName ?? 'Someone',
                color://]^#[0-9a-f]{6}$/i.test(row.actorColor ?? '') ? (row.actorColor as string) : '#475569'
            } : null,
            action,
            detail: parseDetail(row.detail),
            createdAt: row.createdAt
        }]
    })
}