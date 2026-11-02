import type { NextApiRequest, NextApiResponse } from 'next'
import type { Member, ProjectRole } from '@/types'
import type { ProjectAccess } from '@/server/projects'

import { requireViewer } from '@/server/auth'
import { getAccess } from '@/server/projects'
import { parseId } from '@/server/validate'

import { ROLE_RANK } from '@/constants/board'

export type ProjectRequest = ProjectAccess & {
    viewer: Member
}

const DENIED: Record<ProjectRole, string> = {
    member: 'You need to be on this project to do that.',
    admin: 'Only project admins and the owner can do that.',
    owner: 'Only the project owner can do that.'
}

export const requireProject = async (
    req: NextApiRequest,
    res: NextApiResponse,
    minimum: ProjectRole = 'member'
): Promise<ProjectRequest | null> => {
    const viewer = await requireViewer(req, res)

    if (!viewer) return null

    const access = await getAccess(parseId(req.query.projectId), viewer.id)

    if (!access) {
        res.status(404).json({ error: 'This project does not exist, or you are no longer on it.' })
        return null
    }

    if (ROLE_RANK[access.role] < ROLE_RANK[minimum]) {
        res.status(403).json({ error: DENIED[minimum] })
        return null
    }

    return { viewer, ...access }
}
