type EmailRecipients = string | Array<string>

type EmailAttachmentContent = string | Buffer | Uint8Array | ArrayBuffer

export type EmailStatus = 'pending' | 'sent' | 'delayed' | 'delivered' | 'partial' | 'bounced' | 'complained' | 'rejected' | 'failed'

export type EmailRecipientStatus = 'pending' | 'sent' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'rejected' | 'failed' | 'suppressed'

export type EmailRecipientKind = 'to' | 'cc' | 'bcc'

export type EmailEventType = 'sent' | 'delivered' | 'delayed' | 'bounced' | 'complained' | 'rejected' | 'failed' | 'suppressed' | 'opened' | 'clicked'

export type EmailSource = 'site' | 'dashboard' | 'chat' | 'mcp' | 'api'

export type EmailEngagement = 'all' | 'opened' | 'clicked' | 'not-opened'

export interface EmailAttachment {
    filename: string
    content: EmailAttachmentContent
    contentType?: string
    contentId?: string
    disposition?: 'attachment' | 'inline'
}

export interface EmailTag {
    name: string
    value: string
}

export interface SendEmailOptions {
    to: EmailRecipients
    subject: string
    html?: string
    text?: string
    cc?: EmailRecipients
    bcc?: EmailRecipients
    replyTo?: EmailRecipients
    fromName?: string
    attachments?: Array<EmailAttachment>
    headers?: Record<string, string>
    tags?: Array<EmailTag>
    idempotencyKey?: string
}

export interface SendEmailResult {
    id: string
    messageId: string | null
    accepted: Array<string>
    suppressed: Array<string>
    remaining: number | null
    reason: string | null
    duplicate: boolean
}

export interface EmailUsagePause {
    reason: 'plan-limit' | 'no-credits'
    since: string | null
    refused: number
}

export interface EmailUsage {
    period: string
    sent: number
    included: number
    overageBlocks: number
    purchased: number
    carriedOver: number
    allowed: number
    remaining: number
    blockSize: number
    blockCredits: number
    canBuyMore: boolean
    isPaid: boolean
    resetsAt: string
    paused: EmailUsagePause | null
}

export interface EmailLimits {
    maxRecipients: number
    perMinute: number
    maxAttachments: number
    maxAttachmentBytes: number
    maxSubject: number
    maxBody: number
    maxTags: number
    maxHeaders: number
}

export interface EmailTracking {
    available: boolean
    enabled: boolean
}

export interface EmailQuotaResult {
    usage: EmailUsage
    enabled: boolean
    available: boolean
    fromAddress: string
    limits: EmailLimits
    tracking: EmailTracking
}

export interface EmailSummary {
    id: string
    messageId: string | null
    from: string
    to: Array<string>
    cc: Array<string>
    bcc: Array<string>
    replyTo: Array<string>
    subject: string
    status: EmailStatus
    recipientCount: number
    error: string | null
    errorCode: string | null
    test: boolean
    source: EmailSource
    tags: Array<EmailTag>
    attachmentCount: number
    createdAt: string
    sentAt: string | null
    deliveredAt: string | null
    lastEventAt: string | null
    tracked: boolean
    opens: number
    clicks: number
    firstOpenedAt: string | null
    firstClickedAt: string | null
}

export interface EmailRecipient {
    email: string
    kind: EmailRecipientKind
    status: EmailRecipientStatus
    detail: string | null
    updatedAt: string | null
}

export interface EmailEvent {
    type: EmailEventType
    recipient: string | null
    at: string
    detail: string | null
}

export interface EmailAttachmentInfo {
    fileName: string
    contentType: string
    size: number
}

export interface EmailLink {
    url: string
    clicks: number
    firstClickedAt: string | null
    lastClickedAt: string | null
}

export interface EmailDetail extends EmailSummary {
    recipients: Array<EmailRecipient>
    events: Array<EmailEvent>
    attachments: Array<EmailAttachmentInfo>
    headerNames: Array<string>
    html: string | null
    text: string | null
    bodyStored: boolean
    bodyTruncated: boolean
    bounceType: string | null
    bounceSubType: string | null
    idempotencyKey: string | null
    period: string | null
    lastOpenedAt: string | null
    lastClickedAt: string | null
    links: Array<EmailLink>
}

export interface ListEmailsOptions {
    limit?: number
    cursor?: string | null
    status?: EmailStatus
    recipient?: string
    engagement?: EmailEngagement
}

export interface ListEmailsResult {
    items: Array<EmailSummary>
    nextCursor: string | null
}

export interface EmailErrorData {
    code?: string | null
    reason?: string | null
    source?: string | null
    invalid?: Array<string>
    accepted?: Array<string>
    suppressed?: Array<string>
    remaining?: number | null
    [key: string]: unknown
}

