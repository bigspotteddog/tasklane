import type { FC, ReactNode } from 'react'
import type { GetServerSideProps } from 'next'

import { BoardUnavailable } from '@/components/board/board-unavailable'
import { getViewer } from '@/server/auth'
import { defaultProjectFor, getAccessByKey } from '@/server/projects'
import { parseIssueKey } from '@/lib/issues'

export const getServerSideProps: GetServerSideProps = async (context) => {
    try {
        const viewer = await getViewer(context.req, context.res)

        if (!viewer) {
            const next = context.resolvedUrl && context.resolvedUrl !== '/' ? `?next=${encodeURIComponent(context.resolvedUrl)}` : ''
            return { redirect: { destination: `/sign-in${next}`, permanent: false } }
        }

        const linked = parseIssueKey(context.query.issue)

        if (linked) {
            const access = await getAccessByKey(linked.projectKey, viewer.id)

            if (access) {
                const issue = encodeURIComponent(`${access.project.key}-${linked.number}`)
                return { redirect: { destination: `/projects/${access.project.key}?issue=${issue}`, permanent: false } }
            }
        }

        const project = await defaultProjectFor(viewer.id)

        return { redirect: { destination: project ? `/projects/${project.key}` : '/projects', permanent: false } }
    }
    catch (error) {
        console.error(`[projects] The start page could not pick a project: ${error instanceof Error ? error.message : String(error)}`)
        return { props: {} }
    }
}

const Home: FC = (): ReactNode => {
    return <BoardUnavailable />
}

export default Home
