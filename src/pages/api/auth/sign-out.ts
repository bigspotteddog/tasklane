import type { NextApiRequest, NextApiResponse } from 'next'

import { destroySession } from '@/server/auth'
import { HttpError, isCrossSite, rejectMethod, sendError } from '@/server/http'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        if (isCrossSite(req)) throw new HttpError('This request was blocked because it came from another site.', 403)

        await destroySession(req, res)

        return res.status(200).json({ signedOut: true })
    }
    catch (error) {
        return sendError(res, error, 'POST /api/auth/sign-out')
    }
}

export default handler
