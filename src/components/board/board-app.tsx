import type { FC, ReactNode } from 'react'
import type {
    BoardData,
    BoardFilters,
    Issue,
    IssueStatus
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
import { TeamDialog } from '@/components/board/team-dialog'

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
}

const SHORTCUT_IGNORE = 'input, textarea, select, [contenteditable="true"], [role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"]'

export const BoardApp: FC<BoardAppProps> = ({ initialBoard }): ReactNode => {
    const router = useRouter()
    const today = useToday()
    const searchRef = useRef<HTMLInputElement>(null)
    const handledDeepLink = useRef(false)

    const {
        issues,
        members,
        setPaused,
        createIssue,
        updateIssue,
        moveIssue,
        deleteIssue,
        createMember,
        updateMember,
        deleteMember
    } = useBoard(initialBoard)

    const [filters, setFilters] = useState<BoardFilters>(EMPTY_FILTERS)
    const [createOpen, setCreateOpen] = useState(false)
    const [createStatus, setCreateStatus] = useState<IssueStatus>('todo')
    const [teamOpen, setTeamOpen] = useState(false)
    const [selectedId, setSelectedId] = useState<string | null>(null)

    const memberMap = useMemo(() => new Map(members.map((member) => [member.id, member])), [members])
    const visibleIssues = useMemo(() => issues.filter((issue) => matchesFilters(issue, filters, memberMap)), [issues, filters, memberMap])
    const columns = useMemo(() => groupByStatus(visibleIssues), [visibleIssues])
    const filtered = hasActiveFilters(filters)

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
        setIssueQuery(issueKey(issue.number))
    }, [setIssueQuery])

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

    useEffect(() => {
        if (handledDeepLink.current || !router.isReady) return

        handledDeepLink.current = true

        if (router.query.issue === undefined) return

        const number = parseIssueKey(router.query.issue)
        const match = number === null ? undefined : issues.find((issue) => issue.number === number)

        if (match) {
            setSelectedId(match.id)
            return
        }

        toast.error('That issue could not be found. It may have been deleted.')
        setIssueQuery(null)
    }, [router.isReady, router.query.issue, issues, setIssueQuery])

    useEffect(() => {
        if (selectedId && !selectedIssue) closeIssue()
    }, [selectedId, selectedIssue, closeIssue])

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
            if (createOpen || teamOpen || selectedId) return

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
    }, [createOpen, teamOpen, selectedId, openCreate])

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
        if (!matchesFilters(issue, filters, memberMap)) {
            toast(`${issueKey(issue.number)} was created`, {
                description: 'It is hidden by your current filters.',
                action: { label: 'Clear filters', onClick: () => setFilters(EMPTY_FILTERS) }
            })
        }
    }, [filters, memberMap])

    const handleQuickCreate = useCallback(async (status: IssueStatus, title: string): Promise<boolean> => {
        const issue = await createIssue({ title, status })

        if (issue) announceHidden(issue)

        return issue !== null
    }, [createIssue, announceHidden])

    const handleCreated = useCallback((issue: Issue) => {
        if (!matchesFilters(issue, filters, memberMap)) {
            announceHidden(issue)
            return
        }

        toast.success(`${issueKey(issue.number)} was created`, {
            action: { label: 'Open', onClick: () => showIssue(issue) }
        })
    }, [filters, memberMap, announceHidden, showIssue])

    return (
        <Layout header={<AppHeader onCreate={() => openCreate()} onOpenTeam={() => setTeamOpen(true)} />}>
            <BoardToolbar
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

            <TeamDialog
                open={teamOpen}
                members={members}
                issues={issues}
                onOpenChange={setTeamOpen}
                onCreate={createMember}
                onUpdate={updateMember}
                onDelete={deleteMember}
            />
        </Layout>
    )
}
