import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'
import type { SignInState } from '@/types'

import { Seo } from '@/components/generals/seo'
import { SignInScreen } from '@/components/auth/sign-in-screen'
import { getSignInState, getViewer, safeNextPath } from '@/server/auth'
import { normalizeEmail } from '@/server/validate'

interface SignInProps {
    state: SignInState
    next: string
    email: string
}

export const getServerSideProps: GetServerSideProps<SignInProps> = async (context) => {
    const next = safeNextPath(context.query.next)
    const email = normalizeEmail(context.query.email) ?? ''

    try {
        const viewer = await getViewer(context.req, context.res)

        if (viewer) return { redirect: { destination: next, permanent: false } }

        return { props: { state: await getSignInState(), next, email } }
    }
    catch (error) {
        console.error(`[auth] The sign-in page could not check the session: ${error instanceof Error ? error.message : String(error)}`)
        return { props: { state: 'ready', next, email } }
    }
}

const SignIn: FC<SignInProps> = ({ state, next, email }): ReactNode => {
    return (
        <>
            <Seo title='Sign in' description='Sign in to your Tasklane projects with a one-time link sent to your email.' />

            <SignInScreen state={state} next={next} initialEmail={email} />
        </>
    )
}

export default SignIn
