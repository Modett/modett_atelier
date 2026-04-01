'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminCustomerDetail, useAdminCustomerSearch } from '@/hooks/useAdminCustomers'

interface SearchCustomerRow {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: string
  loyalty_balance: number | null
  loyalty_tier: string | null
  composite_score: string | null
  order_count: number
  total_spent_lkr: string
}

function tierBadgeClass(tier: string | null): string {
  const t = (tier ?? '').toUpperCase()
  if (t === 'GOLD') return 'bg-amber-100 text-amber-900'
  if (t === 'SILVER') return 'bg-gray-200 text-gray-800'
  if (t === 'BRONZE') return 'bg-amber-50 text-amber-800'
  return 'bg-gray-100 text-gray-600'
}

function formatJoined(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatLkr(amount: string): string {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    maximumFractionDigits: 0,
  }).format(n)
}

export default function AdminCustomersPage() {
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const search = useAdminCustomerSearch(q, page)
  const detail = useAdminCustomerDetail(selectedId)

  const customers = (search.data?.customers ?? []) as SearchCustomerRow[]
  const totalPages = search.data
    ? Math.ceil(search.data.total / search.data.limit)
    : 0

  const user = detail.data?.user as
    | {
        id: string
        firstName: string
        lastName: string
        email: string
        createdAt: string
      }
    | undefined

  const loyalty = detail.data?.loyalty as
    | {
        account: {
          balance: number
          tier: string
          composite_score: string
          last_activity_at?: string
        } | null
        ledger: Array<Record<string, unknown>>
      }
    | undefined

  const orders = (detail.data?.orders ?? []) as Array<Record<string, unknown>>
  const reviews = (detail.data?.reviews ?? []) as Array<Record<string, unknown>>
  const returns = (detail.data?.returns ?? []) as Array<Record<string, unknown>>
  const addresses = (detail.data?.addresses ?? []) as Array<Record<string, unknown>>
  const preferences = detail.data?.preferences as Record<string, unknown> | null | undefined

  const showMobileDetail = selectedId !== null

  const emailOptIn = preferences?.email_opt_in === true
  const smsOptIn = preferences?.sms_opt_in === true

  const headerSpent = useMemo(() => {
    const row = customers.find((c) => c.id === selectedId)
    if (!row) return null
    return formatLkr(row.total_spent_lkr)
  }, [customers, selectedId])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-gray-900">
          <Users className="h-7 w-7" />
          Customers
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Search by name or email (min. 2 characters)
        </p>
      </div>

      <div className="relative max-w-xl">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          className="pl-9"
          placeholder="Search by name or email…"
          value={q}
          onChange={(e) => {
            setPage(1)
            setSelectedId(null)
            setQ(e.target.value)
          }}
          aria-label="Search customers"
        />
      </div>

      <div
        className={`
          flex flex-col gap-4
          lg:flex-row lg:items-start
          ${showMobileDetail ? 'max-lg:fixed max-lg:inset-0 max-lg:z-20 max-lg:bg-gray-50 max-lg:p-4 max-lg:overflow-y-auto' : ''}
        `}
      >
        <div
          className={`
            w-full shrink-0 space-y-3
            lg:w-[35%]
            ${showMobileDetail ? 'max-lg:hidden' : ''}
          `}
        >
          <h2 className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
            Search results
          </h2>
          {q.trim().length > 0 && q.trim().length < 2 && (
            <p className="text-sm text-gray-500">Type at least 2 characters to search.</p>
          )}
          {search.isFetching && q.trim().length >= 2 && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          )}
          {!search.isFetching &&
            q.trim().length >= 2 &&
            customers.length === 0 && (
              <p className="text-sm text-gray-500">
                No customers found matching &apos;{q.trim()}&apos;
              </p>
            )}
          {!search.isFetching &&
            customers.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={`
                  w-full rounded-lg border p-3 text-left transition-colors
                  ${selectedId === c.id
                    ? 'border-gray-900 bg-white shadow-sm'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    {c.first_name} {c.last_name}
                  </span>
                  {c.loyalty_tier && (
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${tierBadgeClass(c.loyalty_tier)}`}
                    >
                      {c.loyalty_tier}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-gray-600">{c.email}</p>
                <p className="mt-2 text-xs text-gray-500">
                  {c.order_count} {c.order_count === 1 ? 'order' : 'orders'} ·{' '}
                  {formatLkr(c.total_spent_lkr)} spent (LKR)
                </p>
                {c.composite_score != null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Score: {c.composite_score} · Joined {formatJoined(c.created_at)}
                  </p>
                )}
                {c.composite_score == null && (
                  <p className="mt-1 text-xs text-gray-500">
                    Joined {formatJoined(c.created_at)}
                  </p>
                )}
              </button>
            ))}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 text-sm">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-gray-500">
                Page {page} / {totalPages}
              </span>
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
          )}
        </div>

        <div
          className={`
            min-w-0 flex-1
            ${!showMobileDetail ? 'max-lg:hidden lg:block' : 'max-lg:block'}
          `}
        >
          {showMobileDetail && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mb-4 lg:hidden"
              onClick={() => setSelectedId(null)}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to results
            </Button>
          )}

          {!selectedId && (
            <Card className="border-dashed">
              <CardContent className="flex min-h-[280px] items-center justify-center p-8 text-center text-sm text-gray-500">
                Search for a customer above to view their profile
              </CardContent>
            </Card>
          )}

          {selectedId && detail.isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-48 w-full" />
            </div>
          )}

          {selectedId && detail.isError && (
            <p className="text-sm text-red-600">Could not load customer.</p>
          )}

          {selectedId && user && !detail.isLoading && (
            <div className="space-y-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {user.firstName} {user.lastName}
                  </h2>
                  {loyalty?.account && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold uppercase ${tierBadgeClass(loyalty.account.tier)}`}
                    >
                      {loyalty.account.tier}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {user.email} · Member since {formatJoined(user.createdAt)}
                </p>
                {headerSpent && (
                  <p className="mt-1 text-sm text-gray-500">
                    {customers.find((c) => c.id === selectedId)?.order_count ?? 0} orders ·{' '}
                    {headerSpent} total spent (LKR, paid orders)
                  </p>
                )}
              </div>

              <Tabs defaultValue="overview">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="orders">Orders</TabsTrigger>
                  <TabsTrigger value="reviews">Reviews</TabsTrigger>
                  <TabsTrigger value="returns">Returns</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-4">
                  <Card>
                    <CardContent className="space-y-2 p-4 text-sm">
                      <h3 className="font-semibold text-gray-900">Loyalty</h3>
                      {loyalty?.account ? (
                        <>
                          <p>
                            Balance:{' '}
                            <span className="font-medium">{loyalty.account.balance}</span> pts
                          </p>
                          <p>
                            Tier:{' '}
                            <span className="font-medium">{loyalty.account.tier}</span>
                          </p>
                          <p>
                            Composite score:{' '}
                            <span className="font-medium">
                              {loyalty.account.composite_score}
                            </span>
                          </p>
                          {loyalty.account.last_activity_at && (
                            <p className="text-xs text-gray-500">
                              Last activity:{' '}
                              {formatJoined(loyalty.account.last_activity_at)}
                            </p>
                          )}
                          <p className="text-xs text-gray-500">
                            Last ledger entries: {loyalty.ledger.length} loaded
                          </p>
                        </>
                      ) : (
                        <p className="text-gray-500">No loyalty account</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <h3 className="mb-2 font-semibold text-gray-900">Saved addresses</h3>
                      {addresses.length === 0 && (
                        <p className="text-sm text-gray-500">No saved addresses</p>
                      )}
                      <ul className="space-y-2 text-sm">
                        {addresses.map((a) => {
                          const id = String(a.id ?? '')
                          const label = (a.label as string) || 'Address'
                          const aj = a.addressJson as Record<string, unknown> | undefined
                          const line1 = aj && typeof aj.line1 === 'string' ? aj.line1 : ''
                          const city = aj && typeof aj.city === 'string' ? aj.city : ''
                          const cc = (a.countryCode as string) || ''
                          return (
                            <li key={id} className="rounded border border-gray-100 p-2">
                              <span className="font-medium">{label}</span>
                              {line1 && <p className="text-gray-600">{line1}</p>}
                              {(city || cc) && (
                                <p className="text-xs text-gray-500">
                                  {city}
                                  {city && cc ? ' · ' : ''}
                                  {cc}
                                </p>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="space-y-1 p-4 text-sm">
                      <h3 className="mb-2 font-semibold text-gray-900">
                        Notification preferences
                      </h3>
                      {preferences == null && (
                        <p className="text-gray-500">No preferences on file</p>
                      )}
                      {preferences != null && (
                        <>
                          <p>Email: {emailOptIn ? 'Opted in' : 'Opted out'}</p>
                          <p>SMS: {smsOptIn ? 'Opted in' : 'Opted out'}</p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="orders" className="mt-4">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Ref</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Currency</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {orders.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                No orders
                              </TableCell>
                            </TableRow>
                          )}
                          {orders.map((o) => {
                            const ref = String(o.order_ref ?? '')
                            const created = o.created_at
                              ? formatJoined(String(o.created_at))
                              : '—'
                            return (
                              <TableRow key={String(o.id)}>
                                <TableCell className="text-xs whitespace-nowrap">
                                  {created}
                                </TableCell>
                                <TableCell>
                                  <a
                                    href={`/admin/orders/${encodeURIComponent(ref)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {ref}
                                  </a>
                                </TableCell>
                                <TableCell className="text-xs">
                                  {String(o.fulfillment_state ?? o.order_state ?? '—')}
                                </TableCell>
                                <TableCell className="text-xs">
                                  {String(o.currency ?? '—')}
                                </TableCell>
                                <TableCell className="text-right text-xs">
                                  {String(o.total ?? '—')}
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="reviews" className="mt-4 space-y-3">
                  {reviews.length === 0 && (
                    <p className="text-sm text-gray-500">No reviews</p>
                  )}
                  {reviews.map((r) => {
                    const body = String(r.body ?? '')
                    const short = body.length > 80 ? `${body.slice(0, 80)}…` : body
                    return (
                      <Card key={String(r.id)}>
                        <CardContent className="space-y-1 p-3 text-sm">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="font-medium">{String(r.product_name ?? '')}</span>
                            <span className="text-xs text-amber-700">
                              {'★'.repeat(Number(r.rating) || 0)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {String(r.status ?? '')} ·{' '}
                            {r.created_at ? formatJoined(String(r.created_at)) : ''}
                          </p>
                          <p className="text-gray-700">{short}</p>
                        </CardContent>
                      </Card>
                    )
                  })}
                </TabsContent>

                <TabsContent value="returns" className="mt-4">
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Return ID</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Submitted</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {returns.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-gray-500">
                                No active returns
                              </TableCell>
                            </TableRow>
                          )}
                          {returns.map((r) => (
                            <TableRow key={String(r.id)}>
                              <TableCell className="font-mono text-xs">
                                {String(r.id).slice(0, 8)}…
                              </TableCell>
                              <TableCell>
                                <Link
                                  href="/admin/returns"
                                  className="text-blue-600 hover:underline"
                                >
                                  {String(r.order_ref ?? '—')}
                                </Link>
                              </TableCell>
                              <TableCell className="text-xs">{String(r.status ?? '')}</TableCell>
                              <TableCell className="text-xs">
                                {String(r.item_count ?? '—')}
                              </TableCell>
                              <TableCell className="text-xs whitespace-nowrap">
                                {r.created_at ? formatJoined(String(r.created_at)) : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
