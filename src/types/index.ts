import type { ReactNode } from 'react'

export type SiteConfig = {
    name: string
    description: string
    url: string
    ogImage?: string
    links?: {
        twitter?: string
        github?: string
    }
}

export type LayoutProps = {
    header?: ReactNode
    children: ReactNode
}

export type SeoProps = {
    title?: string
    description?: string
    ogImage?: string
}

export type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done'

export type IssueType = 'story' | 'task' | 'bug'

export type IssuePriority = 'highest' | 'high' | 'medium' | 'low' | 'lowest'

export type Member = {
    id: string
    name: string
    color: string
    createdAt: string
    updatedAt: string
}

export type Issue = {
    id: string
    number: number
    title: string
    description: string
    status: IssueStatus
    type: IssueType
    priority: IssuePriority
    points: number | null
    assigneeId: string | null
    labels: string[]
    dueDate: string | null
    position: number
    createdAt: string
    updatedAt: string
}

export type BoardData = {
    issues: Issue[]
    members: Member[]
}

export type IssueDraft = {
    title: string
    description: string
    status: IssueStatus
    type: IssueType
    priority: IssuePriority
    points: number | null
    assigneeId: string | null
    labels: string[]
    dueDate: string | null
}

export type IssuePatch = Partial<Omit<IssueDraft, 'status'>>

export type MemberDraft = {
    name: string
    color: string
}

export type BoardFilters = {
    search: string
    assignees: string[]
    types: IssueType[]
    priorities: IssuePriority[]
}
