import '@/styles/globals.css'

import type { FC, ReactNode } from 'react'
import type { AppProps } from 'next/app'

import Head from 'next/head'
import { Bricolage_Grotesque, JetBrains_Mono, Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'

const sans = Plus_Jakarta_Sans({
    subsets: ['latin']
})

const heading = Bricolage_Grotesque({
    subsets: ['latin']
})

const mono = JetBrains_Mono({
    subsets: ['latin']
})

const fontVariables = `:root{--font-app-sans:${sans.style.fontFamily};--font-app-mono:${mono.style.fontFamily};--font-app-heading:${heading.style.fontFamily}}`

const App: FC<AppProps> = ({ Component, pageProps }): ReactNode => {
    return (
        <div className='h-full font-sans'>
            <Head>
                <style dangerouslySetInnerHTML={{ __html: fontVariables }} />
            </Head>

            <TooltipProvider delay={350}>
                <Component {...pageProps} />
            </TooltipProvider>

            <Toaster position='bottom-right' closeButton />
        </div>
    )
}

export default App
