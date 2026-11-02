import type { NextApiRequest, NextApiResponse } from 'next'

import { requireViewer } from '@/server/auth'
import { deleteIssue, updateIssue } from '@/server/board'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseIssuePatch } from '@/server/validate'

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'PATCH' && req.method !== 'DELETE') return rejectMethod(res, ['PATCH', 'DELETE'])

    try {
        const viewer = await requireViewer(req, res)

        if (!viewer) return

        const id = parseId(req.query.id)

        if (req.method === 'PATCH') {
            const patch = parseIssuePatch(req.body)
            const issue = await updateIssue(id, patch)

            return issue ? res.status(200).json({ issue }) : notFound(res, MISSING)
        }

        const deleted = await deleteIssue(id)

        return deleted ? res.status(200).json({ id }) : notFound(res, MISSING)
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/issues/[id]`)
    }
}

export default handler
