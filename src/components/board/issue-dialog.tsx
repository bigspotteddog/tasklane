import type { FC, KeyboardEvent, ReactNode, RefObject } from 'react'
import type {
    Issue,
    IssuePatch,
    IssueStatus,
    Member
} from '@/types'

import { useEffect, useId, useRef, useState } from 'react'
import { Check, Link2, LoaderCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { copyText } from '@/lib/clipboard'
import { formatTimestamp, issueKey } from '@/lib/issues'
import { IssueKey } from '@/components/board/issue-key'
import { IssueTypeIcon } from '@/components/board/issue-type-icon'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle
} from '@/components/ui/dialog'

import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/components/ui/alert-dialog'

import {
    AssigneeSelect,
    FormField,
    LabelsInput,
    PrioritySelect,
    StatusSelect,
    TypeSelect
} from '@/components/board/issue-fields'

import { LIMITS } from '@/constants/board'

interface IssueDialogProps {
    issue: Issue | null
    members: Member[]
    labelSuggestions: string[]
    onClose: () => void
    onUpdate: (id: string, patch: IssuePatch) => Promise<boolean>
    onStatusChange: (id: string, status: IssueStatus) => void
    onDelete: (id: string) => Promise<boolean>
}

interface IssueDetailsProps extends Omit<IssueDialogProps, 'issue'> {
    issue: Issue
    flushRef: RefObject<(() => void) | null>
}

