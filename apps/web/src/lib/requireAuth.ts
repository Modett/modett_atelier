/**
 * requireAuth — server-side session guard.
 *
 * NOTE: Cannot check cookies server-side because the `sid`
 * cookie is scoped to the API domain (Railway), not the
 * frontend domain. Auth protection for /account/* is
 * handled client-side by AccountAuthGuard in the account
 * layout, which calls GET /auth/session via useSession().
 *
 * This function is kept as a no-op so existing call sites
 * compile without changes.
 */
export async function requireAuth(_nextPath?: string): Promise<void> {
  // no-op — see comment above
}
