import type {
    InviteDraft,
    Project,
    ProjectDraft,
    ProjectMember,
    ProjectRole,
    ProjectSummary
} from '@/types'
import type { ProjectRow } from '@/db/schema'

import {
    and,
    asc,
    count,
    eq,
    gt,
    inArray,
    ne,
    or,
    isNull,
    sql
} from 'drizzle-orm'

import { db } from '@/db/client'
import { HttpError } from '@/server/http'
import { createPerson, findMemberByEmail } from '@/server/members'

import {
    issues,
    members,
    projectMembers,
    projects,
    timestampNow
} from '@/db/schema'

import { LIMITS, ROLE_RANK } from '@/constants/board'

export type ProjectAccess = {
    project: Project
    role: ProjectRole
}

type MemberWithRole = {
    id: string
    name: string
    color: string
    email: string | null
    createdAt: string
    updatedAt: string
    signedInAt: string | null
    role: string
}

const projectColumns = {
    id: projects.id,
    name: projects.name,
    key: projects.key,
    description: projects.description,
    createdAt: projects.createdAt,
    updatedAt: projects.updatedAt
}

const memberColumns = {
    id: members.id,
    name: members.name,
    color: members.color,
    email: members.email,
    createdAt: members.createdAt,
    updatedAt: members.updatedAt,
    signedInAt: members.signedInAt,
    role: projectMembers.role
}

export const asRole = (value: string): ProjectRole => {
    return value === 'owner' || value === 'admin' ? value : 'member'
}

export const toProject = (row: Pick<ProjectRow, 'id' | 'name' | 'key' | 'description' | 'createdAt' | 'updatedAt'>): Project => {
    return {
        id: String(row.id),
        name: row.name ?? '',
        key: String(row.key ?? '').toUpperCase(),
        description: row.description ?? '',
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    }
}

const toProjectMember = (row: MemberWithRole): ProjectMember => {
    return {
        id: String(row.id),
        name: row.name ?? '',
        color: /^#[0-9a-f]{6}$/i.test(row.color ?? '') ? row.color : '#475569',
        email: row.email ? String(row.email) : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        role: asRole(row.role),
        joined: Boolean(row.signedInAt)
    }
}

const sortMembers = (list: ProjectMember[]): ProjectMember[] => {
    return list.sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || a.name.localeCompare(b.name))
}

export const listProjectsFor = async (memberId: string): Promise<ProjectSummary[]> => {
    const rows = await db
        .select({ ...projectColumns, role: projectMembers.role })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(eq(projectMembers.memberId, memberId))
        .orderBy(asc(projects.name))

    if (rows.length === 0) return []

    const ids = rows.map((row) => row.id)

    const [issueCounts, memberCounts] = await Promise.all([
        db
            .select({
                projectId: issues.projectId,
                total: count(),
                open: sql<number>`SUM(CASE WHEN ${issues.status} = 'done' THEN 0 ELSE 1 END)`
            })
            .from(issues)
            .where(inArray(issues.projectId, ids))
            .groupBy(issues.projectId),
        db
            .select({ projectId: projectMembers.projectId, total: count() })
            .from(projectMembers)
            .where(inArray(projectMembers.projectId, ids))
            .groupBy(projectMembers.projectId)
    ])

    const issueMap = new Map(issueCounts.map((row) => [row.projectId, row]))
    const memberMap = new Map(memberCounts.map((row) => [row.projectId, Number(row.total)]))

    return rows.map((row) => ({
        ...toProject(row),
        role: asRole(row.role),
        totalIssues: Number(issueMap.get(row.id)?.total ?? 0),
        openIssues: Number(issueMap.get(row.id)?.open ?? 0),
        memberCount: memberMap.get(row.id) ?? 0
    }))
}

export const getAccess = async (projectId: string, memberId: string): Promise<ProjectAccess | null> => {
    const row = await db
        .select({ ...projectColumns, role: projectMembers.role })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, memberId)))
        .get()

    return row ? { project: toProject(row), role: asRole(row.role) } : null
}

