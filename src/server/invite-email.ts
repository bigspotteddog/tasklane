import type { ProjectRole } from '@/types'

import { EmailError, sendEmail } from '@/lib/modulify/email'
import { escapeHtml } from '@/server/auth-email'

import { siteConfig } from '@/constants/site'

interface InviteEmail {
    to: string
    inviterName: string
    projectId: string
    projectName: string
    memberId: string
    role: ProjectRole
    link: string | null
}

export type InviteDelivery = {
    sent: boolean
    problem: string | null
}

const roleText = (role: ProjectRole): string => role === 'admin' ? 'an Admin' : 'a Member'

const buildText = (invite: InviteEmail): string => {
    const lines = [
        'Hi,',
        '',
        `${invite.inviterName} added you to the ${invite.projectName} project on ${siteConfig.name} as ${roleText(invite.role)}.`,
        ''
    ]

    if (invite.link) {
        lines.push(`Sign in with this email address (${invite.to}) to open the board:`, '', invite.link)
    }
    else {
        lines.push(`Ask ${invite.inviterName} for your team's ${siteConfig.name} address, then sign in with this email address (${invite.to}).`)
    }

    lines.push('', 'If you were not expecting this, you can ignore this email.')

    return lines.join('\n')
}

const buildHtml = (invite: InviteEmail): string => {
    const site = escapeHtml(siteConfig.name)
    const inviter = escapeHtml(invite.inviterName)
    const project = escapeHtml(invite.projectName)
    const email = escapeHtml(invite.to)

    const action = invite.link
        ? `<tr><td style="padding:8px 0 24px"><a ses:no-track href="${escapeHtml(invite.link)}" style="display:inline-block;background:#4f39f6;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:10px">Open ${project}</a></td></tr>`
        : `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:24px">Ask ${inviter} for your team&#39;s ${site} address, then sign in with this email address.</td></tr>`

    return [
        '<!doctype html><html><body style="margin:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e1b3a">',
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">',
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e5ee;border-radius:14px;padding:32px">',
        `<tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">${site}</td></tr>`,
        `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:16px">${inviter} added you to the <strong>${project}</strong> project as ${roleText(invite.role)}.</td></tr>`,
        `<tr><td style="font-size:13px;color:#5b5f73;padding-bottom:8px">Sign in with <strong>${email}</strong>. We will email you a one-time sign-in link, no password needed.</td></tr>`,
        action,
        '<tr><td style="font-size:13px;line-height:1.6;color:#5b5f73;border-top:1px solid #e3e5ee;padding-top:16px">If you were not expecting this, you can ignore this email.</td></tr>',
        '</table></td></tr></table></body></html>'
    ].join('')
}

export const sendInviteEmail = async (invite: InviteEmail): Promise<InviteDelivery> => {
    try {
        await sendEmail({
            to: invite.to,
            subject: `${invite.inviterName} invited you to ${invite.projectName} on ${siteConfig.name}`.slice(0, 300),
            text: buildText(invite),
            html: buildHtml(invite),
            tags: [{ name: 'type', value: 'project-invite' }],
            idempotencyKey: `invite-${invite.projectId}-${invite.memberId}-${Date.now()}`
        })

        return { sent: true, problem: null }
    }
    catch (error) {
        if (error instanceof EmailError && (error.code === 'plan-limit' || error.code === 'no-credits')) {
            return { sent: false, problem: 'This site has used up its emails for the month, so the invite email did not go out.' }
        }

        if (error instanceof EmailError && error.code === 'disabled') {
            return { sent: false, problem: 'Email sending is switched off for this site, so the invite email did not go out.' }
        }

        console.error(`[invite] The invite email could not be sent: ${error instanceof Error ? error.message : String(error)}`)

        return { sent: false, problem: 'The invite email could not be sent.' }
    }
}
