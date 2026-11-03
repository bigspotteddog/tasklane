import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { deleteComment, parseCommentDraft, updateComment } from '@/server/comments'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId } from '@/server/validate'

const MISSING = 'This comment no longer exists. It may have been deleted by its author.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'PATCH' && req.method !== 'DELETE') return rejectMethod(res, ['PATCH', 'DELETE'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const commentId = parseId(req.query.commentId)

        if (req.method === 'PATCH') {
            const comment = await updateComment(access.project.id, commentId, access.viewer.id, parseCommentDraft(req.body))

            return comment ? res.status(200).json({ comment }) : notFound(res, MISSING)
        }

        const deleted = await deleteComment(access.project.id, commentId, access.viewer.id)

        return deleted ? res.status(200).json({ id: commentId }) : notFound(res, MISSING)
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/projects/[projectId]/issues/[issueId]/comments/[commentId]`)
    }
}

export default handler