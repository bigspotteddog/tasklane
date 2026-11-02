import type { FC, ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface LogoProps {
    className?: string
}

export const Logo: FC<LogoProps> = ({ className }): ReactNode => {
    return (
        <svg viewBox='0 0 32 32' className={cn('size-8 shrink-0', className)} aria-hidden='true'>
            <rect width='32' height='32' rx='9' className='fill-primary' />
            <rect x='7.5' y='8' width='4.5' height='16' rx='2.25' fill='white' />
            <rect x='13.75' y='8' width='4.5' height='10' rx='2.25' fill='white' fillOpacity='0.82' />
            <rect x='20' y='8' width='4.5' height='13' rx='2.25' fill='white' fillOpacity='0.64' />
        </svg>
    )
}
