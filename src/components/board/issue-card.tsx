import type { CSSProperties, FC, KeyboardEvent, ReactNode } from 'react'
import type { Issue, Member } from '@/types'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { DueDateChip } from '@/components/board/due-date-chip'
import { IssueKey } from '@/components/board/issue-key'
import { IssueTypeIcon } from '@/components/board/issue-type-icon'
import { MemberAvatar } from '@/components/board/member-avatar'
import { PriorityIcon } from '@/components/board/priority-icon'

interface IssueCardContentProps {
    issue: Issue
    assignee?: Member
    today: string | null
}

interface SortableIssueCardProps extends IssueCardContentProps {
    onOpen: (id: string) => void
}

const CARD_CLASS = 'block w-full rounded-lg border border-border/80 bg-card p-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.05)]'

export const IssueCardContent: FC<IssueCardContentProps> = ({ issue, assignee, today }): ReactNode => {
    const done = issue.status === 'done'
    const hasMeta = issue.labels.length > 0 || issue.dueDate !== null

    return (
        <>
            <p
                className={cn('line-clamp-3 text-sm leading-snug font-medium break-words text-foreground', done && 'text-foreground/70')}
                data-mdlfy-cms={`issues:${issue.id}:title`}
            >
                {issue.title}
            </p>

            {hasMeta && (
                <div className='mt-2 flex flex-wrap items-center gap-1'>
                    {issue.labels.map((label) => (
                        <span
                            key={label}
                            className='max-w-full truncate rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground'
                        >
                            {label}
                        </span>
                    ))}

                    {issue.dueDate && <DueDateChip dueDate={issue.dueDate} today={today} done={done} />}
                </div>
            )}

            <div className='mt-3 flex items-center gap-1.5'>
                <IssueTypeIcon type={issue.type} />
                <IssueKey number={issue.number} className={cn(done && 'line-through decoration-muted-foreground/60')} />

                <div className='ml-auto flex items-center gap-1.5'>
                    {issue.points !== null && (
                        <span
                            title='Story points'
                            className='inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums text-muted-foreground'
                        >
                            <span className='sr-only'>Story points </span>
                            <span>{issue.points}</span>
                        </span>
                    )}

                    <PriorityIcon priority={issue.priority} />
                    <MemberAvatar member={assignee} size='sm' />
                </div>
            </div>
        </>
    )
}

export const IssueCardOverlay: FC<IssueCardContentProps> = (props): ReactNode => {
    return (
        <div className={cn(CARD_CLASS, 'rotate-[1.5deg] cursor-grabbing border-primary/30 shadow-[0_18px_40px_-12px_rgba(30,27,75,0.35)] ring-1 ring-primary/20')}>
            <IssueCardContent {...props} />
        </div>
    )
}

export const SortableIssueCard: FC<SortableIssueCardProps> = ({ onOpen, ...props }): ReactNode => {
    const { issue } = props

    const {
        attributes,
        listeners,
        setNodeRef,
        setActivatorNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: issue.id })

    const style: CSSProperties = {
        transform: CSS.Translate.toString(transform),
        transition
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        listeners?.onKeyDown?.(event)

        if (event.key === 'Enter' && !isDragging && !event.defaultPrevented) {
            event.preventDefault()
            onOpen(issue.id)
        }
    }

    return (
        <li ref={setNodeRef} style={style} className={cn('relative', isDragging && 'z-10')}>
            <div
                ref={setActivatorNodeRef}
                {...attributes}
                {...listeners}
                onKeyDown={handleKeyDown}
                onClick={() => onOpen(issue.id)}
                className={cn(
                    CARD_CLASS,
                    'cursor-pointer touch-manipulation select-none transition-[border-color,box-shadow] duration-150 [-webkit-touch-callout:none] hover:border-primary/35 hover:shadow-[0_4px_12px_-4px_rgba(15,23,42,0.16)] focus-visible:border-primary/50 focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none',
                    isDragging && 'border-dashed border-primary/40 bg-primary/5 shadow-none *:invisible'
                )}
            >
                <IssueCardContent {...props} />
            </div>
        </li>
    )
}
