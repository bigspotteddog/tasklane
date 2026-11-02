export class ApiError extends Error {
    status: number

    constructor(message: string, status: number) {
        super(message)
        this.status = status
    }
}

type RequestOptions = {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
    body?: unknown
}

export const apiRequest = async <T>(url: string, options: RequestOptions = {}): Promise<T> => {
    const hasBody = options.body !== undefined
    let response: Response

    try {
        response = await fetch(url, {
            method: options.method ?? 'GET',
            headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
            body: hasBody ? JSON.stringify(options.body) : undefined
        })
    }
    catch {
        throw new ApiError('You appear to be offline. Check your connection and try again.', 0)
    }

    const data: unknown = await response.json().catch(() => null)

    if (!response.ok) {
        const message = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
            ? data.error
            : 'Something went wrong. Please try again.'

        if (response.status === 401 && !url.startsWith('/api/auth/') && typeof window !== 'undefined') {
            const next = `${window.location.pathname}${window.location.search}`
            window.location.assign(`/sign-in${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`)
        }

        throw new ApiError(message, response.status)
    }

    return data as T
}

export const errorMessage = (error: unknown): string => {
    return error instanceof Error && error.message ? error.message : 'Something went wrong. Please try again.'
}
