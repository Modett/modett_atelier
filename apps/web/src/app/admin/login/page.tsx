'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react'
import { api } from '@/lib/api'
import { ADMIN_SESSION_KEY } from '@/hooks/useAdminSession'
import type { User, Admin, ApiError } from '@/types'

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Incorrect email or password.',
  NOT_AN_ADMIN:        'This account does not have admin access.',
  ACCOUNT_SUSPENDED:   'This admin account has been suspended.',
  INVITE_NOT_ACCEPTED: 'Please accept your invite email before logging in.',
  RATE_LIMIT_EXCEEDED: 'Too many attempts. Please wait 15 minutes.',
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  )
}

function AdminLoginForm() {
  const [email, setEmail]               = useState('')
  const [password, setPassword]         = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const router      = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const sessionExpired = searchParams.get('reason') === 'session_expired'

  const loginMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ data: { user: User; admin: Admin } }>(
        '/admin/auth/login',
        { email, password },
      )
      return res.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(ADMIN_SESSION_KEY, data)
      router.push('/admin')
    },
    onError: (err: Error) => {
      const apiErr = err as unknown as ApiError
      setError(ERROR_MESSAGES[apiErr?.code] ?? 'Login failed. Please try again.')
    },
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm p-8">

        <h1 className="text-xl font-semibold text-gray-900 mb-1">
          Modett Admin
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Sign in to the admin portal
        </p>

        {sessionExpired && (
          <div className="bg-amber-50 border border-amber-200 rounded
                          px-4 py-3 text-sm text-amber-800 mb-4">
            Your session expired due to inactivity. Please sign in again.
          </div>
        )}

        <form
          onSubmit={(e) => { e.preventDefault(); loginMutation.mutate() }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="w-full border border-gray-300 rounded px-3 py-2
                         text-sm focus:outline-none focus:ring-2
                         focus:ring-gray-400 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="w-full border border-gray-300 rounded px-3 py-2 pr-10
                           text-sm focus:outline-none focus:ring-2
                           focus:ring-gray-400 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword
                  ? <EyeOff className="w-4 h-4" />
                  : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <p className="text-xs text-gray-400">
            Sessions expire after 15 minutes of inactivity.
          </p>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full bg-gray-900 text-white rounded py-2.5
                       text-sm font-medium hover:bg-gray-700
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-colors duration-150"
          >
            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
