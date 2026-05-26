'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const LOGO_SRC = {
  light: '/images/logo.png',
  dark: '/images/logo_blue.png',
} as const

const sizeClasses = {
  sm: 'h-11 md:h-12',
  md: 'h-12 md:h-13',
  lg: 'h-14 md:h-16',
} as const

const logoDimensions = {
  light: { height: 48, width: 180 },
  dark: { height: 48, width: 139 },
} as const

export function ModettLogo({
  variant = 'dark',
  size = 'md',
  href = '/',
  className,
}: ModettLogoProps) {
  const dims = logoDimensions[variant]

  const logoElement = (
    <div className={cn('flex items-center', className)}>
      <Image
        src={LOGO_SRC[variant]}
        alt="Modett"
        height={dims.height}
        width={dims.width}
        className={cn(
          sizeClasses[size],
          'w-auto',
          'object-contain object-left',
          variant === 'light' && 'brightness-0 invert',
        )}
        priority
      />
    </div>
  )

  if (href) {
    return (
      <Link
        href={href}
        aria-label="Modett — return to homepage"
        className="inline-flex items-center"
      >
        {logoElement}
      </Link>
    )
  }

  return logoElement
}

interface ModettLogoProps {
  variant?: 'light' | 'dark'
  size?: 'sm' | 'md' | 'lg'
  href?: string
  className?: string
}
