'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Package,
  X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminOrders, type OrderFilters } from '@/hooks/useAdminOrders'
import type {
  FulfillmentState,
  PaymentState,
  OrderState,
} from '@/types/admin'

function formatMoney(amount: string, currency: string): string {
  const num = Number.parseFloat(amount)
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  })
  return formatter.format(num)
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function FulfillmentBadge({ state }: { state: FulfillmentState }) {
  const config: Record<FulfillmentState, { label: string; className: string }> = {
    NOT_STARTED: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
    PACKED: { label: 'Packed', className: 'bg-blue-100 text-blue-800' },
    SHIPPED: { label: 'Shipped', className: 'bg-purple-100 text-purple-800' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', className: 'bg-indigo-100 text-indigo-800' },
    DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
  }
  const { label, className } = config[state] ?? {
    label: state,
    className: 'bg-gray-100 text-gray-800',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function PaymentBadge({ state }: { state: PaymentState }) {
  const config: Record<PaymentState, { label: string; className: string }> = {
    UNPAID: { label: 'Unpaid', className: 'bg-yellow-100 text-yellow-800' },
    PAID: { label: 'Paid', className: 'bg-green-100 text-green-800' },
    FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'Refunded', className: 'bg-gray-100 text-gray-800' },
    PARTIALLY_REFUNDED: { label: 'Partial Refund', className: 'bg-orange-100 text-orange-800' },
  }
  const { label, className } = config[state] ?? {
    label: state,
    className: 'bg-gray-100 text-gray-800',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function OrderStateBadge({ state }: { state: OrderState }) {
  if (state === 'CANCELLED') {
    return (
      <span className="inline-flex items-center rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
        Cancelled
      </span>
    )
  }
  return null
}

const FULFILLMENT_TABS: { value: FulfillmentState | 'all'; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'NOT_STARTED', label: 'Pending' },
  { value: 'PACKED', label: 'Packed' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
  { value: 'DELIVERED', label: 'Delivered' },
]

const PAYMENT_OPTIONS: { value: PaymentState | 'all'; label: string }[] = [
  { value: 'all', label: 'All Payments' },
  { value: 'PAID', label: 'Paid' },
  { value: 'UNPAID', label: 'Unpaid' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REFUNDED', label: 'Refunded' },
  { value: 'PARTIALLY_REFUNDED', label: 'Partial Refund' },
]

const ORDER_STATE_OPTIONS: { value: OrderState | 'all'; label: string }[] = [
  { value: 'all', label: 'All States' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function AdminOrdersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const initialFilters = useMemo(() => {
    const page = Number.parseInt(searchParams.get('page') ?? '1', 10)
    const fulfillmentState = searchParams.get('fulfillment') as FulfillmentState | null
    const paymentState = searchParams.get('payment') as PaymentState | null
    const orderState = searchParams.get('state') as OrderState | null
    const search = searchParams.get('search') ?? ''
    return { page, fulfillmentState, paymentState, orderState, search }
  }, [searchParams])

  const [page, setPage] = useState(initialFilters.page)
  const [search, setSearch] = useState(initialFilters.search)
  const [searchInput, setSearchInput] = useState(initialFilters.search)
  const [fulfillmentFilter, setFulfillmentFilter] = useState<FulfillmentState | 'all'>(
    initialFilters.fulfillmentState ?? 'all',
  )
  const [paymentFilter, setPaymentFilter] = useState<PaymentState | 'all'>(
    initialFilters.paymentState ?? 'all',
  )
  const [orderStateFilter, setOrderStateFilter] = useState<OrderState | 'all'>(
    initialFilters.orderState ?? 'all',
  )

  const filters: OrderFilters = useMemo(
    () => ({
      page,
      limit: 25,
      ...(fulfillmentFilter !== 'all' && { fulfillmentState: fulfillmentFilter }),
      ...(paymentFilter !== 'all' && { paymentState: paymentFilter }),
      ...(orderStateFilter !== 'all' && { orderState: orderStateFilter }),
      ...(search && { search }),
    }),
    [page, fulfillmentFilter, paymentFilter, orderStateFilter, search],
  )

  const { data, isLoading, error } = useAdminOrders(filters)

  const updateUrl = useCallback(
    (newFilters: Partial<OrderFilters & { search: string }>) => {
      const params = new URLSearchParams()
      const merged: OrderFilters & { search?: string } = {
        ...filters,
        search,
        ...newFilters,
      }

      if (merged.page != null && merged.page > 1) {
        params.set('page', String(merged.page))
      }
      if (merged.fulfillmentState) {
        params.set('fulfillment', merged.fulfillmentState)
      }
      if (merged.paymentState) params.set('payment', merged.paymentState)
      if (merged.orderState) params.set('state', merged.orderState)
      if (merged.search?.trim()) params.set('search', merged.search.trim())

      const query = params.toString()
      router.push(`/admin/orders${query ? `?${query}` : ''}`, { scroll: false })
    },
    [filters, router, search],
  )

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
    updateUrl({ search: searchInput, page: 1 })
  }

  const handleFulfillmentChange = (value: string) => {
    const newValue = value as FulfillmentState | 'all'
    setFulfillmentFilter(newValue)
    setPage(1)
    updateUrl({
      fulfillmentState: newValue === 'all' ? undefined : newValue,
      page: 1,
    })
  }

  const handlePaymentChange = (value: string) => {
    const newValue = value as PaymentState | 'all'
    setPaymentFilter(newValue)
    setPage(1)
    updateUrl({
      paymentState: newValue === 'all' ? undefined : newValue,
      page: 1,
    })
  }

  const handleOrderStateChange = (value: string) => {
    const newValue = value as OrderState | 'all'
    setOrderStateFilter(newValue)
    setPage(1)
    updateUrl({
      orderState: newValue === 'all' ? undefined : newValue,
      page: 1,
    })
  }

  const clearFilters = () => {
    setSearch('')
    setSearchInput('')
    setFulfillmentFilter('all')
    setPaymentFilter('all')
    setOrderStateFilter('all')
    setPage(1)
    router.push('/admin/orders')
  }

  const hasActiveFilters =
    Boolean(search) ||
    fulfillmentFilter !== 'all' ||
    paymentFilter !== 'all' ||
    orderStateFilter !== 'all'

  const limit = filters.limit ?? 25
  const totalPages = data ? Math.ceil(data.total / limit) : 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Orders</h1>
          <p className="mt-1 text-sm text-gray-500">Manage and fulfill customer orders</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                <div className="relative flex-1">
                  <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by order ref or email..."
                    className="w-full rounded-lg border border-gray-200 py-2 pr-4 pl-10 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
                  />
                </div>
                <Button type="submit" variant="outline" size="sm">
                  Search
                </Button>
              </form>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                >
                  <Filter className="h-4 w-4" />
                  Payment
                  {paymentFilter !== 'all' && (
                    <Badge variant="secondary" className="ml-1">
                      {PAYMENT_OPTIONS.find((o) => o.value === paymentFilter)?.label}
                    </Badge>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Payment Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={paymentFilter} onValueChange={handlePaymentChange}>
                    {PAYMENT_OPTIONS.map((opt) => (
                      <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}
                >
                  <Filter className="h-4 w-4" />
                  State
                  {orderStateFilter !== 'all' && (
                    <Badge variant="secondary" className="ml-1">
                      {ORDER_STATE_OPTIONS.find((o) => o.value === orderStateFilter)?.label}
                    </Badge>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Order State</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={orderStateFilter}
                    onValueChange={handleOrderStateChange}
                  >
                    {ORDER_STATE_OPTIONS.map((opt) => (
                      <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            <Tabs value={fulfillmentFilter} onValueChange={handleFulfillmentChange}>
              <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 lg:inline-grid lg:w-auto">
                {FULFILLMENT_TABS.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6">
              <OrdersTableSkeleton />
            </div>
          ) : error ? (
            <div className="p-6 text-center text-red-600">Failed to load orders. Please try again.</div>
          ) : !data?.orders.length ? (
            <div className="p-12 text-center">
              <Package className="mx-auto mb-4 h-12 w-12 text-gray-300" />
              <p className="text-gray-500">No orders found</p>
              {hasActiveFilters && (
                <Button variant="link" onClick={clearFilters} className="mt-2">
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className="text-center">Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.orders.map((order) => (
                    <TableRow
                      key={order.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/admin/orders/${order.id}`)}
                    >
                      <TableCell>
                        <span className="font-medium text-blue-600">{order.orderRef}</span>
                        {order.orderState === 'CANCELLED' && (
                          <div className="mt-1">
                            <OrderStateBadge state={order.orderState} />
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">{order.customerEmail}</div>
                      </TableCell>
                      <TableCell>
                        <FulfillmentBadge state={order.fulfillmentState} />
                      </TableCell>
                      <TableCell>
                        <PaymentBadge state={order.paymentState} />
                      </TableCell>
                      <TableCell className="text-center">{order.itemCount}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(order.totalAmount, order.currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-gray-500">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                  <div className="text-sm text-gray-500">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, data.total)} of{' '}
                    {data.total} orders
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = page - 1
                        setPage(next)
                        updateUrl({ page: next })
                      }}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-gray-600">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next = page + 1
                        setPage(next)
                        updateUrl({ page: next })
                      }}
                      disabled={page >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function OrdersTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-8" />
          <Skeleton className="ml-auto h-4 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}
