import type { NextApiRequest, NextApiResponse } from 'next'
import type { BoardData } from '@/types'

import { requireProject } from '@/server/access'
import { getProjectIssues } from '@/server/board'
import { rejectMethod, sendError } from '@/server/http'
import { getProjectMembers } from '@/server/projects'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') return rejectMethod(res, ['GET'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const [issues, members] = await Promise.all([
            getProjectIssues(access.project.id),
            getProjectMembers(access.project.id)
        ])

        const board: BoardData = { project: access.project, role: access.role, issues, members }

        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).json(board)
    }
    catch (error) {
        return sendError(res, error, 'GET /api/projects/[projectId]/board')
    }
}

export default handler
