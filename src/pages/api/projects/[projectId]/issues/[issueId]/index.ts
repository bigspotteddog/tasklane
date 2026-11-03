import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { deleteIssue, getIssue, updateIssue } from '@/server/board'
import { recordActivity } from '@/server/activity'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseIssuePatch } from '@/server/validate'

const MISSING = 'This issue no longer exists. It may have been deleted by a teammate.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'PATCH' && req.method !== 'DELETE') return rejectMethod(res, ['PATCH', 'DELETE'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const id = parseId(req.query.issueId)

        if (req.method === 'PATCH') {
            const patch = parseIssuePatch(req.body)
            const before = await getIssue(access.project.id, id)
            const issue = await updateIssue(access.project.id, id, patch)

            if (issue && before) {
                const detail = (from: unknown, to: unknown) => ({
                    from: typeof from === 'string' ? from : null,
                    to: typeof to === 'string' ? to : null
                })

                if (patch.assigneeId !== undefined && patch.assigneeId !== before.assigneeId) {
                    await recordActivity(access.project.id, id, access.viewer.id, 'assignee', detail(before.assigneeId, patch.assigneeId))
                }

                if (patch.priority !== undefined && patch.priority !== before.priority) {
                    await recordActivity(access.project.id, id, access.viewer.id, 'priority', detail(before.priority, patch.priority))
                }

                if (patch.dueDate !== undefined && patch.dueDate !== before.dueDate) {
                    await recordActivity(access.project.id, id, access.viewer.id, 'due_date', detail(before.dueDate, patch.dueDate))
                }
            }

            return issue ? res.status(200).json({ issue }) : notFound(res, MISSING)
        }

        const deleted = await deleteIssue(access.project.id, id)

        return deleted ? res.status(200).json({ id }) : notFound(res, MISSING)
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/projects/[projectId]/issues/[issueId]`)
    }
}

export default handler
