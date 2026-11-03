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

export type ProjectRole = 'owner' | 'admin' | 'member'

export type Member = {
    id: string
    name: string
    color: string
    email: string | null
    createdAt: string
    updatedAt: string
}

export type ProjectMember = Member & {
    role: ProjectRole
    joined: boolean
}

export type Project = {
    id: string
    name: string
    key: string
    description: string
    createdAt: string
    updatedAt: string
}

export type ProjectSummary = Project & {
    role: ProjectRole
    openIssues: number
    totalIssues: number
    memberCount: number
}

export type Issue = {
    id: string
    projectId: string
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
    project: Project
    role: ProjectRole
    issues: Issue[]
    members: ProjectMember[]
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

export type ProjectDraft = {
    name: string
    key: string
    description: string
}

export type ProfileDraft = {
    name: string
    color: string
}

export type InviteDraft = {
    email: string
    role: Exclude<ProjectRole, 'owner'>
}

export type SignInState = 'ready' | 'setup' | 'closed'

export type BoardFilters = {
    search: string
    assignees: string[]
    types: IssueType[]
    priorities: IssuePriority[]
}

export type ActivityAction = 'created' | 'status' | 'assignee' | 'priority' | 'due_date'

export type Person = {
    id: string
    name: string
    color: string
}

export type Comment = {
    id: string
    issueId: string
    projectId: string
    authorId: string
    author: Person
    body: string
    createdAt: string
    updatedAt: string
}

export type ActivityEntry = {
    id: string
    issueId: string
    projectId: string
    actor: Person | null
    action: ActivityAction
    detail: { from: string | null, to: string | null }
    createdAt: string
}
