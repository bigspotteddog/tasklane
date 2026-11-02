import type { NextApiResponse } from 'next'

import { ValidationError } from '@/server/validate'

export const rejectMethod = (res: NextApiResponse, allowed: string[]) => {
    res.setHeader('Allow', allowed.join(', '))
    return res.status(405).json({ error: 'This action is not supported.' })
}

export const notFound = (res: NextApiResponse, message: string) => {
    return res.status(404).json({ error: message })
}

export const sendError = (res: NextApiResponse, error: unknown, context: string) => {
    if (error instanceof ValidationError) {
        return res.status(400).json({ error: error.message })
    }

    const message = error instanceof Error ? error.message : String(error)

    if (/FOREIGN KEY/i.test(message)) {
        return res.status(400).json({ error: 'That teammate is no longer on the team. Pick someone else.' })
    }

    console.error(`[${context}] ${message}`)

    return res.status(500).json({ error: 'Something went wrong while saving. Please try again.' })
}
