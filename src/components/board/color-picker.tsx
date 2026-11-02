import type { FC, ReactNode } from 'react'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

import { MEMBER_COLORS } from '@/constants/board'

interface ColorPickerProps {
    value: string
    label: string
    onChange: (color: string) => void
}

export const ColorPicker: FC<ColorPickerProps> = ({ value, label, onChange }): ReactNode => {
    return (
        <div role='radiogroup' aria-label={label} className='flex flex-wrap gap-1.5'>
            {MEMBER_COLORS.map((color, index) => {
                const selected = value.toLowerCase() === color

                return (
                    <button
                        key={color}
                        type='button'
                        role='radio'
                        aria-checked={selected}
                        aria-label={`Color ${index + 1}`}
                        onClick={() => onChange(color)}
                        className={cn(
                            'inline-flex size-7 items-center justify-center rounded-full text-white ring-offset-2 ring-offset-background transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                            selected && 'ring-2 ring-foreground/70'
                        )}
                        style={{ backgroundColor: color }}
                    >
                        {selected && <Check className='size-4' strokeWidth={3} aria-hidden='true' />}
                    </button>
                )
            })}
        </div>
    )
}
