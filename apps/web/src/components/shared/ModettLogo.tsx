'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const sizeClasses = {
  sm: 'h-8',
  md: 'h-11',
  lg: 'h-14',
} as const

export function ModettLogo({
  variant = 'dark',
  size = 'md',
  href = '/',
  className,
}: ModettLogoProps) {
  const logoElement = (
    <div className={cn('flex items-center', className)}>
      <Image
        src="/images/logo.png"
        alt="Modett"
        height={44}
        width={160}
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
