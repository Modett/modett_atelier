import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'site_access'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

async function submitPassword(formData: FormData) {
  'use server'
  const entered = formData.get('password') as string
  const next = formData.get('next') as string
  const expected = process.env.SITE_PASSWORD

  if (!expected || entered === expected) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, expected ?? '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })
    redirect(next?.startsWith('/') ? next : '/')
  }

  // Wrong password — redirect back with error flag
  redirect(`/password?error=1&next=${encodeURIComponent(next ?? '/')}`)
}

interface Props {
  searchParams: Promise<{ next?: string; error?: string }>
}

export default async function PasswordPage({ searchParams }: Props) {
  const params = await searchParams
  const next = params.next ?? '/'
  const error = params.error === '1'

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F8F7F4',
        fontFamily: 'sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          textAlign: 'center',
        }}
      >
        {/* Logo */}
        <img
          src="/images/logo.png"
          alt="Modett"
          style={{
            height: '48px',
            width: 'auto',
            marginBottom: '40px',
            objectFit: 'contain',
          }}
        />

        <h1
          style={{
            fontSize: '20px',
            fontWeight: '500',
            color: '#3D2E26',
            marginBottom: '8px',
            letterSpacing: '0.05em',
          }}
        >
          Private Preview
        </h1>

        <p
          style={{
            fontSize: '13px',
            color: '#888',
            marginBottom: '32px',
            lineHeight: '1.6',
          }}
        >
          This site is currently under construction.
          <br />
          Enter the access password to continue.
        </p>

        <form action={submitPassword}>
          <input type="hidden" name="next" value={next} />

          <input
            type="password"
            name="password"
            placeholder="Enter password"
            autoFocus
            required
            style={{
              width: '100%',
              height: '48px',
              border: error ? '1px solid #ef4444' : '1px solid #D4CFC9',
              borderRadius: '2px',
              padding: '0 16px',
              fontSize: '14px',
              color: '#3D2E26',
              background: '#fff',
              outline: 'none',
              boxSizing: 'border-box',
              marginBottom: error ? '8px' : '16px',
            }}
          />

          {error && (
            <p
              style={{
                fontSize: '12px',
                color: '#ef4444',
                marginBottom: '16px',
                textAlign: 'left',
              }}
            >
              Incorrect password. Please try again.
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              height: '48px',
              background: '#3D2E26',
              color: '#fff',
              border: 'none',
              borderRadius: '2px',
              fontSize: '12px',
              fontWeight: '400',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Enter Site
          </button>
        </form>
      </div>
    </div>
  )
}
