import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'
import type { Member, ProjectSummary } from '@/types'

import { Seo } from '@/components/generals/seo'
import { BoardUnavailable } from '@/components/board/board-unavailable'
import { ProjectsHome } from '@/components/projects/projects-home'
import { getViewer } from '@/server/auth'
import { listProjectsFor } from '@/server/projects'

interface ProjectsPageProps {
    viewer: Member | null
    projects: ProjectSummary[]
}

export const getServerSideProps: GetServerSideProps<ProjectsPageProps> = async (context) => {
    try {
        const viewer = await getViewer(context.req, context.res)

        if (!viewer) {
            return { redirect: { destination: '/sign-in?next=%2Fprojects', permanent: false } }
        }

        return { props: { viewer, projects: await listProjectsFor(viewer.id) } }
    }
    catch (error) {
        console.error(`[projects] The project list could not be loaded: ${error instanceof Error ? error.message : String(error)}`)
        return { props: { viewer: null, projects: [] } }
    }
}

const ProjectsPage: FC<ProjectsPageProps> = ({ viewer, projects }): ReactNode => {
    if (!viewer) return <BoardUnavailable />

    return (
        <>
            <Seo title='Projects' />

            <ProjectsHome viewer={viewer} projects={projects} />
        </>
    )
}

export default ProjectsPage
