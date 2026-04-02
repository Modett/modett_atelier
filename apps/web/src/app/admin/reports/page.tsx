'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import {
  Bar,
  BarChart,
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAdminSession } from '@/hooks/useAdminSession'
import {
  useReportSellers,
  useReportMostViewed,
  useReportCartAbandonment,
  useReportReturns,
  useReportTraffic,
  useReportColorsSizes,
  useReportGuestVsRegistered,
  useReportWishlist,
  useReportFunnel,
  useReportTimeSeries,
  type ReportPeriod,
} from '@/hooks'
import { cn } from '@/lib/utils'

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
]

const PERIOD_LABEL: Record<ReportPeriod, string> = {
  '7d':  'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  '1y':  'Last Year',
}

const TRAFFIC_COLORS: Record<string, string> = {
  google:    '#4285F4',
  instagram: '#E1306C',
  facebook:  '#1877F2',
  tiktok:    '#000000',
  direct:    '#3D2E26',
  other:     '#D6CFC6',
}

const RETURN_PIE_COLORS = [
  '#C1885A',
  '#8A9E85',
  '#6B7B8D',
  '#C04E3F',
  '#B5A393',
  '#D6CFC6',
]

const UMBER = '#3D2E26'

interface SellerRow {
  id:            string
  display_name:  string
  product_code:  string
  key_image_url: string | null
  units_sold:    string
  revenue:       string
}

interface MostViewedRow {
  product_id:        string
  view_count:        string
  display_name:      string
  product_code:      string
  key_image_url:     string | null
  add_to_cart_count: string
  view_to_cart_rate: number
}

function AdminPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-[400px] w-full" />
    </div>
  )
}

