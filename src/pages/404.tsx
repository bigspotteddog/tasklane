import type { FC, ReactNode } from 'react'

import Head from 'next/head'
import Link from 'next/link'
import { Logo } from '@/components/generals/logo'

import { siteConfig } from '@/constants/site'

const NotFound: FC = (): ReactNode => {
    return (
        <main id='not-found' className='flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center'>
            <Head>
                <title>
                    {`Page not found - ${siteConfig.name}`}
                </title>
            </Head>

            <Logo className='size-10' />

            <div className='flex flex-col gap-2'>
                <p className='font-mono text-sm font-medium text-primary'>
                    404
                </p>

                <h1 className='font-heading text-3xl font-bold tracking-tight'>
                    This page is not on the board
                </h1>

                <p className='max-w-sm text-sm leading-relaxed text-muted-foreground'>
                    The link may be old or mistyped. Your issues are all still waiting on the board.
                </p>
            </div>

            <Link
                href='/'
                className='inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
            >
                Back to the board
            </Link>
        </main>
    )
}

export default NotFound
