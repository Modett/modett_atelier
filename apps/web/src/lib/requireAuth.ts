import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function requireAuth(redirectTo: string = '/') {
  const cookieStore = await cookies()
  const sid = cookieStore.get('sid')

  if (!sid) {
    redirect(redirectTo)
  }
}