const isDateKey = (value: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(value)

const pointsText = (points: number | null): string => points === null ? '' : String(points)

const IssueDetails: FC<IssueDetailsProps> = ({
    issue,
    members,
    labelSuggestions,
    onClose,
    onUpdate,
    onStatusChange,
    onDelete,
    flushRef
}): ReactNode => {
    const key = issueKey(issue.number)

    const [title, setTitle] = useState(issue.title)
    const [description, setDescription] = useState(issue.description)
    const [points, setPoints] = useState(pointsText(issue.points))
    const [dueDate, setDueDate] = useState(issue.dueDate ?? '')
    const [saving, setSaving] = useState(0)
    const [saved, setSaved] = useState(false)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const titleRef = useRef<HTMLTextAreaElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const pointsRef = useRef<HTMLInputElement>(null)
    const dueRef = useRef<HTMLInputElement>(null)

    const titleId = useId()
    const descriptionId = useId()
    const statusId = useId()
    const assigneeId = useId()
    const priorityId = useId()
    const typeId = useId()
    const pointsId = useId()
    const dueId = useId()
    const labelsId = useId()

    useEffect(() => {
        if (document.activeElement !== titleRef.current) setTitle(issue.title)
    }, [issue.title])

    useEffect(() => {
        if (document.activeElement !== descriptionRef.current) setDescription(issue.description)
    }, [issue.description])

    useEffect(() => {
        if (document.activeElement !== pointsRef.current) setPoints(pointsText(issue.points))
    }, [issue.points])

    useEffect(() => {
        if (document.activeElement !== dueRef.current) setDueDate(issue.dueDate ?? '')
    }, [issue.dueDate])

    useEffect(() => {
        const element = titleRef.current

        if (!element) return

        element.style.height = 'auto'
        element.style.height = `${element.scrollHeight}px`
    }, [title])

    const save = async (patch: IssuePatch) => {
        setSaving((count) => count + 1)
        setSaved(false)

        const ok = await onUpdate(issue.id, patch)

        setSaving((count) => Math.max(0, count - 1))
        if (ok) setSaved(true)
    }

    const commitTitle = () => {
        const next = title.replace(/\s+/g, ' ').trim()

        if (!next) {
            setTitle(issue.title)
            toast.error('An issue needs a title.')
            return
        }

        setTitle(next)
        if (next !== issue.title) void save({ title: next })
    }

    const commitDescription = () => {
        const next = description.trim()
        if (next !== issue.description) void save({ description: next })
    }

    const commitPoints = () => {
        const trimmed = points.trim()

        if (!trimmed) {
            if (issue.points !== null) void save({ points: null })
            return
        }

        const value = Number(trimmed)

        if (!Number.isInteger(value) || value < 0 || value > LIMITS.points) {
            toast.error(`Story points must be a whole number from 0 to ${LIMITS.points}.`)
            setPoints(pointsText(issue.points))
            return
        }

        if (value !== issue.points) void save({ points: value })
    }

    const commitDueDate = (value: string) => {
        if (!value) {
            if (issue.dueDate !== null) void save({ dueDate: null })
            return
        }

        if (isDateKey(value) && value !== issue.dueDate) void save({ dueDate: value })
    }

    useEffect(() => {
        flushRef.current = () => {
            if (document.activeElement === titleRef.current) commitTitle()
            if (document.activeElement === descriptionRef.current) commitDescription()
            if (document.activeElement === pointsRef.current) commitPoints()
        }
    })

    useEffect(() => {
        return () => {
            flushRef.current = null
        }
    }, [flushRef])

    const handleTitleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter') {
            event.preventDefault()
            event.currentTarget.blur()
        }
    }

    const handleDescriptionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
            event.preventDefault()
            event.currentTarget.blur()
        }
    }

    const handleCopyLink = async () => {
        const url = new URL(window.location.href)

        url.search = ''
        url.hash = ''
        url.searchParams.set('issue', key)

        const copied = await copyText(url.toString())

        if (copied) toast.success(`Link to ${key} copied`)
        else toast.error('Your browser blocked copying. Copy the address bar instead.')
    }

    const handleDelete = async () => {
        setDeleting(true)
        const ok = await onDelete(issue.id)
        setDeleting(false)
        setConfirmOpen(false)

        if (ok) {
            toast.success(`${key} deleted`)
            onClose()
        }
    }

    return (
        <>
            <DialogTitle className='sr-only'>
                Issue {key}
            </DialogTitle>

            <DialogDescription className='sr-only'>
                Edit the issue. Changes save automatically.
            </DialogDescription>

            <div className='flex items-center gap-2 border-b px-4 py-2.5 pr-12 sm:px-6'>
                <IssueTypeIcon type={issue.type} />
                <IssueKey number={issue.number} className='text-xs' />

                <span className='ml-1 flex items-center gap-1 text-xs text-muted-foreground' aria-live='polite'>
                    {saving > 0 && (
                        <>
                            <LoaderCircle className='size-3.5 animate-spin' aria-hidden='true' />
                            Saving
                        </>
                    )}

                    {saving === 0 && saved && (
                        <>
                            <Check className='size-3.5 text-emerald-600' aria-hidden='true' />
                            Saved
                        </>
                    )}
                </span>

                <div className='ml-auto flex items-center gap-0.5'>
                    <Button type='button' variant='ghost' size='icon-sm' onClick={handleCopyLink} aria-label='Copy link to this issue' title='Copy link'>
                        <Link2 aria-hidden='true' />
                    </Button>

                    <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        onClick={() => setConfirmOpen(true)}
                        aria-label='Delete issue'
                        title='Delete issue'
                        className='text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                    >
                        <Trash2 aria-hidden='true' />
                    </Button>
                </div>
            </div>

            <div className='grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[minmax(0,1fr)_17.5rem]'>
                <div className='flex min-w-0 flex-col gap-6 p-4 sm:p-6'>
                    <div>
                        <label htmlFor={titleId} className='sr-only'>
                            Title
                        </label>

                        <textarea
                            ref={titleRef}
                            id={titleId}
                            rows={1}
                            value={title}
                            maxLength={LIMITS.title}
                            onChange={(event) => setTitle(event.target.value)}
                            onBlur={commitTitle}
                            onKeyDown={handleTitleKeyDown}
                            className='-mx-2 block w-[calc(100%+1rem)] resize-none overflow-hidden rounded-lg border border-transparent bg-transparent px-2 py-1 font-heading text-xl leading-tight font-semibold tracking-tight text-foreground transition-colors outline-none hover:bg-muted/70 focus:border-ring focus:bg-background focus:ring-3 focus:ring-ring/30 sm:text-2xl'
                        />
                    </div>

                    <FormField label='Description' htmlFor={descriptionId}>
                        <Textarea
                            ref={descriptionRef}
                            id={descriptionId}
                            value={description}
                            maxLength={LIMITS.description}
                            onChange={(event) => setDescription(event.target.value)}
                            onBlur={commitDescription}
                            onKeyDown={handleDescriptionKeyDown}
                            placeholder='Add context, steps to reproduce or what done looks like.'
                            className='min-h-44 resize-y bg-background leading-relaxed'
                        />

                        <p className='text-[11px] text-muted-foreground'>
                            Changes save when you click away.
                        </p>
                    </FormField>
                </div>

                <aside aria-label='Issue details' className='flex flex-col gap-4 border-t bg-muted/40 p-4 sm:p-6 md:border-t-0 md:border-l'>
                    <FormField label='Status' htmlFor={statusId}>
                        <StatusSelect
                            id={statusId}
                            value={issue.status}
                            onChange={(status) => status !== issue.status && onStatusChange(issue.id, status)}
                        />
                    </FormField>

                    <FormField label='Assignee' htmlFor={assigneeId}>
                        <AssigneeSelect
                            id={assigneeId}
                            value={issue.assigneeId}
                            members={members}
                            onChange={(value) => value !== issue.assigneeId && void save({ assigneeId: value })}
                        />
                    </FormField>

                    <div className='grid grid-cols-2 gap-3'>
                        <FormField label='Priority' htmlFor={priorityId}>
                            <PrioritySelect
                                id={priorityId}
                                value={issue.priority}
                                onChange={(priority) => priority !== issue.priority && void save({ priority })}
                            />
                        </FormField>

                        <FormField label='Type' htmlFor={typeId}>
                            <TypeSelect
                                id={typeId}
                                value={issue.type}
                                onChange={(type) => type !== issue.type && void save({ type })}
                            />
                        </FormField>
                    </div>

                    <div className='grid grid-cols-2 gap-3'>
                        <FormField label='Story points' htmlFor={pointsId}>
                            <Input
                                ref={pointsRef}
                                id={pointsId}
                                type='number'
                                inputMode='numeric'
                                min={0}
                                max={LIMITS.points}
                                step={1}
                                value={points}
                                placeholder='None'
                                onChange={(event) => setPoints(event.target.value)}
                                onBlur={commitPoints}
                                onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
                                className='bg-background'
                            />
                        </FormField>

                        <FormField label='Due date' htmlFor={dueId}>
                            <Input
                                ref={dueRef}
                                id={dueId}
                                type='date'
                                value={dueDate}
                                onChange={(event) => {
                                    setDueDate(event.target.value)
                                    if (isDateKey(event.target.value)) commitDueDate(event.target.value)
                                }}
                                onBlur={(event) => commitDueDate(event.target.value)}
                                className='bg-background'
                            />
                        </FormField>
                    </div>

                    <FormField label='Labels' htmlFor={labelsId}>
                        <LabelsInput
                            id={labelsId}
                            value={issue.labels}
                            suggestions={labelSuggestions}
                            onChange={(labels) => void save({ labels })}
                        />
                    </FormField>

                    <div className='mt-auto flex flex-col gap-1 border-t pt-4 text-xs text-muted-foreground'>
                        <p>
                            Created <time dateTime={issue.createdAt}>{formatTimestamp(issue.createdAt)}</time>
                        </p>

                        <p>
                            Updated <time dateTime={issue.updatedAt}>{formatTimestamp(issue.updatedAt)}</time>
                        </p>
                    </div>
                </aside>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Delete {key}?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            The issue and everything on it will be removed for the whole team. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            Keep issue
                        </AlertDialogCancel>

                        <Button
                            type='button'
                            onClick={handleDelete}
                            disabled={deleting}
                            className='bg-destructive text-white hover:bg-destructive/90'
                        >
                            {deleting ? 'Deleting' : 'Delete issue'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}

export const IssueDialog: FC<IssueDialogProps> = ({ issue, onClose, ...props }): ReactNode => {
    const [shown, setShown] = useState<Issue | null>(issue)
    const flushRef = useRef<(() => void) | null>(null)

    useEffect(() => {
        if (issue) setShown(issue)
    }, [issue])

    const current = issue ?? shown

    const handleOpenChange = (open: boolean) => {
        if (open) return

        flushRef.current?.()
        onClose()
    }

    return (
        <Dialog open={issue !== null} onOpenChange={handleOpenChange}>
            {current && (
                <DialogContent className='flex max-h-[min(90dvh,780px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl'>
                    <IssueDetails
                        key={current.id}
                        issue={current}
                        flushRef={flushRef}
                        onClose={onClose}
                        {...props}
                    />
                </DialogContent>
            )}
        </Dialog>
    )
}
