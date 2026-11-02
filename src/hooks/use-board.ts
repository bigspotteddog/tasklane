import type {
    BoardData,
    Issue,
    IssueDraft,
    IssuePatch,
    IssueStatus,
    Member,
    MemberDraft
} from '@/types'

import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { apiRequest, errorMessage } from '@/lib/api'

const REFRESH_INTERVAL = 30000
const REFRESH_THROTTLE = 2000

type IssueResponse = { issue: Issue }

type MemberResponse = { member: Member }

export const useBoard = (initial: BoardData) => {
    const [issues, setIssues] = useState<Issue[]>(initial.issues)
    const [members, setMembers] = useState<Member[]>(initial.members)

    const issuesRef = useRef(issues)
    const pending = useRef(0)
    const version = useRef(0)
    const paused = useRef(false)
    const lastRefresh = useRef(0)
    const moveSequence = useRef(new Map<string, number>())

    useEffect(() => {
        issuesRef.current = issues
    }, [issues])

    const refresh = useCallback(async () => {
        if (pending.current > 0 || paused.current) return
        if (Date.now() - lastRefresh.current < REFRESH_THROTTLE) return

        lastRefresh.current = Date.now()
        const startedAt = version.current

        try {
            const data = await apiRequest<BoardData>('/api/board')

            if (pending.current > 0 || paused.current || version.current !== startedAt) return

            setIssues(data.issues)
            setMembers(data.members)
        }
        catch {
            // Keep what is on screen. The next refresh tries again.
        }
    }, [])

    const mutate = useCallback(async <T>(request: () => Promise<T>): Promise<T | null> => {
        pending.current += 1
        version.current += 1

        let failed = false

        try {
            return await request()
        }
        catch (error) {
            failed = true
            toast.error(errorMessage(error))
            return null
        }
        finally {
            pending.current = Math.max(0, pending.current - 1)

            if (failed) {
                lastRefresh.current = 0
                void refresh()
            }
        }
    }, [refresh])

    useEffect(() => {
        const sync = () => {
            if (document.visibilityState === 'visible') void refresh()
        }

        const timer = window.setInterval(sync, REFRESH_INTERVAL)

        window.addEventListener('focus', sync)
        document.addEventListener('visibilitychange', sync)

        return () => {
            window.clearInterval(timer)
            window.removeEventListener('focus', sync)
            document.removeEventListener('visibilitychange', sync)
        }
    }, [refresh])

    const setPaused = useCallback((value: boolean) => {
        paused.current = value
    }, [])

    const createIssue = useCallback(async (draft: Partial<IssueDraft> & { title: string }): Promise<Issue | null> => {
        const result = await mutate(() => apiRequest<IssueResponse>('/api/issues', { method: 'POST', body: draft }))

        if (!result) return null

        setIssues((current) => current.some((issue) => issue.id === result.issue.id) ? current : [...current, result.issue])

        return result.issue
    }, [mutate])

    const updateIssue = useCallback(async (id: string, patch: IssuePatch): Promise<boolean> => {
        const before = issuesRef.current.find((issue) => issue.id === id)
        const keys = Object.keys(patch) as (keyof IssuePatch)[]

        setIssues((current) => current.map((issue) => issue.id === id ? { ...issue, ...patch } : issue))

        const result = await mutate(() => apiRequest<IssueResponse>(`/api/issues/${id}`, { method: 'PATCH', body: patch }))

        if (!result) {
            if (before) {
                const restored = Object.fromEntries(keys.map((key) => [key, before[key]])) as Partial<Issue>
                setIssues((current) => current.map((issue) => issue.id === id ? { ...issue, ...restored } : issue))
            }

            return false
        }

        const saved = Object.fromEntries(keys.map((key) => [key, result.issue[key]])) as Partial<Issue>

        setIssues((current) => current.map((issue) => {
            return issue.id === id ? { ...issue, ...saved, updatedAt: result.issue.updatedAt } : issue
        }))

        return true
    }, [mutate])

    const moveIssue = useCallback(async (id: string, status: IssueStatus, afterId: string | null, position: number): Promise<boolean> => {
        const before = issuesRef.current.find((issue) => issue.id === id)

        if (!before) return false

        const sequence = (moveSequence.current.get(id) ?? 0) + 1
        moveSequence.current.set(id, sequence)

        setIssues((current) => current.map((issue) => issue.id === id ? { ...issue, status, position } : issue))

        const result = await mutate(() => apiRequest<IssueResponse>(`/api/issues/${id}/move`, {
            method: 'POST',
            body: { status, afterId }
        }))

        if (moveSequence.current.get(id) !== sequence) return Boolean(result)

        if (!result) {
            setIssues((current) => current.map((issue) => {
                return issue.id === id ? { ...issue, status: before.status, position: before.position } : issue
            }))

            return false
        }

        setIssues((current) => current.map((issue) => {
            return issue.id === id
                ? { ...issue, status: result.issue.status, position: result.issue.position, updatedAt: result.issue.updatedAt }
                : issue
        }))

        return true
    }, [mutate])

    const deleteIssue = useCallback(async (id: string): Promise<boolean> => {
        const before = issuesRef.current.find((issue) => issue.id === id)

        setIssues((current) => current.filter((issue) => issue.id !== id))

        const result = await mutate(() => apiRequest<{ id: string }>(`/api/issues/${id}`, { method: 'DELETE' }))

        if (!result && before) {
            setIssues((current) => current.some((issue) => issue.id === id) ? current : [...current, before])
        }

        return Boolean(result)
    }, [mutate])

    const createMember = useCallback(async (draft: MemberDraft): Promise<Member | null> => {
        const result = await mutate(() => apiRequest<MemberResponse>('/api/members', { method: 'POST', body: draft }))

        if (!result) return null

        setMembers((current) => current.some((member) => member.id === result.member.id) ? current : [...current, result.member])

        return result.member
    }, [mutate])

    const updateMember = useCallback(async (id: string, patch: Partial<MemberDraft>): Promise<boolean> => {
        setMembers((current) => current.map((member) => member.id === id ? { ...member, ...patch } : member))

        const result = await mutate(() => apiRequest<MemberResponse>(`/api/members/${id}`, { method: 'PATCH', body: patch }))

        if (!result) return false

        setMembers((current) => current.map((member) => member.id === id ? result.member : member))

        return true
    }, [mutate])

    const deleteMember = useCallback(async (id: string): Promise<boolean> => {
        setMembers((current) => current.filter((member) => member.id !== id))
        setIssues((current) => current.map((issue) => issue.assigneeId === id ? { ...issue, assigneeId: null } : issue))

        const result = await mutate(() => apiRequest<{ id: string }>(`/api/members/${id}`, { method: 'DELETE' }))

        return Boolean(result)
    }, [mutate])

    return {
        issues,
        members,
        refresh,
        setPaused,
        createIssue,
        updateIssue,
        moveIssue,
        deleteIssue,
        createMember,
        updateMember,
        deleteMember
    }
}
