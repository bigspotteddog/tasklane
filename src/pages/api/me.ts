import type { NextApiRequest, NextApiResponse } from 'next'

import { requireViewer } from '@/server/auth'
import { rejectMethod, sendError } from '@/server/http'
import { updateProfile } from '@/server/members'
import { parseProfilePatch } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'PATCH') return rejectMethod(res, ['PATCH'])

    try {
        const viewer = await requireViewer(req, res)

        if (!viewer) return

        const member = await updateProfile(viewer.id, parseProfilePatch(req.body))

        return res.status(200).json({ member })
    }
    catch (error) {
        return sendError(res, error, 'PATCH /api/me')
    }
}

export default handler
