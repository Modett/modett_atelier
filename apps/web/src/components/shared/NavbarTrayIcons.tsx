'use client'

import {
  Heart,
  Mail,
  Menu,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/** Pixel size for every icon in the storefront nav tray (matches prior 20px artwork). */
export const NAVBAR_TRAY_ICON_PX = 20

/** Single stroke weight for the whole tray — Lucide outline set. */
export const NAVBAR_TRAY_STROKE = 1.5

const trayIconProps = {
  size: NAVBAR_TRAY_ICON_PX,
  strokeWidth: NAVBAR_TRAY_STROKE,
  absoluteStrokeWidth: true,
  'aria-hidden': true as const,
}

interface NavbarTrayIconProps {
  className?: string
}

export function NavbarSearchIcon({ className }: NavbarTrayIconProps) {
  return <Search {...trayIconProps} className={cn('shrink-0', className)} />
}

export function NavbarWishlistIcon({ className }: NavbarTrayIconProps) {
  return <Heart {...trayIconProps} className={cn('shrink-0', className)} />
}

export function NavbarInboxIcon({ className }: NavbarTrayIconProps) {
  return <Mail {...trayIconProps} className={cn('shrink-0', className)} />
}

export function NavbarUserIcon({ className }: NavbarTrayIconProps) {
  return <User {...trayIconProps} className={cn('shrink-0', className)} />
}

export function NavbarCartIcon({ className }: NavbarTrayIconProps) {
  return <ShoppingBag {...trayIconProps} className={cn('shrink-0', className)} />
}

export function NavbarMenuIcon({ className }: NavbarTrayIconProps) {
  return <Menu {...trayIconProps} className={cn('shrink-0', className)} />
}
