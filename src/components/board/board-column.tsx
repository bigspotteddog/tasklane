import type { FC, ReactNode } from 'react'
import type { Issue, IssueStatus, Member } from '@/types'
import type { StatusOption } from '@/constants/board'

import { useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { cn } from '@/lib/utils'
import { SortableIssueCard } from '@/components/board/issue-card'
import { QuickAdd } from '@/components/board/quick-add'

interface BoardColumnProps {
    status: StatusOption
    issues: Issue[]
    total: number
    memberMap: Map<string, Member>
    today: string | null
    filtered: boolean
    highlighted: boolean
    onOpen: (id: string) => void
    onQuickCreate: (status: IssueStatus, title: string) => Promise<boolean>
}

export const BoardColumn: FC<BoardColumnProps> = ({
    status,
    issues,
    total,
    memberMap,
    today,
    filtered,
    highlighted,
    onOpen,
    onQuickCreate
}): ReactNode => {
    const { setNodeRef } = useDroppable({ id: status.id })
    const ids = useMemo(() => issues.map((issue) => issue.id), [issues])
    const points = issues.reduce((sum, issue) => sum + (issue.points ?? 0), 0)
    const headingId = `column-${status.id}`

    return (
        <section
            id={`${status.id.replace('_', '-')}-column`}
            aria-labelledby={headingId}
            className={cn(
                'flex h-full w-[min(84vw,300px)] shrink-0 snap-start flex-col rounded-xl bg-muted/80 ring-1 ring-border/70 transition-[background-color,box-shadow] duration-150 ring-inset sm:w-[272px] xl:w-auto xl:min-w-[228px] xl:flex-1',
                highlighted && 'bg-accent ring-primary/30'
            )}
        >
            <header className='flex items-center gap-2 px-3 pt-3 pb-2'>
                <span className={cn('size-2 shrink-0 rounded-full', status.dotClass)} aria-hidden='true' />

                <h2 id={headingId} className='truncate text-xs font-bold tracking-wide text-foreground/75 uppercase'>
                    {status.label}
                </h2>

                <span className='rounded-full bg-background px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted-foreground ring-1 ring-border ring-inset'>
                    {filtered && issues.length !== total ? `${issues.length} of ${total}` : issues.length}
                    <span className='sr-only'> issues</span>
                </span>

                {points > 0 && (
                    <span className='ml-auto shrink-0 text-[11px] font-medium tabular-nums text-muted-foreground' title='Story points in this column'>
                        {points} pts
                    </span>
                )}
            </header>

            <div ref={setNodeRef} className='scrollbar-thin flex min-h-28 flex-1 flex-col overflow-y-auto overscroll-contain px-2 pb-2'>
                <SortableContext id={status.id} items={ids} strategy={verticalListSortingStrategy}>
                    <ol className='flex flex-col gap-2' aria-label={`${status.label} issues`}>
                        {issues.map((issue) => (
                            <SortableIssueCard
                                key={issue.id}
                                issue={issue}
                                assignee={issue.assigneeId ? memberMap.get(issue.assigneeId) : undefined}
                                today={today}
                                onOpen={onOpen}
                            />
                        ))}
                    </ol>
                </SortableContext>

                {issues.length === 0 && (
                    <div className='flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-background/40 px-4 py-6 text-center text-xs leading-relaxed text-muted-foreground'>
                        {filtered ? 'No issues here match your filters.' : status.empty}
                    </div>
                )}
            </div>

            <QuickAdd status={status} onCreate={(title) => onQuickCreate(status.id, title)} />
        </section>
    )
}
