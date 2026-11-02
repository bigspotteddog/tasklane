import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'
import type {
    Member,
    Project,
    ProjectMember,
    ProjectRole,
    ProjectSummary
} from '@/types'

import { Seo } from '@/components/generals/seo'
import { BoardUnavailable } from '@/components/board/board-unavailable'
import { ProjectSettings } from '@/components/projects/project-settings'
import { getViewer } from '@/server/auth'
import { getAccessByKey, getProjectMembers, listProjectsFor } from '@/server/projects'

interface SettingsPageProps {
    project: Project | null
    role: ProjectRole
    members: ProjectMember[]
    viewer: Member | null
    projects: ProjectSummary[]
}

export const getServerSideProps: GetServerSideProps<SettingsPageProps> = async (context) => {
    const key = typeof context.params?.key === 'string' ? context.params.key : ''

    try {
        const viewer = await getViewer(context.req, context.res)

        if (!viewer) {
            return { redirect: { destination: `/sign-in?next=${encodeURIComponent(context.resolvedUrl)}`, permanent: false } }
        }

        const access = await getAccessByKey(key, viewer.id)

        if (!access) return { notFound: true }

        if (key !== access.project.key) {
            return { redirect: { destination: `/projects/${access.project.key}/settings`, permanent: false } }
        }

        const [members, projects] = await Promise.all([
            getProjectMembers(access.project.id),
            listProjectsFor(viewer.id)
        ])

        return { props: { project: access.project, role: access.role, members, viewer, projects } }
    }
    catch (error) {
        console.error(`[projects] Project settings could not be loaded: ${error instanceof Error ? error.message : String(error)}`)
        return { props: { project: null, role: 'member', members: [], viewer: null, projects: [] } }
    }
}

const SettingsPage: FC<SettingsPageProps> = ({ project, role, members, viewer, projects }): ReactNode => {
    if (!project || !viewer) return <BoardUnavailable />

    return (
        <>
            <Seo title={`${project.name} settings`} />

            <ProjectSettings
                key={project.id}
                initialProject={project}
                initialRole={role}
                initialMembers={members}
                viewer={viewer}
                projects={projects}
            />
        </>
    )
}

export default SettingsPage
