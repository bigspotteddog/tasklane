import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { rejectMethod, sendError } from '@/server/http'
import { deleteProject, updateProject } from '@/server/projects'
import { parseProjectPatch } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'PATCH' && req.method !== 'DELETE') return rejectMethod(res, ['PATCH', 'DELETE'])

    try {
        if (req.method === 'PATCH') {
            const access = await requireProject(req, res, 'admin')

            if (!access) return

            const patch = parseProjectPatch(req.body)
            const project = await updateProject(access.project.id, patch)

            return res.status(200).json({ project })
        }

        const access = await requireProject(req, res, 'owner')

        if (!access) return

        await deleteProject(access.project.id)

        return res.status(200).json({ id: access.project.id })
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/projects/[projectId]`)
    }
}

export default handler
