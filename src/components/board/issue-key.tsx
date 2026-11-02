import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { ISSUE_KEY_PREFIX } from '@/constants/board'

interface IssueKeyProps {
    number: number
    className?: string
}

export const IssueKey: FC<IssueKeyProps> = ({ number, className }): ReactNode => {
    return (
        <span className={cn('font-mono text-[11px] font-medium tracking-tight text-muted-foreground', className)}>
            {ISSUE_KEY_PREFIX}-<span>{number}</span>
        </span>
    )
}
