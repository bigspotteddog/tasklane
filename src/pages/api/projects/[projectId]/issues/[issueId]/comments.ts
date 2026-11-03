import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { createComment, listComments, parseCommentDraft } from '@/server/comments'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId } from '@/server/validate'

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET' && req.method !== 'POST') return rejectMethod(res, ['GET', 'POST'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const issueId = parseId(req.query.issueId)

        if (req.method === 'GET') {
            const comments = await listComments(access.project.id, issueId)

            if (!comments) return notFound(res, MISSING)

            res.setHeader('Cache-Control', 'no-store')
            return res.status(200).json({ comments })
        }

        const comment = await createComment(access.project.id, issueId, access.viewer.id, parseCommentDraft(req.body))

        return res.status(201).json({ comment })
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/projects/[projectId]/issues/[issueId]/comments`)
    }
}

export default handler