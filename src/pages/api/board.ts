import type { NextApiRequest, NextApiResponse } from 'next'

import { requireViewer } from '@/server/auth'
import { getBoard } from '@/server/board'
import { rejectMethod, sendError } from '@/server/http'

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method !== 'GET') return rejectMethod(res, ['GET'])

    try {
        const viewer = await requireViewer(req, res)

        if (!viewer) return

        const board = await getBoard()

        res.setHeader('Cache-Control', 'no-store')
        return res.status(200).json(board)
    }
    catch (error) {
        return sendError(res, error, 'GET /api/board')
    }
}

export default handler
