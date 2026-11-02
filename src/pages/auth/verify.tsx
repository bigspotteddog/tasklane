import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'
import type { LinkStatus } from '@/server/auth'

import { Seo } from '@/components/generals/seo'
import { VerifyScreen } from '@/components/auth/verify-screen'
import { inspectLink } from '@/server/auth'

interface VerifyProps {
    status: LinkStatus
    token: string
}

export const getServerSideProps: GetServerSideProps<VerifyProps> = async (context) => {
    context.res.setHeader('Referrer-Policy', 'no-referrer')
    context.res.setHeader('Cache-Control', 'no-store')

    const token = typeof context.query.token === 'string' ? context.query.token : ''

    try {
        return { props: { status: await inspectLink(token), token } }
    }
    catch (error) {
        console.error(`[auth] A sign-in link could not be checked: ${error instanceof Error ? error.message : String(error)}`)
        return { props: { status: { state: 'invalid', member: null }, token: '' } }
    }
}

const Verify: FC<VerifyProps> = ({ status, token }): ReactNode => {
    return (
        <>
            <Seo title='Confirm sign-in' />

            <VerifyScreen status={status} token={token} />
        </>
    )
}

export default Verify
