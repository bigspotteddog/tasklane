import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'
import type { BoardData, Member, ProjectSummary } from '@/types'

import { Seo } from '@/components/generals/seo'
import { BoardApp } from '@/components/board/board-app'
import { BoardUnavailable } from '@/components/board/board-unavailable'
import { getViewer } from '@/server/auth'
import { getProjectIssues } from '@/server/board'

import {
    getAccessByKey,
    getProjectMembers,
    listProjectsFor,
    rememberProject
} from '@/server/projects'

interface ProjectBoardProps {
    board: BoardData | null
    viewer: Member | null
    projects: ProjectSummary[]
}

export const getServerSideProps: GetServerSideProps<ProjectBoardProps> = async (context) => {
    const key = typeof context.params?.key === 'string' ? context.params.key : ''

    try {
        const viewer = await getViewer(context.req, context.res)

        if (!viewer) {
            return { redirect: { destination: `/sign-in?next=${encodeURIComponent(context.resolvedUrl)}`, permanent: false } }
        }

        const access = await getAccessByKey(key, viewer.id)

        if (!access) return { notFound: true }

        if (key !== access.project.key) {
            const query = context.resolvedUrl.includes('?') ? context.resolvedUrl.slice(context.resolvedUrl.indexOf('?')) : ''
            return { redirect: { destination: `/projects/${access.project.key}${query}`, permanent: false } }
        }

        const [issues, members, projects] = await Promise.all([
            getProjectIssues(access.project.id),
            getProjectMembers(access.project.id),
            listProjectsFor(viewer.id),
            rememberProject(viewer.id, access.project.id).catch(() => undefined)
        ])

        return {
            props: {
                board: { project: access.project, role: access.role, issues, members },
                viewer,
                projects
            }
        }
    }
    catch (error) {
        console.error(`[board] The project board could not be loaded: ${error instanceof Error ? error.message : String(error)}`)
        return { props: { board: null, viewer: null, projects: [] } }
    }
}

const ProjectBoard: FC<ProjectBoardProps> = ({ board, viewer, projects }): ReactNode => {
    if (!board || !viewer) return <BoardUnavailable />

    return (
        <>
            <Seo title={board.project.name} description={board.project.description || undefined} />

            <BoardApp key={board.project.id} initialBoard={board} viewer={viewer} projects={projects} />
        </>
    )
}

export default ProjectBoard
