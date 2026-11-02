import type { FC, ReactNode } from 'react'

import {
    Html,
    Head,
    Main,
    NextScript
} from 'next/document'

const Document: FC = (): ReactNode => {
    return (
        <Html lang='en'>
            <Head>
                <link rel='icon' href='data:,' />
            </Head>

            <body className='min-h-full flex flex-col'>
                <Main />
                <NextScript />
            </body>
        </Html>
    )
}

export default Document