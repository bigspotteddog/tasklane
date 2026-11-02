import type { NextApiRequest, NextApiResponse } from 'next'

import { deleteIssue, updateIssue } from '@/server/board'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseIssuePatch } from '@/server/validate'

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const id = parseId(req.query.id)

        if (req.method === 'PATCH') {
            const patch = parseIssuePatch(req.body)
            const issue = await updateIssue(id, patch)

            return issue ? res.status(200).json({ issue }) : notFound(res, MISSING)
        }

        if (req.method === 'DELETE') {
            const deleted = await deleteIssue(id)

            return deleted ? res.status(200).json({ id }) : notFound(res, MISSING)
        }

        return rejectMethod(res, ['PATCH', 'DELETE'])
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/issues/[id]`)
    }
}

export default handler
