import type { FC, FormEvent, ReactNode } from 'react'
import type {
    InviteDraft,
    Member,
    Project,
    ProjectMember,
    ProjectRole,
    ProjectSummary
} from '@/types'

import { useId, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { Crown, DoorOpen, MailPlus, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { apiRequest, errorMessage } from '@/lib/api'
import { Layout } from '@/components/generals/layout'
import { AppHeader } from '@/components/board/app-header'
import { FormField } from '@/components/board/issue-fields'
import { MemberAvatar } from '@/components/board/member-avatar'
import { ProjectBadge } from '@/components/projects/project-badge'
import { ProjectProvider } from '@/components/projects/project-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'

import {
    LIMITS,
    PROJECT_KEY_PATTERN,
    ROLES,
    canManageProject,
    roleLabel
} from '@/constants/board'

interface ProjectSettingsProps {
    initialProject: Project
    initialRole: ProjectRole
    initialMembers: ProjectMember[]
    viewer: Member
    projects: ProjectSummary[]
}

type InviteRole = InviteDraft['role']

type MemberResponse = {
    member: ProjectMember
    emailSent: boolean
    emailProblem: string | null
}

const ROLE_ITEMS = { admin: 'Admin', member: 'Member' }

const CARD = 'rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:p-6'

const RoleSelect: FC<{ id?: string, value: InviteRole, onChange: (role: InviteRole) => void, label: string, disabled?: boolean }> = ({
    id,
    value,
    onChange,
    label,
    disabled = false
}): ReactNode => {
    return (
        <Select items={ROLE_ITEMS} value={value} disabled={disabled} onValueChange={(next) => next && onChange(next as InviteRole)}>
            <SelectTrigger id={id} aria-label={label} className='w-32 bg-background'>
                <SelectValue />
            </SelectTrigger>

            <SelectContent>
                <SelectItem value='admin'>Admin</SelectItem>
                <SelectItem value='member'>Member</SelectItem>
            </SelectContent>
        </Select>
    )
}

const reportInvite = (email: string, response: MemberResponse) => {
    if (response.emailSent) {
        toast.success(`Invite sent to ${email}`)
        return
    }

    toast.warning(`${email} was added to the project`, {
        description: `${response.emailProblem ?? 'The invite email did not go out.'} Ask them to sign in with this email address.`
    })
}

export const ProjectSettings: FC<ProjectSettingsProps> = ({
    initialProject,
    initialRole,
    initialMembers,
    viewer: initialViewer,
    projects
}): ReactNode => {
    const router = useRouter()
    const [project, setProject] = useState(initialProject)
    const [role, setRole] = useState(initialRole)
    const [members, setMembers] = useState(initialMembers)
    const [viewer, setViewer] = useState(initialViewer)

    const canManage = canManageProject(role)
    const base = `/api/projects/${project.id}`

    const switcherProjects = useMemo(() => {
        return projects.map((item) => item.id === project.id ? { ...item, name: project.name, key: project.key } : item)
    }, [projects, project])

    const handleViewerChange = (member: Member) => {
        setViewer(member)
        setMembers((current) => current.map((item) => item.id === member.id ? { ...item, ...member } : item))
    }

    return (
        <ProjectProvider project={project} role={role}>
            <Layout
                header={(
                    <AppHeader
                        viewer={viewer}
                        projects={switcherProjects}
                        project={project}
                        settingsActive
                        onViewerChange={handleViewerChange}
                    />
                )}
            >
                <div className='mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10'>
                    <div className='flex items-center gap-3'>
                        <ProjectBadge projectKey={project.key} size='lg' />

                        <div className='min-w-0'>
                            <p className='text-xs font-semibold tracking-wide text-muted-foreground uppercase'>
                                <span className='font-mono'>{project.key}</span> / Settings
                            </p>

                            <h1 className='truncate font-heading text-2xl font-bold tracking-tight'>
                                <span data-mdlfy-cms={`projects:${project.id}:name`}>{project.name}</span>
                            </h1>
                        </div>

                        <span className='ml-auto shrink-0 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground'>
                            {role === 'owner' ? 'You are the owner' : role === 'admin' ? 'You are an admin' : 'You are a member'}
                        </span>
                    </div>

                    <GeneralSection
                        project={project}
                        canManage={canManage}
                        onSaved={(next) => {
                            setProject(next)

                            if (next.key !== project.key) {
                                void router.replace(`/projects/${next.key}/settings`, undefined, { shallow: true, scroll: false })
                            }
                        }}
                    />

                    <MembersSection
                        base={base}
                        viewerId={viewer.id}
                        canManage={canManage}
                        members={members}
                        onMembersChange={setMembers}
                        onViewerRoleChange={setRole}
                    />

                    <DangerSection
                        base={base}
                        project={project}
                        role={role}
                        viewerId={viewer.id}
                    />
                </div>
            </Layout>
        </ProjectProvider>
    )
}

const GeneralSection: FC<{ project: Project, canManage: boolean, onSaved: (project: Project) => void }> = ({
    project,
    canManage,
    onSaved
}): ReactNode => {
    const [name, setName] = useState(project.name)
    const [key, setKey] = useState(project.key)
    const [description, setDescription] = useState(project.description)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const nameId = useId()
    const keyId = useId()
    const descriptionId = useId()

    const cleanName = name.replace(/\s+/g, ' ').trim()
    const cleanKey = key.trim().toUpperCase()
    const cleanDescription = description.replace(/\s+/g, ' ').trim()
    const changed = cleanName !== project.name || cleanKey !== project.key || cleanDescription !== project.description

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!cleanName) {
            setError('Give the project a name.')
            return
        }

        if (!PROJECT_KEY_PATTERN.test(cleanKey)) {
            setError('The key must be 2 to 6 letters or numbers and start with a letter.')
            return
        }

        const patch: Record<string, string> = {}

        if (cleanName !== project.name) patch.name = cleanName
        if (cleanKey !== project.key) patch.key = cleanKey
        if (cleanDescription !== project.description) patch.description = cleanDescription

        setSaving(true)
        setError(null)

        try {
            const response = await apiRequest<{ project: Project }>(`/api/projects/${project.id}`, { method: 'PATCH', body: patch })

            onSaved(response.project)
            toast.success('Project settings saved')
        }
        catch (problem) {
            setError(errorMessage(problem))
        }
        finally {
            setSaving(false)
        }
    }

    if (!canManage) {
        return (
            <section id='general' aria-labelledby='general-title' className={CARD}>
                <h2 id='general-title' className='font-heading text-lg font-semibold'>General</h2>

                <dl className='mt-4 grid gap-4 sm:grid-cols-[10rem_1fr]'>
                    <dt className='text-sm font-medium text-muted-foreground'>Name</dt>
                    <dd className='text-sm' data-mdlfy-cms={`projects:${project.id}:name`}>{project.name}</dd>

                    <dt className='text-sm font-medium text-muted-foreground'>Key</dt>
                    <dd className='font-mono text-sm'>{project.key}</dd>

                    <dt className='text-sm font-medium text-muted-foreground'>Description</dt>
                    {project.description ? (
                        <dd className='text-sm' data-mdlfy-cms={`projects:${project.id}:description`}>{project.description}</dd>
                    ) : (
                        <dd className='text-sm text-muted-foreground'>No description yet.</dd>
                    )}
                </dl>

                <p className='mt-4 text-xs text-muted-foreground'>
                    Only admins and the owner can change these settings.
                </p>
            </section>
        )
    }

    return (
        <section id='general' aria-labelledby='general-title' className={CARD}>
            <h2 id='general-title' className='font-heading text-lg font-semibold'>General</h2>

            <form onSubmit={submit} noValidate className='mt-4 grid gap-4 sm:grid-cols-[1fr_10rem]'>
                <FormField label='Project name' htmlFor={nameId}>
                    <Input
                        id={nameId}
                        value={name}
                        maxLength={LIMITS.projectName}
                        onChange={(event) => setName(event.target.value)}
                        className='bg-background'
                    />
                </FormField>

                <FormField label='Key' htmlFor={keyId}>
                    <Input
                        id={keyId}
                        value={key}
                        maxLength={6}
                        onChange={(event) => setKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        className='bg-background font-mono uppercase'
                    />
                </FormField>

                <FormField label='Description' htmlFor={descriptionId} className='sm:col-span-2'>
                    <Textarea
                        id={descriptionId}
                        value={description}
                        maxLength={LIMITS.projectDescription}
                        onChange={(event) => setDescription(event.target.value)}
                        placeholder='What is this project for?'
                        className='min-h-20 bg-background'
                    />
                </FormField>

                {cleanKey !== project.key && PROJECT_KEY_PATTERN.test(cleanKey) && (
                    <p className='rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900 ring-1 ring-amber-200 ring-inset sm:col-span-2'>
                        Changing the key renames every issue, so <span className='font-mono'>{project.key}-1</span> becomes <span className='font-mono'>{cleanKey}-1</span>. Links shared with the old key will stop working.
                    </p>
                )}

                {error && (
                    <p role='alert' className='text-sm font-medium text-destructive sm:col-span-2'>
                        {error}
                    </p>
                )}

                <div className='flex justify-end sm:col-span-2'>
                    <Button type='submit' disabled={!changed || saving}>
                        {saving ? 'Saving' : 'Save changes'}
                    </Button>
                </div>
            </form>
        </section>
    )
}

interface MembersSectionProps {
    base: string
    viewerId: string
    canManage: boolean
    members: ProjectMember[]
    onMembersChange: (members: ProjectMember[]) => void
    onViewerRoleChange: (role: ProjectRole) => void
}

const MembersSection: FC<MembersSectionProps> = ({
    base,
    viewerId,
    canManage,
    members,
    onMembersChange,
    onViewerRoleChange
}): ReactNode => {
    const [email, setEmail] = useState('')
    const [inviteRole, setInviteRole] = useState<InviteRole>('member')
    const [inviting, setInviting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const emailId = useId()
    const roleId = useId()

    const invite = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        const address = email.trim().toLowerCase()

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) {
            setError('Enter a valid email address.')
            return
        }

        setInviting(true)
        setError(null)

        try {
            const response = await apiRequest<MemberResponse>(`${base}/members`, {
                method: 'POST',
                body: { email: address, role: inviteRole }
            })

            onMembersChange([...members, response.member])
            setEmail('')
            reportInvite(address, response)
        }
        catch (problem) {
            setError(errorMessage(problem))
        }
        finally {
            setInviting(false)
        }
    }

    const replaceMember = (member: ProjectMember) => {
        onMembersChange(members.map((item) => item.id === member.id ? member : item))
    }

    const changeRole = async (member: ProjectMember, nextRole: InviteRole) => {
        const previous = members

        replaceMember({ ...member, role: nextRole })

        try {
            const response = await apiRequest<MemberResponse>(`${base}/members/${member.id}`, {
                method: 'PATCH',
                body: { role: nextRole }
            })

            replaceMember(response.member)
            toast.success(`${member.name} is now ${nextRole === 'admin' ? 'an Admin' : 'a Member'}`)

            if (member.id === viewerId) onViewerRoleChange(nextRole)
        }
        catch (problem) {
            onMembersChange(previous)
            toast.error(errorMessage(problem))
        }
    }

    const remove = async (member: ProjectMember) => {
        try {
            await apiRequest(`${base}/members/${member.id}`, { method: 'DELETE' })
            onMembersChange(members.filter((item) => item.id !== member.id))
            toast.success(`${member.name} was removed from the project`)
        }
        catch (problem) {
            toast.error(errorMessage(problem))
        }
    }

    const addEmail = async (member: ProjectMember, address: string): Promise<boolean> => {
        try {
            const response = await apiRequest<MemberResponse>(`${base}/members/${member.id}`, {
                method: 'PATCH',
                body: { email: address }
            })

            replaceMember(response.member)
            reportInvite(address, response)
            return true
        }
        catch (problem) {
            toast.error(errorMessage(problem))
            return false
        }
    }

    return (
        <section id='members' aria-labelledby='members-title' className={CARD}>
            <div className='flex flex-wrap items-baseline justify-between gap-2'>
                <h2 id='members-title' className='font-heading text-lg font-semibold'>
                    Members <span className='text-sm font-medium text-muted-foreground'>({members.length})</span>
                </h2>

                <p className='text-xs text-muted-foreground'>
                    Only members can see this project and its issues.
                </p>
            </div>

            <ul className='mt-3 grid gap-2 sm:grid-cols-3'>
                {ROLES.map((option) => (
                    <li key={option.id} className='rounded-lg bg-muted/60 px-3 py-2'>
                        <p className='text-xs font-semibold text-foreground'>{option.label}</p>
                        <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>{option.summary}</p>
                    </li>
                ))}
            </ul>

            {canManage && (
                <form onSubmit={invite} noValidate className='mt-5 flex flex-col gap-2 rounded-xl border border-dashed bg-muted/30 p-4'>
                    <p className='flex items-center gap-2 text-sm font-semibold'>
                        <UserPlus className='size-4 text-primary' aria-hidden='true' />
                        Invite someone by email
                    </p>

                    <div className='flex flex-col gap-2 sm:flex-row'>
                        <label htmlFor={emailId} className='sr-only'>Email address</label>

                        <Input
                            id={emailId}
                            type='email'
                            value={email}
                            onChange={(event) => {
                                setEmail(event.target.value)
                                setError(null)
                            }}
                            placeholder='name@company.com'
                            aria-invalid={Boolean(error)}
                            className='h-9 flex-1 bg-background'
                        />

                        <RoleSelect id={roleId} value={inviteRole} onChange={setInviteRole} label='Role for the new member' />

                        <Button type='submit' disabled={inviting || !email.trim()} className='h-9'>
                            {inviting ? 'Sending' : 'Send invite'}
                        </Button>
                    </div>

                    {error && (
                        <p role='alert' className='text-sm font-medium text-destructive'>{error}</p>
                    )}

                    <p className='text-xs text-muted-foreground'>
                        They get an email and sign in with that address. No password needed.
                    </p>
                </form>
            )}

            <ul className='mt-5 divide-y overflow-hidden rounded-xl border'>
                {members.map((member) => (
                    <MemberRow
                        key={member.id}
                        member={member}
                        isViewer={member.id === viewerId}
                        canManage={canManage}
                        onRoleChange={(nextRole) => void changeRole(member, nextRole)}
                        onRemove={() => void remove(member)}
                        onAddEmail={(address) => addEmail(member, address)}
                    />
                ))}
            </ul>
        </section>
    )
}

