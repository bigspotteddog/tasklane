import type { FC, ReactNode } from 'react'
import type { Member, ProjectSummary } from '@/types'

import { useState } from 'react'
import Link from 'next/link'
import { FolderKanban, Plus } from 'lucide-react'
import { Layout } from '@/components/generals/layout'
import { AppHeader } from '@/components/board/app-header'
import { CreateProjectDialog } from '@/components/projects/create-project-dialog'
import { ProjectBadge } from '@/components/projects/project-badge'
import { Button } from '@/components/ui/button'

import { roleLabel } from '@/constants/board'

interface ProjectsHomeProps {
    viewer: Member
    projects: ProjectSummary[]
}

const plural = (count: number, one: string, many: string): string => `${count} ${count === 1 ? one : many}`

export const ProjectsHome: FC<ProjectsHomeProps> = ({ viewer: initialViewer, projects }): ReactNode => {
    const [viewer, setViewer] = useState(initialViewer)
    const [createOpen, setCreateOpen] = useState(false)

    return (
        <Layout header={<AppHeader viewer={viewer} projects={projects} onViewerChange={setViewer} />}>
            <section id='projects' className='mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10'>
                <div className='flex flex-wrap items-end justify-between gap-4'>
                    <div>
                        <h1 className='font-heading text-2xl font-bold tracking-tight sm:text-3xl'>
                            Your projects
                        </h1>

                        <p className='mt-1 text-sm text-muted-foreground'>
                            Every project has its own board, issues and members. You only see the ones you are on.
                        </p>
                    </div>

                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus aria-hidden='true' />
                        New project
                    </Button>
                </div>

                {projects.length === 0 ? (
                    <div className='mt-10 flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card px-6 py-16 text-center'>
                        <span className='inline-flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground'>
                            <FolderKanban className='size-6' aria-hidden='true' />
                        </span>

                        <h2 className='font-heading text-lg font-semibold'>
                            You are not on any projects yet
                        </h2>

                        <p className='max-w-sm text-sm leading-relaxed text-muted-foreground'>
                            Start your own project, or ask a teammate to invite you to theirs.
                        </p>

                        <Button onClick={() => setCreateOpen(true)} className='mt-2'>
                            <Plus aria-hidden='true' />
                            Create your first project
                        </Button>
                    </div>
                ) : (
                    <ul className='mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
                        {projects.map((project) => (
                            <li key={project.id}>
                                <Link
                                    href={`/projects/${project.key}`}
                                    className='group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition-[border-color,box-shadow] hover:border-primary/35 hover:shadow-[0_6px_18px_-8px_rgba(15,23,42,0.2)] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
                                >
                                    <div className='flex items-start gap-3'>
                                        <ProjectBadge projectKey={project.key} size='lg' />

                                        <div className='min-w-0 flex-1'>
                                            <h2 className='truncate font-heading text-base font-semibold text-foreground group-hover:text-primary'>
                                                <span data-mdlfy-cms={`projects:${project.id}:name`}>{project.name}</span>
                                            </h2>

                                            <p className='text-xs text-muted-foreground'>
                                                <span className='font-mono'>{project.key}</span> · {roleLabel(project.role)}
                                            </p>
                                        </div>
                                    </div>

                                    {project.description ? (
                                        <p className='line-clamp-2 text-sm leading-relaxed text-muted-foreground' data-mdlfy-cms={`projects:${project.id}:description`}>
                                            {project.description}
                                        </p>
                                    ) : (
                                        <p className='text-sm text-muted-foreground/70'>No description yet.</p>
                                    )}

                                    <div className='mt-auto flex items-center gap-3 border-t pt-3 text-xs text-muted-foreground'>
                                        <span>{plural(project.openIssues, 'open issue', 'open issues')}</span>
                                        <span aria-hidden='true'>·</span>
                                        <span>{plural(project.memberCount, 'person', 'people')}</span>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <CreateProjectDialog open={createOpen} onOpenChange={setCreateOpen} />
        </Layout>
    )
}
