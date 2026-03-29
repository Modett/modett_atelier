import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

/**
 * Server guard for authenticated-only routes.
 * When unauthenticated, redirects to home with openAuth + optional next path
 * (middleware already does this for /account/*; this keeps layouts consistent).
 */
export async function requireAuth(nextPath?: string) {
  const cookieStore = await cookies()
  const sid = cookieStore.get('sid')

  if (!sid) {
    const qs = new URLSearchParams({ openAuth: '1' })
    if (nextPath?.startsWith('/')) {
      qs.set('next', nextPath)
    }
    redirect(`/?${qs.toString()}`)
  }
}
