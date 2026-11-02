import { EmailError, sendEmail } from '@/lib/modulify/email'
import { HttpError } from '@/server/http'

import { siteConfig } from '@/constants/site'

interface SignInEmail {
    requestId: string
    email: string
    name: string | null
    code: string
    link: string | null
}

export const escapeHtml = (value: string): string => {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

const buildText = ({ name, code, link }: SignInEmail): string => {
    const greeting = name ? `Hi ${name},` : 'Hi there,'
    const lines = [greeting, '']

    if (link) {
        lines.push(`Use this link to sign in to ${siteConfig.name}. It works once and expires in 15 minutes.`, '', link, '')
        lines.push(`Or enter this code on the sign-in screen: ${code}`)
    }
    else {
        lines.push(`Enter this code on the ${siteConfig.name} sign-in screen. It expires in 15 minutes.`, '', code)
    }

    lines.push('', 'If you did not ask to sign in, you can ignore this email. Nobody can get in without it.')

    return lines.join('\n')
}

const buildHtml = ({ name, code, link }: SignInEmail): string => {
    const greeting = name ? `Hi ${escapeHtml(name)},` : 'Hi there,'
    const site = escapeHtml(siteConfig.name)

    const intro = link
        ? `Use the button below to sign in to ${site}. It works once and expires in 15 minutes.`
        : `Enter this code on the ${site} sign-in screen. It expires in 15 minutes.`

    const button = link
        ? `<tr><td style="padding:8px 0 24px"><a ses:no-track href="${escapeHtml(link)}" style="display:inline-block;background:#4f39f6;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;padding:12px 22px;border-radius:10px">Sign in to ${site}</a></td></tr>`
        : ''

    const codeLabel = link ? 'Or enter this code on the sign-in screen:' : 'Your sign-in code:'

    return [
        '<!doctype html><html><body style="margin:0;background:#f5f6fa;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1e1b3a">',
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">',
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid #e3e5ee;border-radius:14px;padding:32px">',
        `<tr><td style="font-size:20px;font-weight:700;padding-bottom:16px">${site}</td></tr>`,
        `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:8px">${greeting}</td></tr>`,
        `<tr><td style="font-size:15px;line-height:1.6;padding-bottom:16px">${intro}</td></tr>`,
        button,
        `<tr><td style="font-size:13px;color:#5b5f73;padding-bottom:8px">${codeLabel}</td></tr>`,
        `<tr><td style="font-family:Menlo,Consolas,monospace;font-size:28px;font-weight:700;letter-spacing:6px;padding-bottom:24px">${code}</td></tr>`,
        '<tr><td style="font-size:13px;line-height:1.6;color:#5b5f73;border-top:1px solid #e3e5ee;padding-top:16px">If you did not ask to sign in, you can ignore this email. Nobody can get in without it.</td></tr>',
        '</table></td></tr></table></body></html>'
    ].join('')
}

export const sendSignInEmail = async (message: SignInEmail): Promise<void> => {
    try {
        await sendEmail({
            to: message.email,
            subject: message.link ? `Your ${siteConfig.name} sign-in link` : `Your ${siteConfig.name} sign-in code: ${message.code}`,
            text: buildText(message),
            html: buildHtml(message),
            tags: [{ name: 'type', value: 'sign-in' }],
            idempotencyKey: `sign-in-${message.requestId}`
        })
    }
    catch (error) {
        if (error instanceof EmailError) {
            if (error.code === 'plan-limit' || error.code === 'no-credits') {
                throw new HttpError('This site has used up its emails for the month, so sign-in emails cannot go out right now.', 503)
            }

            if (error.code === 'disabled') {
                throw new HttpError('Email sending is switched off for this site, so sign-in emails cannot go out right now.', 503)
            }

            if (error.code === 'all-suppressed') {
                throw new HttpError('Emails to this address keep bouncing. Check the address with a teammate.', 400)
            }
        }

        console.error(`[auth] The sign-in email could not be sent: ${error instanceof Error ? error.message : String(error)}`)

        throw new HttpError('The sign-in email could not be sent. Please try again in a minute.', 503)
    }
}
