import type { NextApiRequest, NextApiResponse } from 'next'

import { sendSignInEmail } from '@/server/auth-email'
import { HttpError, isCrossSite, rejectMethod, sendError } from '@/server/http'

import {
    discardLogin,
    isPreview,
    safeNextPath,
    siteOrigin,
    startLogin
} from '@/server/auth'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        if (isCrossSite(req)) throw new HttpError('This request was blocked because it came from another site.', 403)

        const body = typeof req.body === 'object' && req.body !== null ? req.body as Record<string, unknown> : {}
        const nextPath = safeNextPath(body.next)
        const login = await startLogin(body.email, nextPath, req)

        if (login.delivery) {
            const origin = isPreview ? null : siteOrigin(req)
            const link = origin ? `${origin}/auth/verify?token=${encodeURIComponent(login.delivery.token)}` : null

            try {
                await sendSignInEmail({
                    requestId: login.requestId,
                    email: login.email,
                    name: login.delivery.name,
                    code: login.delivery.code,
                    link
                })
            }
            catch (error) {
                await discardLogin(login.requestId)
                throw error
            }
        }

        return res.status(200).json({ requestId: login.requestId, email: login.email, codeOnly: isPreview })
    }
    catch (error) {
        return sendError(res, error, 'POST /api/auth/request')
    }
}

export default handler
