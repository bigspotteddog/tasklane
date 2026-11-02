import type { FC, ReactNode } from 'react'
import type {
    BoardData,
    BoardFilters,
    Issue,
    IssueStatus,
    Member,
    ProjectSummary
} from '@/types'
import type { BoardStats } from '@/components/board/board-toolbar'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { toast } from 'sonner'
import { useBoard } from '@/hooks/use-board'
import { useToday } from '@/hooks/use-today'
import { Layout } from '@/components/generals/layout'
import { AppHeader } from '@/components/board/app-header'
import { Board } from '@/components/board/board'
import { BoardToolbar } from '@/components/board/board-toolbar'
import { CreateIssueDialog } from '@/components/board/create-issue-dialog'
import { IssueDialog } from '@/components/board/issue-dialog'
import { ProjectProvider } from '@/components/projects/project-context'

import {
    EMPTY_FILTERS,
    compareIssues,
    groupByStatus,
    hasActiveFilters,
    issueKey,
    matchesFilters,
    parseIssueKey
} from '@/lib/issues'

import { POSITION_GAP, STATUS_IDS } from '@/constants/board'

interface BoardAppProps {
    initialBoard: BoardData
    viewer: Member
    projects: ProjectSummary[]
}

const SHORTCUT_IGNORE = 'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

