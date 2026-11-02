import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { moveIssue } from '@/server/board'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseMove } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const id = parseId(req.query.issueId)
        const { status, afterId } = parseMove(req.body)
        const issue = await moveIssue(access.project.id, id, status, afterId)

        return issue
            ? res.status(200).json({ issue })
            : notFound(res, 'This issue no longer exists. It may have been deleted by a teammate.')
    }
    catch (error) {
        return sendError(res, error, 'POST /api/projects/[projectId]/issues/[issueId]/move')
    }
}

export default handler
