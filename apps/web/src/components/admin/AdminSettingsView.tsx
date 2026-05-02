'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import {
  Loader2,
  Lock,
  MoreHorizontal,
  LogOut,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useAdminSession, ADMIN_SESSION_KEY } from '@/hooks/useAdminSession'
import {
  useAdminBanners,
  useActivateBanner,
  useCreateBanner,
  useDeactivateBanner,
  useDeleteBanner,
  useUpdateBanner,
  useAdminTeamMembers,
  useAdminPendingInvites,
  useInviteAdmin,
  useResendInvite,
  useCancelInvite,
  useChangeAdminRole,
  useSuspendAdmin,
  useReinstateAdmin,
  useRemoveAdmin,
  useAdminShippingSettings,
  useUpdateShippingSettings,
  useAdminShippingZones,
  useCreateShippingMethod,
  useUpdateShippingMethod,
  useActivateShippingMethod,
  useDeactivateShippingMethod,
  useAddShippingZoneCountry,
  useUpdateAdminProfile,
  useAdminChangePassword,
} from '@/hooks/useAdminSettings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ApiError } from '@/types'

type SettingsTab = 'banner' | 'team' | 'shipping' | 'account'

function formatExpires(iso: string | null): string {
  if (!iso) return 'No expiry'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

function countdownParts(target: Date): string {
  const ms = target.getTime() - Date.now()
  if (ms <= 0) return 'ended'
  const s = Math.floor(ms / 1000)
  const d = Math.floor(s / 86400)
  const h = Math.floor((s % 86400) / 3600)
  const m = Math.floor((s % 3600) / 60)
  const parts: string[] = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0 || d > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function AdminSettingsSkeleton() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
    </div>
  )
}

// —— Banner tab ——

