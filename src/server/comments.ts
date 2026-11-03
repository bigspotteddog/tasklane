import type { Comment } from '@/types'

import { and, asc, eq } from 'drizzle-orm'

import { db } from '@/db/client'
import { HttpError } from '@/server/http'
import { ValidationError } from '@/server/validate'
import { LIMITS } from '@/constants/board'
import { issueComments, issues, members, timestampNow } from '@/db/schema'

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const asPerson = (name: string | null, color: string | null) => {
    return {
        name: name ?? '',
        color: /^#[0-9a-f]{6}$/i.test(color ?? '') ? (color as string) : '#475569'
    }
}

const ensureIssueInProject = async (projectId: string, issueId: string): Promise<void> => {
    const row = await db
        .select({ id: issues.id })
        .from(issues)
        .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
        .get()

    if (!row) throw new HttpError(MISSING, 404)
}

export const parseCommentDraft = (raw: unknown): string => {
    const input = typeof raw === 'object' && raw !== null && !Array.isArray(raw)
        ? raw as Record<string, unknown>
        : {}

    const value = input.body

    if (typeof value !== 'string') throw new ValidationError('Write your comment as text.')

    const body = value.replace(/\r\n/g, '\n').trim()

    if (!body) throw new ValidationError('Write a comment first.')

    if (body.length > LIMITS.comment) {
        throw new ValidationError(`Keep comments under ${LIMITS.comment} characters.`)
    }

    return body
}

type CommentRecord = {
    id: string
    issueId: string
    projectId: string
    authorId: string
    authorName: string | null
    authorColor: string | null
    body: string
    createdAt: string
    updatedAt: string
}

const toComment = (row: CommentRecord): Comment => {
    const person = asPerson(row.authorName, row.authorColor)

    return {
        id: String(row.id),
        issueId: String(row.issueId),
        projectId: String(row.projectId),
        authorId: String(row.authorId),
        author: {
            id: String(row.authorId),
            name: person.name,
            color: person.color
        },
        body: row.body ?? '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    }
}

export const listComments = async (projectId: string, issueId: string): Promise<Comment[] | null> => {
    const issue = await db
        .select({ id: issues.id })
        .from(issues)
        .where(and(eq(issues.id, issueId), eq(issues.projectId, projectId)))
        .get()

    if (!issue) return null

    const rows = await db
        .select({
            id: issueComments.id,
            issueId: issueComments.issueId,
            projectId: issueComments.projectId,
            authorId: issueComments.authorId,
            authorName: members.name,
            authorColor: members.color,
            body: issueComments.body,
            createdAt: issueComments.createdAt,
            updatedAt: issueComments.updatedAt
        })
        .from(issueComments)
        .leftJoin(members, eq(issueComments.authorId, members.id))
        .where(and(eq(issueComments.projectId, projectId), eq(issueComments.issueId, issueId)))
        .orderBy(asc(issueComments.createdAt), asc(issueComments.id))

    return rows.map(toComment)
}

export const createComment = async (projectId: string, issueId: string, authorId: string, body: string): Promise<Comment> => {
    await ensureIssueInProject(projectId, issueId)

    const author = await db
        .select({ id: members.id, name: members.name, color: members.color })
        .from(members)
        .where(eq(members.id, authorId))
        .get()

    if (!author) throw new HttpError('You are signed out. Sign in again to keep going.', 401)

    const [row] = await db
        .insert(issueComments)
        .values({ projectId, issueId, authorId, body })
        .returning()

    return toComment({
        id: String(row.id),
        issueId: String(row.issueId),
        projectId: String(row.projectId),
        authorId: String(row.authorId),
        authorName: author.name,
        authorColor: author.color,
        body: row.body,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    })
}

export const updateComment = async (projectId: string, commentId: string, authorId: string, body: string): Promise<Comment | null> => {
    const [row] = await db
        .update(issueComments)
        .set({ body, updatedAt: timestampNow })
        .where(and(eq(issueComments.id, commentId), eq(issueComments.projectId, projectId), eq(issueComments.authorId, authorId)))
        .returning()

    if (!row) return null

    const author = await db
        .select({ id: members.id, name: members.name, color: members.color })
        .from(members)
        .where(eq(members.id, authorId))
        .get()

    return toComment({
        id: String(row.id),
        issueId: String(row.issueId),
        projectId: String(row.projectId),
        authorId: String(row.authorId),
        authorName: author?.name ?? null,
        authorColor: author?.color ?? null,
        body: row.body,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    })
}

export const deleteComment = async (projectId: string, commentId: string, authorId: string): Promise<boolean> => {
    const deleted = await db
        .delete(issueComments)
        .where(and(eq(issueComments.id, commentId), eq(issueComments.projectId, projectId), eq(issueComments.authorId, authorId)))
        .returning({ id: issueComments.id })

    return deleted.length > 0
}