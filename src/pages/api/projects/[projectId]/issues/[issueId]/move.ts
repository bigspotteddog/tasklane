import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { getIssue, moveIssue } from '@/server/board'
import { recordActivity } from '@/server/activity'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseMove } from '@/server/validate'

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const id = parseId(req.query.issueId)
        const { status, afterId } = parseMove(req.body)
        const before = await getIssue(access.project.id, id)
        const issue = await moveIssue(access.project.id, id, status, afterId)

        if (issue && before && before.status !== issue.status) {
            await recordActivity(access.project.id, id, access.viewer.id, 'status', {
                from: before.status,
                to: issue.status
            })
        }

        return issue
            ? res.status(200).json({ issue })
            : notFound(res, MISSING)
    }
    catch (error) {
        return sendError(res, error, 'POST /api/projects/[projectId]/issues/[issueI]/move')
    }
}

export default handler
