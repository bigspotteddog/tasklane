import type { NextApiRequest, NextApiResponse } from 'next'

import { requireViewer } from '@/server/auth'
import { deleteMember, updateMember } from '@/server/board'
import { HttpError, notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseMemberPatch } from '@/server/validate'

const MISSING = 'This teammate is no longer on the team.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'PATCH' && req.method !== 'DELETE') return rejectMethod(res, ['PATCH', 'DELETE'])

    try {
        const viewer = await requireViewer(req, res)

        if (!viewer) return

        const id = parseId(req.query.id)

        if (req.method === 'PATCH') {
            const patch = parseMemberPatch(req.body)

            if (id === viewer.id && patch.email === null) {
                throw new HttpError('Keep an email on your own profile, or you will not be able to sign in again.', 400)
            }

            const member = await updateMember(id, patch, viewer.id)

            return member ? res.status(200).json({ member }) : notFound(res, MISSING)
        }

        if (id === viewer.id) throw new HttpError('You cannot remove yourself. Ask a teammate to do it.', 400)

        const deleted = await deleteMember(id)

        return deleted ? res.status(200).json({ id }) : notFound(res, MISSING)
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/members/[id]`)
    }
}

export default handler