export const BoardApp: FC<BoardAppProps> = ({ initialBoard, viewer: initialViewer, projects }): ReactNode => {
    const router = useRouter()
    const today = useToday()
    const searchRef = useRef<HTMLInputElement>(null)
    const handledDeepLink = useRef(false)

    const {
        project,
        role,
        issues,
        members,
        setPaused,
        applyMember,
        createIssue,
        updateIssue,
        moveIssue,
        deleteIssue
    } = useBoard(initialBoard)

    const [viewerState, setViewerState] = useState<Member>(initialViewer)
    const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS)
    const [createOpen, setCreateOpen] = useState(false)
    const [createStatus, setCreateStatus] = useState<IssueStatus>('todo')
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const projectKey = project.key
    const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members])
    const viewer = memberMap.get(viewerState.id) ?? viewerState
    const visibleIssues = useMemo(() => issues.filter((issue) => matchesFilters(issue, filters, memberMap, projectKey)), [issues, filters, memberMap, projectKey])
    const columns = useMemo(() => groupByStatus(visibleIssues), [visibleIssues])
    const filtered = hasActiveFilters(filters)

    const switcherProjects = useMemo(() => {
        return projects.map((item) => item.id === project.id ? { ...item, name: project.name, key: project.key } : item)
    }, [projects, project])

    const totals = useMemo(() => {
        const counts = STATUS_IDS.reduce((result, status) => {
            result[status] = 0
            return result
        }, {} as Record<IssueStatus, number>)

        for (const issue of issues) counts[issue.status] += 1

        return counts
    }, [issues])

    const stats = useMemo<BoardStats>(() => {
        return issues.reduce((result, issue) => {
            const points = issue.points ?? 0
            const done = issue.status === 'done'

            return {
                total: result.total + 1,
                done: result.done + (done ? 1 : 0),
                points: result.points + points,
                donePoints: result.donePoints + (done ? points : 0)
            }
        }, { total: 0, done: 0, points: 0, donePoints: 0 })
    }, [issues])

    const labelSuggestions = useMemo(() => {
        return [...new Set(issues.flatMap((issue) => issue.labels))].sort((a, b) => a.localeCompare(b))
    }, [issues])

    const selectedIssue = selectedId ? issues.find((issue) => issue.id === selectedId) ?? null : null

    const setIssueQuery = useCallback((key: string | null) => {
        const query = { ...router.query }

        if (key) query.issue = key
        else delete query.issue

        void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true, scroll: false })
    }, [router])

    const showIssue = useCallback((issue: Issue) => {
        setSelectedId(issue.id)
        setIssueQuery(issueKey(projectKey, issue.number))
    }, [setIssueQuery, projectKey])

    const openIssue = useCallback((id: string) => {
        const issue = issues.find((item) => item.id === id)
        if (issue) showIssue(issue)
    }, [issues, showIssue])

    const closeIssue = useCallback(() => {
        setSelectedId(null)
        setIssueQuery(null)
    }, [setIssueQuery])

    const openCreate = useCallback((status: IssueStatus = 'todo') => {
        setCreateStatus(status)
        setCreateOpen(true)
    }, [])

    const handleViewerChange = useCallback((member: Member) => {
        setViewerState(member)
        applyMember(member)
    }, [applyMember])

    useEffect(() => {
        if (handledDeepLink.current || !router.isReady) return

        handledDeepLink.current = true

        if (router.query.issue === undefined) return

        const parsed = parseIssueKey(router.query.issue)
        const match = parsed && parsed.projectKey === projectKey
            ? issues.find((issue) => issue.number === parsed.number)
            : undefined

        if (match) {
            setSelectedId(match.id)
            return
        }

        toast.error('That issue could not be found in this project. It may have been deleted.')
        setIssueQuery(null)
    }, [router.isReady, router.query.issue, issues, projectKey, setIssueQuery])

    useEffect(() => {
        if (selectedId && !selectedIssue) closeIssue()
    }, [selectedId, selectedIssue, closeIssue])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
            if (createOpen || selectedId) return

            const target = event.target instanceof Element ? event.target : null

            if (target?.closest(SHORTCUT_IGNORE)) return

            if (event.key === 'c' || event.key === 'C') {
                event.preventDefault()
                openCreate()
            }

            if (event.key === '/') {
                event.preventDefault()
                searchRef.current?.focus()
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [createOpen, selectedId, openCreate])

    const handleMove = useCallback((id: string, status: IssueStatus, afterId: string | null, position: number) => {
        void moveIssue(id, status, afterId, position)
    }, [moveIssue])

    const handleStatusChange = useCallback((id: string, status: IssueStatus) => {
        const first = issues
            .filter((issue) => issue.status === status && issue.id !== id)
            .sort(compareIssues)[0]

        void moveIssue(id, status, null, first ? first.position - POSITION_GAP : POSITION_GAP)
    }, [issues, moveIssue])

    const announceHidden = useCallback((issue: Issue) => {
        if (!matchesFilters(issue, filters, memberMap, projectKey)) {
            toast(`${issueKey(projectKey, issue.number)} was created`, {
                description: 'It is hidden by your current filters.',
                action: { label: 'Clear filters', onClick: () => setFilters(EMPTY_FILTERS) }
            })
        }
    }, [filters, memberMap, projectKey])

    const handleQuickCreate = useCallback(async (status: IssueStatus, title: string): Promise<boolean> => {
        const issue = await createIssue({ title, status })

        if (issue) announceHidden(issue)

        return issue !== null
    }, [createIssue, announceHidden])

    const handleCreated = useCallback((issue: Issue) => {
        if (!matchesFilters(issue, filters, memberMap, projectKey)) {
            announceHidden(issue)
            return
        }

        toast.success(`${issueKey(projectKey, issue.number)} was created`, {
            action: { label: 'Open', onClick: () => showIssue(issue) }
        })
    }, [filters, memberMap, projectKey, announceHidden, showIssue])

    return (
        <ProjectProvider project={project} role={role}>
            <Layout
                header={(
                    <AppHeader
                        viewer={viewer}
                        projects={switcherProjects}
                        project={project}
                        onCreate={() => openCreate()}
                        onViewerChange={handleViewerChange}
                    />
                )}
            >
                <BoardToolbar
                    project={project}
                    filters={filters}
                    members={members}
                    stats={stats}
                    searchRef={searchRef}
                    onFiltersChange={setFilters}
                />

                <Board
                    columns={columns}
                    totals={totals}
                    memberMap={memberMap}
                    today={today}
                    filtered={filtered}
                    onOpen={openIssue}
                    onMove={handleMove}
                    onQuickCreate={handleQuickCreate}
                    onDraggingChange={setPaused}
                />

                <CreateIssueDialog
                    open={createOpen}
                    defaultStatus={createStatus}
                    members={members}
                    labelSuggestions={labelSuggestions}
                    onOpenChange={setCreateOpen}
                    onCreate={createIssue}
                    onCreated={handleCreated}
                />

                <IssueDialog
                    issue={selectedIssue}
                    members={members}
                    labelSuggestions={labelSuggestions}
                    onClose={closeIssue}
                    onUpdate={updateIssue}
                    onStatusChange={handleStatusChange}
                    onDelete={deleteIssue}
                />
            </Layout>
        </ProjectProvider>
    )
}
