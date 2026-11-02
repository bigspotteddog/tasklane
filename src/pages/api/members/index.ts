import type { NextApiRequest, NextApiResponse } from 'next'

import { requireViewer } from '@/server/auth'
import { createMember } from '@/server/board'
import { rejectMethod, sendError } from '@/server/http'
import { parseMemberDraft } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        const viewer = await requireViewer(req, res)

        if (!viewer) return

        const draft = parseMemberDraft(req.body)
        const member = await createMember(draft)

        return res.status(201).json({ member })
    }
    catch (error) {
        return sendError(res, error, 'POST /api/members')
    }
}

export default handler
