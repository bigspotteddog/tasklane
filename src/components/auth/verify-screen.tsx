import type { FC, ReactNode } from 'react'
import type { LinkStatus } from '@/server/auth'

import { useState } from 'react'
import Link from 'next/link'
import { CircleAlert, ShieldCheck } from 'lucide-react'
import { apiRequest, errorMessage } from '@/lib/api'
import { AuthShell } from '@/components/auth/auth-shell'
import { MemberAvatar } from '@/components/board/member-avatar'
import { Button, buttonVariants } from '@/components/ui/button'

interface VerifyScreenProps {
    status: LinkStatus
    token: string
}

const PROBLEMS = {
    used: {
        title: 'This link was already used',
        body: 'Each sign-in link works once. Ask for a fresh one and you will be in within a minute.'
    },
    expired: {
        title: 'This link has expired',
        body: 'Sign-in links work for 15 minutes. Ask for a fresh one to keep going.'
    },
    invalid: {
        title: 'This link does not work',
        body: 'It may have been copied only partly. Ask for a fresh sign-in link instead.'
    }
}

export const VerifyScreen: FC<VerifyScreenProps> = ({ status, token }): ReactNode => {
    const [signingIn, setSigningIn] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const continueSignIn = async () => {
        setSigningIn(true)
        setError(null)

        try {
            const response = await apiRequest<{ next: string }>('/api/auth/verify', {
                method: 'POST',
                body: { token }
            })

            window.location.replace(response.next || '/')
        }
        catch (problem) {
            setError(errorMessage(problem))
            setSigningIn(false)
        }
    }

    if (status.state !== 'valid') {
        const problem = PROBLEMS[status.state]

        return (
            <AuthShell id='verify-link'>
                <div className='flex flex-col gap-5'>
                    <span className='inline-flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive'>
                        <CircleAlert className='size-6' aria-hidden='true' />
                    </span>

                    <div className='flex flex-col gap-1.5'>
                        <h1 className='font-heading text-xl font-bold tracking-tight'>
                            {problem.title}
                        </h1>

                        <p className='text-sm leading-relaxed text-muted-foreground'>
                            {problem.body}
                        </p>
                    </div>

                    <Link href='/sign-in' className={buttonVariants({ size: 'lg', className: 'h-10' })}>
                        Get a new sign-in link
                    </Link>
                </div>
            </AuthShell>
        )
    }

    const { member } = status

    return (
        <AuthShell id='verify-link'>
            <div className='flex flex-col gap-5'>
                <span className='inline-flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground'>
                    <ShieldCheck className='size-6' aria-hidden='true' />
                </span>

                <div className='flex flex-col gap-1.5'>
                    <h1 className='font-heading text-xl font-bold tracking-tight'>
                        You are almost in
                    </h1>

                    <p className='text-sm leading-relaxed text-muted-foreground'>
                        Confirm to finish signing in on this device.
                    </p>
                </div>

                {member && (
                    <div className='flex items-center gap-3 rounded-xl border bg-muted/40 px-3 py-3'>
                        <MemberAvatar member={member} size='md' />

                        <div className='min-w-0'>
                            <p className='truncate text-sm font-semibold text-foreground' data-mdlfy-cms={`members:${member.id}:name`}>
                                {member.name}
                            </p>

                            {member.email && (
                                <p className='truncate text-xs text-muted-foreground' data-mdlfy-cms={`members:${member.id}:email`}>
                                    {member.email}
                                </p>
                            )}
                        </div>
                    </div>
                )}

                {error && (
                    <p role='alert' className='text-sm font-medium text-destructive'>
                        {error}
                    </p>
                )}

                <Button type='button' size='lg' onClick={continueSignIn} disabled={signingIn} className='h-10'>
                    {signingIn ? 'Signing in' : 'Continue to the board'}
                </Button>

                {error && (
                    <Link href='/sign-in' className='text-center text-sm font-medium text-primary underline-offset-4 hover:underline'>
                        Get a new sign-in link
                    </Link>
                )}
            </div>
        </AuthShell>
    )
}
