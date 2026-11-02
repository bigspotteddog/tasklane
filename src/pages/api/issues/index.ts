import type { NextApiRequest, NextApiResponse } from 'next'

import { requireViewer } from '@/server/auth'
import { createIssue } from '@/server/board'
import { rejectMethod, sendError } from '@/server/http'
import { parseIssueDraft } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        const viewer = await requireViewer(req, res)

        if (!viewer) return

        const draft = parseIssueDraft(req.body)
        const issue = await createIssue(draft)

        return res.status(201).json({ issue })
    }
    catch (error) {
        return sendError(res, error, 'POST /api/issues')
    }
}

export default handler
