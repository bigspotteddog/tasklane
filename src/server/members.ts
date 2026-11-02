import type { Member, ProfileDraft } from '@/types'
import type { MemberRow } from '@/db/schema'

import { count, eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { members, timestampNow } from '@/db/schema'

import { MEMBER_COLORS } from '@/constants/board'

export const toMember = (row: MemberRow): Member => {
    return {
        id: String(row.id),
        name: row.name ?? '',
        color: /^#[0-9a-f]{6}$/i.test(row.color ?? '') ? row.color : '#475569',
        email: row.email ? String(row.email) : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    }
}

export const nameFromEmail = (email: string): string => {
    const words = email.split('@')[0].split(/[._+-]+/).filter(Boolean)
    const name = words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')

    return name.slice(0, 60) || 'New teammate'
}

export const pickMemberColor = async (): Promise<string> => {
    const row = await db.select({ total: count() }).from(members).get()
    return MEMBER_COLORS[Number(row?.total ?? 0) % MEMBER_COLORS.length]
}

export const findMemberByEmail = async (email: string): Promise<MemberRow | undefined> => {
    return db.select().from(members).where(eq(members.email, email)).get()
}

export const createPerson = async (email: string): Promise<MemberRow> => {
    const [row] = await db.insert(members).values({
        name: nameFromEmail(email),
        color: await pickMemberColor(),
        email
    }).returning()

    return row
}

export const updateProfile = async (memberId: string, patch: Partial<ProfileDraft>): Promise<Member | null> => {
    const [row] = await db
        .update(members)
        .set({ ...patch, updatedAt: timestampNow })
        .where(eq(members.id, memberId))
        .returning()

    return row ? toMember(row) : null
}
