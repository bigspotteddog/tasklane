import type { FC, ReactNode } from 'react'

import { useState } from 'react'
import { useRouter } from 'next/router'
import { CircleAlert, RefreshCw } from 'lucide-react'
import { Layout } from '@/components/generals/layout'
import { AppHeader } from '@/components/board/app-header'
import { Button } from '@/components/ui/button'

export const BoardUnavailable: FC = (): ReactNode => {
    const router = useRouter()
    const [retrying, setRetrying] = useState(false)

    const retry = async () => {
        setRetrying(true)
        await router.replace(router.asPath)
        setRetrying(false)
    }

    return (
        <Layout header={<AppHeader />}>
            <section id='board-unavailable' className='flex flex-1 items-center justify-center px-6 py-16'>
                <div className='flex max-w-sm flex-col items-center gap-4 text-center'>
                    <span className='inline-flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive'>
                        <CircleAlert className='size-6' aria-hidden='true' />
                    </span>

                    <div className='flex flex-col gap-1.5'>
                        <h1 className='font-heading text-xl font-bold tracking-tight'>
                            The board could not load
                        </h1>

                        <p className='text-sm leading-relaxed text-muted-foreground'>
                            Your issues are safe. We could not reach them just now, so give it another try in a moment.
                        </p>
                    </div>

                    <Button onClick={retry} disabled={retrying}>
                        <RefreshCw className={retrying ? 'animate-spin' : undefined} aria-hidden='true' />
                        {retrying ? 'Trying again' : 'Try again'}
                    </Button>
                </div>
            </section>
        </Layout>
    )
}
