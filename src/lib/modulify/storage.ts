type StorageVisibility = 'public' | 'private'

type PutBody = string | Buffer | Uint8Array

interface PutOptions {
    contentType?: string
    encoding?: 'utf-8' | 'base64'
    visibility?: StorageVisibility
}

interface FolderOptions {
    visibility?: StorageVisibility
}

interface PutResult {
    key: string
    url: string | null
    size: number
    visibility: StorageVisibility
    staleKept: boolean
}

interface StorageObject {
    key: string
    name: string
    size: number
    url: string | null
    visibility: StorageVisibility
}

interface StorageFolder {
    name: string
    visibility: StorageVisibility
    mixed: boolean
}

interface ListResult {
    folders: Array<string>
    folderDetails: Array<StorageFolder>
    files: Array<StorageObject>
    nextToken: string | null
    rootVisibility: StorageVisibility
}

interface GetResult {
    key: string
    contentType: string
    encoding: 'base64'
    body: string
    size: number
    visibility: StorageVisibility
}

interface DeleteResult {
    deleted: number
    missing: number
}

interface DeleteFailure {
    deleted: number
    missing: number
    failed: number
    failedKeys: Array<string>
}

interface DeleteFolderResult {
    deleted: number
    complete: boolean
}

interface FolderResult {
    name: string
    visibility: StorageVisibility
}

interface MoveResult {
    moved: number
    skipped: number
    failed: number
    missing: number
    tooLarge: number
    publicItems: number
    privateItems: number
    destinationVisibility: StorageVisibility | null
}

interface VisibilityResult {
    changed: number
    skipped: number
    failed: number
    tooLong: number
    complete: boolean
    visibility: StorageVisibility
}

interface SignedUrlOptions {
    download?: boolean
}

interface SignedUrlResult {
    key: string
    url: string
    expiresAt: string
    visibility: StorageVisibility
}

type StorageErrorData = DeleteFailure | VisibilityResult | null

export class StorageError extends Error {
    status: number
    data: StorageErrorData

    constructor(message: string, status: number, data: StorageErrorData) {
        super(message)
        this.name = 'StorageError'
        this.status = status
        this.data = data
    }
}

const PUT_OPTION_KEYS = ['contentType', 'encoding', 'visibility']
const FOLDER_OPTION_KEYS = ['visibility']
const SIGNED_URL_OPTION_KEYS = ['download']

const assertOptions = (name: string, options: object | null | undefined, allowed: Array<string>): void => {
    if (options === null || options === undefined) return

    if (typeof options !== 'object' || Array.isArray(options)) throw new Error(`${name} takes its options as an object.`)

    const unknown = Object.keys(options).filter(key => !allowed.includes(key))

    if (unknown.length > 0) throw new Error(`${name} does not accept the option ${unknown.join(', ')}. Allowed options: ${allowed.join(', ')}.`)
}

const encodeBody = (body: PutBody, encoding: PutOptions['encoding']): { body: string, encoding: PutOptions['encoding'] } => {
    if (typeof body === 'string') return { body, encoding }

    if (!(body instanceof Uint8Array)) throw new Error('putObject takes its body as a string, a Buffer or a Uint8Array.')

    const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body.buffer, body.byteOffset, body.byteLength)

    return { body: bytes.toString('base64'), encoding: 'base64' }
}

const base = (): string => process.env.CDN_URL || ''
const storageKey = (): string => process.env.CDN_PRIVATE_KEY || ''

const request = async <T>(path: string, body: Record<string, unknown>): Promise<T> => {
    if (typeof window !== 'undefined') throw new Error('@/lib/modulify/storage is server-only and must not be used in a client component.')

    if (!base() || !storageKey()) throw new Error('Storage is not configured for this environment.')

    const response = await fetch(`${base()}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Storage-Key': storageKey()
        },
        body: JSON.stringify(body)
    })

    const payload = await response.json().catch(() => null)

    if (!response.ok || !payload || payload.success !== true) throw new StorageError(payload?.message || `Storage request failed with status ${response.status}.`, response.status, payload?.data ?? null)

    return payload.data as T
}

export const putObject = async (key: string, body: PutBody, options: PutOptions = {}): Promise<PutResult> => {
    assertOptions('putObject', options, PUT_OPTION_KEYS)

    const encoded = encodeBody(body, options?.encoding)

    return request<PutResult>('/put', { key, body: encoded.body, contentType: options?.contentType, encoding: encoded.encoding, visibility: options?.visibility })
}

export const getObject = (key: string): Promise<GetResult> =>
    request<GetResult>('/get', { key })

export const getObjectText = async (key: string): Promise<string> => {
    const result = await getObject(key)

    return Buffer.from(result.body, 'base64').toString('utf-8')
}

export const listObjects = (prefix = '', token: string | null = null): Promise<ListResult> =>
    request<ListResult>('/list', { prefix, token })

export const deleteObject = (key: string): Promise<DeleteResult> =>
    request<DeleteResult>('/delete', { key })

export const deleteObjects = (keys: Array<string>): Promise<DeleteResult> =>
    request<DeleteResult>('/delete', { keys })

export const createFolder = async (name: string, path = '', options: FolderOptions = {}): Promise<FolderResult> => {
    assertOptions('createFolder', options, FOLDER_OPTION_KEYS)

    return request<FolderResult>('/create-folder', { name, path, visibility: options?.visibility })
}

export const deleteFolder = (path: string): Promise<DeleteFolderResult> =>
    request<DeleteFolderResult>('/delete-folder', { path })

export const moveObjects = (keys: Array<string>, destination: string): Promise<MoveResult> =>
    request<MoveResult>('/move', { keys, destination })

export const setVisibility = (keys: Array<string>, visibility: StorageVisibility): Promise<VisibilityResult> =>
    request<VisibilityResult>('/set-visibility', { keys, visibility })

export const getSignedUrl = async (key: string, options: SignedUrlOptions = {}): Promise<SignedUrlResult> => {
    assertOptions('getSignedUrl', options, SIGNED_URL_OPTION_KEYS)

    return request<SignedUrlResult>('/signed-url', { key, download: options?.download === true })
}