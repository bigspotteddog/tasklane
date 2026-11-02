import type { FC, FormEvent, ReactNode } from 'react'
import type { Member } from '@/types'

import { useId, useState } from 'react'
import { toast } from 'sonner'
import { apiRequest, errorMessage } from '@/lib/api'
import { ColorPicker } from '@/components/board/color-picker'
import { MemberAvatar } from '@/components/board/member-avatar'
import { FormField } from '@/components/board/issue-fields'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog'

import { LIMITS } from '@/constants/board'

interface ProfileDialogProps {
    open: boolean
    viewer: Member
    onOpenChange: (open: boolean) => void
    onSaved: (member: Member) => void
}

interface ProfileFormProps {
    viewer: Member
    onClose: () => void
    onSaved: (member: Member) => void
}

const ProfileForm: FC<ProfileFormProps> = ({ viewer, onClose, onSaved }): ReactNode => {
    const [name, setName] = useState(viewer.name)
    const [color, setColor] = useState(viewer.color)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const nameId = useId()

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const nextName = name.replace(/\s+/g, ' ').trim()

        if (!nextName) {
            setError('Enter your name.')
            return
        }

        setSaving(true)

        try {
            const { member } = await apiRequest<{ member: Member }>('/api/me', {
                method: 'PATCH',
                body: { name: nextName, color }
            })

            onSaved(member)
            toast.success('Profile saved')
            onClose()
        }
        catch (problem) {
            setError(errorMessage(problem))
        }
        finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate className='flex flex-col gap-5'>
            <DialogHeader className='gap-1 pr-8'>
                <DialogTitle className='text-lg font-semibold'>
                    Your profile
                </DialogTitle>

                <DialogDescription>
                    This is how you appear on every project you are on.
                </DialogDescription>
            </DialogHeader>

            <div className='flex items-center gap-3 rounded-xl border bg-muted/40 p-3'>
                <MemberAvatar member={{ name: name || viewer.name, color }} size='md' />

                <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold'>{name || viewer.name}</p>
                    <p className='truncate text-xs text-muted-foreground' data-mdlfy-cms={`members:${viewer.id}:email`}>{viewer.email}</p>
                </div>
            </div>

            <FormField label='Name' htmlFor={nameId} error={error}>
                <Input
                    id={nameId}
                    value={name}
                    maxLength={LIMITS.memberName}
                    onChange={(event) => {
                        setName(event.target.value)
                        setError(null)
                    }}
                    className='bg-background'
                />
            </FormField>

            <div className='flex flex-col gap-2'>
                <p className='text-xs font-semibold text-foreground/75'>Avatar color</p>
                <ColorPicker value={color} label='Avatar color' onChange={setColor} />
            </div>

            <div className='-mx-4 -mb-4 flex justify-end gap-2 border-t bg-muted/50 p-4'>
                <Button type='button' variant='outline' onClick={onClose}>
                    Cancel
                </Button>

                <Button type='submit' disabled={saving}>
                    {saving ? 'Saving' : 'Save profile'}
                </Button>
            </div>
        </form>
    )
}

export const ProfileDialog: FC<ProfileDialogProps> = ({ open, viewer, onOpenChange, onSaved }): ReactNode => {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='sm:max-w-md'>
                <ProfileForm viewer={viewer} onSaved={onSaved} onClose={() => onOpenChange(false)} />
            </DialogContent>
        </Dialog>
    )
}
