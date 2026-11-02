import type { FC, KeyboardEvent, ReactNode } from 'react'
import type {
    IssuePriority,
    IssueStatus,
    IssueType,
    Member
} from '@/types'

import { useId, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { cleanLabels } from '@/lib/labels'
import { IssueTypeIcon } from '@/components/board/issue-type-icon'
import { MemberAvatar } from '@/components/board/member-avatar'
import { PriorityIcon } from '@/components/board/priority-icon'
import { Label } from '@/components/ui/label'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'

import {
    ISSUE_TYPES,
    LIMITS,
    PRIORITIES,
    STATUSES,
    UNASSIGNED
} from '@/constants/board'

interface FieldProps<T> {
    id?: string
    value: T
    onChange: (value: T) => void
    className?: string
    size?: 'sm' | 'default'
}

interface AssigneeSelectProps {
    id?: string
    value: string | null
    members: Member[]
    onChange: (value: string | null) => void
    className?: string
}

interface LabelsInputProps {
    id?: string
    value: string[]
    suggestions: string[]
    onChange: (labels: string[]) => void
}

interface FormFieldProps {
    label: string
    htmlFor?: string
    error?: string | null
    required?: boolean
    className?: string
    children: ReactNode
}

export const FormField: FC<FormFieldProps> = ({
    label,
    htmlFor,
    error,
    required = false,
    className,
    children
}): ReactNode => {
    return (
        <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
            <Label htmlFor={htmlFor} className='gap-1 text-xs font-semibold text-foreground/75'>
                {label}
                {required && <span className='text-destructive' aria-hidden='true'>*</span>}
            </Label>

            {children}

            {error && (
                <p id={htmlFor ? `${htmlFor}-error` : undefined} className='text-xs font-medium text-destructive'>
                    {error}
                </p>
            )}
        </div>
    )
}

const StatusOptionLabel: FC<{ status: IssueStatus }> = ({ status }): ReactNode => {
    const option = STATUSES.find((item) => item.id === status)

    return (
        <span className='flex items-center gap-2'>
            <span className={cn('size-2 rounded-full', option?.dotClass)} aria-hidden='true' />
            {option?.label}
        </span>
    )
}

const TypeOptionLabel: FC<{ type: IssueType }> = ({ type }): ReactNode => {
    return (
        <span className='flex items-center gap-2'>
            <IssueTypeIcon type={type} />
            {ISSUE_TYPES.find((item) => item.id === type)?.label}
        </span>
    )
}

const PriorityOptionLabel: FC<{ priority: IssuePriority }> = ({ priority }): ReactNode => {
    return (
        <span className='flex items-center gap-2'>
            <PriorityIcon priority={priority} />
            {PRIORITIES.find((item) => item.id === priority)?.label}
        </span>
    )
}

const AssigneeOptionLabel: FC<{ member: Member | null }> = ({ member }): ReactNode => {
    if (!member) {
        return (
            <span className='flex items-center gap-2 text-muted-foreground'>
                <MemberAvatar member={null} size='xs' />
                Unassigned
            </span>
        )
    }

    return (
        <span className='flex min-w-0 items-center gap-2'>
            <MemberAvatar member={member} size='xs' />
            <span className='truncate' data-mdlfy-cms={`members:${member.id}:name`}>{member.name}</span>
        </span>
    )
}

const STATUS_ITEMS = Object.fromEntries(STATUSES.map((status) => [status.id, <StatusOptionLabel key={status.id} status={status.id} />]))

const TYPE_ITEMS = Object.fromEntries(ISSUE_TYPES.map((type) => [type.id, <TypeOptionLabel key={type.id} type={type.id} />]))

const PRIORITY_ITEMS = Object.fromEntries(PRIORITIES.map((priority) => [priority.id, <PriorityOptionLabel key={priority.id} priority={priority.id} />]))

export const StatusSelect: FC<FieldProps<IssueStatus>> = ({ id, value, onChange, className, size }): ReactNode => {
    return (
        <Select items={STATUS_ITEMS} value={value} onValueChange={(next) => next && onChange(next as IssueStatus)}>
            <SelectTrigger id={id} size={size} className={cn('w-full bg-background', className)}>
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                {STATUSES.map((status) => (
                    <SelectItem key={status.id} value={status.id}>
                        <StatusOptionLabel status={status.id} />
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export const TypeSelect: FC<FieldProps<IssueType>> = ({ id, value, onChange, className, size }): ReactNode => {
    return (
        <Select items={TYPE_ITEMS} value={value} onValueChange={(next) => next && onChange(next as IssueType)}>
            <SelectTrigger id={id} size={size} className={cn('w-full bg-background', className)}>
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                {ISSUE_TYPES.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                        <TypeOptionLabel type={type.id} />
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export const PrioritySelect: FC<FieldProps<IssuePriority>> = ({ id, value, onChange, className, size }): ReactNode => {
    return (
        <Select items={PRIORITY_ITEMS} value={value} onValueChange={(next) => next && onChange(next as IssuePriority)}>
            <SelectTrigger id={id} size={size} className={cn('w-full bg-background', className)}>
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                {PRIORITIES.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id}>
                        <PriorityOptionLabel priority={priority.id} />
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export const AssigneeSelect: FC<AssigneeSelectProps> = ({ id, value, members, onChange, className }): ReactNode => {
    const items = useMemo(() => ({
        [UNASSIGNED]: <AssigneeOptionLabel member={null} />,
        ...Object.fromEntries(members.map((member) => [member.id, <AssigneeOptionLabel key={member.id} member={member} />]))
    }), [members])

    const current = value && members.some((member) => member.id === value) ? value : UNASSIGNED

    return (
        <Select
            items={items}
            value={current}
            onValueChange={(next) => onChange(!next || next === UNASSIGNED ? null : String(next))}
        >
            <SelectTrigger id={id} className={cn('w-full bg-background', className)}>
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value={UNASSIGNED}>
                    <AssigneeOptionLabel member={null} />
                </SelectItem>

                {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                        <AssigneeOptionLabel member={member} />
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

export const LabelsInput: FC<LabelsInputProps> = ({ id, value, suggestions, onChange }): ReactNode => {
    const [draft, setDraft] = useState('')
    const listId = useId()
    const available = suggestions.filter((label) => !value.includes(label))

    const add = (raw: string) => {
        const next = cleanLabels([...value, ...raw.split(',')])

        if (next.length > LIMITS.labels) {
            toast.error(`An issue can have up to ${LIMITS.labels} labels.`)
            return
        }

        setDraft('')

        if (next.length !== value.length) onChange(next)
    }

    const remove = (label: string) => {
        onChange(value.filter((item) => item !== label))
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if ((event.key === 'Enter' || event.key === ',') && draft.trim()) {
            event.preventDefault()
            add(draft)
        }

        if (event.key === 'Backspace' && !draft && value.length > 0) {
            remove(value[value.length - 1])
        }
    }

    return (
        <div className='flex min-h-8 flex-wrap items-center gap-1 rounded-lg border border-input bg-background px-1.5 py-1 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50'>
            {value.map((label) => (
                <span key={label} className='inline-flex max-w-full items-center gap-0.5 rounded-md bg-secondary py-0.5 pr-0.5 pl-1.5 text-xs font-medium text-secondary-foreground'>
                    <span className='truncate'>{label}</span>

                    <button
                        type='button'
                        onClick={() => remove(label)}
                        aria-label={`Remove label ${label}`}
                        className='rounded p-0.5 text-secondary-foreground/70 hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                    >
                        <X className='size-3' aria-hidden='true' />
                    </button>
                </span>
            ))}

            <input
                id={id}
                list={listId}
                value={draft}
                maxLength={LIMITS.labelLength * 2}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => draft.trim() && add(draft)}
                placeholder={value.length > 0 ? 'Add more' : 'Type a label and press Enter'}
                className='h-6 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground'
            />

            <datalist id={listId}>
                {available.map((label) => <option key={label} value={label} />)}
            </datalist>
        </div>
    )
}
