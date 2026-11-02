import type { FC, FormEvent, ReactNode } from 'react'
import type { Project } from '@/types'

import { useId, useState } from 'react'
import { useRouter } from 'next/router'
import { toast } from 'sonner'
import { apiRequest, errorMessage } from '@/lib/api'
import { FormField } from '@/components/board/issue-fields'
import { ProjectBadge } from '@/components/projects/project-badge'
import { Button } from '@/components/ui/button'
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
    LIMITS,
    PROJECT_KEY_PATTERN,
    suggestProjectKey
} from '@/constants/board'

interface CreateProjectDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type Errors = {
    name?: string
    key?: string
    form?: string
}

const CreateProjectForm: FC<{ onClose: () => void }> = ({ onClose }): ReactNode => {
    const router = useRouter()
    const [name, setName] = useState('')
    const [key, setKey] = useState('')
    const [keyEdited, setKeyEdited] = useState(false)
    const [description, setDescription] = useState('')
    const [errors, setErrors] = useState<Errors>({})
    const [saving, setSaving] = useState(false)

    const nameId = useId()
    const keyId = useId()
    const descriptionId = useId()

    const previewKey = key || 'KEY'

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const cleanName = name.replace(/\s+/g, ' ').trim()
        const cleanKey = key.trim().toUpperCase()
        const nextErrors: Errors = {}

        if (!cleanName) nextErrors.name = 'Give the project a name.'
        if (!PROJECT_KEY_PATTERN.test(cleanKey)) nextErrors.key = 'Use 2 to 6 letters or numbers, starting with a letter.'

        if (nextErrors.name || nextErrors.key) {
            setErrors(nextErrors)
            return
        }

        setSaving(true)
        setErrors({})

        try {
            const { project } = await apiRequest<{ project: Project }>('/api/projects', {
                method: 'POST',
                body: { name: cleanName, key: cleanKey, description }
            })

            toast.success(`${project.name} is ready`)
            onClose()
            await router.push(`/projects/${project.key}`)
        }
        catch (problem) {
            setErrors({ form: errorMessage(problem) })
            setSaving(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate className='flex min-h-0 flex-1 flex-col'>
            <DialogHeader className='gap-1 border-b px-5 py-4 pr-12 sm:px-6'>
                <DialogTitle className='text-lg font-semibold'>
                    Create a project
                </DialogTitle>

                <DialogDescription>
                    Each project gets its own board, issues and members. You will be its owner.
                </DialogDescription>
            </DialogHeader>

            <div className='flex flex-col gap-4 px-5 py-5 sm:px-6'>
                <FormField label='Project name' htmlFor={nameId} error={errors.name} required>
                    <Input
                        id={nameId}
                        autoFocus
                        value={name}
                        maxLength={LIMITS.projectName}
                        onChange={(event) => {
                            setName(event.target.value)
                            if (!keyEdited) setKey(suggestProjectKey(event.target.value))
                            setErrors((current) => ({ ...current, name: undefined, form: undefined }))
                        }}
                        placeholder='For example: Website relaunch'
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? `${nameId}-error` : undefined}
                        className='h-9 bg-background'
                    />
                </FormField>

                <FormField label='Key' htmlFor={keyId} error={errors.key} required>
                    <div className='flex items-center gap-3'>
                        <Input
                            id={keyId}
                            value={key}
                            maxLength={6}
                            onChange={(event) => {
                                setKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                                setKeyEdited(true)
                                setErrors((current) => ({ ...current, key: undefined, form: undefined }))
                            }}
                            placeholder='WEB'
                            aria-invalid={Boolean(errors.key)}
                            aria-describedby={errors.key ? `${keyId}-error` : `${keyId}-hint`}
                            className='h-9 w-32 bg-background font-mono uppercase'
                        />

                        <span id={`${keyId}-hint`} className='flex items-center gap-2 text-xs text-muted-foreground'>
                            <ProjectBadge projectKey={previewKey} size='sm' />
                            Issues will be numbered <span className='font-mono font-medium text-foreground'>{previewKey}-1</span>, <span className='font-mono font-medium text-foreground'>{previewKey}-2</span> and so on.
                        </span>
                    </div>
                </FormField>

                <FormField label='Description' htmlFor={descriptionId}>
                    <Textarea
                        id={descriptionId}
                        value={description}
                        maxLength={LIMITS.projectDescription}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder='What is this project for? Optional.'
                        className='min-h-20 bg-background'
                    />
                </FormField>

                {errors.form && (
                    <p role='alert' className='text-sm font-medium text-destructive'>
                        {errors.form}
                    </p>
                )}
            </div>

            <div className='flex justify-end gap-2 border-t bg-muted/50 px-5 py-4 sm:px-6'>
                <Button type='button' variant='outline' onClick={onClose}>
                    Cancel
                </Button>

                <Button type='submit' disabled={saving}>
                    {saving ? 'Creating' : 'Create project'}
                </Button>
            </div>
        </form>
    )
}

export const CreateProjectDialog: FC<CreateProjectDialogProps> = ({ open, onOpenChange }): ReactNode => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='flex flex-col gap-0 overflow-hidden p-0 sm:max-w-lg'>
                <CreateProjectForm onClose={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    )
}
