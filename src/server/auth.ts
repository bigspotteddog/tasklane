import type { IncomingMessage, ServerResponse } from 'http'
import type { NextApiRequest, NextApiResponse } from 'next'
import type { Member, SignInState } from '@/types'
import type { LoginRequestRow } from '@/db/schema'

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto'

import {
    and,
    count,
    eq,
    gt,
    isNotNull,
    isNull,
    lt,
    max,
    sql
} from 'drizzle-orm'

import { db } from '@/db/client'
import { toMember } from '@/server/board'
import { HttpError, isCrossSite } from '@/server/http'
import { normalizeEmail, ValidationError } from '@/server/validate'

import {
    authLoginRequests,
    authSessions,
    members,
    timestampNow
} from '@/db/schema'

import { MEMBER_COLORS } from '@/constants/board'

type CookieRequest = IncomingMessage & { cookies?: Partial<Record<string, string>> }

export type LinkStatus = {
    state: 'valid' | 'used' | 'expired' | 'invalid'
    member: Pick<Member, 'id' | 'name' | 'email' | 'color'> | null
}

export type SignInResult = {
    member: Member
    nextPath: string
}

export type LoginStart = {
    requestId: string
    email: string
    delivery: { name: string | null, token: string, code: string } | null
}

export const SESSION_COOKIE = 'tasklane_session'

// The editor preview runs as the development server inside an embedded frame.
export const isPreview = process.env.NODE_ENV !== 'production'

const MINUTE = 60000
const DAY = 86400000
const SESSION_DAYS = 30
const RENEW_BELOW_DAYS = 20
const LINK_MINUTES = 15
const MAX_CODE_ATTEMPTS = 5
const RESEND_SECONDS = 60
const MAX_PER_EMAIL_PER_HOUR = 5
const MAX_PER_CLIENT_PER_HOUR = 12
const INTERNAL_HOST = /^(localhost|127\.|0\.0\.0\.0|\[::1\]|[^.]+$)|\.internal(:\d+)?$/i

const hash = (value: string): string => createHash('sha256').update(value).digest('hex')

const newToken = (): string => randomBytes(32).toString('base64url')

const newCode = (): string => String(randomInt(0, 1000000)).padStart(6, '0')

const nowIso = (): string => new Date().toISOString()

const isoIn = (ms: number): string => new Date(Date.now() + ms).toISOString()

const header = (req: IncomingMessage, name: string): string | undefined => {
    const value = req.headers[name]
    const first = Array.isArray(value) ? value[0] : value

    return first?.split(',')[0]?.trim() || undefined
}

const nameFromEmail = (email: string): string => {
    const words = email.split('@')[0].split(/[._+-]+/).filter(Boolean)
    const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

    return name.slice(0, 60) || 'New teammate'
}

export const safeNextPath = (value: unknown): string => {
    if (typeof value !== 'string' || value.length > 500) return '/'
    if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return '/'
    if (/[\r\n]/.test(value)) return '/'
    if (value.startsWith('/sign-in') || value.startsWith('/auth/') || value.startsWith('/api/')) return '/'

    return value
}

export const siteOrigin = (req: IncomingMessage): string | null => {
    const host = header(req, 'host')
    const forwarded = header(req, 'x-forwarded-host')
    const chosen = host && !INTERNAL_HOST.test(host) ? host : forwarded && !INTERNAL_HOST.test(forwarded) ? forwarded : null

    if (!chosen || !/^[a-z0-9.-]+(:\d+)?$/i.test(chosen)) return null

    return `https://${chosen.toLowerCase()}`
}

const clientKey = (req: IncomingMessage): string => {
    const ip = header(req, 'fly-client-ip')
        ?? header(req, 'x-real-ip')
        ?? header(req, 'x-forwarded-for')
        ?? req.socket?.remoteAddress
        ?? 'unknown'

    return hash(`client:${ip}`)
}

