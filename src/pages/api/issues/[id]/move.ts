import type { NextApiRequest, NextApiResponse } from 'next'

import { moveIssue } from '@/server/board'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseMove } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        const id = parseId(req.query.id)
        const { status, afterId } = parseMove(req.body)
        const issue = await moveIssue(id, status, afterId)

        return issue
            ? res.status(200).json({ issue })
            : notFound(res, 'This issue no longer exists. It may have been deleted by a teammate.')
    }
    catch (error) {
        return sendError(res, error, 'POST /api/issues/[id]/move')
    }
}

export default handler
