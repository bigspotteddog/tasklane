import type { SiteConfig } from '@/types'
import { getOrigin } from '@/lib/window'

export const siteConfig: SiteConfig = {
    name: 'Tasklane',
    description: 'A lightweight issue board for small teams. Plan in the backlog, move work through To Do, In Progress and Review, and ship it to Done.',
    url: getOrigin()
}
