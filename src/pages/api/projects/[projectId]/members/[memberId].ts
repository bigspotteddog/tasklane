import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { isPreview, siteOrigin } from '@/server/auth'
import { HttpError, notFound, rejectMethod, sendError } from '@/server/http'
import { sendInviteEmail } from '@/server/invite-email'
import { removeProjectMember, updateProjectMember } from '@/server/projects'
import { parseId, parseMembershipPatch } from '@/server/validate'

import { canManageProject } from '@/constants/board'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'PATCH' && req.method !== 'DELETE') return rejectMethod(res, ['PATCH', 'DELETE'])

    try {
        const access = await requireProject(req, res)

        if (!access) return

        const memberId = parseId(req.query.memberId)
        const leaving = req.method === 'DELETE' && memberId === access.viewer.id

        if (!leaving && !canManageProject(access.role)) {
            throw new HttpError('Only project admins and the owner can manage members.', 403)
        }

        if (req.method === 'PATCH') {
            const patch = parseMembershipPatch(req.body)

            if (memberId === access.viewer.id && patch.role !== undefined && access.role === 'owner') {
                throw new HttpError('The owner always keeps the Owner role.', 400)
            }

            const { member, emailAdded } = await updateProjectMember(access.project.id, memberId, patch)

            if (!emailAdded || !member.email) {
                return res.status(200).json({ member, emailSent: false, emailProblem: null })
            }

            const origin = isPreview ? null : siteOrigin(req)

            const delivery = await sendInviteEmail({
                to: member.email,
                inviterName: access.viewer.name,
                projectId: access.project.id,
                projectName: access.project.name,
                memberId: member.id,
                role: member.role,
                link: origin ? `${origin}/sign-in?email=${encodeURIComponent(member.email)}` : null
            })

            return res.status(200).json({ member, emailSent: delivery.sent, emailProblem: delivery.problem })
        }

        const removed = await removeProjectMember(access.project.id, memberId)

        return removed ? res.status(200).json({ id: memberId }) : notFound(res, 'That person is no longer on this project.')
    }
    catch (error) {
        return sendError(res, error, `${req.method} /api/projects/[projectId]/members/[memberId]`)
    }
}

export default handler
