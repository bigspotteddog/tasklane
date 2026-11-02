import type { FC, ReactNode } from 'react'
import type { Member } from '@/types'

import { UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/issues'

interface MemberAvatarProps {
    member?: Member | null
    size?: 'xs' | 'sm' | 'md'
    className?: string
}

const SIZES = {
    xs: 'size-5 text-[9px]',
    sm: 'size-6 text-[10px]',
    md: 'size-8 text-xs'
}

export const MemberAvatar: FC<MemberAvatarProps> = ({ member, size = 'sm', className }): ReactNode => {
    if (!member) {
        return (
            <span
                role='img'
                aria-label='Unassigned'
                title='Unassigned'
                className={cn('inline-flex shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/50 bg-background text-muted-foreground', SIZES[size], className)}
            >
                <UserRound className={size === 'md' ? 'size-4' : 'size-3'} aria-hidden='true' />
            </span>
        )
    }

    return (
        <span
            role='img'
            aria-label={member.name}
            title={member.name}
            className={cn('inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold tracking-tight text-white', SIZES[size], className)}
            style={{ backgroundColor: member.color }}
        >
            <span aria-hidden='true'>
                {initials(member.name)}
            </span>
        </span>
    )
}
