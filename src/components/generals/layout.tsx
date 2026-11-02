import type { FC, ReactNode } from 'react'
import type { LayoutProps } from '@/types'

export const Layout: FC<LayoutProps> = ({ header, children }): ReactNode => {
    return (
        <div className='flex h-dvh flex-col overflow-hidden bg-background'>
            {header}

            <main id='main-content' className='flex min-h-0 flex-1 flex-col overflow-y-auto'>
                {children}
            </main>
        </div>
    )
}
