import type { FC, FormEvent, KeyboardEvent, ReactNode } from 'react'
import type { Issue, Member, MemberDraft } from '@/types'

import { useId, useMemo, useState } from 'react'
import { Check, Pencil, Trash2, UserRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MemberAvatar } from '@/components/board/member-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'

import { LIMITS, MEMBER_COLORS } from '@/constants/board'

interface TeamDialogProps {
    open: boolean
    viewerId: string
    members: Member[]
    issues: Issue[]
    onOpenChange: (open: boolean) => void
    onCreate: (draft: MemberDraft) => Promise<Member | null>
    onUpdate: (id: string, patch: Partial<MemberDraft>) => Promise<boolean>
    onDelete: (id: string) => Promise<boolean>
}

interface ColorPickerProps {
    value: string
    label: string
    onChange: (color: string) => void
}

interface MemberRowProps {
    member: Member
    isViewer: boolean
    openCount: number
    onUpdate: TeamDialogProps['onUpdate']
    onDelete: TeamDialogProps['onDelete']
}

interface AddMemberFormProps {
    members: Member[]
    onCreate: TeamDialogProps['onCreate']
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const cleanName = (value: string): string => value.replace(/\s+/g, ' ').trim()

const cleanEmail = (value: string): string => value.trim().toLowerCase()

const nextColor = (members: Member[]): string => {
    const used = new Map<string, number>()

    for (const member of members) {
        used.set(member.color.toLowerCase(), (used.get(member.color.toLowerCase()) ?? 0) + 1)
    }

    return [...MEMBER_COLORS].sort((a, b) => (used.get(a) ?? 0) - (used.get(b) ?? 0))[0]
}

const ColorPicker: FC<ColorPickerProps> = ({ value, label, onChange }): ReactNode => {
    return (
        <div role='radiogroup' aria-label={label} className='flex flex-wrap gap-1.5'>
            {MEMBER_COLORS.map((color, index) => {
                const selected = value.toLowerCase() === color

                return (
                    <button
                        key={color}
                        type='button'
                        role='radio'
                        aria-checked={selected}
                        aria-label={`Color ${index + 1}`}
                        onClick={() => onChange(color)}
                        className={cn(
                            'inline-flex size-6 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            selected && 'ring-2 ring-foreground/70'
                        )}
                        style={{ backgroundColor: color }}
                    >
                        {selected && <Check className='size-3.5' strokeWidth={3} aria-hidden='true' />}
                    </button>
                )
            })}
        </div>
    )
}

const MemberRow: FC<MemberRowProps> = ({ member, isViewer, openCount, onUpdate, onDelete }): ReactNode => {
    const [editing, setEditing] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [saving, setSaving] = useState(false)
    const [name, setName] = useState(member.name)
    const [email, setEmail] = useState(member.email ?? '')
    const [color, setColor] = useState(member.color)
    const [error, setError] = useState<string | null>(null)
    const nameId = useId()
    const emailId = useId()

    const startEditing = () => {
        setName(member.name)
        setEmail(member.email ?? '')
        setColor(member.color)
        setError(null)
        setEditing(true)
    }

    const save = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const nextName = cleanName(name)
        const nextEmail = cleanEmail(email)

        if (!nextName) {
            setError('Enter a name.')
            return
        }

        if (nextEmail && !EMAIL_PATTERN.test(nextEmail)) {
            setError('Enter a valid email address, or leave it empty.')
            return
        }

        if (isViewer && !nextEmail) {
            setError('Keep an email on your own profile so you can sign in again.')
            return
        }

        const patch: Partial<MemberDraft> = {}

        if (nextName !== member.name) patch.name = nextName
        if ((nextEmail || null) !== member.email) patch.email = nextEmail || null
        if (color !== member.color) patch.color = color

        if (Object.keys(patch).length === 0) {
            setEditing(false)
            return
        }

        setSaving(true)
        const ok = await onUpdate(member.id, patch)
        setSaving(false)

        if (ok) setEditing(false)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setEditing(false)
        }
    }

    if (editing) {
        return (
            <li className='bg-muted/40 px-3 py-3'>
                <form onSubmit={save} onKeyDown={handleKeyDown} noValidate className='flex flex-col gap-3'>
                    <div className='grid gap-2 sm:grid-cols-2'>
                        <div className='flex flex-col gap-1'>
                            <Label htmlFor={nameId} className='text-[11px] font-semibold text-foreground/70'>
                                Name
                            </Label>

                            <Input
                                id={nameId}
                                autoFocus
                                value={name}
                                maxLength={LIMITS.memberName}
                                onChange={(event) => setName(event.target.value)}
                                className='bg-background'
                            />
                        </div>

                        <div className='flex flex-col gap-1'>
                            <Label htmlFor={emailId} className='text-[11px] font-semibold text-foreground/70'>
                                Sign-in email
                            </Label>

                            <Input
                                id={emailId}
                                type='email'
                                value={email}
                                maxLength={254}
                                placeholder='name@company.com'
                                onChange={(event) => setEmail(event.target.value)}
                                className='bg-background'
                            />
                        </div>
                    </div>

                    <ColorPicker value={color} label='Avatar color' onChange={setColor} />

                    {error && (
                        <p role='alert' className='text-xs font-medium text-destructive'>
                            {error}
                        </p>
                    )}

                    <div className='flex items-center justify-end gap-1.5'>
                        <Button type='button' variant='ghost' size='sm' onClick={() => setEditing(false)}>
                            Cancel
                        </Button>

                        <Button type='submit' size='sm' disabled={saving}>
                            {saving ? 'Saving' : 'Save'}
                        </Button>
                    </div>
                </form>
            </li>
        )
    }

    return (
        <li className='flex items-center gap-3 px-3 py-2.5'>
            <MemberAvatar member={member} size='md' />

            <div className='min-w-0 flex-1'>
                <p className='flex items-center gap-1.5 text-sm font-medium text-foreground'>
                    <span className='truncate' data-mdlfy-cms={`members:${member.id}:name`}>
                        {member.name}
                    </span>

                    {isViewer && (
                        <span className='shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground'>
                            You
                        </span>
                    )}
                </p>

                {member.email ? (
                    <p className='truncate text-xs text-muted-foreground' data-mdlfy-cms={`members:${member.id}:email`}>
                        {member.email}
                    </p>
                ) : (
                    <p className='text-xs text-amber-700'>
                        No email yet, so they cannot sign in
                    </p>
                )}

                <p className='text-[11px] text-muted-foreground/80'>
                    {openCount === 0 ? 'No open issues' : openCount === 1 ? '1 open issue' : `${openCount} open issues`}
                </p>
            </div>

            {confirming ? (
                <div className='flex items-center gap-1.5'>
                    <Button
                        type='button'
                        size='sm'
                        onClick={() => {
                            setConfirming(false)
                            void onDelete(member.id)
                        }}
                        className='bg-destructive text-white hover:bg-destructive/90'
                    >
                        Remove
                    </Button>

                    <Button type='button' variant='ghost' size='sm' onClick={() => setConfirming(false)}>
                        Keep
                    </Button>
                </div>
            ) : (
                <div className='flex items-center gap-0.5'>
                    <Button type='button' variant='ghost' size='icon-sm' onClick={startEditing} aria-label={`Edit ${member.name}`}>
                        <Pencil aria-hidden='true' />
                    </Button>

                    {!isViewer && (
                        <Button
                            type='button'
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => setConfirming(true)}
                            aria-label={`Remove ${member.name}`}
                            className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                        >
                            <Trash2 aria-hidden='true' />
                        </Button>
                    )}
                </div>
            )}
        </li>
    )
}