function BannerTab() {
  const { data: banners = [], isLoading } = useAdminBanners()
  const createMut = useCreateBanner()
  const updateMut = useUpdateBanner()
  const actMut = useActivateBanner()
  const deactMut = useDeactivateBanner()
  const delMut = useDeleteBanner()

  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [form, setForm] = useState({
    message: '',
    linkUrl: '',
    expiresLocal: '',
  })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!form.expiresLocal) return
    const t = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [form.expiresLocal])

  const previewEnd = useMemo(() => {
    if (!form.expiresLocal) return null
    const d = new Date(form.expiresLocal)
    return Number.isNaN(d.getTime()) ? null : d
  }, [form.expiresLocal, tick])

  function resetForm() {
    setForm({ message: '', linkUrl: '', expiresLocal: '' })
    setShowNew(false)
    setEditingId(null)
  }

  async function saveBanner() {
    if (!form.message.trim() || form.message.length > 120) {
      toast.error('Message is required (max 120 characters).')
      return
    }
    const endAt =
      form.expiresLocal.trim() === ''
        ? null
        : new Date(form.expiresLocal).toISOString()
    try {
      if (editingId) {
        await updateMut.mutateAsync({
          id: editingId,
          message: form.message.trim(),
          linkUrl: form.linkUrl.trim() || null,
          endAt,
        })
        toast.success('Banner updated.')
      } else {
        await createMut.mutateAsync({
          message: form.message.trim(),
          linkUrl: form.linkUrl.trim() || null,
          endAt,
        })
        toast.success('Banner created.')
      }
      resetForm()
    } catch (e) {
      toast.error((e as ApiError).message ?? 'Save failed')
    }
  }

  if (isLoading) return <AdminSettingsSkeleton />

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Site Banner</h2>
        <p className="text-sm text-gray-500">
          The banner appears at the top of the storefront. Only one banner can be active at a time.
        </p>
      </div>
      {!showNew && !editingId && (
        <Button type="button" variant="outline" onClick={() => setShowNew(true)}>
          + New Banner
        </Button>
      )}
      {(showNew || editingId) && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-medium text-gray-900">
            {editingId ? 'Edit Banner' : 'New Banner'}
          </h3>
          <div className="space-y-3">
            <div>
              <Label>Message *</Label>
              <Input
                value={form.message}
                onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                maxLength={120}
                placeholder="Free shipping on all orders this weekend!"
              />
              <p className="mt-1 text-xs text-gray-500">
                Max 120 characters. Shown to all storefront visitors.
              </p>
            </div>
            <div>
              <Label>Link URL (optional)</Label>
              <Input
                value={form.linkUrl}
                onChange={(e) => setForm((f) => ({ ...f, linkUrl: e.target.value }))}
                placeholder="https://…"
              />
            </div>
            <div>
              <Label>Expires at (optional)</Label>
              <Input
                type="datetime-local"
                value={form.expiresLocal}
                onChange={(e) => setForm((f) => ({ ...f, expiresLocal: e.target.value }))}
              />
              {previewEnd && previewEnd > new Date() && (
                <p className="mt-2 text-sm text-gray-600">
                  Preview: &quot;{form.message.trim() || '…'}&quot; — ends in {countdownParts(previewEnd)}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                onClick={() => void saveBanner()}
                disabled={createMut.isPending || updateMut.isPending}
              >
                Save Banner
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      <div className="space-y-3">
        {banners.map((b) => {
          const end = b.endAt ? new Date(b.endAt) : null
          const expired = end != null && end.getTime() <= Date.now()
          const visuallyActive = b.enabled && !expired
          return (
            <div
              key={b.id}
              className={cn(
                'rounded-lg border bg-white p-4 shadow-sm',
                visuallyActive ? 'border-l-4 border-l-green-500 border-gray-200' : 'border-gray-200',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      visuallyActive ? 'bg-green-500' : 'bg-gray-300',
                    )}
                  />
                  {visuallyActive ? (
                    <Badge className="bg-green-100 text-green-800">ACTIVE</Badge>
                  ) : expired ? (
                    <Badge className="bg-amber-100 text-amber-800">EXPIRED</Badge>
                  ) : (
                    <Badge variant="secondary">INACTIVE</Badge>
                  )}
                  <span className="font-medium text-gray-900">&quot;{b.message}&quot;</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingId(b.id)
                      setShowNew(false)
                      setForm({
                        message: b.message,
                        linkUrl: b.linkUrl ?? '',
                        expiresLocal: b.endAt
                          ? new Date(b.endAt).toISOString().slice(0, 16)
                          : '',
                      })
                    }}
                  >
                    Edit
                  </Button>
                  {visuallyActive ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void deactMut.mutateAsync(b.id).then(() => toast.success('Banner deactivated.'))
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void actMut.mutateAsync(b.id).then(() => toast.success('Banner activated.'))
                      }}
                    >
                      Activate
                    </Button>
                  )}
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteId(b.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {b.endAt ? `Expires: ${formatExpires(b.endAt)}` : 'No expiry'}
              </p>
            </div>
          )
        })}
      </div>
      <Dialog open={deleteId != null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this banner?</DialogTitle>
            <DialogDescription>This cannot be undone.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!deleteId) return
                void delMut.mutateAsync(deleteId).then(() => {
                  toast.success('Banner deleted.')
                  setDeleteId(null)
                })
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// —— Team tab ——

