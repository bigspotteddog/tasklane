import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { projectColor } from '@/constants/board'

interface ProjectBadgeProps {
    projectKey: string
    size?: 'sm' | 'md' | 'lg'
    className?: string
}

const SIZES = {
    sm: 'size-5 rounded-[5px] text-[9px]',
    md: 'size-7 rounded-md text-[10px]',
    lg: 'size-10 rounded-lg text-xs'
}

export const ProjectBadge: FC<ProjectBadgeProps> = ({ projectKey, size = 'md', className }): ReactNode => {
    return (
        <span
            aria-hidden='true'
            className={cn('inline-flex shrink-0 items-center justify-center font-mono font-bold tracking-tight text-white', SIZES[size], className)}
            style={{ backgroundColor: projectColor(projectKey) }}
        >
            {projectKey.slice(0, 3)}
        </span>
    )
}
