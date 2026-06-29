'use client'

import { cn } from '@/lib/utils'

interface LogoProps {
  size?: number
  className?: string
  variant?: 'default' | 'white' | 'inverse'
}

export function DonutO({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
    >
      <circle
        cx="50" cy="50" r="38"
        fill="none"
        stroke={color}
        strokeWidth="14"
        strokeDasharray="202.94 35.82"
        transform="rotate(-99 50 50)"
        strokeLinecap="butt"
      />
    </svg>
  )
}

export function Logo({ size = 24, className, variant = 'default' }: LogoProps) {
  const colorMap = {
    default: 'var(--domus-brand)',
    white:   '#FFFFFF',
    inverse: 'var(--domus-ivory)',
  }
  const color = colorMap[variant]

  return (
    <span
      className={cn('domus-lockup', className)}
      style={{ fontSize: size, color }}
    >
      D
      <span className="domus-ring">
        <DonutO color={color} />
      </span>
      MUS
    </span>
  )
}