function TeamTab({ isOwner, currentAdminId }: { isOwner: boolean; currentAdminId: string }) {
  const { data: members = [], isLoading: loadM } = useAdminTeamMembers()
  const { data: invites = [], isLoading: loadI } = useAdminPendingInvites()
  const inviteMut = useInviteAdmin()
  const resendMut = useResendInvite()
  const cancelMut = useCancelInvite()
  const roleMut = useChangeAdminRole()
  const suspendMut = useSuspendAdmin()
  const reinstateMut = useReinstateAdmin()
  const removeMut = useRemoveAdmin()

  const [email, setEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'OWNER'>('ADMIN')
  const [confirm, setConfirm] = useState<
    | null
    | { type: 'role' | 'suspend' | 'remove'; adminId: string; label: string }
  >(null)

  const adminNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const a of members) {
      m.set(a.id, `${a.user.firstName} ${a.user.lastName}`.trim())
    }
    return m
  }, [members])

  async function sendInvite() {
    if (!email.trim()) return
    try {
      await inviteMut.mutateAsync({ email: email.trim(), role: inviteRole })
      toast.success(`Invitation sent to ${email.trim()}.`)
      setEmail('')
    } catch (e) {
      toast.error((e as ApiError).message ?? 'Invite failed')
    }
  }

  if (loadM || loadI) return <AdminSettingsSkeleton />

  return (
    <div className="space-y-8">
      {!isOwner && (
        <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Lock className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-medium">Team management requires Owner access.</p>
            <p className="text-amber-800/90">You can view the team but cannot make changes.</p>
          </div>
        </div>
      )}
      <div>
        <h3 className="mb-3 text-base font-semibold text-gray-900">Team Members</h3>
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {members.map((row) => {
                const isYou = row.id === currentAdminId
                const status =
                  row.status === 'ACTIVE'
                    ? { label: 'Active', className: 'bg-green-100 text-green-700' }
                    : row.status === 'INVITED'
                      ? { label: 'Invite pending', className: 'bg-blue-100 text-blue-700' }
                      : { label: 'Suspended', className: 'bg-red-100 text-red-700' }
                return (
                  <tr key={row.id} className="border-b border-gray-100">
                    <td className="px-3 py-2">
                      {row.user.firstName} {row.user.lastName}
                      {isYou && <span className="text-gray-500"> (You)</span>}
                    </td>
                    <td className="px-3 py-2">{row.user.email}</td>
                    <td className="px-3 py-2">{row.role}</td>
                    <td className="px-3 py-2">
                      <span className={cn('rounded px-2 py-0.5 text-xs font-medium', status.className)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {isOwner && !isYou && row.status !== 'INVITED' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                            disabled={!isOwner}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {row.role === 'ADMIN' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirm({
                                    type: 'role',
                                    adminId: row.id,
                                    label: 'Change this admin to Owner?',
                                  })
                                }
                              >
                                Change to Owner role
                              </DropdownMenuItem>
                            )}
                            {row.status === 'ACTIVE' && (
                              <DropdownMenuItem
                                onClick={() =>
                                  setConfirm({
                                    type: 'suspend',
                                    adminId: row.id,
                                    label: 'Suspend this admin’s access?',
                                  })
                                }
                              >
                                Suspend access
                              </DropdownMenuItem>
                            )}
                            {row.status === 'SUSPENDED' && (
                              <DropdownMenuItem
                                onClick={() => {
                                  void reinstateMut.mutateAsync(row.id).then(() =>
                                    toast.success('Access reinstated.'),
                                  )
                                }}
                              >
                                Reinstate access
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() =>
                                setConfirm({
                                  type: 'remove',
                                  adminId: row.id,
                                  label: 'Remove this admin’s access?',
                                })
                              }
                            >
                              Remove admin
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Pending Invites</h3>
        <ul className="space-y-2 text-sm">
          {invites.length === 0 && <li className="text-gray-500">No pending invites.</li>}
          {invites.map((inv) => (
            <li
              key={inv.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded border border-gray-100 bg-gray-50 px-3 py-2"
            >
              <span>
                {inv.email} — Invited by:{' '}
                {adminNameById.get(inv.createdByAdminId) ?? 'Admin'} — Expires:{' '}
                {new Date(inv.expiresAt).toLocaleDateString()}
              </span>
              {isOwner && (
                <span className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void resendMut.mutateAsync(inv.id).then(() => toast.success('Invitation resent.'))
                    }
                  >
                    Resend
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      void cancelMut.mutateAsync(inv.id).then(() => toast.success('Invite cancelled.'))
                    }
                  >
                    Cancel
                  </Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1 text-base font-semibold text-gray-900">Invite a Team Member</h3>
        <p className="mb-4 text-sm text-gray-500">Owner access required to send invitations.</p>
        <div className="space-y-3">
          <div>
            <Label>Email *</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              disabled={!isOwner}
            />
          </div>
          <div className="space-y-2">
            <Label>Role *</Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={inviteRole === 'ADMIN'}
                  onChange={() => setInviteRole('ADMIN')}
                  disabled={!isOwner}
                />
                Admin — manage products, orders, inventory, etc.
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={inviteRole === 'OWNER'}
                  onChange={() => setInviteRole('OWNER')}
                  disabled={!isOwner}
                />
                Owner — full access including team and financial settings
              </label>
            </div>
          </div>
          <Button type="button" onClick={() => void sendInvite()} disabled={!isOwner || inviteMut.isPending}>
            Send Invitation
          </Button>
        </div>
      </div>
      <Dialog open={confirm != null} onOpenChange={() => setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm</DialogTitle>
            <DialogDescription>{confirm?.label}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!confirm) return
                const { adminId, type } = confirm
                const done = () => {
                  toast.success('Done.')
                  setConfirm(null)
                }
                if (type === 'role') {
                  void roleMut.mutateAsync({ adminId, role: 'OWNER' }).then(done)
                } else if (type === 'suspend') {
                  void suspendMut.mutateAsync(adminId).then(done)
                } else {
                  void removeMut.mutateAsync(adminId).then(done)
                }
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// —— Shipping tab ——

function methodRow(m: Record<string, unknown>) {
  const id = String(m.id ?? '')
  const name = String(m.name ?? '')
  const rateType = String(m.rate_type ?? m.rateType ?? '')
  const lkr = String(m.flat_rate_lkr ?? m.flatRateLkr ?? '0')
  const sgd = String(m.flat_rate_sgd ?? m.flatRateSgd ?? '0')
  const usd = String(m.flat_rate_usd ?? m.flatRateUsd ?? '0')
  const days = String(m.estimated_days ?? m.estimatedDays ?? '—')
  const active = Boolean(m.active)
  return { id, name, rateType, lkr, sgd, usd, days, active }
}

function ShippingTab({ isOwner }: { isOwner: boolean }) {
  const { data: settings, isLoading: ls } = useAdminShippingSettings()
  const { data: zones = [], isLoading: lz } = useAdminShippingZones()
  const updateSettings = useUpdateShippingSettings()
  const createMethod = useCreateShippingMethod()
  const updateMethod = useUpdateShippingMethod()
  const actM = useActivateShippingMethod()
  const deactM = useDeactivateShippingMethod()
  const addCountry = useAddShippingZoneCountry()

  const [lkr, setLkr] = useState('')
  const [sgd, setSgd] = useState('')
  const [usd, setUsd] = useState('')
  const [label, setLabel] = useState('Free Shipping')

  useEffect(() => {
    if (!settings) return
    setLkr(settings.freeThresholdLkr ?? '')
    setSgd(settings.freeThresholdSgd ?? '')
    setUsd(settings.freeThresholdUsd ?? '')
    setLabel(settings.freeShippingLabel)
  }, [settings])

  const [editMethod, setEditMethod] = useState<{
    zoneId: string
    method: Record<string, unknown>
  } | null>(null)
  const [addToZone, setAddToZone] = useState<string | null>(null)
  const [newCountryByZone, setNewCountryByZone] = useState<Record<string, string>>({})

  const [methodForm, setMethodForm] = useState({
    name: '',
    carrier: '',
    rateType: 'FLAT' as 'FLAT' | 'FREE' | 'CALCULATED',
    flatRateLkr: '',
    flatRateSgd: '',
    flatRateUsd: '',
    estimatedDays: '',
  })

  async function saveThresholds() {
    try {
      await updateSettings.mutateAsync({
        freeThresholdLkr: lkr.trim() === '' ? null : Number(lkr),
        freeThresholdSgd: sgd.trim() === '' ? null : Number(sgd),
        freeThresholdUsd: usd.trim() === '' ? null : Number(usd),
        freeShippingLabel: label.trim() || 'Free Shipping',
      })
      toast.success('Thresholds saved.')
    } catch (e) {
      toast.error((e as ApiError).message ?? 'Save failed')
    }
  }

  async function saveMethod(zoneId: string, methodId?: string) {
    const body: Record<string, unknown> = {
      name: methodForm.name.trim(),
      carrier: methodForm.carrier.trim() || undefined,
      rateType: methodForm.rateType,
      estimatedDays: methodForm.estimatedDays.trim() || undefined,
    }
    if (methodForm.rateType === 'FLAT') {
      body.flatRateLkr = methodForm.flatRateLkr.trim() === '' ? 0 : Number(methodForm.flatRateLkr)
      body.flatRateSgd = methodForm.flatRateSgd.trim() === '' ? 0 : Number(methodForm.flatRateSgd)
      body.flatRateUsd = methodForm.flatRateUsd.trim() === '' ? 0 : Number(methodForm.flatRateUsd)
    }
    try {
      if (methodId) {
        await updateMethod.mutateAsync({ methodId, body })
        toast.success('Method updated.')
      } else {
        await createMethod.mutateAsync({ zoneId, body })
        toast.success('Method added.')
      }
      setEditMethod(null)
      setAddToZone(null)
    } catch (e) {
      toast.error((e as ApiError).message ?? 'Save failed')
    }
  }

  if (ls || lz) return <AdminSettingsSkeleton />

  return (
    <div className="space-y-8">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-1 font-semibold text-gray-900">Free Shipping Thresholds</h3>
        <p className="mb-4 text-sm text-gray-500">Orders above these amounts qualify for free shipping.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>Sri Lanka (LKR)</Label>
            <Input value={lkr} onChange={(e) => setLkr(e.target.value)} type="number" />
          </div>
          <div>
            <Label>Singapore (SGD)</Label>
            <Input value={sgd} onChange={(e) => setSgd(e.target.value)} type="number" step="0.01" />
          </div>
          <div>
            <Label>International (USD)</Label>
            <Input value={usd} onChange={(e) => setUsd(e.target.value)} type="number" step="0.01" />
          </div>
        </div>
        <div className="mt-3">
          <Label>Free shipping label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} />
        </div>
        <Button className="mt-3" type="button" onClick={() => void saveThresholds()}>
          Save Thresholds
        </Button>
      </div>
      {(zones as Record<string, unknown>[]).map((z) => {
        const id = String(z.id)
        const name = String(z.name ?? 'Zone')
        const countries = Array.isArray(z.countries) ? (z.countries as string[]) : []
        const methods = Array.isArray(z.methods) ? (z.methods as Record<string, unknown>[]) : []
        return (
          <div key={id} className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-gray-900">{name}</h3>
              <span className="text-sm text-gray-500">Countries: {countries.join(', ') || '—'}</span>
            </div>
            {isOwner && (
              <div className="mb-3 flex flex-wrap gap-2">
                <Input
                  className="max-w-[100px]"
                  placeholder="LK"
                  value={newCountryByZone[id] ?? ''}
                  onChange={(e) =>
                    setNewCountryByZone((m) => ({ ...m, [id]: e.target.value.toUpperCase() }))
                  }
                  maxLength={2}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const code = (newCountryByZone[id] ?? '').trim()
                    if (code.length !== 2) return
                    void addCountry.mutateAsync({ zoneId: id, countryCode: code }).then(() => {
                      toast.success('Country added.')
                      setNewCountryByZone((m) => ({ ...m, [id]: '' }))
                    })
                  }}
                >
                  Add country
                </Button>
              </div>
            )}
            <ul className="space-y-2">
              {methods.map((raw) => {
                const m = methodRow(raw)
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 py-2 text-sm"
                  >
                    <span>
                      {m.name} | {m.rateType} | LKR {m.lkr} / SGD {m.sgd} / USD {m.usd} |{' '}
                      {m.days} days
                    </span>
                    <span className="flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const row = raw
                          setMethodForm({
                            name: String(row.name ?? ''),
                            carrier: String(row.carrier ?? ''),
                            rateType: (String(row.rate_type ?? 'FLAT') as 'FLAT' | 'FREE' | 'CALCULATED'),
                            flatRateLkr: String(row.flat_rate_lkr ?? ''),
                            flatRateSgd: String(row.flat_rate_sgd ?? ''),
                            flatRateUsd: String(row.flat_rate_usd ?? ''),
                            estimatedDays: String(row.estimated_days ?? ''),
                          })
                          setEditMethod({ zoneId: id, method: raw })
                          setAddToZone(null)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {m.active ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void deactM.mutateAsync(m.id).then(() => toast.success('Method deactivated.'))
                          }
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            void actM.mutateAsync(m.id).then(() => toast.success('Method activated.'))
                          }
                        >
                          Activate
                        </Button>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() => {
                setAddToZone(id)
                setEditMethod(null)
                setMethodForm({
                  name: '',
                  carrier: '',
                  rateType: 'FLAT',
                  flatRateLkr: '',
                  flatRateSgd: '',
                  flatRateUsd: '',
                  estimatedDays: '',
                })
              }}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Method
            </Button>
          </div>
        )
      })}
      <Dialog open={editMethod != null || addToZone != null} onOpenChange={() => {
        setEditMethod(null)
        setAddToZone(null)
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMethod ? 'Edit method' : 'New method'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={methodForm.name}
              onChange={(e) => setMethodForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Label>Carrier (optional)</Label>
            <Input
              value={methodForm.carrier}
              onChange={(e) => setMethodForm((f) => ({ ...f, carrier: e.target.value }))}
            />
            <Label>Rate type</Label>
            <Select
              value={methodForm.rateType}
              onValueChange={(v) =>
                setMethodForm((f) => ({ ...f, rateType: v as typeof methodForm.rateType }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FLAT">FLAT</SelectItem>
                <SelectItem value="FREE">FREE</SelectItem>
                <SelectItem value="CALCULATED">CALCULATED</SelectItem>
              </SelectContent>
            </Select>
            {methodForm.rateType === 'FLAT' && (
              <>
                <Label>Flat LKR</Label>
                <Input
                  type="number"
                  value={methodForm.flatRateLkr}
                  onChange={(e) => setMethodForm((f) => ({ ...f, flatRateLkr: e.target.value }))}
                />
                <Label>Flat SGD</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={methodForm.flatRateSgd}
                  onChange={(e) => setMethodForm((f) => ({ ...f, flatRateSgd: e.target.value }))}
                />
                <Label>Flat USD</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={methodForm.flatRateUsd}
                  onChange={(e) => setMethodForm((f) => ({ ...f, flatRateUsd: e.target.value }))}
                />
              </>
            )}
            <Label>Estimated days</Label>
            <Input
              value={methodForm.estimatedDays}
              onChange={(e) => setMethodForm((f) => ({ ...f, estimatedDays: e.target.value }))}
              placeholder="3-5 days"
            />
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                const zoneId = editMethod?.zoneId ?? addToZone
                if (!zoneId) return
                void saveMethod(zoneId, editMethod ? String(editMethod.method.id) : undefined)
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// —— Account tab ——

function AccountTab() {
  const router = useRouter()
  const qc = useQueryClient()
  const { user, admin, isLoading } = useAdminSession()
  const updateProfile = useUpdateAdminProfile()
  const changePw = useAdminChangePassword()

  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [curPw, setCurPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [newPw2, setNewPw2] = useState('')
  const [showLogout, setShowLogout] = useState(false)

  useEffect(() => {
    if (!user) return
    setFirst(user.firstName)
    setLast(user.lastName)
  }, [user])

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/admin/auth/logout')
    } catch {
      // ignore
    }
    qc.clear()
    void qc.removeQueries({ queryKey: ADMIN_SESSION_KEY })
    router.push('/admin/login')
    toast.success('You have been logged out.')
  }, [qc, router])

  if (isLoading || !user || !admin) return <AdminSettingsSkeleton />

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h3 className="mb-3 font-semibold text-gray-900">Your Account</h3>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="flex-1 min-w-[120px]">
              <Label>First name</Label>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div className="flex-1 min-w-[120px]">
              <Label>Last name</Label>
              <Input value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>
          <Button
            type="button"
            onClick={() =>
              void updateProfile.mutateAsync({ firstName: first.trim(), lastName: last.trim() }).then(() =>
                toast.success('Name updated.'),
              )
            }
          >
            Save Changes
          </Button>
          <p className="text-sm text-gray-500">
            Email: {user.email} (read-only)
          </p>
          <p className="text-sm text-gray-500">Role: {admin.role} (read-only)</p>
        </div>
      </div>
      <div>
        <h3 className="mb-3 font-semibold text-gray-900">Change Password</h3>
        <div className="space-y-2">
          <Label>Current password</Label>
          <Input type="password" value={curPw} onChange={(e) => setCurPw(e.target.value)} />
          <Label>New password</Label>
          <Input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
          <Label>Confirm new password</Label>
          <Input type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} />
        </div>
        <Button
          className="mt-3"
          type="button"
          onClick={() => {
            if (newPw.length < 8) {
              toast.error('New password must be at least 8 characters.')
              return
            }
            if (newPw !== newPw2) {
              toast.error('Passwords do not match.')
              return
            }
            void changePw
              .mutateAsync({ currentPassword: curPw, newPassword: newPw })
              .then(() => {
                toast.success('Password updated.')
                setCurPw('')
                setNewPw('')
                setNewPw2('')
              })
              .catch((e: ApiError) => {
                if (e.code === 'INCORRECT_PASSWORD') {
                  toast.error('Current password is incorrect.')
                } else {
                  toast.error(e.message ?? 'Failed')
                }
              })
          }}
        >
          Update Password
        </Button>
      </div>
      <div>
        <h3 className="mb-2 font-semibold text-gray-900">Session</h3>
        <p className="text-sm text-gray-600">Logged in as: {user.email}</p>
        <p className="text-sm text-gray-600">Session timeout: 15 minutes idle</p>
        <p className="text-sm text-gray-600">Last activity: Just now</p>
        <Button
          variant="destructive"
          className="mt-4 border border-red-200 bg-transparent text-red-600 hover:bg-red-50"
          type="button"
          onClick={() => setShowLogout(true)}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Log Out
        </Button>
        <p className="mt-2 text-xs text-gray-500">
          You will be redirected to the admin login page.
        </p>
      </div>
      <Dialog open={showLogout} onOpenChange={setShowLogout}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log out of the admin portal?</DialogTitle>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowLogout(false)}>
              Stay logged in
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowLogout(false)
                void handleLogout()
              }}
            >
              Confirm Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function AdminSettingsView() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { admin, isLoading } = useAdminSession()

  const tabParam = searchParams.get('tab') as SettingsTab | null
  const initialTab: SettingsTab =
    tabParam === 'team' || tabParam === 'shipping' || tabParam === 'account' ? tabParam : 'banner'
  const [tab, setTab] = useState<SettingsTab>(initialTab)

  useEffect(() => {
    if (tabParam && tabParam !== tab) {
      setTab(tabParam)
    }
  }, [tabParam, tab])

  const setTabNav = useCallback(
    (v: string | null) => {
      if (!v) return
      const t = v as SettingsTab
      setTab(t)
      router.replace(`/admin/settings?tab=${t}`, { scroll: false })
    },
    [router],
  )

  if (isLoading) return <AdminSettingsSkeleton />
  if (!admin) {
    router.replace('/admin/login')
    return null
  }

  const isOwner = admin.role === 'OWNER'

  return (
    <div className="max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">Settings</h1>
      <div className="block md:hidden">
        <Label className="mb-2 block">Section</Label>
        <Select value={tab} onValueChange={setTabNav}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="banner">Site Banner</SelectItem>
            <SelectItem value="team">Team</SelectItem>
            <SelectItem value="shipping">Shipping</SelectItem>
            <SelectItem value="account">Account</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Tabs value={tab} onValueChange={setTabNav} className="mt-4 md:mt-0">
        <div className="flex flex-col gap-6 md:flex-row">
          <TabsList className="hidden h-auto w-52 shrink-0 flex-col items-stretch rounded-lg border border-gray-200 bg-white p-1 shadow-sm md:flex">
            <TabsTrigger
              value="banner"
              className="justify-start rounded-md px-3 py-2 text-left text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-50"
            >
              <span>Site Banner</span>
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="justify-start rounded-md px-3 py-2 text-left text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-50"
            >
              <span>Team</span>
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="justify-start rounded-md px-3 py-2 text-left text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-50"
            >
              <span>Shipping</span>
            </TabsTrigger>
            <TabsTrigger
              value="account"
              className="justify-start rounded-md px-3 py-2 text-left text-sm data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=inactive]:text-gray-600 data-[state=inactive]:hover:bg-gray-50"
            >
              <span>Account</span>
            </TabsTrigger>
          </TabsList>
          <div className="min-w-0 flex-1">
            <TabsContent value="banner" className="mt-0 md:ml-0">
              <BannerTab />
            </TabsContent>
            <TabsContent value="team" className="mt-0">
              <TeamTab isOwner={isOwner} currentAdminId={admin.id} />
            </TabsContent>
            <TabsContent value="shipping" className="mt-0">
              <ShippingTab isOwner={isOwner} />
            </TabsContent>
            <TabsContent value="account" className="mt-0">
              <AccountTab />
            </TabsContent>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
