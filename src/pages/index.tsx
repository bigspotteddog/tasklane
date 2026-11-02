import type { FC, ReactNode } from 'react'

import { Seo } from '@/components/generals/seo'
import { Layout } from '@/components/generals/layout'
import { siteConfig } from '@/constants/site'

const Home: FC = (): ReactNode => {
    return (
        <Layout>
            <Seo />

            <div className='min-h-screen flex items-center justify-center bg-zinc-50 px-6'>
                <p className='text-muted-foreground text-sm text-center max-w-[320px] leading-relaxed'>
                    {siteConfig.placeholder}
                </p>
            </div>
        </Layout>
    )
}

export default Home