const setSessionCookie = (res: ServerResponse, value: string, maxAgeSeconds: number) => {
    const attributes = [
        'Path=/',
        `Max-Age=${maxAgeSeconds}`,
        'HttpOnly',
        'Secure',
        isPreview ? 'SameSite=None' : 'SameSite=Lax'
    ]

    if (isPreview) attributes.push('Partitioned')

    res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${value}; ${attributes.join('; ')}`)
}

const clearSessionCookie = (res: ServerResponse) => {
    setSessionCookie(res, '', 0)
}

const createSession = async (res: ServerResponse, memberId: string): Promise<void> => {
    const token = newToken()

    await db.insert(authSessions).values({
        memberId,
        tokenHash: hash(token),
        expiresAt: isoIn(SESSION_DAYS * DAY)
    })

    setSessionCookie(res, token, SESSION_DAYS * 86400)
}

export const getViewer = async (req: CookieRequest, res: ServerResponse): Promise<Member | null> => {
    const token = req.cookies?.[SESSION_COOKIE]

    if (!token || token.length > 200) return null

    const session = await db
        .select({ id: authSessions.id, memberId: authSessions.memberId, expiresAt: authSessions.expiresAt })
        .from(authSessions)
        .where(eq(authSessions.tokenHash, hash(token)))
        .get()

    if (!session) {
        clearSessionCookie(res)
        return null
    }

    if (session.expiresAt <= nowIso()) {
        await db.delete(authSessions).where(eq(authSessions.id, session.id))
        clearSessionCookie(res)
        return null
    }

    const row = await db.select().from(members).where(eq(members.id, session.memberId)).get()

    if (!row) {
        clearSessionCookie(res)
        return null
    }

    if (Date.parse(session.expiresAt) - Date.now() < RENEW_BELOW_DAYS * DAY) {
        await db
            .update(authSessions)
            .set({ expiresAt: isoIn(SESSION_DAYS * DAY), updatedAt: timestampNow })
            .where(eq(authSessions.id, session.id))

        setSessionCookie(res, token, SESSION_DAYS * 86400)
    }

    return toMember(row)
}

export const requireViewer = async (req: NextApiRequest, res: NextApiResponse): Promise<Member | null> => {
    if (isCrossSite(req)) {
        res.status(403).json({ error: 'This request was blocked because it came from another site.' })
        return null
    }

    const viewer = await getViewer(req, res)

    if (!viewer) {
        res.status(401).json({ error: 'You are signed out. Sign in again to keep going.' })
        return null
    }

    return viewer
}

export const destroySession = async (req: CookieRequest, res: ServerResponse): Promise<void> => {
    const token = req.cookies?.[SESSION_COOKIE]

    if (token && token.length <= 200) {
        await db.delete(authSessions).where(eq(authSessions.tokenHash, hash(token)))
    }

    clearSessionCookie(res)
}

export const getSignInState = async (): Promise<SignInState> => {
    const row = await db.select({ total: count() }).from(members).where(isNotNull(members.email)).get()

    if (Number(row?.total ?? 0) > 0) return 'ready'

    return isPreview ? 'setup' : 'closed'
}

const cleanup = async (): Promise<void> => {
    await db.delete(authLoginRequests).where(lt(authLoginRequests.expiresAt, new Date(Date.now() - DAY).toISOString()))
    await db.delete(authSessions).where(lt(authSessions.expiresAt, nowIso()))
}

export const startLogin = async (rawEmail: unknown, nextPath: string, req: IncomingMessage): Promise<LoginStart> => {
    const email = normalizeEmail(rawEmail)

    if (!email) throw new ValidationError('Enter a valid email address.')

    await cleanup()

    const member = await db.select().from(members).where(eq(members.email, email)).get()
    const eligible = Boolean(member) || await getSignInState() === 'setup'

    if (!eligible) {
        return { requestId: crypto.randomUUID(), email, delivery: null }
    }

    const hourAgo = new Date(Date.now() - 60 * MINUTE).toISOString()

    const recent = await db
        .select({ total: count(), latest: max(authLoginRequests.createdAt) })
        .from(authLoginRequests)
        .where(and(eq(authLoginRequests.email, email), gt(authLoginRequests.createdAt, hourAgo)))
        .get()

    if (recent?.latest && Date.now() - Date.parse(String(recent.latest)) < RESEND_SECONDS * 1000) {
        throw new HttpError('A sign-in email was just sent. Give it a minute before asking for another.', 429)
    }

    if (Number(recent?.total ?? 0) >= MAX_PER_EMAIL_PER_HOUR) {
        throw new HttpError('Too many sign-in emails went to this address. Try again in an hour.', 429)
    }

    const client = clientKey(req)

    const fromClient = await db
        .select({ total: count() })
        .from(authLoginRequests)
        .where(and(eq(authLoginRequests.clientHash, client), gt(authLoginRequests.createdAt, hourAgo)))
        .get()

    if (Number(fromClient?.total ?? 0) >= MAX_PER_CLIENT_PER_HOUR) {
        throw new HttpError('Too many sign-in attempts from this device. Try again in an hour.', 429)
    }

    const id = crypto.randomUUID()
    const token = newToken()
    const code = newCode()

    await db.insert(authLoginRequests).values({
        id,
        email,
        memberId: member?.id ?? null,
        tokenHash: hash(token),
        codeHash: hash(`${id}:${code}`),
        nextPath,
        clientHash: client,
        expiresAt: isoIn(LINK_MINUTES * MINUTE)
    })

    return { requestId: id, email, delivery: { name: member?.name ?? null, token, code } }
}

export const discardLogin = async (requestId: string): Promise<void> => {
    await db.delete(authLoginRequests).where(eq(authLoginRequests.id, requestId))
}

const resolveMember = async (request: LoginRequestRow): Promise<Member> => {
    if (request.memberId) {
        const row = await db.select().from(members).where(eq(members.id, request.memberId)).get()

        if (!row || row.email !== request.email) {
            throw new HttpError('This sign-in email is no longer valid. Ask for a new one.', 400)
        }

        return toMember(row)
    }

    const existing = await db.select().from(members).where(eq(members.email, request.email)).get()

    if (existing) return toMember(existing)

    if (await getSignInState() !== 'setup') {
        throw new HttpError('Sign-in is limited to people on the team. Ask a teammate to add your email.', 403)
    }

    const [row] = await db.insert(members).values({
        name: nameFromEmail(request.email),
        color: MEMBER_COLORS[0],
        email: request.email
    }).returning()

    return toMember(row)
}

export const inspectLink = async (token: unknown): Promise<LinkStatus> => {
    if (typeof token !== 'string' || !token || token.length > 200) return { state: 'invalid', member: null }

    const request = await db
        .select({ memberId: authLoginRequests.memberId, usedAt: authLoginRequests.usedAt, expiresAt: authLoginRequests.expiresAt })
        .from(authLoginRequests)
        .where(eq(authLoginRequests.tokenHash, hash(token)))
        .get()

    if (!request) return { state: 'invalid', member: null }
    if (request.usedAt) return { state: 'used', member: null }
    if (request.expiresAt <= nowIso()) return { state: 'expired', member: null }

    if (!request.memberId) return { state: 'valid', member: null }

    const row = await db
        .select({ id: members.id, name: members.name, email: members.email, color: members.color })
        .from(members)
        .where(eq(members.id, request.memberId))
        .get()

    return {
        state: 'valid',
        member: row ? { id: row.id, name: row.name, email: row.email ?? null, color: row.color } : null
    }
}

export const consumeLink = async (token: unknown, res: ServerResponse): Promise<SignInResult> => {
    if (typeof token !== 'string' || !token || token.length > 200) {
        throw new HttpError('This sign-in link is not valid. Ask for a new one.', 400)
    }

    const tokenHash = hash(token)

    const [request] = await db
        .update(authLoginRequests)
        .set({ usedAt: timestampNow, updatedAt: timestampNow })
        .where(and(
            eq(authLoginRequests.tokenHash, tokenHash),
            isNull(authLoginRequests.usedAt),
            gt(authLoginRequests.expiresAt, nowIso())
        ))
        .returning()

    if (!request) {
        const status = await inspectLink(token)

        throw new HttpError(status.state === 'used'
            ? 'This sign-in link was already used. Ask for a new one.'
            : 'This sign-in link has expired. Ask for a new one.', 400)
    }

    const member = await resolveMember(request)

    await createSession(res, member.id)

    return { member, nextPath: safeNextPath(request.nextPath) }
}

export const consumeCode = async (requestId: unknown, rawCode: unknown, res: ServerResponse): Promise<SignInResult> => {
    const wrong = 'That code did not work. Check the latest email or send a new one.'
    const code = typeof rawCode === 'string' ? rawCode.replace(/\s/g, '') : ''

    if (typeof requestId !== 'string' || requestId.length > 64 || !/^\d{6}$/.test(code)) {
        throw new HttpError(wrong, 400)
    }

    const [request] = await db
        .update(authLoginRequests)
        .set({ attempts: sql`${authLoginRequests.attempts} + 1`, updatedAt: timestampNow })
        .where(and(
            eq(authLoginRequests.id, requestId),
            isNull(authLoginRequests.usedAt),
            gt(authLoginRequests.expiresAt, nowIso()),
            lt(authLoginRequests.attempts, MAX_CODE_ATTEMPTS)
        ))
        .returning()

    if (!request) {
        const existing = await db
            .select({ attempts: authLoginRequests.attempts })
            .from(authLoginRequests)
            .where(eq(authLoginRequests.id, requestId))
            .get()

        if (existing && Number(existing.attempts) >= MAX_CODE_ATTEMPTS) {
            throw new HttpError('Too many tries with this code. Send yourself a new one.', 429)
        }

        throw new HttpError(wrong, 400)
    }

    const expected = Buffer.from(request.codeHash, 'hex')
    const actual = Buffer.from(hash(`${request.id}:${code}`), 'hex')

    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        const left = MAX_CODE_ATTEMPTS - Number(request.attempts)

        throw new HttpError(left > 0 ? wrong : 'Too many tries with this code. Send yourself a new one.', left > 0 ? 400 : 429)
    }

    const [claimed] = await db
        .update(authLoginRequests)
        .set({ usedAt: timestampNow, updatedAt: timestampNow })
        .where(and(eq(authLoginRequests.id, request.id), isNull(authLoginRequests.usedAt)))
        .returning({ id: authLoginRequests.id })

    if (!claimed) throw new HttpError('This code was already used. Send yourself a new one.', 400)

    const member = await resolveMember(request)

    await createSession(res, member.id)

    return { member, nextPath: safeNextPath(request.nextPath) }
}
