import type { NextApiRequest, NextApiResponse } from 'next'

// Retired: the board now loads per project from /api/projects/[projectId]/board.
const handler = (_req: NextApiRequest, res: NextApiResponse) => {
    return res.status(410).json({ error: 'This address is no longer used. Reload the page to continue.' })
}

export default handler