function ProductThumb({ url, name }: { url: string | null; name: string }) {
  if (!url) {
    return (
      <div className="h-10 w-10 shrink-0 bg-muted flex items-center justify-center text-[10px] text-muted-foreground">
        —
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- admin report thumbnails; arbitrary R2 URLs
    <img
      src={url}
      alt={name}
      width={40}
      height={40}
      className="h-10 w-10 object-cover shrink-0"
    />
  )
}

export default function AdminReportsPage() {
  const router = useRouter()
  const { admin, isLoading: authLoading } = useAdminSession()
  const [period, setPeriod] = useState<ReportPeriod>('30d')
  const [activeTab, setActiveTab] = useState('sellers')
  const [exporting, setExporting] = useState(false)

  const sellersQ = useReportSellers(period)
  const mostViewedQ = useReportMostViewed(period)
  const cartQ = useReportCartAbandonment(period)
  const returnsQ = useReportReturns(period)
  const trafficQ = useReportTraffic(period)
  const colorsQ = useReportColorsSizes(period)
  const guestQ = useReportGuestVsRegistered(period)
  const wishlistQ = useReportWishlist(period)
  const funnelQ = useReportFunnel(period)

  const tsPurchases = useReportTimeSeries('purchases', period)
  const tsProductViews = useReportTimeSeries('product_views', period)
  const tsTraffic = useReportTimeSeries('traffic_source', period)
  const tsAccount = useReportTimeSeries('account_creations', period)

  const exportPdf = useCallback(async () => {
    setExporting(true)
    try {
      const el = document.getElementById('report-content')
      if (!el) return
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const canvas = await html2canvas(el, {
        scale:                   2,
        useCORS:                 true,
        logging:                 false,
        backgroundColor:         '#ffffff',
        // AUDIT FIX: improve SVG / Recharts capture in PDF export
        foreignObjectRendering:  true,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pageWidth
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      const imgData = canvas.toDataURL('image/png')
      let heightLeft = imgHeight
      let y = 0
      pdf.setFontSize(10)
      pdf.text(
        `Modett Atelier — ${activeTab} | ${PERIOD_LABEL[period]} | ${new Date().toISOString().slice(0, 10)}`,
        10,
        8,
      )
      pdf.addImage(imgData, 'PNG', 0, 12, imgWidth, imgHeight)
      heightLeft -= pageHeight - 12
      while (heightLeft > 0) {
        y = heightLeft - imgHeight + 12
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, y, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      const filename = `modett-report-${activeTab}-${period}-${new Date().toISOString().slice(0, 10)}.pdf`
      pdf.save(filename)
    } finally {
      setExporting(false)
    }
  }, [activeTab, period])

  // All useMemo hooks must be above early returns — Rules of Hooks
  // These read from query data which may be undefined until loaded (that's fine)
  const funnelNums = useMemo(() => {
    const funnel = funnelQ.data?.data.funnel as Record<string, string> | undefined
    const pv  = Number.parseFloat(funnel?.product_views  ?? '0') || 0
    const atc = Number.parseFloat(funnel?.add_to_cart    ?? '0') || 0
    const co  = Number.parseFloat(funnel?.checkout_starts ?? '0') || 0
    const pur = Number.parseFloat(funnel?.purchases       ?? '0') || 0
    return {
      pv, atc, co, pur,
      p1: pv  > 0 ? (atc / pv)  * 100 : 0,
      p2: atc > 0 ? (co  / atc) * 100 : 0,
      p3: co  > 0 ? (pur / co)  * 100 : 0,
    }
  }, [funnelQ.data])

  const guestChart = useMemo(() => {
    const guestPayload = guestQ.data?.data as { byUserType: { user_type: string; purchase_count: string }[] } | undefined
    const rows = guestPayload?.byUserType ?? []
    return rows.map((r) => ({
      name:  r.user_type === 'registered' ? 'Registered' : 'Guest',
      value: Number.parseFloat(r.purchase_count) || 0,
      fill:  r.user_type === 'registered' ? UMBER : '#D6CFC6',
    }))
  }, [guestQ.data])

  const registeredPct = useMemo(() => {
    const guestPayload = guestQ.data?.data as { byUserType: { user_type: string; purchase_count: string }[] } | undefined
    const rows = guestPayload?.byUserType ?? []
    const reg   = Number.parseFloat(rows.find((r) => r.user_type === 'registered')?.purchase_count ?? '0') || 0
    const guest = Number.parseFloat(rows.find((r) => r.user_type === 'guest')?.purchase_count      ?? '0') || 0
    const t = reg + guest
    return t > 0 ? Math.round((reg / t) * 100) : 0
  }, [guestQ.data])

  if (authLoading) return <AdminPageSkeleton />
  if (!admin) {
    router.push('/admin/login')
    return null
  }

  const bestSellers = (sellersQ.data?.data.bestSellers ?? []) as SellerRow[]
  const leastSellers = (sellersQ.data?.data.leastSellers ?? []) as SellerRow[]
  const maxUnits = Math.max(
    ...bestSellers.map((r) => Number.parseFloat(r.units_sold) || 0),
    1,
  )
  const barData = bestSellers.slice(0, 8).map((r) => ({
    name:  r.display_name.slice(0, 14) + (r.display_name.length > 14 ? '…' : ''),
    units: Number.parseFloat(r.units_sold) || 0,
  }))

  const mostViewed = (mostViewedQ.data?.data.products ?? []) as MostViewedRow[]

  const cartRows = (cartQ.data?.data.rows ?? []) as Array<{
    product_id: string
    display_name: string
    product_code: string
    key_image_url: string | null
    add_to_cart_count: string
    purchased_count: string
    abandoned_count: string
    abandonment_rate_pct: string
  }>

  const ret = returnsQ.data?.data as
    | {
        topProducts: Array<{
          display_name: string
          product_code: string
          key_image_url: string | null
          returned_qty: string
          return_count: string
        }>
        reasonBreakdown: Array<{ reason: string; count: string; percentage: string }>
        mostReturnedSizes: Array<{ label: string; count: string }>
        mostReturnedColors: Array<{ label: string; count: string }>
      }
    | undefined

  const traffic = trafficQ.data?.data
  const sources = (traffic?.sources ?? []) as Array<{ source: string; sessions: string }>
  const devices = (traffic?.devices ?? []) as Array<{ device_type: string; page_views: string }>
  const totalSessions = sources.reduce(
    (a, s) => a + (Number.parseFloat(s.sessions) || 0),
    0,
  )

  const colorsPayload = colorsQ.data?.data as
    | {
        purchasedColors: { color: string; units_sold: string }[]
        purchasedSizes: { size: string; units_sold: string }[]
        viewedColors: { color: string; select_count: string }[]
        viewedSizes: { size: string; select_count: string }[]
      }
    | undefined

  const guestPayload = guestQ.data?.data as
    | {
        byUserType: { user_type: string; purchase_count: string }[]
        accountCreationsSum: string
      }
    | undefined

  const wishRows = (wishlistQ.data?.data.rows ?? []) as Array<{
    product_id: string
    wishlist_adds: string
    display_name: string
    product_code: string
    key_image_url: string | null
  }>

  const funnel = funnelQ.data?.data.funnel as
    | Record<string, string>
    | undefined

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <h1 className="font-semibold text-2xl text-gray-900">Reports</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border border-gray-200 p-0.5 bg-white">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-sm transition-colors',
                  period === p.value
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={exporting}
            onClick={() => void exportPdf()}
          >
            {exporting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating PDF…
              </>
            ) : (
              'Export PDF'
            )}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-gray-100 p-1">
          <TabsTrigger value="sellers">Sellers</TabsTrigger>
          <TabsTrigger value="views">Most Viewed</TabsTrigger>
          <TabsTrigger value="cart">Cart & Funnel</TabsTrigger>
          <TabsTrigger value="returns">Returns</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="sizes">Colours & Sizes</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
        </TabsList>

        <div
          id="report-content"
          className="mt-6 min-w-0 bg-white p-4 rounded-lg border border-gray-100 md:min-w-[960px] print:!w-[1200px] print:!max-w-none"
        >
          {activeTab === 'sellers' && (
          <div className="space-y-6">
            {sellersQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Best sellers</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {bestSellers.map((r, i) => (
                            <TableRow key={r.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-0">
                                  <ProductThumb url={r.key_image_url} name={r.display_name} />
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{r.display_name}</div>
                                    <div className="text-xs text-muted-foreground">{r.product_code}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <div
                                    className="h-2 rounded-sm bg-[#3D2E26]/80 max-w-[80px]"
                                    style={{
                                      width: `${((Number.parseFloat(r.units_sold) || 0) / maxUnits) * 80}px`,
                                    }}
                                  />
                                  {r.units_sold}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-200/80">
                    <CardHeader>
                      <CardTitle className="text-base">Least sellers</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10">#</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {leastSellers.map((r, i) => (
                            <TableRow key={r.id}>
                              <TableCell>{i + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-0">
                                  <ProductThumb url={r.key_image_url} name={r.display_name} />
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{r.display_name}</div>
                                    <div className="text-xs text-muted-foreground">{r.product_code}</div>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{r.units_sold}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Units sold (top 8)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="units" fill={UMBER} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily units sold (purchases aggregate)</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tsPurchases.data?.data.series ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={UMBER} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          )}

          {activeTab === 'views' && (
          <div className="space-y-6">
            {mostViewedQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Top products by views</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>#</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Views</TableHead>
                          <TableHead className="text-right">View → cart %</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mostViewed.map((r, i) => (
                          <TableRow key={r.product_id}>
                            <TableCell>{i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ProductThumb url={r.key_image_url} name={r.display_name} />
                                <span className="font-medium">{r.display_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{r.view_count}</TableCell>
                            <TableCell
                              className={cn(
                                'text-right font-medium',
                                r.view_to_cart_rate > 10 && 'text-green-700',
                                r.view_to_cart_rate <= 10 &&
                                  r.view_to_cart_rate >= 5 &&
                                  'text-amber-700',
                                r.view_to_cart_rate < 5 && 'text-red-700',
                              )}
                            >
                              {r.view_to_cart_rate.toFixed(1)}%
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Views by product</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={mostViewed.map((r) => ({
                          name:  r.display_name.slice(0, 28),
                          views: Number.parseFloat(r.view_count) || 0,
                        }))}
                        margin={{ left: 24 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="views" fill={UMBER} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily product views</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tsProductViews.data?.data.series ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={UMBER} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          )}

          {activeTab === 'cart' && (
          <div className="space-y-6">
            {funnelQ.isLoading || cartQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Conversion funnel</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                      <div className="rounded border p-4">
                        <div className="text-2xl font-semibold">{Math.round(funnelNums.pv)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Product views</div>
                      </div>
                      <div className="rounded border p-4">
                        <div className="text-2xl font-semibold">{Math.round(funnelNums.atc)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Added to cart</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {funnelNums.p1.toFixed(1)}% of views
                        </div>
                      </div>
                      <div className="rounded border p-4">
                        <div className="text-2xl font-semibold">{Math.round(funnelNums.co)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Checkout starts</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {funnelNums.p2.toFixed(1)}% of cart adds
                        </div>
                      </div>
                      <div className="rounded border p-4">
                        <div className="text-2xl font-semibold">{Math.round(funnelNums.pur)}</div>
                        <div className="text-xs text-muted-foreground mt-1">Purchases</div>
                        <div className="text-[11px] text-muted-foreground mt-1">
                          {funnelNums.p3.toFixed(1)}% of checkouts
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Cart abandonment</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Added</TableHead>
                          <TableHead className="text-right">Purchased</TableHead>
                          <TableHead className="text-right">Abandoned</TableHead>
                          <TableHead className="text-right">Rate</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {cartRows.map((r) => {
                          const rate = Number.parseFloat(r.abandonment_rate_pct) || 0
                          return (
                            <TableRow key={r.product_id}>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <ProductThumb url={r.key_image_url} name={r.display_name} />
                                  <span className="font-medium">{r.display_name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right">{r.add_to_cart_count}</TableCell>
                              <TableCell className="text-right">{r.purchased_count}</TableCell>
                              <TableCell className="text-right">{r.abandoned_count}</TableCell>
                              <TableCell
                                className={cn(
                                  'text-right font-medium',
                                  rate > 80 && 'text-red-700',
                                  rate <= 80 && rate >= 50 && 'text-orange-700',
                                )}
                              >
                                {rate.toFixed(1)}%
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          )}

          {activeTab === 'returns' && (
          <div className="space-y-6">
            {returnsQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Return reasons</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={(ret?.reasonBreakdown ?? []).map((x) => ({
                            name:  x.reason.slice(0, 40),
                            value: Number.parseFloat(x.count) || 0,
                          }))}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) =>
                            `${(name ?? '').slice(0, 16)}… ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {(ret?.reasonBreakdown ?? []).map((_, i) => (
                            <Cell
                              key={String(i)}
                              fill={RETURN_PIE_COLORS[i % RETURN_PIE_COLORS.length]!}
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Most returned products</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Units</TableHead>
                          <TableHead className="text-right">Returns</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(ret?.topProducts ?? []).map((r) => (
                          <TableRow key={r.product_code}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ProductThumb url={r.key_image_url} name={r.display_name} />
                                <span>{r.display_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{r.returned_qty}</TableCell>
                            <TableCell className="text-right">{r.return_count}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Returned sizes</CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={(ret?.mostReturnedSizes ?? []).map((x) => ({
                          name:  x.label || '—',
                          count: Number.parseFloat(x.count) || 0,
                        }))}
                      >
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={56} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill={UMBER} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle className="text-base">Returned colours</CardTitle>
                  </CardHeader>
                  <CardContent className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={(ret?.mostReturnedColors ?? []).map((x) => ({
                          name:  x.label || '—',
                          count: Number.parseFloat(x.count) || 0,
                        }))}
                      >
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#C1885A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
          )}

          {activeTab === 'traffic' && (
          <div className="space-y-6">
            {trafficQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Sources</CardTitle>
                    </CardHeader>
                    <CardContent className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={sources.map((s) => ({
                              name:  s.source,
                              value: Number.parseFloat(s.sessions) || 0,
                            }))}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label
                          >
                            {sources.map((s) => (
                              <Cell
                                key={s.source}
                                fill={TRAFFIC_COLORS[s.source] ?? TRAFFIC_COLORS.other!}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Source table</CardTitle>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Source</TableHead>
                            <TableHead className="text-right">Sessions</TableHead>
                            <TableHead className="text-right">%</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {sources.map((s) => {
                            const n = Number.parseFloat(s.sessions) || 0
                            const pct = totalSessions > 0 ? (n / totalSessions) * 100 : 0
                            return (
                              <TableRow key={s.source}>
                                <TableCell className="capitalize">{s.source}</TableCell>
                                <TableCell className="text-right">{s.sessions}</TableCell>
                                <TableCell className="text-right">{pct.toFixed(1)}%</TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Sessions over time</CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={tsTraffic.data?.data.series ?? []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="value" stroke={UMBER} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {['mobile', 'tablet', 'desktop'].map((kind) => {
                    const row = devices.find(
                      (d) => (d.device_type ?? '').toLowerCase() === kind,
                    )
                    const n = Number.parseFloat(row?.page_views ?? '0') || 0
                    const totalD = devices.reduce(
                      (a, d) => a + (Number.parseFloat(d.page_views) || 0),
                      0,
                    )
                    const pct = totalD > 0 ? Math.round((n / totalD) * 100) : 0
                    return (
                      <Card key={kind}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm capitalize">{kind}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold">{pct}%</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {Math.round(n)} page views
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          )}

          {activeTab === 'sizes' && (
          <div className="space-y-6">
            {colorsQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Purchased colours</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={(colorsPayload?.purchasedColors ?? []).map((c) => ({
                          name:  c.color,
                          units: Number.parseFloat(c.units_sold) || 0,
                        }))}
                      >
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="units" fill={UMBER} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Purchased sizes</CardTitle>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={(colorsPayload?.purchasedSizes ?? []).map((c) => ({
                          name:  c.size,
                          units: Number.parseFloat(c.units_sold) || 0,
                        }))}
                      >
                        <XAxis type="number" />
                        <YAxis dataKey="name" type="category" width={56} tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="units" fill="#C1885A" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Variant selects — colours (views)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={(colorsPayload?.viewedColors ?? []).map((c) => ({
                            name:  c.color,
                            n:     Number.parseFloat(c.select_count) || 0,
                          }))}
                        >
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={88} tick={{ fontSize: 9 }} />
                          <Tooltip />
                          <Bar dataKey="n" fill="#8A9E85" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Variant selects — sizes (views)</CardTitle>
                    </CardHeader>
                    <CardContent className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={(colorsPayload?.viewedSizes ?? []).map((c) => ({
                            name:  c.size,
                            n:     Number.parseFloat(c.select_count) || 0,
                          }))}
                        >
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={48} tick={{ fontSize: 9 }} />
                          <Tooltip />
                          <Bar dataKey="n" fill="#6B7B8D" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </div>
          )}

          {activeTab === 'customers' && (
          <div className="space-y-6">
            {guestQ.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Guest vs registered purchases</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72 flex flex-col items-center justify-center">
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart>
                          <Pie
                            data={guestChart}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={58}
                            outerRadius={88}
                            paddingAngle={2}
                          >
                            {guestChart.map((e, i) => (
                              <Cell key={String(i)} fill={e.fill} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                      <p className="text-sm text-center text-muted-foreground mt-2">
                        {registeredPct}% of purchases are by registered customers
                      </p>
                      <p className="text-xs text-center text-muted-foreground">
                        {guestPayload?.accountCreationsSum ?? '0'} accounts created in this period
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Account creations over time</CardTitle>
                    </CardHeader>
                    <CardContent className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tsAccount.data?.data.series ?? []}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="value" stroke={UMBER} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Insight</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground leading-relaxed">
                    Guest customers complete checkout quickly but cannot earn loyalty points, access
                    full order history in-app, or start self-serve returns without an account.
                    Consider prompting guests to register on the order confirmation page.
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Wishlist adds (top products)</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Adds</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {wishRows.map((r) => (
                          <TableRow key={r.product_id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ProductThumb url={r.key_image_url} name={r.display_name} />
                                <span>{r.display_name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{r.wishlist_adds}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
          )}
        </div>
      </Tabs>
    </div>
  )
}