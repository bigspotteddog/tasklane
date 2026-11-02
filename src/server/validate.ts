import type {
    IssueDraft,
    IssuePatch,
    IssueStatus,
    MemberDraft
} from '@/types'

import { cleanLabels } from '@/lib/labels'

import {
    ISSUE_TYPE_IDS,
    LIMITS,
    PRIORITY_IDS,
    STATUS_IDS,
    UNASSIGNED
} from '@/constants/board'

export class ValidationError extends Error {}

type Input = Record<string, unknown>

const asInput = (body: unknown): Input => {
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw new ValidationError('The request must be a JSON object.')
    }

    return body as Input
}

const has = (input: Input, key: string): boolean => {
    return Object.prototype.hasOwnProperty.call(input, key)
}

const parseEnum = <T extends string>(value: unknown, allowed: readonly T[], label: string): T => {
    if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) {
        return value as T
    }

    throw new ValidationError(`Choose a valid ${label}.`)
}

const parseTitle = (value: unknown): string => {
    const title = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

    if (!title) throw new ValidationError('Give the issue a title.')
    if (title.length > LIMITS.title) throw new ValidationError(`Keep the title under ${LIMITS.title} characters.`)

    return title
}

const parseDescription = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value !== 'string') throw new ValidationError('The description must be text.')

    const description = value.replace(/\r\n/g, '\n').trim()

    if (description.length > LIMITS.description) {
        throw new ValidationError(`Keep the description under ${LIMITS.description} characters.`)
    }

    return description
}

const parsePoints = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null

    const points = typeof value === 'string' ? Number(value) : value

    if (typeof points !== 'number' || !Number.isInteger(points) || points < 0 || points > LIMITS.points) {
        throw new ValidationError(`Story points must be a whole number from 0 to ${LIMITS.points}.`)
    }

    return points
}

const parseAssignee = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '' || value === UNASSIGNED) return null
    if (typeof value !== 'string' || value.length > 64) throw new ValidationError('Choose a valid assignee.')

    return value
}

const parseLabels = (value: unknown): string[] => {
    if (value === null || value === undefined) return []
    if (!Array.isArray(value)) throw new ValidationError('Labels must be a list.')

    const labels = cleanLabels(value.filter((item): item is string => typeof item === 'string'))

    if (labels.length > LIMITS.labels) throw new ValidationError(`Use at most ${LIMITS.labels} labels.`)

    return labels
}

export const isValidDate = (value: string): boolean => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

const parseDueDate = (value: unknown): string | null => {
    if (value === null || value === undefined || value === '') return null
    if (typeof value !== 'string' || !isValidDate(value)) throw new ValidationError('Choose a valid due date.')

    return value
}

const parseMemberName = (value: unknown): string => {
    const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

    if (!name) throw new ValidationError('Enter a name for the teammate.')
    if (name.length > LIMITS.memberName) throw new ValidationError(`Keep names under ${LIMITS.memberName} characters.`)

    return name
}

const parseColor = (value: unknown): string => {
    if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) {
        throw new ValidationError('Choose a valid color.')
    }

    return value.toLowerCase()
}

export const parseId = (value: unknown): string => {
    if (typeof value !== 'string' || !value || value.length > 64) {
        throw new ValidationError('That item could not be found.')
    }

    return value
}

export const parseIssueDraft = (body: unknown): IssueDraft => {
    const input = asInput(body)

    return {
        title: parseTitle(input.title),
        description: parseDescription(input.description),
        status: input.status === undefined ? 'todo' : parseEnum(input.status, STATUS_IDS, 'column'),
        type: input.type === undefined ? 'task' : parseEnum(input.type, ISSUE_TYPE_IDS, 'issue type'),
        priority: input.priority === undefined ? 'medium' : parseEnum(input.priority, PRIORITY_IDS, 'priority'),
        points: parsePoints(input.points),
        assigneeId: parseAssignee(input.assigneeId),
        labels: parseLabels(input.labels),
        dueDate: parseDueDate(input.dueDate)
    }
}

export const parseIssuePatch = (body: unknown): IssuePatch => {
    const input = asInput(body)
    const patch: IssuePatch = {}

    if (has(input, 'title')) patch.title = parseTitle(input.title)
    if (has(input, 'description')) patch.description = parseDescription(input.description)
    if (has(input, 'type')) patch.type = parseEnum(input.type, ISSUE_TYPE_IDS, 'issue type')
    if (has(input, 'priority')) patch.priority = parseEnum(input.priority, PRIORITY_IDS, 'priority')
    if (has(input, 'points')) patch.points = parsePoints(input.points)
    if (has(input, 'assigneeId')) patch.assigneeId = parseAssignee(input.assigneeId)
    if (has(input, 'labels')) patch.labels = parseLabels(input.labels)
    if (has(input, 'dueDate')) patch.dueDate = parseDueDate(input.dueDate)

    if (Object.keys(patch).length === 0) throw new ValidationError('There is nothing to update.')

    return patch
}

export const parseMove = (body: unknown): { status: IssueStatus, afterId: string | null } => {
    const input = asInput(body)
    const status = parseEnum(input.status, STATUS_IDS, 'column')
    const afterId = input.afterId === null || input.afterId === undefined ? null : parseId(input.afterId)

    return { status, afterId }
}

export const parseMemberDraft = (body: unknown): MemberDraft => {
    const input = asInput(body)

    return {
        name: parseMemberName(input.name),
        color: parseColor(input.color)
    }
}

export const parseMemberPatch = (body: unknown): Partial<MemberDraft> => {
    const input = asInput(body)
    const patch: Partial<MemberDraft> = {}

    if (has(input, 'name')) patch.name = parseMemberName(input.name)
    if (has(input, 'color')) patch.color = parseColor(input.color)

    if (Object.keys(patch).length === 0) throw new ValidationError('There is nothing to update.')

    return patch
}
