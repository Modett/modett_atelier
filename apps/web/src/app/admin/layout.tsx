'use client'

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import {
  AlertTriangle,
  Boxes,
  Coins,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Megaphone,
  Menu,
  Package,
  BarChart3,
  RotateCcw,
  Settings,
  ShoppingCart,
  Star,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'
import { ADMIN_SESSION_KEY, useAdminSession } from '@/hooks/useAdminSession'
import { api } from '@/lib/api'
import { AdminSessionWarning } from '@/components/admin/AdminSessionWarning'
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary'
import { NotificationBell } from '@/components/admin/NotificationBell'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const IDLE_WARNING_MS = 13 * 60 * 1000
const IDLE_LOGOUT_MS = 15 * 60 * 1000

// AUDIT FIX: nav order matches dashboard spec (Settings remains last above logout)
const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Products', icon: Package },
  { href: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { href: '/admin/orders', label: 'Orders', icon: ShoppingCart },
  { href: '/admin/returns', label: 'Returns', icon: RotateCcw },
  { href: '/admin/reviews', label: 'Reviews', icon: Star },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/admin/loyalty', label: 'Loyalty', icon: Coins },
  { href: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
  { href: '/admin/customers', label: 'Customers', icon: Users },
  { href: '/admin/audit-log', label: 'Audit Log', icon: FileText },
] as const

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, admin, isLoading, isAdmin } = useAdminSession()

  if (pathname === '/admin/login' || pathname === '/admin/accept-invite') {
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAdmin) {
    router.push('/admin/login')
    return null
  }

  return (
    <AdminShell admin={admin} user={user}>
      {children}
    </AdminShell>
  )
}

function AdminShell({
  user,
  admin,
  children,
}: {
  user: { firstName: string; lastName: string; email: string } | null
  admin: { role: 'OWNER' | 'ADMIN' } | null
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showIdleWarning, setShowIdleWarning] = useState(false)
  const [secondsUntilLogout, setSecondsUntilLogout] = useState(120)

  const lastActivityRef = useRef(Date.now())
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const handleLogoutRef = useRef<(expired?: boolean) => Promise<void>>(
    async () => {},
  )

  const handleLogout = useCallback(
    async (expired = false) => {
      try {
        await api.post('/admin/auth/logout')
      } catch {
        // ignore
      }
      queryClient.clear()
      void queryClient.removeQueries({ queryKey: ADMIN_SESSION_KEY })
      router.push(expired ? '/admin/login?reason=session_expired' : '/admin/login')
    },
    [queryClient, router],
  )

  useEffect(() => {
    handleLogoutRef.current = handleLogout
  }, [handleLogout])

  const resetIdleTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowIdleWarning(false)

    if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
    if (countdownRef.current) clearInterval(countdownRef.current)

    warningTimerRef.current = setTimeout(() => {
      setShowIdleWarning(true)
      setSecondsUntilLogout(120)
      countdownRef.current = setInterval(() => {
        setSecondsUntilLogout((prev) => {
          if (prev <= 1) {
            if (countdownRef.current) clearInterval(countdownRef.current)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }, IDLE_WARNING_MS)

    logoutTimerRef.current = setTimeout(() => {
      void handleLogoutRef.current(true)
    }, IDLE_LOGOUT_MS)
  }, [])

  useEffect(() => {
    resetIdleTimer()

    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'] as const
    const handleActivity = () => {
      if (!showIdleWarning) {
        resetIdleTimer()
      }
    }

    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true })
    })

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity)
      })
      if (warningTimerRef.current) clearTimeout(warningTimerRef.current)
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current)
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [resetIdleTimer, showIdleWarning])

  useEffect(() => {
    const handleExpired = () => {
      router.push('/admin/login?reason=session_expired')
    }
    window.addEventListener('admin-session-expired', handleExpired)
    return () => window.removeEventListener('admin-session-expired', handleExpired)
  }, [router])

  const handleStayLoggedIn = () => {
    setShowIdleWarning(false)
    resetIdleTimer()
    void api.get('/admin/me').catch(() => {})
  }

  const adminName = user ? `${user.firstName} ${user.lastName}` : 'Admin'
  const isOwner = admin?.role === 'OWNER'

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSessionWarning />
      <Toaster position="top-right" richColors />
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 flex h-full w-64 flex-col border-r border-gray-200 bg-white
          transform transition-transform duration-200 ease-in-out
          lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-4">
          <Link className="text-sm font-bold tracking-widest uppercase text-gray-900" href="/admin">
            MODETT
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              type="button"
              className="p-1 text-gray-400 hover:text-gray-600 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                className={`
                  flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }
                `}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-auto border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white">
              {user?.firstName?.charAt(0)?.toUpperCase() ?? 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{adminName}</p>
              <p className="text-xs text-gray-500">{isOwner ? 'Owner' : 'Admin'}</p>
            </div>
          </div>
          <button
            type="button"
            className="mt-auto flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
            onClick={() => void handleLogout(false)}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 h-16 border-b border-gray-200 bg-white lg:hidden">
          <div className="flex h-full items-center justify-between px-4">
            <button
              type="button"
              className="p-2 text-gray-400 hover:text-gray-600"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-semibold text-gray-900">Modett Admin</span>
            <NotificationBell />
          </div>
        </header>

        <main className="p-4 lg:p-8">
          <div className="mx-auto max-w-[1400px]">
            <AdminErrorBoundary>{children}</AdminErrorBoundary>
          </div>
        </main>
      </div>

      <Dialog
        disablePointerDismissal
        modal
        open={showIdleWarning}
        onOpenChange={() => {}}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Session Expiring
            </DialogTitle>
            <DialogDescription>
              You&apos;ve been inactive for a while. Your session will expire in{' '}
              <span className="font-semibold text-gray-900">
                {secondsUntilLogout} seconds
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => void handleLogout(false)}>
              Sign out
            </Button>
            <Button onClick={handleStayLoggedIn}>Stay signed in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
