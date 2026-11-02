import type { FC, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import type { IssuePriority } from '@/types'

import {
    ChevronDown,
    ChevronsDown,
    ChevronsUp,
    ChevronUp,
    Equal
} from 'lucide-react'
import { cn } from '@/lib/utils'

import { priorityLabel } from '@/constants/board'

interface PriorityIconProps {
    priority: IssuePriority
    className?: string
}

const STYLES: Record<IssuePriority, { Icon: LucideIcon, tone: string }> = {
    highest: { Icon: ChevronsUp, tone: 'text-red-600' },
    high: { Icon: ChevronUp, tone: 'text-orange-600' },
    medium: { Icon: Equal, tone: 'text-amber-600' },
    low: { Icon: ChevronDown, tone: 'text-sky-600' },
    lowest: { Icon: ChevronsDown, tone: 'text-sky-700' }
}

export const PriorityIcon: FC<PriorityIconProps> = ({ priority, className }): ReactNode => {
    const { Icon, tone } = STYLES[priority]
    const label = `${priorityLabel(priority)} priority`

    return (
        <span role='img' aria-label={label} title={label} className='inline-flex shrink-0'>
            <Icon className={cn('size-4', tone, className)} strokeWidth={2.5} aria-hidden='true' />
        </span>
    )
}