const AddMemberForm: FC<AddMemberFormProps> = ({ members, onCreate }): ReactNode => {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [color, setColor] = useState(() => nextColor(members))
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const nameId = useId()
    const emailId = useId()

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const value = cleanName(name)
        const address = cleanEmail(email)

        if (!value || saving) return

        if (address && !EMAIL_PATTERN.test(address)) {
            setError('Enter a valid email address, or leave it empty.')
            return
        }

        setError(null)
        setSaving(true)
        const member = await onCreate({ name: value, color, email: address || null })
        setSaving(false)

        if (member) {
            setName('')
            setEmail('')
            setColor(nextColor([...members, member]))
        }
    }

    return (
        <form onSubmit={submit} noValidate className='flex flex-col gap-3 rounded-lg border border-dashed bg-muted/30 p-3'>
            <p className='text-xs font-semibold text-foreground/75'>
                Add a teammate
            </p>

            <div className='grid gap-2 sm:grid-cols-2'>
                <div className='flex flex-col gap-1'>
                    <Label htmlFor={nameId} className='text-[11px] font-semibold text-foreground/70'>
                        Name
                    </Label>

                    <Input
                        id={nameId}
                        value={name}
                        maxLength={LIMITS.memberName}
                        onChange={(event) => setName(event.target.value)}
                        placeholder='Full name'
                        className='bg-background'
                    />
                </div>

                <div className='flex flex-col gap-1'>
                    <Label htmlFor={emailId} className='text-[11px] font-semibold text-foreground/70'>
                        Sign-in email
                    </Label>

                    <Input
                        id={emailId}
                        type='email'
                        value={email}
                        maxLength={254}
                        onChange={(event) => {
                            setEmail(event.target.value)
                            setError(null)
                        }}
                        placeholder='name@company.com'
                        className='bg-background'
                    />
                </div>
            </div>

            <ColorPicker value={color} label='Avatar color for the new teammate' onChange={setColor} />

            {error && (
                <p role='alert' className='text-xs font-medium text-destructive'>
                    {error}
                </p>
            )}

            <Button type='submit' disabled={!name.trim() || saving} className='self-end'>
                {saving ? 'Adding' : 'Add teammate'}
            </Button>
        </form>
    )
}

