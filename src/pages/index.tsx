import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'
import type { BoardData, Member } from '@/types'

import { Seo } from '@/components/generals/seo'
import { BoardApp } from '@/components/board/board-app'
import { BoardUnavailable } from '@/components/board/board-unavailable'
import { getViewer } from '@/server/auth'
import { getBoard } from '@/server/board'

interface HomeProps {
    board: BoardData | null
    viewer: Member | null
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async (context) => {
    try {
        const viewer = await getViewer(context.req, context.res)

        if (!viewer) {
            const next = context.resolvedUrl && context.resolvedUrl !== '/' ? `?next=${encodeURIComponent(context.resolvedUrl)}` : ''
            return { redirect: { destination: `/sign-in${next}`, permanent: false } }
        }

        const board = await getBoard()

        return { props: { board, viewer } }
    }
    catch (error) {
        console.error(`[board] The board could not be loaded: ${error instanceof Error ? error.message : String(error)}`)
        return { props: { board: null, viewer: null } }
    }
}

const Home: FC<HomeProps> = ({ board, viewer }): ReactNode => {
    return (
        <>
            <Seo />

            {board && viewer ? <BoardApp initialBoard={board} viewer={viewer} /> : <BoardUnavailable />}
        </>
    )
}

export default Home
