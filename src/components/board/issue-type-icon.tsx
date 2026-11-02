import type { FC, ReactNode } from 'react'
import type { IssueType } from '@/types'

import { Bookmark, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

import { typeLabel } from '@/constants/board'

interface IssueTypeIconProps {
    type: IssueType
    className?: string
}

const TONES: Record<IssueType, string> = {
    story: 'bg-emerald-600',
    task: 'bg-sky-600',
    bug: 'bg-rose-600'
}

export const IssueTypeIcon: FC<IssueTypeIconProps> = ({ type, className }): ReactNode => {
    const label = typeLabel(type)

    return (
        <span
            role='img'
            aria-label={label}
            title={label}
            className={cn('inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] text-white', TONES[type], className)}
        >
            {type === 'story' && <Bookmark className='size-2.5' fill='currentColor' strokeWidth={2.5} aria-hidden='true' />}
            {type === 'task' && <Check className='size-3' strokeWidth={3.5} aria-hidden='true' />}
            {type === 'bug' && <span className='size-1.5 rounded-full bg-white' aria-hidden='true' />}
        </span>
    )
}