export const TeamDialog: FC<TeamDialogProps> = ({
    open,
    viewerId,
    members,
    issues,
    onOpenChange,
    onCreate,
    onUpdate,
    onDelete
}): ReactNode => {
    const openCounts = useMemo(() => {
        const counts = new Map<string, number>()

        for (const issue of issues) {
            if (issue.assigneeId && issue.status !== 'done') {
                counts.set(issue.assigneeId, (counts.get(issue.assigneeId) ?? 0) + 1)
            }
        }

        return counts
    }, [issues])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='flex max-h-[min(88dvh,720px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg'>
                <DialogHeader className='gap-1 border-b px-5 py-4 pr-12'>
                    <DialogTitle className='text-lg font-semibold'>
                        Team and access
                    </DialogTitle>

                    <DialogDescription>
                        Everyone here can be assigned issues. People with a sign-in email can open the board.
                    </DialogDescription>
                </DialogHeader>

                <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5'>
                    {members.length > 0 ? (
                        <ul className='divide-y overflow-hidden rounded-lg border bg-card'>
                            {members.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    member={member}
                                    isViewer={member.id === viewerId}
                                    openCount={openCounts.get(member.id) ?? 0}
                                    onUpdate={onUpdate}
                                    onDelete={onDelete}
                                />
                            ))}
                        </ul>
                    ) : (
                        <div className='flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center'>
                            <span className='inline-flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground'>
                                <UserRound className='size-5' aria-hidden='true' />
                            </span>

                            <p className='text-sm font-medium'>No teammates yet</p>

                            <p className='text-xs text-muted-foreground'>
                                Add the people who pick up work so you can assign issues to them.
                            </p>
                        </div>
                    )}

                    <AddMemberForm members={members} onCreate={onCreate} />

                    <p className='text-xs leading-relaxed text-muted-foreground'>
                        Removing someone or changing their email signs them out. Their issues stay on the board, and a removed teammate&apos;s issues become unassigned.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
