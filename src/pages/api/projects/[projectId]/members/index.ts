import type { NextApiRequest, NextApiResponse } from 'next'

import { requireProject } from '@/server/access'
import { isPreview, siteOrigin } from '@/server/auth'
import { rejectMethod, sendError } from '@/server/http'
import { sendInviteEmail } from '@/server/invite-email'
import { inviteToProject } from '@/server/projects'
import { parseInvite } from '@/server/validate'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'POST') return rejectMethod(res, ['POST'])

    try {
        const access = await requireProject(req, res, 'admin')

        if (!access) return

        const draft = parseInvite(req.body)
        const { member } = await inviteToProject(access.project.id, access.viewer.id, draft)

        const origin = isPreview ? null : siteOrigin(req)

        const delivery = await sendInviteEmail({
            to: draft.email,
            inviterName: access.viewer.name,
            projectId: access.project.id,
            projectName: access.project.name,
            memberId: member.id,
            role: draft.role,
            link: origin ? `${origin}/sign-in?email=${encodeURIComponent(draft.email)}` : null
        })

        return res.status(201).json({ member, emailSent: delivery.sent, emailProblem: delivery.problem })
    }
    catch (error) {
        return sendError(res, error, 'POST /api/projects/[projectId]/members')
    }
}

export default handler
