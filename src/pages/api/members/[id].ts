import type { NextApiRequest, NextApiResponse } from 'next'

import { deleteMember, updateMember } from '@/server/board'
import { notFound, rejectMethod, sendError } from '@/server/http'
import { parseId, parseMemberPatch } from '@/server/validate'

const MISSING = 'This teammate is no longer on the team.'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
        const id = parseId(req.query.id)

        if (req.method === 'PATCH') {
            const patch = parseMemberPatch(req.body)
            const member = await updateMember(id, patch)

            return member ? res.status(200).json({ member }) : notFound(res, MISSING)
        }

        if (req.method === 'DELETE') {
            const deleted = await deleteMember(id)

            return deleted ? res.status(200).json({ id }) : notFound(res, MISSING)
        }

        return rejectMethod(res, ['PATCH', 'DELETE'])
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/members/[id]`)
    }
}

export default handler
