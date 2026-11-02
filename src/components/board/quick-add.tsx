import type { FC, FocusEvent, FormEvent, KeyboardEvent, ReactNode } from 'react'
import type { StatusOption } from '@/constants/board'

import { useId, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

import { LIMITS } from '@/constants/board'

interface QuickAddProps {
    status: StatusOption
    onCreate: (title: string) => Promise<boolean>
}

export const QuickAdd: FC<QuickAddProps> = ({ status, onCreate }): ReactNode => {
    const [open, setOpen] = useState(false)
    const [title, setTitle] = useState('')
    const [saving, setSaving] = useState(false)
    const inputRef = useRef<HTMLTextAreaElement>(null)
    const fieldId = useId()

    const close = () => {
        setOpen(false)
        setTitle('')
    }

    const submit = async (event?: FormEvent) => {
        event?.preventDefault()

        const value = title.replace(/\s+/g, ' ').trim()

        if (!value || saving) return

        setSaving(true)
        const created = await onCreate(value)
        setSaving(false)

        if (created) {
            setTitle('')
            inputRef.current?.focus()
        }
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submit()
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            close()
        }
    }

    const handleBlur = (event: FocusEvent<HTMLFormElement>) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
        if (!title.trim() && !saving) close()
    }

    if (!open) {
        return (
            <button
                type='button'
                onClick={() => setOpen(true)}
                className='mx-2 mb-2 flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-background/80 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none'
            >
                <Plus className='size-4' aria-hidden='true' />
                Create issue
                <span className='sr-only'> in {status.label}</span>
            </button>
        )
    }

    return (
        <form onSubmit={submit} onBlur={handleBlur} className='mx-2 mb-2 rounded-lg border border-primary/30 bg-card p-2 shadow-sm ring-3 ring-ring/20'>
            <label htmlFor={fieldId} className='sr-only'>
                New issue title in {status.label}
            </label>

            <textarea
                ref={inputRef}
                id={fieldId}
                autoFocus
                rows={2}
                value={title}
                maxLength={LIMITS.title}
                aria-busy={saving}
                onChange={(event) => setTitle(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='What needs to be done?'
                className='block w-full resize-none bg-transparent px-1 py-0.5 text-sm leading-snug outline-none placeholder:text-muted-foreground'
            />

            <div className='mt-1.5 flex items-center justify-between gap-2'>
                <span className='hidden text-[11px] text-muted-foreground sm:inline'>
                    Enter to add, Esc to close
                </span>

                <div className='ml-auto flex items-center gap-1'>
                    <Button type='button' variant='ghost' size='sm' onClick={close}>
                        Cancel
                    </Button>

                    <Button type='submit' size='sm' disabled={!title.trim() || saving}>
                        {saving ? 'Adding' : 'Add'}
                    </Button>
                </div>
            </div>
        </form>
    )
}
