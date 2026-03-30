import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const API_BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`

/**
 * Server guard for authenticated-only routes.
 * Validates the session against the backend — not just cookie presence.
 * If no sid cookie OR if the session is expired: redirects to homepage
 * and opens the auth panel, preserving the intended destination in ?next=.
 */
export async function requireAuth(nextPath?: string) {
  const cookieStore = await cookies()
  const sid = cookieStore.get('sid')

  const buildRedirect = () => {
    const qs = new URLSearchParams({ openAuth: '1' })
    if (nextPath?.startsWith('/')) qs.set('next', nextPath)
    redirect(`/?${qs.toString()}`)
  }

  if (!sid) {
    buildRedirect()
    return
  }

  try {
    const res = await fetch(`${API_BASE_URL}/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sid=${sid.value}`,
      },
      cache: 'no-store',
    })
    if (!res.ok) buildRedirect()
  } catch {
    // Network error — allow through rather than block the user.
    // The page's client-side data fetches will handle the error state.
  }
}
