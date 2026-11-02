import type { FC, ReactNode } from 'react'

import { Logo } from '@/components/generals/logo'

import { siteConfig } from '@/constants/site'

interface AuthShellProps {
    id: string
    children: ReactNode
}

const LANES = ['h-40', 'h-56', 'h-32', 'h-48', 'h-36']

export const AuthShell: FC<AuthShellProps> = ({ id, children }): ReactNode => {
    return (
        <main id={id} className='relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background px-4 py-12'>
            <div aria-hidden='true' className='pointer-events-none absolute inset-x-0 top-0 flex justify-center gap-4 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]'>
                {LANES.map((height, index) => (
                    <div key={index} className={`${height} w-24 rounded-b-2xl bg-muted ring-1 ring-border/60 sm:w-36`} />
                ))}
            </div>

            <div aria-hidden='true' className='pointer-events-none absolute top-24 left-1/2 size-[28rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl' />

            <div className='relative w-full max-w-sm'>
                <div className='mb-6 flex items-center justify-center gap-2.5'>
                    <Logo className='size-8' />

                    <span className='font-heading text-xl font-bold tracking-tight text-foreground'>
                        {siteConfig.name}
                    </span>
                </div>

                <div className='rounded-2xl border bg-card p-6 shadow-[0_24px_60px_-28px_rgba(30,27,75,0.35)] sm:p-7'>
                    {children}
                </div>

                <p className='mt-6 text-center text-xs leading-relaxed text-muted-foreground'>
                    No passwords to remember. We email you a one-time link instead.
                </p>
            </div>
        </main>
    )
}
