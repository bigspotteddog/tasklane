import type {
    BoardFilters,
    Issue,
    IssueStatus,
    Member
} from '@/types'

import {
    ISSUE_KEY_PREFIX,
    POSITION_GAP,
    STATUS_IDS,
    UNASSIGNED
} from '@/constants/board'

export type ColumnMap<T> = Record<IssueStatus, T[]>

export const EMPTY_FILTERS: BoardFilters = {
    search: '',
    assignees: [],
    types: [],
    priorities: []
}

export const issueKey = (number: number): string => {
    return `${ISSUE_KEY_PREFIX}-${number}`
}

export const parseIssueKey = (value: unknown): number | null => {
    if (typeof value !== 'string') return null

    const match = value.trim().toUpperCase().match(new RegExp(`^${ISSUE_KEY_PREFIX}-(\\d+)$`))
    return match ? Number(match[1]) : null
}

export const emptyColumns = <T>(): ColumnMap<T> => {
    return STATUS_IDS.reduce((columns, status) => {
        columns[status] = []
        return columns
    }, {} as ColumnMap<T>)
}

export const compareIssues = (a: Issue, b: Issue): number => {
    return a.position - b.position || a.number - b.number
}

export const hasActiveFilters = (filters: BoardFilters): boolean => {
    return Boolean(filters.search.trim()) || filters.assignees.length > 0 || filters.types.length > 0 || filters.priorities.length > 0
}

export const matchesFilters = (issue: Issue, filters: BoardFilters, members: Map<string, Member>): boolean => {
    if (filters.types.length > 0 && !filters.types.includes(issue.type)) return false
    if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) return false

    if (filters.assignees.length > 0) {
        const assignee = issue.assigneeId ?? UNASSIGNED
        if (!filters.assignees.includes(assignee)) return false
    }

    const query = filters.search.trim().toLowerCase()

    if (!query) return true

    const assigneeName = issue.assigneeId ? members.get(issue.assigneeId)?.name ?? '' : ''
    const haystack = [
        issue.title,
        issueKey(issue.number),
        String(issue.number),
        assigneeName,
        ...issue.labels
    ].join(' ').toLowerCase()

    return query.split(/\s+/).every((term) => haystack.includes(term))
}

export const groupByStatus = (issues: Issue[]): ColumnMap<Issue> => {
    const columns = emptyColumns<Issue>()

    for (const issue of issues) {
        columns[issue.status].push(issue)
    }

    for (const status of STATUS_IDS) {
        columns[status].sort(compareIssues)
    }

    return columns
}

export const provisionalPosition = (previous?: Issue, next?: Issue): number => {
    if (previous && next) return (previous.position + next.position) / 2
    if (previous) return previous.position + POSITION_GAP
    if (next) return next.position - POSITION_GAP

    return POSITION_GAP
}

export const todayKey = (): string => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')

    return `${now.getFullYear()}-${month}-${day}`
}

export type DueState = 'overdue' | 'today' | 'soon' | 'later'

export const dueState = (dueDate: string, today: string): DueState => {
    if (dueDate < today) return 'overdue'
    if (dueDate === today) return 'today'

    const due = new Date(`${dueDate}T00:00:00`)
    const now = new Date(`${today}T00:00:00`)
    const days = Math.round((due.getTime() - now.getTime()) / 86400000)

    return days <= 3 ? 'soon' : 'later'
}

export const formatDueDate = (dueDate: string, today: string | null): string => {
    const date = new Date(`${dueDate}T00:00:00`)
    const showYear = today !== null && dueDate.slice(0, 4) !== today.slice(0, 4)

    return date.toLocaleDateString('en-US', showYear
        ? { month: 'short', day: 'numeric', year: 'numeric' }
        : { month: 'short', day: 'numeric' })
}

export const formatTimestamp = (value: string): string => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return ''

    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })
}

export const initials = (name: string): string => {
    const parts = name.trim().split(/\s+/).filter(Boolean)

    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()

    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}