interface MemberRowProps {
    member: ProjectMember
    isViewer: boolean
    canManage: boolean
    onRoleChange: (role: InviteRole) => void
    onRemove: () => void
    onAddEmail: (email: string) => Promise<boolean>
}

const MemberRow: FC<MemberRowProps> = ({ member, isViewer, canManage, onRoleChange, onRemove, onAddEmail }): ReactNode => {
    const [confirming, setConfirming] = useState(false)
    const [adding, setAdding] = useState(false)
    const [address, setAddress] = useState('')
    const [saving, setSaving] = useState(false)
    const fieldId = useId()

    const owner = member.role === 'owner'
    const manageable = canManage && !owner

    const submitEmail = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address.trim())) return

        setSaving(true)
        const ok = await onAddEmail(address.trim().toLowerCase())
        setSaving(false)

        if (ok) {
            setAdding(false)
            setAddress('')
        }
    }

    return (
        <li className='flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:px-4'>
            <div className='flex min-w-0 flex-1 items-center gap-3'>
                <MemberAvatar member={member} size='md' />

                <div className='min-w-0'>
                    <p className='flex flex-wrap items-center gap-1.5 text-sm font-medium'>
                        <span className='truncate' data-mdlfy-cms={`members:${member.id}:name`}>{member.name}</span>

                        {isViewer && (
                            <span className='rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-semibold text-accent-foreground'>You</span>
                        )}

                        {member.email && !member.joined && (
                            <span className='rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset'>
                                Invited
                            </span>
                        )}
                    </p>

                    {member.email ? (
                        <p className='truncate text-xs text-muted-foreground' data-mdlfy-cms={`members:${member.id}:email`}>{member.email}</p>
                    ) : (
                        <p className='text-xs text-amber-700'>No email yet, so they cannot sign in</p>
                    )}
                </div>
            </div>

            {adding ? (
                <form onSubmit={submitEmail} className='flex items-center gap-2'>
                    <label htmlFor={fieldId} className='sr-only'>Email address for {member.name}</label>

                    <Input
                        id={fieldId}
                        type='email'
                        autoFocus
                        value={address}
                        onChange={(event) => setAddress(event.target.value)}
                        placeholder='name@company.com'
                        className='h-8 w-48 bg-background'
                    />

                    <Button type='submit' size='sm' disabled={saving || !address.trim()}>
                        {saving ? 'Sending' : 'Invite'}
                    </Button>

                    <Button type='button' variant='ghost' size='sm' onClick={() => setAdding(false)}>
                        Cancel
                    </Button>
                </form>
            ) : confirming ? (
                <div className='flex items-center gap-1.5'>
                    <span className='text-xs text-muted-foreground'>Remove from the project?</span>

                    <Button
                        type='button'
                        size='sm'
                        onClick={() => {
                            setConfirming(false)
                            onRemove()
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
                <div className='flex items-center gap-1.5'>
                    {manageable && !member.email && (
                        <Button type='button' variant='outline' size='sm' onClick={() => setAdding(true)} className='bg-background'>
                            <MailPlus aria-hidden='true' />
                            Add email
                        </Button>
                    )}

                    {owner ? (
                        <span className='inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 ring-inset'>
                            <Crown className='size-3.5' aria-hidden='true' />
                            Owner
                        </span>
                    ) : manageable ? (
                        <RoleSelect value={member.role === 'admin' ? 'admin' : 'member'} onChange={onRoleChange} label={`Role for ${member.name}`} />
                    ) : (
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset', member.role === 'admin' ? 'bg-accent text-accent-foreground ring-primary/20' : 'bg-muted text-muted-foreground ring-border')}>
                            {roleLabel(member.role)}
                        </span>
                    )}

                    {manageable && !isViewer && (
                        <Button
                            type='button'
                            variant='ghost'
                            size='icon-sm'
                            onClick={() => setConfirming(true)}
                            aria-label={`Remove ${member.name} from the project`}
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

interface DangerSectionProps {
    base: string
    project: Project
    role: ProjectRole
    viewerId: string
}

const DangerSection: FC<DangerSectionProps> = ({ base, project, role, viewerId }): ReactNode => {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [confirmKey, setConfirmKey] = useState('')
    const [working, setWorking] = useState(false)
    const confirmId = useId()
    const owner = role === 'owner'

    const run = async () => {
        setWorking(true)

        try {
            if (owner) {
                await apiRequest(base, { method: 'DELETE' })
                toast.success('The project was deleted')
            }
            else {
                await apiRequest(`${base}/members/${viewerId}`, { method: 'DELETE' })
                toast.success('You left the project')
            }

            setOpen(false)
            await router.push('/projects')
        }
        catch (problem) {
            toast.error(errorMessage(problem))
            setWorking(false)
        }
    }

    return (
        <section id='danger-zone' aria-labelledby='danger-title' className={cn(CARD, 'border-destructive/30')}>
            <h2 id='danger-title' className='font-heading text-lg font-semibold'>
                {owner ? 'Delete project' : 'Leave project'}
            </h2>

            <div className='mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <p className='max-w-xl text-sm leading-relaxed text-muted-foreground'>
                    {owner
                        ? 'Deleting removes the board, every issue on it and all memberships for everyone. This cannot be undone.'
                        : 'You will lose access to this board until an admin invites you again. Issues assigned to you become unassigned.'}
                </p>

                <Button
                    type='button'
                    onClick={() => {
                        setConfirmKey('')
                        setOpen(true)
                    }}
                    className='shrink-0 bg-destructive text-white hover:bg-destructive/90'
                >
                    {owner ? <Trash2 aria-hidden='true' /> : <DoorOpen aria-hidden='true' />}
                    {owner ? 'Delete project' : 'Leave project'}
                </Button>
            </div>

            <AlertDialog open={open} onOpenChange={setOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {owner ? 'Delete ' : 'Leave '}<span data-mdlfy-cms={`projects:${project.id}:name`}>{project.name}</span>?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            {owner
                                ? 'Every issue in this project is deleted for the whole team.'
                                : 'You can only come back if an admin invites you again.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {owner && (
                        <div className='flex flex-col gap-1.5'>
                            <label htmlFor={confirmId} className='text-xs font-semibold text-foreground/75'>
                                Type <span className='font-mono'>{project.key}</span> to confirm
                            </label>

                            <Input
                                id={confirmId}
                                value={confirmKey}
                                onChange={(event) => setConfirmKey(event.target.value.toUpperCase())}
                                className='bg-background font-mono uppercase'
                            />
                        </div>
                    )}

                    <AlertDialogFooter>
                        <AlertDialogCancel>
                            Cancel
                        </AlertDialogCancel>

                        <Button
                            type='button'
                            onClick={run}
                            disabled={working || (owner && confirmKey.trim() !== project.key)}
                            className='bg-destructive text-white hover:bg-destructive/90'
                        >
                            {working ? 'Working' : owner ? 'Delete project' : 'Leave project'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    )
}
