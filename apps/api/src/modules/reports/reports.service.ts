/**
 * Admin reports — thin orchestration over packages/db reports queries.
 */

import {
  getBestAndLeastSellers,
  getMostViewedProducts,
  getCartAbandonment,
  getReturnAnalysis,
  getTrafficSources,
  getPopularColorsSizes,
  getGuestVsRegistered,
  getWishlistAnalysis,
  getConversionFunnel,
  getTimeSeries,
  getDeviceTypeBreakdown,
  getAddToCartByProduct,
  type ReportPeriod,
} from '@modett/db'

export async function getFullReport({ period }: { period: string }) {
  const [
    sellers,
    mostViewed,
    cartAbandonment,
    returnAnalysis,
    trafficSources,
    colorsSizes,
    guestVsRegistered,
    wishlistTop,
    conversionFunnel,
    deviceTypes,
  ] = await Promise.all([
    getBestAndLeastSellers({ period }),
    getMostViewedProducts({ period }),
    getCartAbandonment({ period }),
    getReturnAnalysis({ period }),
    getTrafficSources({ period }),
    getPopularColorsSizes({ period }),
    getGuestVsRegistered({ period }),
    getWishlistAnalysis({ period }),
    getConversionFunnel({ period }),
    getDeviceTypeBreakdown({ period }),
  ])

  return {
    sellers,
    mostViewed,
    cartAbandonment,
    returnAnalysis,
    trafficSources,
    colorsSizes,
    guestVsRegistered,
    wishlistTop,
    conversionFunnel,
    deviceTypes,
    period,
    generatedAt: new Date().toISOString(),
  }
}

export async function getReportSellers({ period }: { period: string }) {
  return getBestAndLeastSellers({ period })
}

export async function getReportMostViewed({ period }: { period: string }) {
  return getMostViewedProducts({ period })
}

export async function getReportCartAbandonment({ period }: { period: string }) {
  return getCartAbandonment({ period })
}

export async function getReportReturns({ period }: { period: string }) {
  return getReturnAnalysis({ period })
}

export async function getReportTraffic({ period }: { period: string }) {
  return getTrafficSources({ period })
}

export async function getReportColorsSizes({ period }: { period: string }) {
  return getPopularColorsSizes({ period })
}

export async function getReportGuestVsRegistered({ period }: { period: string }) {
  return getGuestVsRegistered({ period })
}

export async function getReportWishlist({ period }: { period: string }) {
  return getWishlistAnalysis({ period })
}

export async function getReportFunnel({ period }: { period: string }) {
  return getConversionFunnel({ period })
}

export async function getReportDeviceTypes({ period }: { period: string }) {
  return getDeviceTypeBreakdown({ period })
}

export async function getReportTimeSeries({
  metric,
  period,
  dimensionJson,
}: {
  metric:         string
  period:         ReportPeriod
  dimensionJson?: Record<string, unknown> | null
}) {
  const series = await getTimeSeries({ metric, period, dimensionJson })
  return {
    series: series.map((row) => ({
      date:  row.date,
      value: Number.parseFloat(row.value) || 0,
    })),
    metric,
    period,
  }
}

export async function getMostViewedWithCartRates({ period }: { period: string }) {
  const [mostViewed, addByProduct] = await Promise.all([
    getMostViewedProducts({ period }),
    getAddToCartByProduct({ period }),
  ])
  const addMap = new Map(
    addByProduct.map((r) => [r.product_id, Number.parseFloat(r.add_to_cart_count) || 0]),
  )
  return mostViewed.map((row) => {
    const views = Number.parseFloat(row.view_count) || 0
    const adds = addMap.get(row.product_id) ?? 0
    const rate = views > 0 ? (adds / views) * 100 : 0
    return {
      ...row,
      add_to_cart_count: String(adds),
      view_to_cart_rate: rate,
    }
  })
}
