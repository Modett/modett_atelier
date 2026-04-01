'use client'

import { Fragment, useMemo, useState } from 'react'
import { FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAuditLog, useAdminAdminsList, type AuditLogRow } from '@/hooks/useAuditLog'

const ACTION_LABELS: Record<string, string> = {
  CREATE_PRODUCT: 'Created product',
  UPDATE_PRODUCT: 'Updated product',
  DELETE_PRODUCT: 'Deleted product',
  ACTIVATE_BANNER: 'Activated banner',
  RESTOCK_VARIANT: 'Restocked inventory',
  MARK_DAMAGED: 'Marked units damaged',
  ADJUST_OUT: 'Adjusted units out',
  UPDATE_FULFILLMENT: 'Updated fulfillment status',
  CANCEL_ORDER: 'Cancelled order',
  UPDATE_ADDRESS: 'Updated shipping address',
  APPROVE_RETURN: 'Approved return',
  REJECT_RETURN: 'Rejected return',
  FULFIL_RETURN: 'Fulfilled return',
  GRANT_POINTS: 'Granted loyalty points',
  ADJUST_POINTS: 'Adjusted loyalty points',
  INVITE_ADMIN: 'Invited admin',
  SUSPEND_ADMIN: 'Suspended admin',
  CHANGE_ROLE: 'Changed admin role',
}

const ACTION_OPTIONS = Object.keys(ACTION_LABELS).sort()

const ENTITY_TYPES = [
  'product',
  'order',
  'user',
  'variant',
  'return_request',
  'admin',
  'admin_invite',
  'banner',
] as const

function DiffTable({ before, after }: { before: unknown; after: unknown }) {
  const b = (before ?? {}) as Record<string, unknown>
  const a = (after ?? {}) as Record<string, unknown>
  const keys = [...new Set([...Object.keys(b), ...Object.keys(a)])]
  const changed = keys.filter((k) => JSON.stringify(b[k]) !== JSON.stringify(a[k]))
  if (changed.length === 0) {
    return <p className="text-xs text-gray-400">No field-level diff available.</p>
  }
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="text-left">
          <th className="pb-1 font-medium">Field</th>
          <th className="pb-1 font-medium">Before</th>
          <th className="pb-1 font-medium">After</th>
        </tr>
      </thead>
      <tbody>
        {changed.map((k) => (
          <tr key={k} className="border-t border-gray-100">
            <td className="py-1 font-mono text-gray-500">{k}</td>
            <td className="max-w-[200px] truncate py-1 text-red-600">
              {JSON.stringify(b[k]) ?? '—'}
            </td>
            <td className="max-w-[200px] truncate py-1 text-green-600">
              {JSON.stringify(a[k]) ?? '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatTs(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1)
  const [adminId, setAdminId] = useState<string>('')
  const [action, setAction] = useState<string>('')
  const [entityType, setEntityType] = useState<string>('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  const filters = useMemo(
    () => ({
      page,
      limit: 50,
      adminId: adminId || undefined,
      action: action || undefined,
      entityType: entityType || undefined,
      from: from || undefined,
      to: to || undefined,
    }),
    [page, adminId, action, entityType, from, to],
  )

  const { data, isLoading } = useAuditLog(filters)
  const { data: admins } = useAdminAdminsList()

  function clearFilters() {
    setPage(1)
    setAdminId('')
    setAction('')
    setEntityType('')
    setFrom('')
    setTo('')
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
          <FileText className="h-7 w-7" />
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-gray-500">Immutable record of admin mutations</p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Select
            value={adminId || '__all__'}
            onValueChange={(v) => {
              if (v == null) return
              setPage(1)
              setAdminId(v === '__all__' ? '' : v)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Admin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All admins</SelectItem>
              {(admins ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.user.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={action || '__all__'}
            onValueChange={(v) => {
              if (v == null) return
              setPage(1)
              setAction(v === '__all__' ? '' : v)
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All actions</SelectItem>
              {ACTION_OPTIONS.map((k) => (
                <SelectItem key={k} value={k}>
                  {ACTION_LABELS[k] ?? k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={entityType || '__all__'}
            onValueChange={(v) => {
              if (v == null) return
              setPage(1)
              setEntityType(v === '__all__' ? '' : v)
            }}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All entities</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <input
            type="date"
            className="h-9 rounded-md border border-gray-200 px-2 text-sm"
            value={from}
            onChange={(e) => {
              setPage(1)
              setFrom(e.target.value)
            }}
            aria-label="From date"
          />
          <input
            type="date"
            className="h-9 rounded-md border border-gray-200 px-2 text-sm"
            value={to}
            onChange={(e) => {
              setPage(1)
              setTo(e.target.value)
            }}
            aria-label="To date"
          />

          <Button type="button" variant="outline" size="sm" onClick={clearFilters}>
            Clear
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Label</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))}
              {!isLoading &&
                (data?.logs.length ?? 0) === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-gray-500">
                      No audit log entries found.
                    </TableCell>
                  </TableRow>
                )}
              {!isLoading &&
                (data?.logs ?? []).map((row: AuditLogRow) => (
                  <Fragment key={row.id}>
                    <TableRow
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() =>
                        setExpanded((e) => (e === row.id ? null : row.id))
                      }
                    >
                      <TableCell className="whitespace-nowrap text-xs">
                        {formatTs(row.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{row.adminEmail}</div>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium uppercase">
                          {row.currentRole ?? row.adminRole}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {ACTION_LABELS[row.action] ?? row.action}
                      </TableCell>
                      <TableCell>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">
                          {row.entityType}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm">
                        {row.entityLabel ?? '—'}
                      </TableCell>
                    </TableRow>
                    {expanded === row.id && (
                      <TableRow>
                        <TableCell colSpan={5} className="bg-gray-50 p-4">
                          <DiffTable before={row.beforeJson} after={row.afterJson} />
                          <p className="mt-2 font-mono text-[10px] text-gray-500">
                            Entity ID: {row.entityId ?? '—'} · IP: {row.ipAddress ?? '—'}
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
            </TableBody>
          </Table>

          {data != null && totalPages > 1 && (
            <div className="flex items-center justify-between border-t p-3 text-sm">
              <span className="text-gray-500">
                Page {data.page} of {totalPages} ({data.total} total)
              </span>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
