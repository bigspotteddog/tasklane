import type { FC, FormEvent, ReactNode } from 'react'
import type {
    Issue,
    IssueDraft,
    IssuePriority,
    IssueStatus,
    IssueType,
    Member
} from '@/types'

import { useId, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'

import {
    AssigneeSelect,
    FormField,
    LabelsInput,
    PrioritySelect,
    StatusSelect,
    TypeSelect
} from '@/components/board/issue-fields'

import { LIMITS } from '@/constants/board'

interface CreateIssueDialogProps {
    open: boolean
    defaultStatus: IssueStatus
    members: Member[]
    labelSuggestions: string[]
    onOpenChange: (open: boolean) => void
    onCreate: (draft: IssueDraft) => Promise<Issue | null>
    onCreated: (issue: Issue) => void
}

interface CreateIssueFormProps extends Omit<CreateIssueDialogProps, 'open' | 'onOpenChange'> {
    onClose: () => void
}

type FormState = {
    title: string
    description: string
    status: IssueStatus
    type: IssueType
    priority: IssuePriority
    points: string
    assigneeId: string | null
    labels: string[]
    dueDate: string
}

type FormErrors = {
    title?: string
    points?: string
}

const blankForm = (status: IssueStatus): FormState => ({
    title: '',
    description: '',
    status,
    type: 'task',
    priority: 'medium',
    points: '',
    assigneeId: null,
    labels: [],
    dueDate: ''
})

const CreateIssueForm: FC<CreateIssueFormProps> = ({
    defaultStatus,
    members,
    labelSuggestions,
    onCreate,
    onCreated,
    onClose
}): ReactNode => {
    const [form, setForm] = useState<FormState>(() => blankForm(defaultStatus))
    const [errors, setErrors] = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)
    const [createAnother, setCreateAnother] = useState(false)
    const titleRef = useRef<HTMLInputElement>(null)

    const ids = {
        type: useId(),
        status: useId(),
        title: useId(),
        description: useId(),
        assignee: useId(),
        priority: useId(),
        points: useId(),
        due: useId(),
        labels: useId(),
        another: useId()
    }

    const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((current) => ({ ...current, [key]: value }))

        if (key === 'title' || key === 'points') {
            setErrors((current) => ({ ...current, [key]: undefined }))
        }
    }

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (submitting) return

        const title = form.title.replace(/\s+/g, ' ').trim()
        const pointsValue = form.points.trim()
        const points = pointsValue === '' ? null : Number(pointsValue)
        const nextErrors: FormErrors = {}

        if (!title) nextErrors.title = 'Give the issue a short title.'

        if (points !== null && (!Number.isInteger(points) || points < 0 || points > LIMITS.points)) {
            nextErrors.points = `Use a whole number from 0 to ${LIMITS.points}.`
        }

        if (nextErrors.title || nextErrors.points) {
            setErrors(nextErrors)
            if (nextErrors.title) titleRef.current?.focus()
            return
        }

        setSubmitting(true)

        const issue = await onCreate({
            title,
            description: form.description.trim(),
            status: form.status,
            type: form.type,
            priority: form.priority,
            points,
            assigneeId: form.assigneeId,
            labels: form.labels,
            dueDate: form.dueDate || null
        })

        setSubmitting(false)

        if (!issue) return

        onCreated(issue)

        if (createAnother) {
            setForm((current) => ({
                ...blankForm(current.status),
                type: current.type,
                priority: current.priority,
                assigneeId: current.assigneeId,
                labels: current.labels
            }))
            titleRef.current?.focus()
            return
        }

        onClose()
    }

    return (
        <form onSubmit={submit} noValidate className='flex min-h-0 flex-1 flex-col'>
            <DialogHeader className='gap-1 border-b px-5 py-4 pr-12 sm:px-6'>
                <DialogTitle className='text-lg font-semibold'>
                    Create issue
                </DialogTitle>

                <DialogDescription>
                    Add work to the board. Only the title is required.
                </DialogDescription>
            </DialogHeader>

            <div className='grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 py-5 sm:grid-cols-2 sm:px-6'>
                <FormField label='Type' htmlFor={ids.type}>
                    <TypeSelect id={ids.type} value={form.type} onChange={(value) => update('type', value)} />
                </FormField>

                <FormField label='Status' htmlFor={ids.status}>
                    <StatusSelect id={ids.status} value={form.status} onChange={(value) => update('status', value)} />
                </FormField>

                <FormField label='Title' htmlFor={ids.title} error={errors.title} required className='sm:col-span-2'>
                    <Input
                        ref={titleRef}
                        id={ids.title}
                        autoFocus
                        value={form.title}
                        maxLength={LIMITS.title}
                        onChange={(event) => update('title', event.target.value)}
                        placeholder='For example: Add a checkout confirmation email'
                        aria-invalid={Boolean(errors.title)}
                        aria-describedby={errors.title ? `${ids.title}-error` : undefined}
                        aria-required='true'
                        className='h-9 bg-background'
                    />
                </FormField>

                <FormField label='Description' htmlFor={ids.description} className='sm:col-span-2'>
                    <Textarea
                        id={ids.description}
                        value={form.description}
                        maxLength={LIMITS.description}
                        onChange={(event) => update('description', event.target.value)}
                        placeholder='Add context, steps to reproduce or what done looks like.'
                        className='min-h-28 bg-background leading-relaxed'
                    />
                </FormField>

                <FormField label='Assignee' htmlFor={ids.assignee}>
                    <AssigneeSelect
                        id={ids.assignee}
                        value={form.assigneeId}
                        members={members}
                        onChange={(value) => update('assigneeId', value)}
                    />
                </FormField>

                <FormField label='Priority' htmlFor={ids.priority}>
                    <PrioritySelect id={ids.priority} value={form.priority} onChange={(value) => update('priority', value)} />
                </FormField>

                <FormField label='Story points' htmlFor={ids.points} error={errors.points}>
                    <Input
                        id={ids.points}
                        type='number'
                        inputMode='numeric'
                        min={0}
                        max={LIMITS.points}
                        step={1}
                        value={form.points}
                        placeholder='None'
                        onChange={(event) => update('points', event.target.value)}
                        aria-invalid={Boolean(errors.points)}
                        aria-describedby={errors.points ? `${ids.points}-error` : undefined}
                        className='bg-background'
                    />
                </FormField>

                <FormField label='Due date' htmlFor={ids.due}>
                    <Input
                        id={ids.due}
                        type='date'
                        value={form.dueDate}
                        onChange={(event) => update('dueDate', event.target.value)}
                        className='bg-background'
                    />
                </FormField>

                <FormField label='Labels' htmlFor={ids.labels} className='sm:col-span-2'>
                    <LabelsInput
                        id={ids.labels}
                        value={form.labels}
                        suggestions={labelSuggestions}
                        onChange={(value) => update('labels', value)}
                    />
                </FormField>
            </div>

            <div className='flex flex-col-reverse gap-3 border-t bg-muted/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
                <label htmlFor={ids.another} className='flex items-center gap-2 text-sm text-foreground/80'>
                    <Checkbox id={ids.another} checked={createAnother} onCheckedChange={(checked) => setCreateAnother(Boolean(checked))} />
                    Create another
                </label>

                <div className='flex gap-2 sm:justify-end'>
                    <Button type='button' variant='outline' onClick={onClose} className='flex-1 sm:flex-none'>
                        Cancel
                    </Button>

                    <Button type='submit' disabled={submitting} className='flex-1 sm:flex-none'>
                        {submitting ? 'Creating' : 'Create issue'}
                    </Button>
                </div>
            </div>
        </form>
    )
}

export const CreateIssueDialog: FC<CreateIssueDialogProps> = ({ open, onOpenChange, ...props }): ReactNode => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='flex max-h-[min(92dvh,820px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl'>
                <CreateIssueForm {...props} onClose={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    )
}
