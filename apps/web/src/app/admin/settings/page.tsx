'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { AdminSettingsView } from '@/components/admin/AdminSettingsView'

function SettingsFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<SettingsFallback />}>
      <AdminSettingsView />
    </Suspense>
  )
}
