import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { createIssue } from '@/server/board'
import { rejectMethod, sendError } from '@/server/http'
import { parseIssueDraft } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const draft = parseIssueDraft(req.body)
        const issue = await createIssue(access.project.id, draft)

        return res.status(201).json({ issue })
    }
    catch (error) {
        return sendError(res, error, 'POST /api/projects/[projectId]/issues')
    }
}

export default handler