const RETRYABLE_STATUSES = [0, 429, 502, 503, 504]
const RETRYABLE_CODES = ['unavailable', 'charge-failed', 'rate-limited', 'idempotency-pending', 'provider-busy', 'provider-paused', 'provider-failed', 'provider-unconfirmed']

export class EmailError extends Error {
    status: number
    code: string | null
    data: EmailErrorData | null
    retryable: boolean
    retryAfter: number | null
    idempotencyKey: string | null

    constructor(message: string, status: number, data: EmailErrorData | null, retryAfter: number | null = null) {
        super(message)
        this.name = 'EmailError'
        this.status = status
        this.code = typeof data?.code === 'string' ? data.code : null
        this.data = data
        this.retryable = RETRYABLE_STATUSES.includes(status) || (this.code !== null && RETRYABLE_CODES.includes(this.code))
        this.retryAfter = retryAfter
        this.idempotencyKey = null
    }
}

const SEND_EMAIL_OPTION_KEYS = ['to', 'cc', 'bcc', 'subject', 'html', 'text', 'replyTo', 'fromName', 'attachments', 'headers', 'tags', 'idempotencyKey']
const ATTACHMENT_OPTION_KEYS = ['filename', 'content', 'contentType', 'contentId', 'disposition']
const TAG_OPTION_KEYS = ['name', 'value']
const LIST_EMAILS_OPTION_KEYS = ['limit', 'cursor', 'status', 'recipient', 'engagement']
const QUOTA_OPTION_KEYS: Array<string> = []
const REQUEST_TIMEOUT_MS = 60000
const TRAILING_SLASHES = /\/+$/
const DATA_URL_PREFIX = /^data:[^,]*;base64,/i
const WHITESPACE = /\s+/g
const HEADER_SAFE_VALUE = /^[\x21-\x7E](?:[\x20-\x7E]*[\x21-\x7E])?$/
const BASE64_CHUNK_BYTES = 32768

const assertServer = (): void => {
    if (typeof window !== 'undefined') throw new Error('@/lib/modulify/email is server-only and must not be used in a client component.')
}

const isObject = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const assertKeys = (label: string, value: unknown, allowed: Array<string>): Record<string, unknown> => {
    if (!isObject(value)) throw new Error(`${label} takes its options as an object.`)

    const unknownKeys = Object.keys(value).filter(key => !allowed.includes(key))

    if (unknownKeys.length > 0) throw new Error(`${label} does not accept the option ${unknownKeys.join(', ')}. Allowed options: ${allowed.join(', ')}.`)

    return value
}

const assertOptions = (label: string, options: unknown, allowed: Array<string>): void => {
    if (options === null || options === undefined) return

    assertKeys(label, options, allowed)
}

const toRecipients = (option: string, value: unknown): Array<string> | undefined => {
    if (value === undefined || value === null) return undefined

    const list: Array<unknown> = Array.isArray(value) ? value : [value]

    if (!list.every(isString)) throw new Error(`sendEmail takes ${option} as one address or an array of addresses.`)

    return list
}

const bytesToBase64 = (bytes: Uint8Array): string => {
    if (typeof Buffer !== 'undefined') return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength).toString('base64')

    let binary = ''

    for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK_BYTES) binary += String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK_BYTES))

    return btoa(binary)
}

const encodeContent = (content: unknown): string => {
    if (isString(content)) return content.replace(DATA_URL_PREFIX, '').replace(WHITESPACE, '')

    if (content instanceof ArrayBuffer) return bytesToBase64(new Uint8Array(content))

    if (content instanceof Uint8Array) return bytesToBase64(content)

    throw new Error('An email attachment takes its content as a base64 string, a Buffer, a Uint8Array or an ArrayBuffer.')
}

const toAttachments = (value: unknown): Array<Record<string, unknown>> | undefined => {
    if (value === undefined || value === null) return undefined

    if (!Array.isArray(value)) throw new Error('sendEmail takes attachments as an array of { filename, content } objects.')

    return value.map((item: unknown) => {
        const attachment = assertKeys('An email attachment', item, ATTACHMENT_OPTION_KEYS)

        if (!isString(attachment.filename) || !attachment.filename.trim()) throw new Error('Every email attachment needs a filename.')

        return {
            filename: attachment.filename,
            content: encodeContent(attachment.content),
            contentType: attachment.contentType,
            contentId: attachment.contentId,
            disposition: attachment.disposition
        }
    })
}

const toHeaders = (value: unknown): Record<string, string> | undefined => {
    if (value === undefined || value === null) return undefined

    if (!isObject(value)) throw new Error('sendEmail takes headers as an object of header names and string values.')

    const invalid = Object.keys(value).filter(name => !isString(value[name]))

    if (invalid.length > 0) throw new Error(`sendEmail takes every header value as a string, which ${invalid.join(', ')} is not.`)

    return value as Record<string, string>
}

