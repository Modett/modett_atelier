'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  Star,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import {
  useFlaggedReviews,
  useLowStockVariants,
  useNotifyMeDemand,
  usePendingReturns,
  useRecentOrders,
} from '@/hooks/useAdminDashboard'
import type {
  AdminOrderSummary,
  AdminReturnSummary,
  FlaggedReview,
  FulfillmentState,
  LowStockVariant,
  NotifyMeDemandItem,
  PaymentState,
  ReturnStatus,
} from '@/types/admin'

function formatMoney(amount: string, currency: string): string {
  const num = Number.parseFloat(amount)
  const formatter = new Intl.NumberFormat('en-US', {
    style:                 'currency',
    currency,
    minimumFractionDigits: 2,
  })
  return formatter.format(num)
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

function FulfillmentBadge({ state }: { state: FulfillmentState }) {
  const config: Record<
    FulfillmentState,
    { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
  > = {
    NOT_STARTED:      { label: 'Pending', variant: 'secondary' },
    PACKED:           { label: 'Packed', variant: 'outline' },
    SHIPPED:          { label: 'Shipped', variant: 'default' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', variant: 'default' },
    DELIVERED:        { label: 'Delivered', variant: 'default' },
  }
  const { label, variant } = config[state]
  return <Badge variant={variant}>{label}</Badge>
}

function PaymentBadge({ state }: { state: PaymentState }) {
  const config: Record<PaymentState, { label: string; className: string }> = {
    UNPAID:               { label: 'Unpaid', className: 'bg-yellow-100 text-yellow-800' },
    PAID:                 { label: 'Paid', className: 'bg-green-100 text-green-800' },
    FAILED:               { label: 'Failed', className: 'bg-red-100 text-red-800' },
    REFUNDED:             { label: 'Refunded', className: 'bg-gray-100 text-gray-800' },
    PARTIALLY_REFUNDED:   { label: 'Partial Refund', className: 'bg-orange-100 text-orange-800' },
  }
  const { label, className } = config[state]
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  const config: Record<ReturnStatus, { label: string; className: string }> = {
    SUBMITTED:      { label: 'New', className: 'bg-blue-100 text-blue-800' },
    PENDING_REVIEW: { label: 'Under Review', className: 'bg-yellow-100 text-yellow-800' },
    APPROVED:       { label: 'Approved', className: 'bg-green-100 text-green-800' },
    REJECTED:       { label: 'Rejected', className: 'bg-red-100 text-red-800' },
    FULFILLED:      { label: 'Fulfilled', className: 'bg-gray-100 text-gray-800' },
  }
  const { label, className } = config[status]
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

export default function AdminDashboardPage() {
  const { data: ordersData, isLoading: ordersLoading } = useRecentOrders()
  const { data: returnsData, isLoading: returnsLoading } = usePendingReturns()
  const { data: stockData, isLoading: stockLoading } = useLowStockVariants()
  const { data: notifyMeData, isLoading: notifyMeLoading } = useNotifyMeDemand()
  const { data: flaggedData, isLoading: flaggedLoading } = useFlaggedReviews()

  const stats = useMemo(
    () => ({
      todayOrders:    ordersData?.total ?? 0,
      pendingReturns:
        (returnsData?.totalSubmitted ?? 0) + (returnsData?.totalPendingReview ?? 0),
      lowStock:       stockData?.lowStockItems.length ?? 0,
      outOfStock:     stockData?.outOfStockItems.length ?? 0,
      flaggedReviews: flaggedData?.total ?? 0,
    }),
    [ordersData, returnsData, stockData, flaggedData],
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your store&apos;s performance and alerts
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatsCard
          alert={false}
          href="/admin/orders"
          icon={ShoppingCart}
          loading={ordersLoading}
          title="Orders (total)"
          value={stats.todayOrders}
        />
        <StatsCard
          alert={stats.pendingReturns > 0}
          alertColor="blue"
          href="/admin/returns"
          icon={RotateCcw}
          loading={returnsLoading}
          title="Pending Returns"
          value={stats.pendingReturns}
        />
        <StatsCard
          alert={stats.lowStock > 0}
          alertColor="amber"
          href="/admin/inventory?filter=low"
          icon={AlertTriangle}
          loading={stockLoading}
          title="Low Stock"
          value={stats.lowStock}
        />
        <StatsCard
          alert={stats.outOfStock > 0}
          alertColor="red"
          href="/admin/inventory?filter=out"
          icon={XCircle}
          loading={stockLoading}
          title="Out of Stock"
          value={stats.outOfStock}
        />
        <StatsCard
          alert={stats.flaggedReviews > 0}
          alertColor="blue"
          href="/admin/reviews?filter=flagged"
          icon={Star}
          loading={flaggedLoading}
          title="Flagged Reviews"
          value={stats.flaggedReviews}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Recent Orders</CardTitle>
            <Link href="/admin/orders">
              <Button className="text-xs" size="sm" variant="ghost">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <OrdersTableSkeleton />
            ) : ordersData?.orders.length === 0 ? (
              <EmptyState icon={Package} message="No orders yet" />
            ) : (
              <ScrollArea className="h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ordersData?.orders.slice(0, 8).map((order: AdminOrderSummary) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link
                            className="font-medium text-blue-600 hover:underline"
                            href={`/admin/orders/${order.id}`}
                          >
                            {order.orderRef}
                          </Link>
                          <div className="text-xs text-gray-500">
                            {formatRelativeTime(order.createdAt)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate">{order.customerName}</div>
                          <div className="max-w-[150px] truncate text-xs text-gray-500">
                            {order.customerEmail}
                          </div>
                        </TableCell>
                        <TableCell>
                          <FulfillmentBadge state={order.fulfillmentState} />
                        </TableCell>
                        <TableCell>
                          <PaymentBadge state={order.paymentState} />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatMoney(order.totalAmount, order.currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Pending Returns</CardTitle>
            <Link href="/admin/returns">
              <Button className="text-xs" size="sm" variant="ghost">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {returnsLoading ? (
              <ListSkeleton count={4} />
            ) : returnsData?.returns.length === 0 ? (
              <EmptyState icon={CheckCircle2} message="No pending returns" positive />
            ) : (
              <ScrollArea className="h-[300px]">
                <div className="space-y-3">
                  {returnsData?.returns.slice(0, 6).map((ret: AdminReturnSummary) => (
                    <Link
                      key={ret.id}
                      className="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
                      href={`/admin/returns/${ret.id}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">
                            {ret.customerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            Order {ret.orderRef}
                            {ret.itemCount > 0
                              ? ` · ${ret.itemCount} item${ret.itemCount !== 1 ? 's' : ''}`
                              : ''}
                          </div>
                        </div>
                        <ReturnStatusBadge status={ret.status} />
                      </div>
                      <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(ret.createdAt)}
                        <span className="text-gray-300">·</span>
                        <span
                          className={
                            ret.type === 'REFUND' ? 'text-red-600' : 'text-blue-600'
                          }
                        >
                          {ret.type}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs className="w-full" defaultValue="low">
              <TabsList className="mb-4 grid w-full grid-cols-2">
                <TabsTrigger className="text-sm" value="low">
                  Low Stock ({stats.lowStock})
                </TabsTrigger>
                <TabsTrigger className="text-sm" value="out">
                  Out of Stock ({stats.outOfStock})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="low">
                {stockLoading ? (
                  <ListSkeleton count={4} />
                ) : stockData?.lowStockItems.length === 0 ? (
                  <EmptyState icon={CheckCircle2} message="All items well stocked" positive />
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {stockData?.lowStockItems.slice(0, 10).map((item) => (
                        <StockAlertRow key={item.variantId} item={item} type="low" />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent value="out">
                {stockLoading ? (
                  <ListSkeleton count={4} />
                ) : stockData?.outOfStockItems.length === 0 ? (
                  <EmptyState icon={CheckCircle2} message="No items out of stock" positive />
                ) : (
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-2">
                      {stockData?.outOfStockItems.slice(0, 10).map((item) => (
                        <StockAlertRow key={item.variantId} item={item} type="out" />
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Bell className="h-4 w-4" />
              Restock Demand
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifyMeLoading ? (
              <ListSkeleton count={4} />
            ) : !notifyMeData || notifyMeData.length === 0 ? (
              <EmptyState icon={Bell} message="No notify-me requests" />
            ) : (
              <ScrollArea className="h-[260px]">
                <div className="space-y-3">
                  {notifyMeData.slice(0, 8).map((item: NotifyMeDemandItem, idx) => (
                    <div
                      key={item.variantId}
                      className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-50"
                    >
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">
                          {item.productName}
                        </div>
                        <div className="text-xs text-gray-500">
                          {item.color} · {item.size}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{item.requestCount}</div>
                        <div className="text-xs text-gray-500">waiting</div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Star className="h-4 w-4 text-amber-500" />
            Flagged Reviews
          </CardTitle>
          <Link href="/admin/reviews?filter=flagged">
            <Button className="text-xs" size="sm" variant="ghost">
              View all <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {flaggedLoading ? (
            <ListSkeleton count={3} />
          ) : !flaggedData || flaggedData.total === 0 ? (
            <EmptyState icon={Star} message="No flagged reviews" positive />
          ) : (
            <div className="space-y-3">
              {flaggedData.reviews.slice(0, 3).map((review: FlaggedReview) => (
                <FlaggedReviewRow key={review.id} review={review} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function StatsCard({
  title,
  value,
  icon: Icon,
  href,
  loading,
  alert,
  alertColor = 'blue',
}: {
  title: string
  value: number
  icon: React.ElementType
  href: string
  loading?: boolean
  alert?: boolean
  alertColor?: 'blue' | 'amber' | 'red'
}) {
  const colorMap = {
    blue:  'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    red:   'bg-red-50 text-red-600',
  } as const

  const ringMap = {
    blue:  'ring-2 ring-blue-200',
    amber: 'ring-2 ring-amber-200',
    red:   'ring-2 ring-red-200',
  } as const

  const pulseMap = {
    blue:  'bg-blue-500',
    amber: 'bg-amber-500',
    red:   'bg-red-500',
  } as const

  return (
    <Link href={href}>
      <Card
        className={`transition-shadow hover:shadow-md ${alert ? ringMap[alertColor] : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div
              className={`rounded-lg p-2 ${
                alert ? colorMap[alertColor] : 'bg-gray-100 text-gray-600'
              }`}
            >
              <Icon className="h-4 w-4" />
            </div>
            {alert && (
              <span
                className={`h-2 w-2 animate-pulse rounded-full ${pulseMap[alertColor]}`}
              />
            )}
          </div>
          <div className="mt-3">
            {loading ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
            )}
            <div className="mt-1 text-xs text-gray-500">{title}</div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

function StockAlertRow({ item, type }: { item: LowStockVariant; type: 'low' | 'out' }) {
  return (
    <Link
      className="flex items-center justify-between rounded-lg p-2 transition-colors hover:bg-gray-50"
      href={`/admin/inventory?variant=${item.variantId}`}
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{item.productName}</div>
        <div className="text-xs text-gray-500">
          {item.color} · {item.size} · {item.sku}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={`text-sm font-semibold ${
            type === 'out' ? 'text-red-600' : 'text-amber-600'
          }`}
        >
          {item.availableQty}
        </span>
        <span className="text-xs text-gray-400">/ {item.lowStockThreshold}</span>
        <Button className="h-7 text-xs" size="sm" variant="outline">
          <RefreshCw className="mr-1 h-3 w-3" />
          Restock
        </Button>
      </div>
    </Link>
  )
}

function FlaggedReviewRow({ review }: { review: FlaggedReview }) {
  const stars = Array.from({ length: 5 }, (_, i) => i < review.rating)

  return (
    <Link
      className="block rounded-lg border border-gray-100 p-3 transition-colors hover:bg-gray-50"
      href={`/admin/reviews/${review.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <div className="flex">
              {stars.map((filled, i) => (
                <Star
                  key={i}
                  className={`h-3 w-3 ${filled ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`}
                />
              ))}
            </div>
            <span className="text-sm font-medium">{review.productName}</span>
          </div>
          {review.body && (
            <p className="mt-1 line-clamp-2 text-sm text-gray-600">{review.body}</p>
          )}
          <div className="mt-2 text-xs text-gray-500">
            by {review.customerName} · {formatRelativeTime(review.createdAt)}
          </div>
        </div>
        <Badge className="text-xs" variant="destructive">
          {review.flagReason}
        </Badge>
      </div>
    </Link>
  )
}

function EmptyState({
  message,
  icon: Icon,
  positive,
}: {
  message: string
  icon: React.ElementType
  positive?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div
        className={`mb-3 rounded-full p-3 ${positive ? 'bg-green-50' : 'bg-gray-100'}`}
      >
        <Icon
          className={`h-5 w-5 ${positive ? 'text-green-600' : 'text-gray-400'}`}
        />
      </div>
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )
}

function OrdersTableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="ml-auto h-4 w-20" />
        </div>
      ))}
    </div>
  )
}

function ListSkeleton({ count }: { count: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 max-w-[240px]" />
            <Skeleton className="h-3 w-1/2 max-w-[160px]" />
          </div>
        </div>
      ))}
    </div>
  )
}
