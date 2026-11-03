import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { listActivity } from '@/server/activity'
import { parseId } from '@/server/validate'

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') return rejectMethod(res, ['GET'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const activity = await listActivity(access.project.id, parseId(req.query.issueId))

        if (!activity) return notFound(res, MISSING)

        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).json({ activity })
    }
    catch (error) {
        return sendError(res, error, 'GET /api/projects/[projectId]/issues/[issueId]/activity')
    }
}

export default handler