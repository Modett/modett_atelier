'use client'

import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useAnalyticsToday,
  useAnalyticsRevenue,
  useAnalyticsFunnel,
  useAnalyticsRevenueByCurrency,
  type AnalyticsPeriod,
  type RevenueSeriesPoint,
} from '@/hooks/useAnalyticsDashboard'

const COLORS = { LKR: '#3D2E26', SGD: '#4285F4', USD: '#34A853' } as const

function formatMoney(amount: string, currency: string): string {
  const n = Number.parseFloat(amount)
  if (Number.isNaN(n)) return amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function FunnelChart({
  data,
}: {
  data: {
    productViews: number
    addToCart: number
    checkoutStarts: number
    purchases: number
    viewToCartPct: number
    cartToCheckoutPct: number
    checkoutToPurchasePct: number
    overallConversionPct: number
  }
}) {
  const stages = [
    {
      label: 'Product Views',
      value: data.productViews,
      pct: 100,
      drop: null as string | null,
    },
    {
      label: 'Added to Cart',
      value: data.addToCart,
      pct: data.viewToCartPct,
      drop:
        data.productViews > 0
          ? `${(100 - data.viewToCartPct).toFixed(1)}% drop`
          : null,
    },
    {
      label: 'Checkout Started',
      value: data.checkoutStarts,
      pct: data.cartToCheckoutPct,
      drop:
        data.addToCart > 0
          ? `${(100 - data.cartToCheckoutPct).toFixed(1)}% drop`
          : null,
    },
    {
      label: 'Purchased',
      value: data.purchases,
      pct: data.checkoutToPurchasePct,
      drop:
        data.checkoutStarts > 0
          ? `${(100 - data.checkoutToPurchasePct).toFixed(1)}% drop`
          : null,
    },
  ]

  const widths = ['w-full', 'w-3/4', 'w-1/2', 'w-[35%]']

  return (
    <div className="space-y-3">
      {stages.map((s, i) => (
        <div key={s.label} className="flex flex-col gap-1">
          <div className={`mx-auto ${widths[i] ?? 'w-full'} min-w-[120px]`}>
            <div
              className="rounded-sm px-3 py-2 text-center text-xs font-medium text-white shadow-sm"
              style={{
                background: `linear-gradient(90deg, ${COLORS.LKR} 0%, #8B6E52 100%)`,
              }}
            >
              <div className="font-semibold">{s.label}</div>
              <div className="opacity-90">{s.value.toLocaleString()}</div>
              {i > 0 && (
                <div className="text-[10px] opacity-80">
                  {s.pct.toFixed(1)}% of prev
                  {s.drop ? ` · ${s.drop}` : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <p className="pt-2 text-center text-sm text-gray-600">
        Overall conversion:{' '}
        <span className="font-semibold text-gray-900">
          {data.overallConversionPct.toFixed(2)}%
        </span>
      </p>
    </div>
  )
}

function mergeRevenueForChart(
  points: RevenueSeriesPoint[],
  currency: 'LKR' | 'SGD' | 'USD' | 'ALL',
): Array<Record<string, string | number | null>> {
  if (currency !== 'ALL') {
    return points
      .filter((p) => p.currency === currency)
      .map((p) => ({
        date: p.date,
        revenue: Number.parseFloat(p.revenue) || 0,
      }))
  }
  const dates = [...new Set(points.map((p) => p.date))].sort()
  return dates.map((date) => {
    const row: Record<string, string | number | null> = { date }
    for (const c of ['LKR', 'SGD', 'USD'] as const) {
      const hit = points.find((p) => p.date === date && p.currency === c)
      row[c] = hit != null ? Number.parseFloat(hit.revenue) || 0 : null
    }
    return row
  })
}

export default function AdminAnalyticsPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>('30d')
  const [lineCurrency, setLineCurrency] = useState<'LKR' | 'SGD' | 'USD' | 'ALL'>('ALL')

  const todayQ = useAnalyticsToday()
  const revenueQ = useAnalyticsRevenue(period, lineCurrency)
  const funnelQ = useAnalyticsFunnel(period)
  const byCurQ = useAnalyticsRevenueByCurrency(period)

  const chartData = useMemo(
    () => mergeRevenueForChart(revenueQ.data ?? [], lineCurrency),
    [revenueQ.data, lineCurrency],
  )

  const pieData = useMemo(
    () =>
      (byCurQ.data ?? []).map((r) => ({
        name: r.currency,
        value: Number.parseFloat(r.totalRevenue) || 0,
        orders: r.orders,
      })),
    [byCurQ.data],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            Performance and conversion (aggregates + live today)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Period</span>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as AnalyticsPeriod)}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7d</SelectItem>
              <SelectItem value="30d">30d</SelectItem>
              <SelectItem value="90d">90d</SelectItem>
              <SelectItem value="1y">1y</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <span
                className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500"
                aria-hidden
              />
              Today (live)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todayQ.isLoading && !todayQ.data ? (
              <Skeleton className="h-40 w-full" />
            ) : todayQ.data ? (
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-gray-500">Orders today</dt>
                  <dd className="text-lg font-semibold">{todayQ.data.ordersToday}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Active sessions (30m)</dt>
                  <dd className="text-lg font-semibold">
                    {todayQ.data.activeSessionsNow}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">LKR revenue</dt>
                  <dd>{formatMoney(todayQ.data.revenueLkr, 'LKR')}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">SGD revenue</dt>
                  <dd>{formatMoney(todayQ.data.revenueSgd, 'SGD')}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">USD revenue</dt>
                  <dd>{formatMoney(todayQ.data.revenueUsd, 'USD')}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Avg order (LKR)</dt>
                  <dd>{formatMoney(todayQ.data.avgOrderValueLkr, 'LKR')}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-gray-500">Conversion today</dt>
                  <dd className="font-medium">{todayQ.data.conversionToday}%</dd>
                </div>
              </dl>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Period revenue by currency</CardTitle>
          </CardHeader>
          <CardContent>
            {byCurQ.isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                {(byCurQ.data ?? []).map((r) => (
                  <div key={r.currency} className="rounded-md border p-3">
                    <div className="text-xs text-gray-500">{r.currency}</div>
                    <div className="font-semibold">
                      {formatMoney(r.totalRevenue, r.currency)}
                    </div>
                    <div className="text-xs text-gray-500">{r.orders} orders</div>
                  </div>
                ))}
                {(byCurQ.data ?? []).length === 0 && (
                  <p className="col-span-3 text-gray-500">No paid orders in period.</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base">Revenue over time</CardTitle>
          <Select
            value={lineCurrency}
            onValueChange={(v) =>
              setLineCurrency(v as 'LKR' | 'SGD' | 'USD' | 'ALL')
            }
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="LKR">LKR</SelectItem>
              <SelectItem value="SGD">SGD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="h-[320px]">
          {revenueQ.isLoading ? (
            <Skeleton className="h-full w-full" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                {lineCurrency === 'ALL' ? (
                  <>
                    <Line type="monotone" dataKey="LKR" name="LKR" stroke={COLORS.LKR} dot={false} connectNulls />
                    <Line type="monotone" dataKey="SGD" name="SGD" stroke={COLORS.SGD} dot={false} connectNulls />
                    <Line type="monotone" dataKey="USD" name="USD" stroke={COLORS.USD} dot={false} connectNulls />
                  </>
                ) : (
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name={lineCurrency}
                    stroke={COLORS[lineCurrency]}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conversion funnel</CardTitle>
          </CardHeader>
          <CardContent>
            {funnelQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : funnelQ.data ? (
              <FunnelChart data={funnelQ.data} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue mix</CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {byCurQ.isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : pieData.length === 0 ? (
              <p className="text-sm text-gray-500">No data</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {pieData.map((e) => (
                      <Cell
                        key={e.name}
                        fill={COLORS[e.name as keyof typeof COLORS] ?? '#888'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v, _n, item) => {
                      const p = item.payload as { name: string; orders: number }
                      return [`${Number(v).toFixed(2)} (${p.orders} orders)`, p.name]
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
