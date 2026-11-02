import type { ReactNode } from 'react'

export type SiteConfig = {
    name: string
    description: string
    placeholder: string
    url: string
    ogImage?: string
    links?: {
        twitter?: string
        github?: string
    }
}

export type LayoutProps = {
    children: ReactNode
}

export type SeoProps = {
    title?: string
    description?: string
    ogImage?: string
}