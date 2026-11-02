import type { NextApiRequest, NextApiResponse } from 'next'

// Retired: issues are moved through /api/projects/[projectId]/issues/[issueId]/move.
const handler = (_req: NextApiRequest, res: NextApiResponse) => {
    return res.status(410).json({ error: 'This address is no longer used. Reload the page to continue.' })
}

export default handler
