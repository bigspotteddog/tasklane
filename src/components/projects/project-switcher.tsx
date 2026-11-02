import type { FC, ReactNode } from 'react'
import type { Project, ProjectSummary } from '@/types'

import { useState } from 'react'
import Link from 'next/link'
import { Check, ChevronsUpDown, LayoutGrid, Plus } from 'lucide-react'
import { ProjectBadge } from '@/components/projects/project-badge'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import { roleLabel } from '@/constants/board'

interface ProjectSwitcherProps {
    projects: ProjectSummary[]
    current: Project | null
}

export const ProjectSwitcher: FC<ProjectSwitcherProps> = ({ projects, current }): ReactNode => {
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={(
                        <button
                            type='button'
                            aria-label={current ? `Switch project, current project ${current.name}` : 'Choose a project'}
                            className='flex min-w-0 max-w-[14rem] items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none data-popup-open:bg-muted sm:max-w-xs'
                        />
                    )}
                >
                    {current ? (
                        <>
                            <ProjectBadge projectKey={current.key} size='sm' />
                            <span className='truncate text-sm font-semibold text-foreground' data-mdlfy-cms={`projects:${current.id}:name`}>
                                {current.name}
                            </span>
                        </>
                    ) : (
                        <span className='text-sm font-semibold text-foreground'>Projects</span>
                    )}

                    <ChevronsUpDown className='size-4 shrink-0 text-muted-foreground' aria-hidden='true' />
                </DropdownMenuTrigger>

                <DropdownMenuContent align='start' className='w-72'>
                    <DropdownMenuGroup>
                        <DropdownMenuLabel>
                            Your projects
                        </DropdownMenuLabel>

                        {projects.length === 0 && (
                            <p className='px-2 py-2 text-xs text-muted-foreground'>
                                You are not on any projects yet.
                            </p>
                        )}

                        {projects.map((project) => (
                            <DropdownMenuItem
                                key={project.id}
                                render={<Link href={`/projects/${project.key}`} />}
                                className='gap-2.5 py-1.5'
                            >
                                <ProjectBadge projectKey={project.key} size='md' />

                                <span className='min-w-0 flex-1'>
                                    <span className='block truncate text-sm font-medium' data-mdlfy-cms={`projects:${project.id}:name`}>
                                        {project.name}
                                    </span>

                                    <span className='block text-[11px] text-muted-foreground'>
                                        <span className='font-mono'>{project.key}</span> · {roleLabel(project.role)}
                                    </span>
                                </span>

                                {current?.id === project.id && <Check className='size-4 text-primary' aria-label='Current project' />}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuGroup>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem render={<Link href='/projects' />}>
                        <LayoutGrid aria-hidden='true' />
                        All projects
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                        <Plus aria-hidden='true' />
                        Create project
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
        </>
    )
}
