'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CampaignContent } from '@modett/types'
import { renderCampaignEmailClient } from '@/lib/campaign-renderer'

export interface CampaignEmailPreviewProps {
  content: CampaignContent
}

export function CampaignEmailPreview({ content }: CampaignEmailPreviewProps) {
  const [debounced, setDebounced] = useState(content)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(content), 300)
    return () => window.clearTimeout(t)
  }, [content])

  const html = useMemo(
    () => renderCampaignEmailClient(debounced),
    [debounced],
  )

  const empty =
    !(debounced.subject?.trim()) && !(debounced.heading?.trim())

  return (
    <div className="flex h-full min-h-[480px] flex-col overflow-hidden rounded-md border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 text-xs text-gray-500">
        Email Preview — {debounced.subject?.trim() || 'No subject yet'}
      </div>
      {empty ? (
        <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-gray-500">
          Start filling in the content fields to see a live preview of your
          email here.
        </div>
      ) : (
        <iframe
          title="Email preview"
          srcDoc={html}
          sandbox="allow-same-origin"
          className="min-h-[560px] w-full flex-1 border-0 bg-white"
        />
      )}
    </div>
  )
}
