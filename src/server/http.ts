import type { NextApiRequest, NextApiResponse } from 'next'

import { ValidationError } from '@/server/validate'

export class HttpError extends Error {
    status: number

    constructor(message: string, status = 400) {
        super(message)
        this.status = status
    }
}

export const rejectMethod = (res: NextApiResponse, allowed: string[]) => {
    res.setHeader('Allow', allowed.join(', '))
    return res.status(405).json({ error: 'This action is not supported.' })
}

export const notFound = (res: NextApiResponse, message: string) => {
    return res.status(404).json({ error: message })
}

export const isCrossSite = (req: NextApiRequest): boolean => {
    const safe = req.method === 'GET' || req.method === 'HEAD'
    return !safe && req.headers['sec-fetch-site'] === 'cross-site'
}

export const sendError = (res: NextApiResponse, error: unknown, context: string) => {
    if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message })
    }

    if (error instanceof HttpError) {
        return res.status(error.status).json({ error: error.message })
    }

    const message = error instanceof Error ? error.message : String(error)

    if (/FOREIGN KEY/i.test(message)) {
        return res.status(400).json({ error: 'That teammate is no longer on the team. Pick someone else.' })
    }

    if (/UNIQUE/i.test(message) && /projects\.key/i.test(message)) {
        return res.status(400).json({ error: 'Another project already uses that key. Pick a different one.' })
    }

    if (/UNIQUE/i.test(message) && /email/i.test(message)) {
        return res.status(400).json({ error: 'Another teammate already uses that email address.' })
    }

    console.error(`[${context}] ${message}`)

    return res.status(500).json({ error: 'Something went wrong while saving. Please try again.' })
}
