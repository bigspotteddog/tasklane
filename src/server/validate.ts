import type {
    InviteDraft,
    IssueDraft,
    IssuePatch,
    IssueStatus,
    ProfileDraft,
    ProjectDraft
} from '@/types'

import { cleanLabels } from '@/lib/labels'

import {
    ISSUE_TYPE_IDS,
    LIMITS,
    PRIORITY_IDS,
    PROJECT_KEY_PATTERN,
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

    if (!name) throw new ValidationError('Enter a name.')
    if (name.length > LIMITS.memberName) throw new ValidationError(`Keep names under ${LIMITS.memberName} characters.`)

    return name
}

export const normalizeEmail = (value: unknown): string | null => {
    if (typeof value !== 'string') return null

    const email = value.trim().toLowerCase()

    if (email.length > 254 || !/^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:".]{2,}$/.test(email)) return null

    return email
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

const parseProjectName = (value: unknown): string => {
    const name = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''

    if (!name) throw new ValidationError('Give the project a name.')
    if (name.length > LIMITS.projectName) throw new ValidationError(`Keep the project name under ${LIMITS.projectName} characters.`)

    return name
}

const parseProjectKey = (value: unknown): string => {
    const key = typeof value === 'string' ? value.trim().toUpperCase() : ''

    if (!PROJECT_KEY_PATTERN.test(key)) {
        throw new ValidationError('The key must be 2 to 6 letters or numbers and start with a letter, like WEB or APP2.')
    }

    return key
}

const parseProjectDescription = (value: unknown): string => {
    if (value === null || value === undefined) return ''
    if (typeof value !== 'string') throw new ValidationError('The description must be text.')

    const description = value.replace(/\s+/g, ' ').trim()

    if (description.length > LIMITS.projectDescription) {
        throw new ValidationError(`Keep the description under ${LIMITS.projectDescription} characters.`)
    }

    return description
}

const parseInviteRole = (value: unknown): InviteDraft['role'] => {
    return parseEnum(value, ['admin', 'member'] as const, 'role')
}

export const parseProjectDraft = (body: unknown): ProjectDraft => {
    const input = asInput(body)

    return {
        name: parseProjectName(input.name),
        key: parseProjectKey(input.key),
        description: parseProjectDescription(input.description)
    }
}

export const parseProjectPatch = (body: unknown): Partial<ProjectDraft> => {
    const input = asInput(body)
    const patch: Partial<ProjectDraft> = {}

    if (has(input, 'name')) patch.name = parseProjectName(input.name)
    if (has(input, 'key')) patch.key = parseProjectKey(input.key)
    if (has(input, 'description')) patch.description = parseProjectDescription(input.description)

    if (Object.keys(patch).length === 0) throw new ValidationError('There is nothing to update.')

    return patch
}

export const parseInvite = (body: unknown): InviteDraft => {
    const input = asInput(body)
    const email = normalizeEmail(input.email)

    if (!email) throw new ValidationError('Enter a valid email address.')

    return { email, role: parseInviteRole(input.role) }
}

export const parseMembershipPatch = (body: unknown): { role?: InviteDraft['role'], name?: string, email?: string } => {
    const input = asInput(body)
    const patch: { role?: InviteDraft['role'], name?: string, email?: string } = {}

    if (has(input, 'role')) patch.role = parseInviteRole(input.role)
    if (has(input, 'name')) patch.name = parseMemberName(input.name)

    if (has(input, 'email')) {
        const email = normalizeEmail(input.email)

        if (!email) throw new ValidationError('Enter a valid email address.')

        patch.email = email
    }

    if (Object.keys(patch).length === 0) throw new ValidationError('There is nothing to update.')

    return patch
}

export const parseProfilePatch = (body: unknown): Partial<ProfileDraft> => {
    const input = asInput(body)
    const patch: Partial<ProfileDraft> = {}

    if (has(input, 'name')) patch.name = parseMemberName(input.name)
    if (has(input, 'color')) patch.color = parseColor(input.color)

    if (Object.keys(patch).length === 0) throw new ValidationError('There is nothing to update.')

    return patch
}
