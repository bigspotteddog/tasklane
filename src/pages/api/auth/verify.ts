import type { NextApiRequest, NextApiResponse } from 'next'

import { consumeLink } from '@/server/auth'
import { HttpError, isCrossSite, rejectMethod, sendError } from '@/server/http'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        if (isCrossSite(req)) throw new HttpError('This request was blocked because it came from another site.', 403)

        const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
        const { nextPath } = await consumeLink(body.token, res)

        return res.status(200).json({ next: nextPath })
    }
    catch (error) {
        return sendError(res, error, 'POST /api/auth/verify')
    }
}

export default handler
