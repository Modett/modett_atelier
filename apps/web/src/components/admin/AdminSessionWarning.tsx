'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'

const THIRTEEN_MINUTES = 13 * 60 * 1000

export function AdminSessionWarning() {
  const [lastActivity, setLastActivity] = useState(Date.now())
  const [showWarning, setShowWarning]   = useState(false)
  const router      = useRouter()
  const queryClient = useQueryClient()

  useEffect(() => {
    function resetTimer() {
      setLastActivity(Date.now())
      setShowWarning(false)
    }

    document.addEventListener('mousedown', resetTimer)
    document.addEventListener('keydown', resetTimer)
    document.addEventListener('click', resetTimer)

    return () => {
      document.removeEventListener('mousedown', resetTimer)
      document.removeEventListener('keydown', resetTimer)
      document.removeEventListener('click', resetTimer)
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivity
      if (elapsed >= THIRTEEN_MINUTES) {
        setShowWarning(true)
      }
    }, 30_000)

    return () => clearInterval(interval)
  }, [lastActivity])

  useEffect(() => {
    function handleAdminExpiry() {
      queryClient.clear()
      router.push('/admin/login?reason=session_expired')
    }

    window.addEventListener('admin-session-expired', handleAdminExpiry)
    return () => window.removeEventListener('admin-session-expired', handleAdminExpiry)
  }, [router, queryClient])

  if (!showWarning) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100]
                 bg-amber-50 border-b border-amber-200
                 px-6 py-3 flex items-center justify-between"
    >
      <p className="text-sm text-amber-800">
        Your session will expire soon due to inactivity.
        Click anywhere to stay logged in.
      </p>
      <button
        onClick={() => setShowWarning(false)}
        className="text-amber-600 hover:text-amber-800 text-sm underline ml-4"
      >
        Dismiss
      </button>
    </div>
  )
}
