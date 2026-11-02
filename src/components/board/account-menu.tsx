import type { FC, ReactNode } from 'react'
import type { Member } from '@/types'

import { useState } from 'react'
import { LogOut, Users } from 'lucide-react'
import { toast } from 'sonner'
import { apiRequest, errorMessage } from '@/lib/api'
import { MemberAvatar } from '@/components/board/member-avatar'

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

interface AccountMenuProps {
    viewer: Member
    onOpenTeam?: () => void
}

export const AccountMenu: FC<AccountMenuProps> = ({ viewer, onOpenTeam }): ReactNode => {
    const [signingOut, setSigningOut] = useState(false)

    const signOut = async () => {
        if (signingOut) return

        setSigningOut(true)

        try {
            await apiRequest('/api/auth/sign-out', { method: 'POST', body: {} })
            window.location.assign('/sign-in')
        }
        catch (error) {
            toast.error(errorMessage(error))
            setSigningOut(false)
        }
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={(
                    <button
                        type='button'
                        aria-label='Your account'
                        className='rounded-full ring-2 ring-transparent transition focus-visible:ring-ring focus-visible:outline-none data-popup-open:ring-primary/40'
                    />
                )}
            >
                <MemberAvatar member={viewer} size='md' />
            </DropdownMenuTrigger>

            <DropdownMenuContent align='end' className='w-64'>
                <DropdownMenuGroup>
                    <DropdownMenuLabel className='flex items-center gap-2.5 px-2 py-2'>
                        <MemberAvatar member={viewer} size='md' />

                        <span className='min-w-0'>
                            <span className='block truncate text-sm font-semibold text-foreground' data-mdlfy-cms={`members:${viewer.id}:name`}>
                                {viewer.name}
                            </span>

                            {viewer.email && (
                                <span className='block truncate text-xs font-normal text-muted-foreground' data-mdlfy-cms={`members:${viewer.id}:email`}>
                                    {viewer.email}
                                </span>
                            )}
                        </span>
                    </DropdownMenuLabel>
                </DropdownMenuGroup>

                <DropdownMenuSeparator />

                {onOpenTeam && (
                    <DropdownMenuItem onClick={onOpenTeam}>
                        <Users aria-hidden='true' />
                        Team and access
                    </DropdownMenuItem>
                )}

                <DropdownMenuItem onClick={signOut} disabled={signingOut}>
                    <LogOut aria-hidden='true' />
                    {signingOut ? 'Signing out' : 'Sign out'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
