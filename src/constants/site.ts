import type { SiteConfig } from '@/types'
import { getOrigin } from '@/lib/window'

export const siteConfig: SiteConfig = {
    name: 'Site',
    description: 'Describe what you want. AI builds it live.',
    placeholder: 'Your new site will appear right here. Just ask Modulify to generate anything you can describe.',
    url: getOrigin()
}