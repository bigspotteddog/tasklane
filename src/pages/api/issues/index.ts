import type { NextApiRequest, NextApiResponse } from 'next'

// Retired: issues are created through /api/projects/[projectId]/issues.
const handler = (_req: NextApiRequest, res: NextApiResponse) => {
    return res.status(410).json({ error: 'This address is no longer used. Reload the page to continue.' })
}

export default handler
