import type { FC, ReactNode } from 'react'
import type { Member, Project, ProjectSummary } from '@/types'

import Link from 'next/link'
import { ArrowLeft, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/generals/logo'
import { AccountMenu } from '@/components/board/account-menu'
import { ProjectSwitcher } from '@/components/projects/project-switcher'
import { Button, buttonVariants } from '@/components/ui/button'

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@/components/ui/tooltip'

import { siteConfig } from '@/constants/site'

interface AppHeaderProps {
    viewer?: Member
    projects?: ProjectSummary[]
    project?: Project | null
    settingsActive?: boolean
    onCreate?: () => void
    onViewerChange?: (member: Member) => void
}

export const AppHeader: FC<AppHeaderProps> = ({
    viewer,
    projects,
    project = null,
    settingsActive = false,
    onCreate,
    onViewerChange
}): ReactNode => {
    return (
        <header id='site-header' className='z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/90 px-3 backdrop-blur sm:gap-3 sm:px-6'>
            <Link href='/projects' className='flex shrink-0 items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'>
                <Logo className='size-7' />

                <span className='hidden font-heading text-lg font-bold tracking-tight text-foreground sm:inline'>
                    {siteConfig.name}
                </span>
            </Link>

            {projects && (
                <>
                    <span className='h-6 w-px shrink-0 bg-border' aria-hidden='true' />
                    <ProjectSwitcher projects={projects} current={project} />
                </>
            )}

            {viewer && (
                <nav aria-label='Project actions' className='ml-auto flex shrink-0 items-center gap-2'>
                    {project && (
                        <Link
                            href={settingsActive ? `/projects/${project.key}` : `/projects/${project.key}/settings`}
                            className={cn(buttonVariants({ variant: 'outline' }), 'bg-background')}
                        >
                            {settingsActive ? <ArrowLeft aria-hidden='true' /> : <Settings aria-hidden='true' />}
                            <span className='hidden sm:inline'>{settingsActive ? 'Back to board' : 'Settings'}</span>
                            <span className='sr-only sm:hidden'>{settingsActive ? 'Back to board' : 'Project settings'}</span>
                        </Link>
                    )}

                    {onCreate && (
                        <Tooltip>
                            <TooltipTrigger render={<Button onClick={onCreate} />}>
                                <Plus aria-hidden='true' />
                                <span className='hidden sm:inline'>Create</span>
                                <span className='sr-only sm:hidden'>Create issue</span>
                            </TooltipTrigger>

                            <TooltipContent>
                                Create issue
                                <kbd className='rounded border border-background/30 px-1 font-mono text-[10px]'>C</kbd>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    <span className='mx-1 hidden h-6 w-px bg-border sm:block' aria-hidden='true' />
                    <AccountMenu viewer={viewer} onViewerChange={onViewerChange} />
                </nav>
            )}
        </header>
    )
}
