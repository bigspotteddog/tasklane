import type { FC, ReactNode } from 'react'

import Head from 'next/head'
import Link from 'next/link'
import { Logo } from '@/components/generals/logo'

import { siteConfig } from '@/constants/site'

const ServerError: FC = (): ReactNode => {
    return (
        <main id='server-error' className='flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-6 text-center'>
            <Head>
                <title>
                    {`Something went wrong - ${siteConfig.name}`}
                </title>
            </Head>

            <Logo className='size-10' />

            <div className='flex flex-col gap-2'>
                <h1 className='font-heading text-3xl font-bold tracking-tight'>
                    Something went wrong
                </h1>

                <p className='max-w-sm text-sm leading-relaxed text-muted-foreground'>
                    We hit a snag loading this page. Your issues are safe, so head back and try again.
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

export default ServerError
