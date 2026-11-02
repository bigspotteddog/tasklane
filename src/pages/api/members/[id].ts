import type { NextApiRequest, NextApiResponse } from 'next'

// Retired: memberships are managed through /api/projects/[projectId]/members/[memberId].
const handler = (_req: NextApiRequest, res: NextApiResponse) => {
    return res.status(410).json({ error: 'This address is no longer used. Reload the page to continue.' })
}

export default handler
