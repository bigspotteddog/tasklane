import type {
    IssuePriority,
    IssueStatus,
    IssueType,
    ProjectRole
} from '@/types'

export const UNASSIGNED = 'unassigned'

export const POSITION_GAP = 1024

export const LIMITS = {
    title: 200,
    description: 10000,
    labels: 10,
    labelLength: 30,
    memberName: 60,
    points: 100,
    projectName: 60,
    projectDescription: 280,
    invitesPerDay: 20,
    comment: 5000
}

export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,5}$/

export const ROLES: { id: ProjectRole, label: string, summary: string }[] = [
    { id: 'owner', label: 'Owner', summary: 'Everything an admin can do, plus deleting the project.' },
    { id: 'admin', label: 'Admin', summary: 'Manages members and project settings, and works on issues.' },
    { id: 'member', label: 'Member', summary: 'Creates, updates and moves issues.' }
]

export const ROLE_RANK: Record<ProjectRole, number> = {
    member: 1,
    admin: 2,
    owner: 3
}

export const roleLabel = (role: ProjectRole): string => {
    return ROLES.find((option) => option.id === role)?.label ?? role
}

export const canManageProject = (role: ProjectRole): boolean => ROLE_RANK[role] >= ROLE_RANK.admin

export const PROJECT_COLORS = ['#4f39f6', '#0369a1', '#0f766e', '#b45309', '#be123c', '#a21caf', '#047857', '#475569']

export const projectColor = (key: string): string => {
    let total = 0

    for (const character of key) total = (total * 31 + character.charCodeAt(0)) % 997

    return PROJECT_COLORS[total % PROJECT_COLORS.length]
}

export const suggestProjectKey = (name: string): string => {
    const words = name.toUpperCase().replace(/[^A-Z0-9\s]/g, ' ').split(/\s+/).filter(Boolean)

    if (words.length === 0) return ''

    const key = words.length === 1
        ? words[0].replace(/^[0-9]+/, '').slice(0, 4)
        : words.map((word) => word[0]).join('').replace(/^[0-9]+/, '').slice(0, 4)

    return key.length >= 2 ? key : words.join('').replace(/^[0-9]+/, '').slice(0, 4)
}

export type StatusOption = {
    id: IssueStatus
    label: string
    empty: string
    dotClass: string
    badgeClass: string
}

export const STATUSES: StatusOption[] = [
    {
        id: 'backlog',
        label: 'Backlog',
        empty: 'Park ideas and unplanned work here.',
        dotClass: 'bg-zinc-400',
        badgeClass: 'bg-zinc-100 text-zinc-700 ring-zinc-200'
    },
    {
        id: 'todo',
        label: 'To Do',
        empty: 'Nothing queued up yet.',
        dotClass: 'bg-sky-500',
        badgeClass: 'bg-sky-50 text-sky-800 ring-sky-200'
    },
    {
        id: 'in_progress',
        label: 'In Progress',
        empty: 'Drag an issue here when work starts.',
        dotClass: 'bg-amber-500',
        badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200'
    },
    {
        id: 'review',
        label: 'Review',
        empty: 'Work waiting for a second pair of eyes.',
        dotClass: 'bg-violet-500',
        badgeClass: 'bg-violet-50 text-violet-800 ring-violet-200'
    },
    {
        id: 'done',
        label: 'Done',
        empty: 'Finished work lands here.',
        dotClass: 'bg-emerald-500',
        badgeClass: 'bg-emerald-50 text-emerald-800 ring-emerald-200'
    }
]

export const STATUS_IDS: IssueStatus[] = STATUSES.map((status) => status.id)

export const ISSUE_TYPES: { id: IssueType, label: string }[] = [
    { id: 'story', label: 'Story' },
    { id: 'task', label: 'Task' },
    { id: 'bug', label: 'Bug' }
]

export const ISSUE_TYPE_IDS: IssueType[] = ISSUE_TYPES.map((type) => type.id)

export const PRIORITIES: { id: IssuePriority, label: string }[] = [
    { id: 'highest', label: 'Highest' },
    { id: 'high', label: 'High' },
    { id: 'medium', label: 'Medium' },
    { id: 'low', label: 'Low' },
    { id: 'lowest', label: 'Lowest' }
]

export const PRIORITY_IDS: IssuePriority[] = PRIORITIES.map((priority) => priority.id)

export const MEMBER_COLORS = [
    '#4f46e5',
    '#0369a1',
    '#b45309',
    '#0f766e',
    '#be123c',
    '#a21caf',
    '#047857',
    '#475569'
]

export const statusLabel = (status: IssueStatus): string => {
    return STATUSES.find((option) => option.id === status)?.label ?? status
}

export const typeLabel = (type: IssueType): string => {
    return ISSUE_TYPES.find((option) => option.id === type)?.label ?? type
}

export const priorityLabel = (priority: IssuePriority): string => {
    return PRIORITIES.find((option) => option.id === priority)?.label ?? priority
}
