import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import { useProjectKey } from '@/components/projects/project-context'

interface IssueKeyProps {
    number: number
    className?: string
}

export const IssueKey: FC<IssueKeyProps> = ({ number, className }): ReactNode => {
    const prefix = useProjectKey()

    return (
        <span className={cn('font-mono text-[11px] font-medium tracking-tight text-muted-foreground', className)}>
            {prefix}-<span>{number}</span>
        </span>
    )
}
