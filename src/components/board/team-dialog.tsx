import type { FC, FormEvent, KeyboardEvent, ReactNode } from 'react'
import type { Issue, Member, MemberDraft } from '@/types'

import { useId, useMemo, useState } from 'react'
import { Check, Pencil, Trash2, UserRound, X } from 'lucide-react'
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
    openCount: number
    onUpdate: TeamDialogProps['onUpdate']
    onDelete: TeamDialogProps['onDelete']
}

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

const MemberRow: FC<MemberRowProps> = ({ member, openCount, onUpdate, onDelete }): ReactNode => {
    const [editing, setEditing] = useState(false)
    const [confirming, setConfirming] = useState(false)
    const [name, setName] = useState(member.name)
    const [color, setColor] = useState(member.color)
    const fieldId = useId()

    const startEditing = () => {
        setName(member.name)
        setColor(member.color)
        setEditing(true)
    }

    const save = async (event?: FormEvent) => {
        event?.preventDefault()

        const next = name.replace(/\s+/g, ' ').trim()

        if (!next) return

        const patch: Partial<MemberDraft> = {}

        if (next !== member.name) patch.name = next
        if (color !== member.color) patch.color = color

        setEditing(false)

        if (Object.keys(patch).length > 0) await onUpdate(member.id, patch)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            setEditing(false)
        }
    }

    if (editing) {
        return (
            <li className='bg-muted/40 px-3 py-3'>
                <form onSubmit={save} className='flex flex-col gap-3'>
                    <div className='flex items-center gap-2'>
                        <label htmlFor={fieldId} className='sr-only'>
                            Teammate name
                        </label>

                        <Input
                            id={fieldId}
                            autoFocus
                            value={name}
                            maxLength={LIMITS.memberName}
                            onChange={(event) => setName(event.target.value)}
                            onKeyDown={handleKeyDown}
                            className='bg-background'
                        />

                        <Button type='submit' size='sm' disabled={!name.trim()}>
                            Save
                        </Button>

                        <Button type='button' variant='ghost' size='icon-sm' onClick={() => setEditing(false)} aria-label='Cancel editing'>
                            <X aria-hidden='true' />
                        </Button>
                    </div>

                    <ColorPicker value={color} label='Avatar color' onChange={setColor} />
                </form>
            </li>
        )
    }

    return (
        <li className='flex items-center gap-3 px-3 py-2.5'>
            <MemberAvatar member={member} size='md' />

            <div className='min-w-0 flex-1'>
                <p className='truncate text-sm font-medium text-foreground' data-mdlfy-cms={`members:${member.id}:name`}>
                    {member.name}
                </p>

                <p className='text-xs text-muted-foreground'>
                    {openCount === 0 ? 'No open issues' : openCount === 1 ? '1 open issue' : `${openCount} open issues`}
                </p>
            </div>

            {confirming ? (
                <div className='flex items-center gap-1.5'>
                    <span className='hidden text-xs text-muted-foreground sm:inline'>Remove?</span>

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
                </div>
            )}
        </li>
    )
}

const AddMemberForm: FC<{ members: Member[], onCreate: TeamDialogProps['onCreate'] }> = ({ members, onCreate }): ReactNode => {
    const [name, setName] = useState('')
    const [color, setColor] = useState(() => nextColor(members))
    const [saving, setSaving] = useState(false)
    const fieldId = useId()

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const value = name.replace(/\s+/g, ' ').trim()

        if (!value || saving) return

        setSaving(true)
        const member = await onCreate({ name: value, color })
        setSaving(false)

        if (member) {
            setName('')
            setColor(nextColor([...members, member]))
        }
    }

    return (
        <form onSubmit={submit} className='flex flex-col gap-3 rounded-lg border border-dashed bg-muted/30 p-3'>
            <Label htmlFor={fieldId} className='text-xs font-semibold text-foreground/75'>
                Add a teammate
            </Label>

            <div className='flex gap-2'>
                <Input
                    id={fieldId}
                    value={name}
                    maxLength={LIMITS.memberName}
                    onChange={(event) => setName(event.target.value)}
                    placeholder='Full name'
                    className='bg-background'
                />

                <Button type='submit' disabled={!name.trim() || saving}>
                    {saving ? 'Adding' : 'Add'}
                </Button>
            </div>

            <ColorPicker value={color} label='Avatar color for the new teammate' onChange={setColor} />
        </form>
    )
}

export const TeamDialog: FC<TeamDialogProps> = ({
    open,
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
            <DialogContent className='flex max-h-[min(88dvh,680px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md'>
                <DialogHeader className='gap-1 border-b px-5 py-4 pr-12'>
                    <DialogTitle className='text-lg font-semibold'>
                        Team
                    </DialogTitle>

                    <DialogDescription>
                        The people who can be assigned issues on this board.
                    </DialogDescription>
                </DialogHeader>

                <div className='flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5'>
                    {members.length > 0 ? (
                        <ul className='divide-y overflow-hidden rounded-lg border bg-card'>
                            {members.map((member) => (
                                <MemberRow
                                    key={member.id}
                                    member={member}
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
                        Removing someone keeps their issues on the board and marks them unassigned.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    )
}
