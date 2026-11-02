import type { ChangeEvent, FC, FormEvent, ReactNode } from 'react'
import type { SignInState } from '@/types'

import { useEffect, useId, useRef, useState } from 'react'
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react'
import { apiRequest, errorMessage } from '@/lib/api'
import { AuthShell } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface SignInScreenProps {
    state: SignInState
    next: string
}

type RequestResponse = {
    requestId: string
    email: string
    codeOnly: boolean
}

type Pending = RequestResponse

const RESEND_SECONDS = 60

export const SignInScreen: FC<SignInScreenProps> = ({ state, next }): ReactNode => {
    const [email, setEmail] = useState('')
    const [pending, setPending] = useState<Pending | null>(null)
    const [code, setCode] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [sending, setSending] = useState(false)
    const [verifying, setVerifying] = useState(false)
    const [cooldown, setCooldown] = useState(0)
    const codeRef = useRef<HTMLInputElement>(null)

    const emailId = useId()
    const codeId = useId()
    const errorId = useId()

    useEffect(() => {
        if (cooldown <= 0) return

        const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000)
        return () => window.clearTimeout(timer)
    }, [cooldown])

    const requestEmail = async (address: string) => {
        setSending(true)
        setError(null)

        try {
            const response = await apiRequest<RequestResponse>('/api/auth/request', {
                method: 'POST',
                body: { email: address, next }
            })

            setPending(response)
            setCode('')
            setCooldown(RESEND_SECONDS)
            window.setTimeout(() => codeRef.current?.focus(), 50)
        }
        catch (problem) {
            setError(errorMessage(problem))
        }
        finally {
            setSending(false)
        }
    }

    const submitEmail = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const address = email.trim()

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
            setError('Enter the email address you use with your team.')
            return
        }

        void requestEmail(address)
    }

    const verifyCode = async (value: string) => {
        if (!pending || verifying) return

        setVerifying(true)
        setError(null)

        try {
            const response = await apiRequest<{ next: string }>('/api/auth/code', {
                method: 'POST',
                body: { requestId: pending.requestId, code: value }
            })

            window.location.assign(response.next || '/')
        }
        catch (problem) {
            setError(errorMessage(problem))
            setVerifying(false)
            codeRef.current?.select()
        }
    }

    const handleCodeChange = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value.replace(/\D/g, '').slice(0, 6)

        setCode(value)
        setError(null)

        if (value.length === 6) void verifyCode(value)
    }

    const startOver = () => {
        setPending(null)
        setCode('')
        setError(null)
    }

    if (pending) {
        return (
            <AuthShell id='sign-in'>
                <div className='flex flex-col gap-5'>
                    <span className='inline-flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground'>
                        <MailCheck className='size-6' aria-hidden='true' />
                    </span>

                    <div className='flex flex-col gap-1.5'>
                        <h1 className='font-heading text-xl font-bold tracking-tight'>
                            Check your email
                        </h1>

                        <p className='text-sm leading-relaxed text-muted-foreground'>
                            If <span className='font-medium break-all text-foreground'>{pending.email}</span> is on the team, we just sent {pending.codeOnly ? 'a 6-digit sign-in code' : 'a sign-in link'} to it. It expires in 15 minutes.
                        </p>
                    </div>

                    <form
                        onSubmit={(event) => {
                            event.preventDefault()
                            if (code.length === 6) void verifyCode(code)
                        }}
                        className='flex flex-col gap-3'
                    >
                        <Label htmlFor={codeId} className='text-xs font-semibold text-foreground/75'>
                            {pending.codeOnly ? 'Enter the code from the email' : 'Or enter the code from the email'}
                        </Label>

                        <Input
                            ref={codeRef}
                            id={codeId}
                            value={code}
                            onChange={handleCodeChange}
                            inputMode='numeric'
                            autoComplete='one-time-code'
                            placeholder='000000'
                            maxLength={6}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? errorId : undefined}
                            readOnly={verifying}
                            className='h-12 bg-background text-center font-mono text-2xl tracking-[0.5em] md:text-2xl'
                        />

                        {error && (
                            <p id={errorId} role='alert' className='text-sm font-medium text-destructive'>
                                {error}
                            </p>
                        )}

                        <Button type='submit' size='lg' disabled={code.length !== 6 || verifying}>
                            <KeyRound aria-hidden='true' />
                            {verifying ? 'Signing in' : 'Sign in with code'}
                        </Button>
                    </form>

                    <div className='flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-sm'>
                        <Button type='button' variant='ghost' size='sm' onClick={startOver} className='-ml-2 text-muted-foreground'>
                            <ArrowLeft aria-hidden='true' />
                            Use a different email
                        </Button>

                        <Button
                            type='button'
                            variant='link'
                            size='sm'
                            disabled={cooldown > 0 || sending}
                            onClick={() => void requestEmail(pending.email)}
                        >
                            {cooldown > 0 ? `Send again in ${cooldown}s` : sending ? 'Sending' : 'Send it again'}
                        </Button>
                    </div>
                </div>
            </AuthShell>
        )
    }

    return (
        <AuthShell id='sign-in'>
            <form onSubmit={submitEmail} noValidate className='flex flex-col gap-5'>
                <div className='flex flex-col gap-1.5'>
                    <h1 className='font-heading text-xl font-bold tracking-tight'>
                        Sign in to your board
                    </h1>

                    <p className='text-sm leading-relaxed text-muted-foreground'>
                        Enter your work email and we will send you a link that signs you in.
                    </p>
                </div>

                {state === 'setup' && (
                    <p className='rounded-lg bg-accent px-3 py-2.5 text-xs leading-relaxed text-accent-foreground'>
                        You are the first one here. The email you enter becomes the first teammate on this board, and you can add the rest of the team from Team.
                    </p>
                )}

                {state === 'closed' && (
                    <p className='rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200 ring-inset'>
                        This board is not open for sign-in yet. Ask the person who runs it to finish setting it up.
                    </p>
                )}

                <div className='flex flex-col gap-1.5'>
                    <Label htmlFor={emailId} className='text-xs font-semibold text-foreground/75'>
                        Email address
                    </Label>

                    <Input
                        id={emailId}
                        type='email'
                        autoComplete='email'
                        autoFocus
                        value={email}
                        onChange={(event) => {
                            setEmail(event.target.value)
                            setError(null)
                        }}
                        placeholder='you@company.com'
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? errorId : undefined}
                        className='h-10 bg-background'
                    />

                    {error && (
                        <p id={errorId} role='alert' className='text-sm font-medium text-destructive'>
                            {error}
                        </p>
                    )}
                </div>

                <Button type='submit' size='lg' disabled={sending} className='h-10'>
                    {sending ? 'Sending' : 'Email me a sign-in link'}
                </Button>

                <p className='text-xs leading-relaxed text-muted-foreground'>
                    Only people on the team can sign in. Not on it yet? Ask a teammate to add your email under Team.
                </p>
            </form>
        </AuthShell>
    )
}
