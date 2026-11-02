import { LIMITS } from '@/constants/board'

export const cleanLabel = (value: string): string => {
    return value
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^\p{L}\p{N}._-]/gu, '')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, LIMITS.labelLength)
}

export const cleanLabels = (values: string[]): string[] => {
    const seen = new Set<string>()
    const labels: string[] = []

    for (const value of values) {
        const label = cleanLabel(value)

        if (!label || seen.has(label)) continue

        seen.add(label)
        labels.push(label)
    }

    return labels
}
