'use client'

/**
 * Campaign builder — content, audience, schedule, test send.
 * Manual E2E: TEST 2–6 (media, preview, test email, audience count, send now) from messaging spec.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import type { CampaignContent } from '@modett/types'
import { DEFAULT_CAMPAIGN_CONTENT } from '@modett/types'
import { useAdminSession } from '@/hooks/useAdminSession'
import {
  useAdminCampaignDetail,
  useAudienceEstimate,
  useCreateCampaign,
  useScheduleCampaign,
  useSendCampaignNow,
  useSendTestEmail,
  useUpdateCampaign,
  useUploadCampaignAsset,
} from '@/hooks/useAdminMessaging'
import { CampaignEmailPreview } from '@/components/admin/CampaignEmailPreview'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

function parseContent(raw: Record<string, unknown>): CampaignContent {
  return {
    subject: String(raw.subject ?? ''),
    preheader:
      raw.preheader != null && String(raw.preheader).trim() !== ''
        ? String(raw.preheader)
        : undefined,
    heroImageUrl:
      raw.heroImageUrl != null && String(raw.heroImageUrl).trim() !== ''
        ? String(raw.heroImageUrl)
        : undefined,
    heroVideoUrl:
      raw.heroVideoUrl != null && String(raw.heroVideoUrl).trim() !== ''
        ? String(raw.heroVideoUrl)
        : undefined,
    heading: String(raw.heading ?? ''),
    body: String(raw.body ?? ''),
    ctaLabel:
      raw.ctaLabel != null && String(raw.ctaLabel).trim() !== ''
        ? String(raw.ctaLabel)
        : undefined,
    ctaUrl:
      raw.ctaUrl != null && String(raw.ctaUrl).trim() !== ''
        ? String(raw.ctaUrl)
        : undefined,
    footerNote:
      raw.footerNote != null && String(raw.footerNote).trim() !== ''
        ? String(raw.footerNote)
        : undefined,
  }
}

function statusBadgeClass(status: string): string {
  const m: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    SCHEDULED: 'bg-blue-100 text-blue-700',
    SENT: 'bg-green-100 text-green-700',
    CANCELLED: 'bg-red-100 text-red-600',
  }
  return m[status] ?? 'bg-gray-100 text-gray-800'
}

function audienceSelectionKey(filter: Record<string, unknown>): string {
  if (filter.noLoyaltyAccount === true) return 'noloyalty'
  if (filter.loyaltyTier === 'GOLD') return 'gold'
  if (filter.loyaltyTier === 'SILVER') return 'silver'
  if (filter.loyaltyTier === 'BRONZE') return 'bronze'
  return 'all'
}

function tomorrowLocalDatetimeMin(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminCampaignBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const { admin, user, isLoading: authLoading } = useAdminSession()

  const { data: campaign, isLoading } = useAdminCampaignDetail(id)
  const updateCampaign = useUpdateCampaign()
  const scheduleCampaign = useScheduleCampaign()
  const sendTest = useSendTestEmail()
  const sendNow = useSendCampaignNow()
  const uploadAsset = useUploadCampaignAsset()
  const createCampaign = useCreateCampaign()

  const [tab, setTab] = useState('content')
  const [content, setContent] = useState<CampaignContent>(DEFAULT_CAMPAIGN_CONTENT)
  const [campaignName, setCampaignName] = useState('')
  const [audienceFilter, setAudienceFilter] = useState<Record<string, unknown>>({})
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [testEmail, setTestEmail] = useState('')
  const [scheduleAt, setScheduleAt] = useState('')
  const [sendNowOpen, setSendNowOpen] = useState(false)
  const [uploadPct, setUploadPct] = useState<number | null>(null)

  const lastSavedJson = useRef('')
  const initId = useRef<string | null>(null)

  const { data: audienceCount } = useAudienceEstimate(
    audienceFilter,
    tab === 'audience',
  )

  useEffect(() => {
    if (user?.email) setTestEmail(user.email)
  }, [user?.email])

  useEffect(() => {
    if (!campaign) return
    if (initId.current !== campaign.id) {
      initId.current = campaign.id
      setContent(parseContent(campaign.content_json as Record<string, unknown>))
      setCampaignName(campaign.name)
      setAudienceFilter(campaign.audience_filter_json ?? {})
      lastSavedJson.current = JSON.stringify(
        parseContent(campaign.content_json as Record<string, unknown>),
      )
    }
  }, [campaign])

  const isDraft = campaign?.status === 'DRAFT'
  const readOnly = !isDraft

  useEffect(() => {
    if (!campaign || !isDraft) return
    const next = JSON.stringify(content)
    if (next === lastSavedJson.current) return
    setSaveState('saving')
    const t = window.setTimeout(() => {
      void updateCampaign
        .mutateAsync({ id: campaign.id, contentJson: content })
        .then(() => {
          lastSavedJson.current = next
          setSaveState('saved')
          window.setTimeout(() => setSaveState('idle'), 1500)
        })
        .catch(() => {
          setSaveState('idle')
          toast.error('Auto-save failed')
        })
    }, 800)
    return () => window.clearTimeout(t)
  }, [content, campaign, isDraft, updateCampaign])

  const saveName = useCallback(() => {
    if (!campaign || !isDraft) return
    void updateCampaign
      .mutateAsync({ id: campaign.id, name: campaignName })
      .then(() => toast.success('Campaign name saved'))
      .catch(() => toast.error('Could not save name'))
  }, [campaign, campaignName, isDraft, updateCampaign])

  const patchAudience = useCallback(
    (next: Record<string, unknown>) => {
      if (!campaign || !isDraft) return
      setAudienceFilter(next)
      void updateCampaign.mutateAsync({
        id: campaign.id,
        audienceFilterJson: next,
      })
    },
    [campaign, isDraft, updateCampaign],
  )

  async function handleAssetFile(file: File) {
    if (!campaign || !isDraft) return
    const fd = new FormData()
    fd.append('asset', file)
    try {
      if (file.type.startsWith('video/')) setUploadPct(0)
      const data = await uploadAsset.mutateAsync(fd)
      if (data.method === 'presigned' && data.uploadUrl) {
        const putUrl = data.uploadUrl
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', putUrl)
          xhr.setRequestHeader('Content-Type', file.type)
          xhr.upload.onprogress = (ev) => {
            if (ev.lengthComputable) {
              setUploadPct(Math.round((ev.loaded / ev.total) * 100))
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) resolve()
            else reject(new Error('Upload failed'))
          }
          xhr.onerror = () => reject(new Error('Upload failed'))
          xhr.send(file)
        })
        setContent((c) => ({
          ...c,
          heroVideoUrl: data.url,
          heroImageUrl: undefined,
        }))
        setUploadPct(null)
        toast.success('Video uploaded')
      } else {
        setContent((c) => ({
          ...c,
          heroImageUrl: data.url,
          heroVideoUrl: undefined,
        }))
        toast.success('Image uploaded')
      }
    } catch {
      setUploadPct(null)
      toast.error('Upload failed')
    }
  }

  if (authLoading || isLoading || !campaign) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    )
  }

  if (!admin) {
    router.push('/admin/login')
    return null
  }

  const ctaPartial =
    Boolean(content.ctaLabel?.trim()) !== Boolean(content.ctaUrl?.trim())

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/campaigns"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Campaigns
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">{campaign.name}</h1>
          <span
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium',
              statusBadgeClass(campaign.status),
            )}
          >
            {campaign.status}
          </span>
          {isDraft && (
            <span className="text-xs text-gray-500">
              {saveState === 'saving' && 'Saving…'}
              {saveState === 'saved' && 'Saved ✓'}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setTab('deliver')}
              >
                Send Test Email
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={() => setTab('deliver')}
              >
                Schedule Send
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => setTab('deliver')}
              >
                Send Now
              </Button>
            </>
          )}
          {campaign.status === 'SCHEDULED' && campaign.scheduled_at && (
            <p className="text-sm text-gray-600">
              Sends at{' '}
              {new Date(campaign.scheduled_at).toLocaleString('en-GB')}
            </p>
          )}
          {campaign.status === 'SENT' && (
            <p className="text-sm text-gray-600">
              Sent{' '}
              {campaign.sent_at
                ? new Date(campaign.sent_at).toLocaleString('en-GB')
                : '—'}{' '}
              · {campaign.delivery_count ?? 0} recipients
            </p>
          )}
          {campaign.status === 'CANCELLED' && (
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                void createCampaign
                  .mutateAsync({
                    name: `${campaign.name} (copy)`,
                    contentJson: parseContent(
                      campaign.content_json as Record<string, unknown>,
                    ),
                    channelsJson: campaign.channels_json ?? ['EMAIL'],
                    audienceFilterJson: campaign.audience_filter_json ?? {},
                  })
                  .then((row) => {
                    toast.success('Duplicate draft created')
                    router.push(`/admin/campaigns/${row.id}`)
                  })
                  .catch(() => toast.error('Could not duplicate'))
              }}
            >
              Duplicate
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="min-w-0">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="mb-4 flex w-full flex-wrap h-auto gap-1">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="audience">Audience</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="deliver">Deliver</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject line *</Label>
                <Input
                  id="subject"
                  disabled={readOnly}
                  value={content.subject}
                  onChange={(e) =>
                    setContent((c) => ({ ...c, subject: e.target.value }))
                  }
                  placeholder="e.g. New arrivals — Silk collection"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="preheader">Preheader</Label>
                <Input
                  id="preheader"
                  disabled={readOnly}
                  value={content.preheader ?? ''}
                  onChange={(e) =>
                    setContent((c) => ({
                      ...c,
                      preheader: e.target.value || undefined,
                    }))
                  }
                  placeholder="Preview text shown in inbox..."
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Hero media</Label>
                <p className="text-xs text-gray-500 mb-2">
                  Image or video — not both. Plain text body only below.
                </p>
                {uploadPct != null && (
                  <div className="mb-2 h-2 w-full overflow-hidden rounded bg-gray-200">
                    <div
                      className="h-full bg-gray-800 transition-all"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {!content.heroVideoUrl && (
                    <label
                      className={cn(
                        'flex cursor-pointer flex-col rounded-md border border-dashed border-gray-300 p-4 text-center text-sm',
                        readOnly && 'pointer-events-none opacity-50',
                      )}
                    >
                      <span className="font-medium">Upload image</span>
                      <span className="text-gray-500">JPEG, PNG, WebP · max 10MB</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="sr-only"
                        disabled={readOnly || uploadAsset.isPending}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleAssetFile(f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                  {!content.heroImageUrl && (
                    <label
                      className={cn(
                        'flex cursor-pointer flex-col rounded-md border border-dashed border-gray-300 p-4 text-center text-sm',
                        readOnly && 'pointer-events-none opacity-50',
                      )}
                    >
                      <span className="font-medium">Upload video</span>
                      <span className="text-gray-500">MP4, MOV · max 100MB</span>
                      <input
                        type="file"
                        accept="video/mp4,video/quicktime"
                        className="sr-only"
                        disabled={readOnly || uploadAsset.isPending}
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) void handleAssetFile(f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  )}
                </div>
                {content.heroImageUrl && (
                  <div className="mt-2 flex items-start gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={content.heroImageUrl}
                      alt=""
                      className="h-24 w-auto rounded border object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={readOnly}
                      onClick={() =>
                        setContent((c) => ({ ...c, heroImageUrl: undefined }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                )}
                {content.heroVideoUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600 truncate">
                      Video: {content.heroVideoUrl.slice(-40)}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={readOnly}
                      onClick={() =>
                        setContent((c) => ({ ...c, heroVideoUrl: undefined }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="heading">Heading *</Label>
                <Input
                  id="heading"
                  disabled={readOnly}
                  value={content.heading}
                  onChange={(e) =>
                    setContent((c) => ({ ...c, heading: e.target.value }))
                  }
                  placeholder="New arrivals just landed"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="body">Body *</Label>
                <Textarea
                  id="body"
                  disabled={readOnly}
                  rows={8}
                  value={content.body}
                  onChange={(e) =>
                    setContent((c) => ({ ...c, body: e.target.value }))
                  }
                  placeholder="Write your campaign message..."
                  className="mt-1"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Plain text only — no HTML tags. Line breaks are preserved.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label htmlFor="ctaLabel">CTA label</Label>
                  <Input
                    id="ctaLabel"
                    disabled={readOnly}
                    value={content.ctaLabel ?? ''}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        ctaLabel: e.target.value || undefined,
                      }))
                    }
                    placeholder="Shop Now"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="ctaUrl">CTA URL</Label>
                  <Input
                    id="ctaUrl"
                    disabled={readOnly}
                    value={content.ctaUrl ?? ''}
                    onChange={(e) =>
                      setContent((c) => ({
                        ...c,
                        ctaUrl: e.target.value || undefined,
                      }))
                    }
                    placeholder="https://modett.com/collections"
                    className="mt-1"
                  />
                </div>
              </div>
              {ctaPartial && (
                <p className="text-sm text-amber-700">
                  CTA label and URL must both be filled, or leave both empty.
                </p>
              )}
              <div>
                <Label htmlFor="footerNote">Footer note</Label>
                <Input
                  id="footerNote"
                  disabled={readOnly}
                  value={content.footerNote ?? ''}
                  onChange={(e) =>
                    setContent((c) => ({
                      ...c,
                      footerNote: e.target.value || undefined,
                    }))
                  }
                  placeholder="e.g. Valid until 31 March 2026"
                  className="mt-1"
                />
              </div>
            </TabsContent>

            <TabsContent value="audience" className="space-y-4">
              <fieldset disabled={readOnly} className="space-y-3">
                <legend className="text-sm font-medium text-gray-900">
                  Audience
                </legend>
                {(
                  [
                    { key: 'all', label: 'All subscribers', filter: {} },
                    {
                      key: 'gold',
                      label: 'Loyalty Gold tier only',
                      filter: { loyaltyTier: 'GOLD' },
                    },
                    {
                      key: 'silver',
                      label: 'Loyalty Silver tier only',
                      filter: { loyaltyTier: 'SILVER' },
                    },
                    {
                      key: 'bronze',
                      label: 'Loyalty Bronze tier only',
                      filter: { loyaltyTier: 'BRONZE' },
                    },
                    {
                      key: 'noloyalty',
                      label: 'Non-loyalty customers',
                      filter: { noLoyaltyAccount: true },
                    },
                  ] as const
                ).map((opt) => (
                  <label key={opt.key} className="flex cursor-pointer gap-2">
                    <input
                      type="radio"
                      name="audience"
                      className="mt-1"
                      checked={audienceSelectionKey(audienceFilter) === opt.key}
                      onChange={() => patchAudience(opt.filter)}
                    />
                    <span>
                      <span className="font-medium text-gray-900">
                        {opt.label}
                      </span>
                    </span>
                  </label>
                ))}
              </fieldset>
              <p className="text-sm text-gray-600">
                Estimated recipients: ~
                {audienceCount != null ? audienceCount : '…'}
              </p>

              <div>
                <p className="text-sm font-medium text-gray-900">Channels</p>
                <div className="mt-2 space-y-2">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked readOnly disabled />
                    <span>Email (launch channel)</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-400">
                    <input type="checkbox" disabled />
                    <span>SMS (coming soon)</span>
                  </label>
                  <label className="flex items-center gap-2 text-gray-400">
                    <input type="checkbox" disabled />
                    <span>WhatsApp (coming soon)</span>
                  </label>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <div>
                <Label htmlFor="cname">Campaign name *</Label>
                <Input
                  id="cname"
                  disabled={readOnly}
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  onBlur={() => {
                    if (campaignName.trim() && campaignName !== campaign.name) {
                      void saveName()
                    }
                  }}
                  className="mt-1"
                />
              </div>
              <p className="text-sm text-gray-600">
                Created{' '}
                {new Date(campaign.created_at).toLocaleString('en-GB')}
              </p>
            </TabsContent>

            <TabsContent value="deliver" className="space-y-6">
              <section className="space-y-3 rounded-md border border-gray-200 p-4">
                <h2 className="font-medium text-gray-900">Test before sending</h2>
                <p className="text-sm text-gray-600">
                  Send a test email to verify how it looks in an inbox.
                </p>
                <Input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="your@email.com"
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={sendTest.isPending || !testEmail.trim()}
                  onClick={() => {
                    void sendTest
                      .mutateAsync({
                        id: campaign.id,
                        recipientEmail: testEmail.trim(),
                      })
                      .then(() => {
                        toast.success(`Test email sent to ${testEmail.trim()}.`)
                      })
                      .catch(() =>
                        toast.error('Failed to send test email.'),
                      )
                  }}
                >
                  {sendTest.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Send Test Email
                </Button>
                <p className="text-xs text-gray-500">
                  Test emails have &quot;[TEST]&quot; in the subject line and are
                  not tracked in delivery logs.
                </p>
              </section>

              {isDraft && (
                <section className="space-y-3 rounded-md border border-gray-200 p-4">
                  <h2 className="font-medium text-gray-900">
                    Schedule this campaign
                  </h2>
                  <Label htmlFor="sched">Send at</Label>
                  <Input
                    id="sched"
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={(e) => setScheduleAt(e.target.value)}
                    min={tomorrowLocalDatetimeMin()}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    disabled={!scheduleAt || scheduleCampaign.isPending}
                    onClick={() => {
                      const d = new Date(scheduleAt)
                      if (d.getTime() <= Date.now()) {
                        toast.error('Choose a future date and time')
                        return
                      }
                      void scheduleCampaign
                        .mutateAsync({
                          id: campaign.id,
                          scheduledAt: d.toISOString(),
                        })
                        .then(() => {
                          toast.success(
                            `Campaign scheduled for ${d.toLocaleString('en-GB')}.`,
                          )
                        })
                        .catch(() => toast.error('Could not schedule'))
                    }}
                  >
                    {scheduleCampaign.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Schedule Campaign
                  </Button>
                </section>
              )}

              {isDraft && (
                <section className="space-y-3 rounded-md border border-gray-200 p-4">
                  {!sendNowOpen ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSendNowOpen(true)}
                    >
                      Send Now
                    </Button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700">
                        Send this campaign immediately to all matching recipients?
                        This action cannot be undone.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={
                            sendNow.isPending || ctaPartial
                          }
                          onClick={() => {
                            void sendNow
                              .mutateAsync({ id: campaign.id })
                              .then(() => {
                                toast.success('Campaign sent successfully.')
                                window.setTimeout(() => {
                                  router.push('/admin/campaigns')
                                }, 2000)
                              })
                              .catch(() => toast.error('Send failed'))
                          }}
                        >
                          {sendNow.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Confirm: Send Now
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setSendNowOpen(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="min-h-[520px] lg:sticky lg:top-24">
          <CampaignEmailPreview content={content} />
        </div>
      </div>
    </div>
  )
}