export const getAccessByKey = async (key: string, memberId: string): Promise<ProjectAccess | null> => {
    const row = await db
        .select({ ...projectColumns, role: projectMembers.role })
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(and(eq(projects.key, key.toUpperCase()), eq(projectMembers.memberId, memberId)))
        .get()

    return row ? { project: toProject(row), role: asRole(row.role) } : null
}

export const isProjectMember = async (projectId: string, memberId: string): Promise<boolean> => {
    const row = await db
        .select({ id: projectMembers.id })
        .from(projectMembers)
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, memberId)))
        .get()

    return Boolean(row)
}

export const getProjectMembers = async (projectId: string): Promise<ProjectMember[]> => {
    const rows = await db
        .select(memberColumns)
        .from(projectMembers)
        .innerJoin(members, eq(projectMembers.memberId, members.id))
        .where(eq(projectMembers.projectId, projectId))
        .orderBy(asc(members.name))

    return sortMembers(rows.map(toProjectMember))
}

const getProjectMember = async (projectId: string, memberId: string): Promise<ProjectMember | null> => {
    const row = await db
        .select(memberColumns)
        .from(projectMembers)
        .innerJoin(members, eq(projectMembers.memberId, members.id))
        .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, memberId)))
        .get()

    return row ? toProjectMember(row) : null
}

export const createProject = async (ownerId: string, draft: ProjectDraft): Promise<Project> => {
    const id = crypto.randomUUID()

    await db.batch([
        db.insert(projects).values({ id, name: draft.name, key: draft.key, description: draft.description }),
        db.insert(projectMembers).values({ projectId: id, memberId: ownerId, role: 'owner' })
    ])

    const row = await db.select(projectColumns).from(projects).where(eq(projects.id, id)).get()

    if (!row) throw new HttpError('The project could not be created. Please try again.', 500)

    return toProject(row)
}

export const updateProject = async (projectId: string, patch: Partial<ProjectDraft>): Promise<Project | null> => {
    const [row] = await db
        .update(projects)
        .set({ ...patch, updatedAt: timestampNow })
        .where(eq(projects.id, projectId))
        .returning()

    return row ? toProject(row) : null
}

export const deleteProject = async (projectId: string): Promise<void> => {
    await db.batch([
        db.delete(issues).where(eq(issues.projectId, projectId)),
        db.delete(projectMembers).where(eq(projectMembers.projectId, projectId)),
        db.update(members).set({ lastProjectId: null, updatedAt: timestampNow }).where(eq(members.lastProjectId, projectId)),
        db.delete(projects).where(eq(projects.id, projectId))
    ])
}

export const inviteToProject = async (projectId: string, inviterId: string, draft: InviteDraft): Promise<{ member: ProjectMember, created: boolean }> => {
    const dayAgo = new Date(Date.now() - 86400000).toISOString()

    const sent = await db
        .select({ total: count() })
        .from(projectMembers)
        .where(and(eq(projectMembers.invitedBy, inviterId), gt(projectMembers.createdAt, dayAgo)))
        .get()

    if (Number(sent?.total ?? 0) >= LIMITS.invitesPerDay) {
        throw new HttpError(`You can invite up to ${LIMITS.invitesPerDay} people a day. Try again tomorrow.`, 429)
    }

    let person = await findMemberByEmail(draft.email)
    let created = false

    if (person && await isProjectMember(projectId, person.id)) {
        throw new HttpError('That person is already on this project.', 400)
    }

    if (!person) {
        person = await createPerson(draft.email)
        created = true
    }

    await db.insert(projectMembers).values({
        projectId,
        memberId: person.id,
        role: draft.role,
        invitedBy: inviterId
    })

    const member = await getProjectMember(projectId, person.id)

    if (!member) throw new HttpError('The invite could not be saved. Please try again.', 500)

    return { member, created }
}

