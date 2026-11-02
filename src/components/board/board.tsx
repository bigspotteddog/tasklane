import type { FC, ReactNode } from 'react'
import type { Issue, IssueStatus, Member } from '@/types'
import type { ColumnMap } from '@/lib/issues'

import type {
    Announcements,
    CollisionDetection,
    DragEndEvent,
    DragOverEvent,
    DragStartEvent,
    DropAnimation,
    UniqueIdentifier
} from '@dnd-kit/core'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { issueKey, provisionalPosition } from '@/lib/issues'
import { BoardColumn } from '@/components/board/board-column'
import { IssueCardOverlay } from '@/components/board/issue-card'

import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MeasuringStrategy,
    MouseSensor,
    TouchSensor,
    closestCenter,
    defaultDropAnimationSideEffects,
    getFirstCollision,
    pointerWithin,
    rectIntersection,
    useSensor,
    useSensors
} from '@dnd-kit/core'

import { STATUS_IDS, STATUSES, statusLabel } from '@/constants/board'

type ColumnIds = ColumnMap<string>

interface BoardProps {
    columns: ColumnMap<Issue>
    totals: Record<IssueStatus, number>
    memberMap: Map<string, Member>
    today: string | null
    filtered: boolean
    onOpen: (id: string) => void
    onMove: (id: string, status: IssueStatus, afterId: string | null, position: number) => void
    onQuickCreate: (status: IssueStatus, title: string) => Promise<boolean>
    onDraggingChange: (dragging: boolean) => void
}

const isStatus = (id: UniqueIdentifier): id is IssueStatus => {
    return (STATUS_IDS as string[]).includes(String(id))
}

const toIds = (columns: ColumnMap<Issue>): ColumnIds => {
    return STATUS_IDS.reduce((result, status) => {
        result[status] = columns[status].map((issue) => issue.id)
        return result
    }, {} as ColumnIds)
}

const findColumn = (id: string, columns: ColumnIds): IssueStatus | undefined => {
    if (isStatus(id)) return id
    return STATUS_IDS.find((status) => columns[status].includes(id))
}

const dropAnimation: DropAnimation = {
    duration: 180,
    easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
    sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: '0.4' } } })
}

const screenReaderInstructions = {
    draggable: 'To move an issue, press Space to pick it up. Use the arrow keys to move it within a column or to another column, then press Space to drop it, or Escape to cancel. Press Enter to open the issue.'
}