const toTags = (value: unknown): Array<EmailTag> | undefined => {
    if (value === undefined || value === null) return undefined

    if (!Array.isArray(value)) throw new Error('sendEmail takes tags as an array of { name, value } objects.')

    return value.map((item: unknown) => {
        const tag = assertKeys('An email tag', item, TAG_OPTION_KEYS)

        if (!isString(tag.name) || !isString(tag.value)) throw new Error('Every email tag needs a string name and a string value.')

        return { name: tag.name, value: tag.value }
    })
}

const toIdempotencyKey = (value: unknown): string | undefined => {
    if (value === undefined || value === null) return undefined

    if (!isString(value)) throw new Error('sendEmail takes idempotencyKey as a string.')

    return value
}

const generateIdempotencyKey = (): string | undefined =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : undefined

const baseUrl = (): string => (process.env.EMAIL_URL || '').trim().replace(TRAILING_SLASHES, '')
const emailKey = (): string => (process.env.EMAIL_PRIVATE_KEY || '').trim()

const timeoutSignal = (): AbortSignal | undefined =>
    typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' ? AbortSignal.timeout(REQUEST_TIMEOUT_MS) : undefined

const unreachable = (error: unknown): EmailError => {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')

    return new EmailError(timedOut ? 'The email service did not answer in time.' : 'The email service could not be reached.', 0, null)
}

const readMessage = (payload: unknown, status: number): string =>
    isObject(payload) && isString(payload.message) && payload.message.trim() ? payload.message : `Email request failed with status ${status}.`

const readData = (payload: unknown): EmailErrorData | null =>
    isObject(payload) && isObject(payload.data) ? payload.data as EmailErrorData : null

const readRetryAfter = (response: Response): number | null => {
    const seconds = Number.parseInt(response.headers.get('retry-after') || '', 10)

    return Number.isFinite(seconds) && seconds >= 0 ? seconds : null
}

const request = async <T>(path: string, body: Record<string, unknown>, headers: Record<string, string> = {}): Promise<T> => {
    if (!baseUrl() || !emailKey()) throw new Error('Email sending is not configured for this environment. EMAIL_URL and EMAIL_PRIVATE_KEY reach the preview when it starts and the published site when it is published again, while sending is on in the Emails tab.')

    const response = await fetch(`${baseUrl()}${path}`, {
        method: 'POST',
        headers: {
            ...headers,
            'Content-Type': 'application/json',
            'X-Email-Key': emailKey()
        },
        body: JSON.stringify(body),
        signal: timeoutSignal()
    }).catch((error: unknown) => {
        throw unreachable(error)
    })

    const payload: unknown = await response.json().catch(() => null)

    if (response.ok && isObject(payload) && payload.success === true) return payload.data as T

    throw new EmailError(readMessage(payload, response.status), response.status, readData(payload), readRetryAfter(response))
}

export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailResult> => {
    assertServer()

    const input = assertKeys('sendEmail', options, SEND_EMAIL_OPTION_KEYS)
    const idempotencyKey = toIdempotencyKey(input.idempotencyKey) ?? generateIdempotencyKey()
    const headers: Record<string, string> = idempotencyKey && HEADER_SAFE_VALUE.test(idempotencyKey) ? { 'Idempotency-Key': idempotencyKey } : {}

    try {
        return await request<SendEmailResult>('/send', {
            to: toRecipients('to', input.to),
            cc: toRecipients('cc', input.cc),
            bcc: toRecipients('bcc', input.bcc),
            subject: input.subject,
            html: input.html,
            text: input.text,
            replyTo: toRecipients('replyTo', input.replyTo),
            fromName: input.fromName,
            attachments: toAttachments(input.attachments),
            headers: toHeaders(input.headers),
            tags: toTags(input.tags),
            idempotencyKey
        }, headers)
    }

    catch (error) {
        if (error instanceof EmailError) error.idempotencyKey = idempotencyKey ?? null

        throw error
    }
}

export const getEmail = async (id: string): Promise<EmailDetail> => {
    assertServer()

    if (!isString(id) || !id.trim()) throw new Error('getEmail takes the id of an email this site sent, as returned by sendEmail or listEmails.')

    return request<EmailDetail>('/email', { id: id.trim() })
}

export const listEmails = async (options: ListEmailsOptions = {}): Promise<ListEmailsResult> => {
    assertServer()
    assertOptions('listEmails', options, LIST_EMAILS_OPTION_KEYS)

    return request<ListEmailsResult>('/emails', { limit: options?.limit, cursor: options?.cursor, status: options?.status, recipient: options?.recipient, engagement: options?.engagement })
}

export const getEmailQuota = async (options: object = {}): Promise<EmailQuotaResult> => {
    assertServer()
    assertOptions('getEmailQuota', options, QUOTA_OPTION_KEYS)

    return request<EmailQuotaResult>('/quota', {})
}