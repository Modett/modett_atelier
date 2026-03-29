const STORAGE_KEY = 'modett_post_auth_next'

export function storePostAuthPath(path: string): void {
  if (typeof window === 'undefined') return
  if (path.startsWith('/')) {
    sessionStorage.setItem(STORAGE_KEY, path)
  }
}

export function consumePostAuthPath(): string | null {
  if (typeof window === 'undefined') return null
  const next = sessionStorage.getItem(STORAGE_KEY)
  if (!next?.startsWith('/')) return null
  sessionStorage.removeItem(STORAGE_KEY)
  return next
}
