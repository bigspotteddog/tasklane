import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'
import type { BoardData } from '@/types'

import { Seo } from '@/components/generals/seo'
import { BoardApp } from '@/components/board/board-app'
import { BoardUnavailable } from '@/components/board/board-unavailable'
import { getBoard } from '@/server/board'

interface HomeProps {
    board: BoardData | null
}

export const getServerSideProps: GetServerSideProps<HomeProps> = async () => {
    try {
        const board = await getBoard()
        return { props: { board } }
    }
    catch (error) {
        console.error(`[board] The board could not be loaded: ${error instanceof Error ? error.message : String(error)}`)
        return { props: { board: null } }
    }
}

const Home: FC<HomeProps> = ({ board }): ReactNode => {
    return (
        <>
            <Seo />

            {board ? <BoardApp initialBoard={board} /> : <BoardUnavailable />}
        </>
    )
}

export default Home
