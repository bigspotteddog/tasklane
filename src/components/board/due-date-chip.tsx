import type { FC, ReactNode } from 'react'

import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { dueState, formatDueDate } from '@/lib/issues'

interface DueDateChipProps {
    dueDate: string
    today: string | null
    done?: boolean
}

const TONES = {
    overdue: 'bg-red-50 text-red-700 ring-red-200',
    today: 'bg-amber-50 text-amber-800 ring-amber-200',
    soon: 'bg-amber-50 text-amber-800 ring-amber-200',
    later: 'bg-background text-muted-foreground ring-border'
}

export const DueDateChip: FC<DueDateChipProps> = ({ dueDate, today, done = false }): ReactNode => {
    const state = today && !done ? dueState(dueDate, today) : 'later'

    return (
        <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', TONES[state])}>
            <CalendarDays className='size-3.5' aria-hidden='true' />
            <span className='sr-only'>Due </span>
            <span>{formatDueDate(dueDate, today)}</span>
            {state === 'overdue' && <span className='sr-only'>, overdue</span>}
        </span>
    )
}
