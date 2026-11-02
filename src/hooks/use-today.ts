import { useEffect, useState } from 'react'
import { todayKey } from '@/lib/issues'

export const useToday = (): string | null => {
    const [today, setToday] = useState<string | null>(null)

    useEffect(() => {
        setToday(todayKey())

        const timer = window.setInterval(() => setToday(todayKey()), 60000)
        return () => window.clearInterval(timer)
    }, [])

    return today
}
