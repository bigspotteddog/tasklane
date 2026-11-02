import type { FC, ReactNode, RefObject } from 'react'
import type {
    BoardFilters,
    IssuePriority,
    IssueType,
    Member
} from '@/types'

import { ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasActiveFilters, EMPTY_FILTERS } from '@/lib/issues'
import { IssueTypeIcon } from '@/components/board/issue-type-icon'
import { MemberAvatar } from '@/components/board/member-avatar'
import { PriorityIcon } from '@/components/board/priority-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'

import {
    Tooltip,
    TooltipContent,
    TooltipTrigger
} from '@/components/ui/tooltip'

import { ISSUE_TYPES, PRIORITIES, UNASSIGNED } from '@/constants/board'

export type BoardStats = {
    total: number
    done: number
    points: number
    donePoints: number
}

interface BoardToolbarProps {
    filters: BoardFilters
    members: Member[]
    stats: BoardStats
    searchRef: RefObject<HTMLInputElement | null>
    onFiltersChange: (filters: BoardFilters) => void
}

interface FilterMenuProps<T extends string> {
    label: string
    heading: string
    options: { id: T, label: string }[]
    selected: T[]
    renderIcon: (id: T) => ReactNode
    onChange: (selected: T[]) => void
}

const toggle = <T,>(list: T[], value: T): T[] => {
    return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

const FilterMenu = <T extends string>({
    label,
    heading,
    options,
    selected,
    renderIcon,
    onChange
}: FilterMenuProps<T>): ReactNode => {
    const count = selected.length

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={(
                    <Button
                        variant='outline'
                        className={cn('bg-background', count > 0 && 'border-primary/40 bg-accent text-accent-foreground')}
                    />
                )}
            >
                {label}

                {count > 0 && (
                    <span className='inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground'>
                        {count}
                        <span className='sr-only'> selected</span>
                    </span>
                )}

                <ChevronDown className='text-muted-foreground' aria-hidden='true' />
            </DropdownMenuTrigger>

            <DropdownMenuContent align='start' className='w-48'>
                <DropdownMenuGroup>
                    <DropdownMenuLabel>
                        {heading}
                    </DropdownMenuLabel>

                    {options.map((option) => (
                        <DropdownMenuCheckboxItem
                            key={option.id}
                            checked={selected.includes(option.id)}
                            onCheckedChange={() => onChange(toggle(selected, option.id))}
                        >
                            {renderIcon(option.id)}
                            {option.label}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}

export const BoardToolbar: FC<BoardToolbarProps> = ({
    filters,
    members,
    stats,
    searchRef,
    onFiltersChange
}): ReactNode => {
    const active = hasActiveFilters(filters)
    const percent = stats.points > 0 ? Math.round((stats.donePoints / stats.points) * 100) : 0

    const toggleAssignee = (id: string) => {
        onFiltersChange({ ...filters, assignees: toggle(filters.assignees, id) })
    }

    return (
        <div id='board-toolbar' className='flex shrink-0 flex-col gap-4 px-4 pt-5 pb-4 sm:px-6'>
            <div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-3'>
                <div className='min-w-0'>
                    <h1 className='font-heading text-2xl font-bold tracking-tight text-foreground sm:text-[1.75rem]'>
                        Board
                    </h1>

                    <p className='mt-0.5 text-sm text-muted-foreground'>
                        Track every issue from backlog to done.
                    </p>
                </div>

                <div className='flex items-center gap-4'>
                    <div className='text-right'>
                        <p className='text-xs font-medium text-muted-foreground'>
                            <span className='tabular-nums'>{stats.done}</span> of <span className='tabular-nums'>{stats.total}</span> issues done
                        </p>

                        <p className='text-sm font-semibold text-foreground'>
                            <span className='tabular-nums'>{stats.donePoints}</span> / <span className='tabular-nums'>{stats.points}</span> story points
                        </p>
                    </div>

                    <div
                        role='progressbar'
                        aria-label='Story points completed'
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        className='h-2 w-24 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset sm:w-32'
                    >
                        <div className='h-full rounded-full bg-emerald-500 transition-[width] duration-500' style={{ width: `${percent}%` }} />
                    </div>
                </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
                <div className='relative w-full sm:w-64'>
                    <Search className='pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground' aria-hidden='true' />

                    <Input
                        ref={searchRef}
                        type='search'
                        value={filters.search}
                        onChange={(event) => onFiltersChange({ ...filters, search: event.target.value })}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                onFiltersChange({ ...filters, search: '' })
                                event.currentTarget.blur()
                            }
                        }}
                        placeholder='Search issues'
                        aria-label='Search issues by title, key, label or assignee'
                        className='h-8 bg-background pr-8 pl-8 [&::-webkit-search-cancel-button]:hidden'
                    />

                    {filters.search ? (
                        <button
                            type='button'
                            onClick={() => onFiltersChange({ ...filters, search: '' })}
                            aria-label='Clear search'
                            className='absolute top-1/2 right-1.5 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground'
                        >
                            <X className='size-3.5' aria-hidden='true' />
                        </button>
                    ) : (
                        <kbd className='pointer-events-none absolute top-1/2 right-2 hidden -translate-y-1/2 rounded border bg-muted px-1.5 font-mono text-[10px] leading-4 text-muted-foreground sm:inline'>
                            /
                        </kbd>
                    )}
                </div>

                <div role='group' aria-label='Filter by assignee' className='flex items-center pl-1.5'>
                    {members.map((member) => {
                        const pressed = filters.assignees.includes(member.id)

                        return (
                            <Tooltip key={member.id}>
                                <TooltipTrigger
                                    render={(
                                        <button
                                            type='button'
                                            aria-pressed={pressed}
                                            onClick={() => toggleAssignee(member.id)}
                                            className={cn(
                                                '-ml-1.5 rounded-full ring-2 ring-background transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:ring-ring focus-visible:outline-none',
                                                pressed && 'z-10 ring-primary'
                                            )}
                                        />
                                    )}
                                >
                                    <MemberAvatar member={member} size='md' />
                                </TooltipTrigger>

                                <TooltipContent>
                                    <span data-mdlfy-cms={`members:${member.id}:name`}>{member.name}</span>
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}

                    <Tooltip>
                        <TooltipTrigger
                            render={(
                                <button
                                    type='button'
                                    aria-pressed={filters.assignees.includes(UNASSIGNED)}
                                    onClick={() => toggleAssignee(UNASSIGNED)}
                                    className={cn(
                                        '-ml-1.5 rounded-full ring-2 ring-background transition-transform hover:z-10 hover:-translate-y-0.5 focus-visible:z-10 focus-visible:ring-ring focus-visible:outline-none',
                                        filters.assignees.includes(UNASSIGNED) && 'z-10 ring-primary'
                                    )}
                                />
                            )}
                        >
                            <MemberAvatar member={null} size='md' />
                        </TooltipTrigger>

                        <TooltipContent>
                            Unassigned
                        </TooltipContent>
                    </Tooltip>
                </div>

                <FilterMenu<IssueType>
                    label='Type'
                    heading='Issue type'
                    options={ISSUE_TYPES}
                    selected={filters.types}
                    renderIcon={(type) => <IssueTypeIcon type={type} />}
                    onChange={(types) => onFiltersChange({ ...filters, types })}
                />

                <FilterMenu<IssuePriority>
                    label='Priority'
                    heading='Priority'
                    options={PRIORITIES}
                    selected={filters.priorities}
                    renderIcon={(priority) => <PriorityIcon priority={priority} />}
                    onChange={(priorities) => onFiltersChange({ ...filters, priorities })}
                />

                {active && (
                    <Button variant='ghost' onClick={() => onFiltersChange(EMPTY_FILTERS)} className='text-muted-foreground'>
                        Clear filters
                    </Button>
                )}
            </div>
        </div>
    )
}
