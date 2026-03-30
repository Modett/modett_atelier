import type { ApiError } from '@/types'

const API_BASE_URL =
  `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/api`

interface RequestOptions extends RequestInit {
  params?: Record<string, string>
}

async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options

  const url = new URL(`${API_BASE_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, value)
      }
    })
  }

  const { headers: optionHeaders, credentials, ...restFetch } = fetchOptions
  void credentials

  const response = await fetch(url.toString(), {
    ...restFetch,
    headers: {
      'Content-Type': 'application/json',
      ...optionHeaders,
    },
    credentials: 'include',
  })

  if (!response.ok) {
    if (
      response.status === 401 &&
      endpoint.startsWith('/admin/') &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(new Event('admin-session-expired'))
    }

    const body = await response.json().catch(() => ({}))
    const err: ApiError = {
      code:    body?.error?.code    ?? 'UNKNOWN_ERROR',
      message: body?.error?.message ?? 'An unexpected error occurred',
      status:  response.status,
    }
    throw err
  }

  if (response.status === 204) return {} as T

  return response.json() as Promise<T>
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      method: 'POST',
      body:   body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  patch: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      method: 'PATCH',
      body:   body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  put: <T>(endpoint: string, body?: unknown, options?: RequestOptions) =>
    apiClient<T>(endpoint, {
      method: 'PUT',
      body:   body ? JSON.stringify(body) : undefined,
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { method: 'DELETE', ...options }),
}