export const Board: FC<BoardProps> = ({
    columns,
    totals,
    memberMap,
    today,
    filtered,
    onOpen,
    onMove,
    onQuickCreate,
    onDraggingChange
}): ReactNode => {
    const baseIds = useMemo(() => toIds(columns), [columns])

    const issueById = useMemo(() => {
        const map = new Map<string, Issue>()

        for (const status of STATUS_IDS) {
            for (const issue of columns[status]) map.set(issue.id, issue)
        }

        return map
    }, [columns])

    const [dragIds, setDragIdsState] = useState<ColumnIds | null>(null)
    const [activeId, setActiveId] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)
    const dragIdsRef = useRef<ColumnIds | null>(null)
    const lastOverId = useRef<UniqueIdentifier | null>(null)
    const movedToNewColumn = useRef(false)

    const visibleIds = dragIds ?? baseIds

    const setDragIds = useCallback((next: ColumnIds | null) => {
        dragIdsRef.current = next
        setDragIdsState(next)
    }, [])

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            movedToNewColumn.current = false
        })

        return () => cancelAnimationFrame(frame)
    }, [visibleIds])

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
            keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space', 'Enter'] }
        })
    )

    const collisionDetection: CollisionDetection = useCallback((args) => {
        const pointerHits = pointerWithin(args)
        const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args)
        let overId = getFirstCollision(hits, 'id')

        if (overId !== null && overId !== undefined) {
            const current = dragIdsRef.current

            if (current && isStatus(overId)) {
                const items = current[overId]

                if (items.length > 0) {
                    const closest = closestCenter({
                        ...args,
                        droppableContainers: args.droppableContainers.filter((container) => {
                            return container.id !== overId && items.includes(String(container.id))
                        })
                    })

                    overId = closest[0]?.id ?? overId
                }
            }

            lastOverId.current = overId
            return [{ id: overId }]
        }

        if (movedToNewColumn.current) lastOverId.current = args.active.id

        return lastOverId.current !== null ? [{ id: lastOverId.current }] : []
    }, [])

    const resetDrag = () => {
        setActiveId(null)
        setDragIds(null)
        lastOverId.current = null
        onDraggingChange(false)
    }

    const handleDragStart = ({ active }: DragStartEvent) => {
        setActiveId(String(active.id))
        setDragIds({ ...baseIds })
        onDraggingChange(true)
    }

    const handleDragOver = ({ active, over }: DragOverEvent) => {
        const current = dragIdsRef.current

        if (!current || !over) return

        const activeKey = String(active.id)
        const overKey = String(over.id)
        const from = findColumn(activeKey, current)
        const to = findColumn(overKey, current)

        if (!from || !to || from === to) return

        const target = current[to]
        let index = target.length

        if (!isStatus(overKey)) {
            const overIndex = target.indexOf(overKey)
            const translated = active.rect.current.translated
            const below = translated ? translated.top > over.rect.top + over.rect.height / 2 : false

            index = overIndex >= 0 ? overIndex + (below ? 1 : 0) : target.length
        }

        movedToNewColumn.current = true

        setDragIds({
            ...current,
            [from]: current[from].filter((id) => id !== activeKey),
            [to]: [...target.slice(0, index), activeKey, ...target.slice(index)]
        })
    }

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        const current = dragIdsRef.current
        const activeKey = String(active.id)
        const original = issueById.get(activeKey)

        resetDrag()

        if (!current || !over || !original) return

        const overKey = String(over.id)
        let column = findColumn(activeKey, current)
        const overColumn = findColumn(overKey, current)

        if (!column || !overColumn) return

        let order = current[column]

        if (overColumn !== column) {
            const target = current[overColumn].filter((id) => id !== activeKey)
            const overIndex = isStatus(overKey) ? target.length : target.indexOf(overKey)
            const index = overIndex >= 0 ? overIndex : target.length

            order = [...target.slice(0, index), activeKey, ...target.slice(index)]
            column = overColumn
        }
        else if (!isStatus(overKey)) {
            const from = order.indexOf(activeKey)
            const to = order.indexOf(overKey)

            if (from !== -1 && to !== -1 && from !== to) order = arrayMove(order, from, to)
        }

        const index = order.indexOf(activeKey)

        if (index === -1) return

        const originalIndex = baseIds[original.status].indexOf(activeKey)

        if (column === original.status && index === originalIndex) return

        const previousId = index > 0 ? order[index - 1] : null
        const nextId = index < order.length - 1 ? order[index + 1] : null

        const position = provisionalPosition(
            previousId ? issueById.get(previousId) : undefined,
            nextId ? issueById.get(nextId) : undefined
        )

        onMove(activeKey, column, previousId, position)
    }

    const describe = (id: UniqueIdentifier): string => {
        const issue = issueById.get(String(id))
        return issue ? issueKey(issue.number) : 'The issue'
    }

    const columnOf = (id: UniqueIdentifier): string => {
        const status = findColumn(String(id), dragIdsRef.current ?? baseIds)
        return status ? statusLabel(status) : 'the board'
    }

    const announcements: Announcements = {
        onDragStart: ({ active }) => `Picked up ${describe(active.id)}.`,
        onDragOver: ({ active, over }) => over
            ? `${describe(active.id)} is over ${columnOf(over.id)}.`
            : `${describe(active.id)} is no longer over a column.`,
        onDragEnd: ({ active, over }) => over
            ? `${describe(active.id)} was dropped in ${columnOf(over.id)}.`
            : `${describe(active.id)} was dropped.`,
        onDragCancel: ({ active }) => `Moving ${describe(active.id)} was cancelled.`
    }

    const activeIssue = activeId ? issueById.get(activeId) : undefined
    const activeColumn = activeId ? findColumn(activeId, visibleIds) : undefined

    return (
        <DndContext
            id='tasklane-board'
            sensors={sensors}
            collisionDetection={collisionDetection}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            accessibility={{ announcements, screenReaderInstructions }}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={resetDrag}
        >
            <section
                id='board'
                aria-label='Board columns'
                className={cn(
                    'scrollbar-thin flex min-h-[26rem] flex-1 scroll-px-4 gap-3 overflow-x-auto px-4 pb-4 sm:px-6 sm:pb-6',
                    activeId ? 'snap-none' : 'snap-x snap-mandatory sm:snap-none'
                )}
            >
                {STATUSES.map((status) => (
                    <BoardColumn
                        key={status.id}
                        status={status}
                        issues={visibleIds[status.id].map((id) => issueById.get(id)).filter((issue): issue is Issue => Boolean(issue))}
                        total={totals[status.id]}
                        memberMap={memberMap}
                        today={today}
                        filtered={filtered}
                        highlighted={activeColumn === status.id}
                        onOpen={onOpen}
                        onQuickCreate={onQuickCreate}
                    />
                ))}
            </section>

            {mounted && createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                    {activeIssue && (
                        <IssueCardOverlay
                            issue={activeIssue}
                            assignee={activeIssue.assigneeId ? memberMap.get(activeIssue.assigneeId) : undefined}
                            today={today}
                        />
                    )}
                </DragOverlay>,
                document.body
            )}
        </DndContext>
    )
}
