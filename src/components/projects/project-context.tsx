import type { FC, ReactNode } from 'react'
import type { Project, ProjectRole } from '@/types'

import { createContext, useContext } from 'react'

type ProjectContextValue = {
    project: Project
    role: ProjectRole
}

interface ProjectProviderProps extends ProjectContextValue {
    children: ReactNode
}

const ProjectContext = createContext<ProjectContextValue | null>(null)

export const ProjectProvider: FC<ProjectProviderProps> = ({ project, role, children }): ReactNode => {
    return (
        <ProjectContext.Provider value={{ project, role }}>
            {children}
        </ProjectContext.Provider>
    )
}

export const useProject = (): ProjectContextValue | null => {
    return useContext(ProjectContext)
}

export const useProjectKey = (): string => {
    return useContext(ProjectContext)?.project.key ?? ''
}
