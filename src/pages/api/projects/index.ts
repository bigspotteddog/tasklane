import type { NextApiRequest, NextApiResponse } from 'next'

import { requireViewer } from '@/server/auth'
import { rejectMethod, sendError } from '@/server/http'
import { createProject, listProjectsFor } from '@/server/projects'
import { parseProjectDraft } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET' && req.method !== 'POST') return rejectMethod(res, ['GET', 'POST'])

    try {
        const viewer = await requireViewer(req, res)

        if (!viewer) return

        if (req.method === 'GET') {
            res.setHeader('Cache-Control', 'no-store')
            return res.status(200).json({ projects: await listProjectsFor(viewer.id) })
        }

        const draft = parseProjectDraft(req.body)
        const project = await createProject(viewer.id, draft)

        return res.status(201).json({ project })
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/projects`)
    }
}

export default handler
