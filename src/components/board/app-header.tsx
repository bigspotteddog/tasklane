import type { FC, ReactNode } from 'react'
import type { Member } from '@/types'

import Link from 'next/link'
import { Plus, Users } from 'lucide-react'
import { Logo } from '@/components/generals/logo'
import { AccountMenu } from '@/components/board/account-menu'
import { Button } from '@/components/ui/button'

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@/components/ui/tooltip'

import { siteConfig } from '@/constants/site'

interface AppHeaderProps {
    viewer?: Member
    onCreate?: () => void
    onOpenTeam?: () => void
}

export const AppHeader: FC<AppHeaderProps> = ({ viewer, onCreate, onOpenTeam }): ReactNode => {
    return (
        <header id='site-header' className='z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur sm:px-6'>
            <Link href='/' className='flex items-center gap-2.5 rounded-lg focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'>
                <Logo className='size-7' />

                <span className='font-heading text-lg font-bold tracking-tight text-foreground'>
                    {siteConfig.name}
                </span>
            </Link>

            {(onCreate || onOpenTeam) && (
                <nav aria-label='Board actions' className='ml-auto flex items-center gap-2'>
                    {onOpenTeam && (
                        <Button variant='outline' onClick={onOpenTeam} className='bg-background'>
                            <Users aria-hidden='true' />
                            Team
                        </Button>
                    )}

                    {onCreate && (
                        <Tooltip>
                            <TooltipTrigger render={<Button onClick={onCreate} />}>
                                <Plus aria-hidden='true' />
                                Create
                            </TooltipTrigger>

                            <TooltipContent>
                                Create issue
                                <kbd className='rounded border border-background/30 px-1 font-mono text-[10px]'>C</kbd>
                            </TooltipContent>
                        </Tooltip>
                    )}

                    {viewer && (
                        <>
                            <span className='mx-1 hidden h-6 w-px bg-border sm:block' aria-hidden='true' />
                            <AccountMenu viewer={viewer} onOpenTeam={onOpenTeam} />
                        </>
                    )}
                </nav>
            )}
        </header>
    )
}
