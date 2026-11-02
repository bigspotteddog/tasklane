import { drizzle } from 'drizzle-orm/sqlite-proxy'

import * as schema from '@/db/schema'

type ResultRow = Record<string, unknown> | unknown[]

type DatabasePayload = {
    success?: boolean
    rows?: ResultRow[]
    result?: { results?: ResultRow[] }[]
    errors?: { message?: string }[]
    message?: string
    error?: string
}

type Method = 'run' | 'all' | 'values' | 'get'

const toValues = (row: ResultRow): unknown[] => {
    return Array.isArray(row) ? row : Object.values(row)
}

const shapeRows = (rows: ResultRow[], method: Method): unknown[] => {
    const values = rows.map(toValues)
    return method === 'get' ? values[0] as unknown[] : values
}

const request = async (body: unknown): Promise<DatabasePayload> => {
    if (typeof window !== 'undefined') {
        throw new Error('The database can only be reached from the server.')
    }

    const url = process.env.DATABASE_URL
    const token = process.env.DATABASE_TOKEN

    if (!url || !token) {
        throw new Error('The database is not configured.')
    }

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(body)
    })

    const text = await response.text()
    let payload: DatabasePayload = {}

    try {
        payload = text ? JSON.parse(text) as DatabasePayload : {}
    }
    catch {
        throw new Error(`The database answered with an unreadable response (status ${response.status}).`)
    }

    if (!response.ok || payload.success === false) {
        const reason = payload.errors?.map((error) => error.message).filter(Boolean).join('; ')
        throw new Error(reason || payload.message || payload.error || `The database request failed with status ${response.status}.`)
    }

    return payload
}

export const db = drizzle(
    async (sql, params, method) => {
        const payload = await request({ sql, params: params ?? [] })
        const rows = payload.result?.[0]?.results ?? payload.rows ?? []

        return { rows: shapeRows(rows, method) }
    },
    async (queries) => {
        const payload = await request({
            batch: queries.map(({ sql, params }) => ({ sql, params: params ?? [] }))
        })

        return queries.map(({ method }, index) => ({
            rows: shapeRows(payload.result?.[index]?.results ?? [], method)
        }))
    },
    { schema }
)