export const updateProjectMember = async (
    projectId: string,
    memberId: string,
    patch: { role?: InviteDraft['role'], name?: string, email?: string }
): Promise<{ member: ProjectMember, emailAdded: boolean }> => {
    const target = await getProjectMember(projectId, memberId)

    if (!target) throw new HttpError('That person is no longer on this project.', 404)

    if (patch.role !== undefined) {
        if (target.role === 'owner') throw new HttpError('The owner always keeps the Owner role.', 400)

        await db
            .update(projectMembers)
            .set({ role: patch.role, updatedAt: timestampNow })
            .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, memberId)))
    }

    let emailAdded = false

    if (patch.name !== undefined || patch.email !== undefined) {
        if (target.email !== null) {
            throw new HttpError('People with an account change their own name from their profile.', 400)
        }

        if (patch.email !== undefined) {
            const other = await findMemberByEmail(patch.email)

            if (other) {
                throw new HttpError('Someone with that email already has an account. Invite them instead, then reassign the issues.', 400)
            }

            emailAdded = true
        }

        await db
            .update(members)
            .set({
                ...(patch.name !== undefined ? { name: patch.name } : {}),
                ...(patch.email !== undefined ? { email: patch.email } : {}),
                updatedAt: timestampNow
            })
            .where(and(eq(members.id, memberId), isNull(members.email)))
    }

    const member = await getProjectMember(projectId, memberId)

    if (!member) throw new HttpError('That person is no longer on this project.', 404)

    return { member, emailAdded }
}

export const removeProjectMember = async (projectId: string, memberId: string): Promise<boolean> => {
    const target = await getProjectMember(projectId, memberId)

    if (!target) return false

    if (target.role === 'owner') {
        throw new HttpError('The owner cannot be removed from the project.', 400)
    }

    await db.batch([
        db
            .update(issues)
            .set({ assigneeId: null, updatedAt: timestampNow })
            .where(and(eq(issues.projectId, projectId), eq(issues.assigneeId, memberId))),
        db
            .delete(projectMembers)
            .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.memberId, memberId))),
        db
            .update(members)
            .set({ lastProjectId: null, updatedAt: timestampNow })
            .where(and(eq(members.id, memberId), eq(members.lastProjectId, projectId)))
    ])

    if (target.email === null) {
        await db.run(sql`
            DELETE FROM members
            WHERE id = ${memberId}
            AND email IS NULL
            AND NOT EXISTS (SELECT 1 FROM project_members WHERE member_id = ${memberId})
        `)
    }

    return true
}

export const rememberProject = async (memberId: string, projectId: string): Promise<void> => {
    await db
        .update(members)
        .set({ lastProjectId: projectId })
        .where(and(eq(members.id, memberId), or(isNull(members.lastProjectId), ne(members.lastProjectId, projectId))))
}

export const defaultProjectFor = async (memberId: string): Promise<Project | null> => {
    const person = await db.select({ lastProjectId: members.lastProjectId }).from(members).where(eq(members.id, memberId)).get()

    if (person?.lastProjectId) {
        const access = await getAccess(person.lastProjectId, memberId)
        if (access) return access.project
    }

    const first = await db
        .select(projectColumns)
        .from(projectMembers)
        .innerJoin(projects, eq(projectMembers.projectId, projects.id))
        .where(eq(projectMembers.memberId, memberId))
        .orderBy(asc(projects.createdAt))
        .get()

    return first ? toProject(first) : null
}

export const claimOwnerlessProjects = async (memberId: string): Promise<void> => {
    await db.run(sql`
        INSERT INTO project_members (project_id, member_id, role)
        SELECT p.id, ${memberId}, 'owner'
        FROM projects AS p
        WHERE NOT EXISTS (SELECT 1 FROM project_members AS pm WHERE pm.project_id = p.id AND pm.role = 'owner')
        ON CONFLICT (project_id, member_id) DO UPDATE SET role = 'owner'
    `)
}
