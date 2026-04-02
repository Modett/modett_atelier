const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const ENDPOINT = `${API_BASE}/api/analytics/event`
const SESSION_KEY = 'modett_session_id'

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let sid = localStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = crypto.randomUUID()
    localStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

function getDeviceType(): 'mobile' | 'desktop' | 'tablet' {
  if (typeof window === 'undefined') return 'desktop'
  const w = window.innerWidth
  if (w < 768) return 'mobile'
  if (w < 1024) return 'tablet'
  return 'desktop'
}

function getReferrer(): string {
  if (typeof window === 'undefined') return ''
  return document.referrer || ''
}

function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {}
  for (const key of [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'gclid',
    'fbclid',
  ]) {
    const v = p.get(key)
    if (v) result[key] = v
  }
  return result
}

export interface TrackEventPayload {
  type:    string
  payload?: Record<string, unknown>
  userId?: string
}

export function track(event: TrackEventPayload): void {
  const body = {
    type:       event.type,
    payload:    event.payload ?? {},
    sessionId:  getSessionId(),
    userId:     event.userId ?? null,
    deviceType: getDeviceType(),
    referrer:   getReferrer(),
    utmParams:  getUtmParams(),
    path:       typeof window !== 'undefined' ? window.location.pathname : '',
    timestamp:  new Date().toISOString(),
  }

  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' })
    navigator.sendBeacon(ENDPOINT, blob)
  } else {
    void fetch(ENDPOINT, {
      method:      'POST',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify(body),
      keepalive:   true,
      credentials: 'include',
    }).catch(() => {})
  }
}

export const Analytics = {
  pageView: (p: { path: string; userId?: string }) =>
    track({ type: 'PAGE_VIEW', payload: { path: p.path }, userId: p.userId }),

  productView: (p: {
    productId:      string
    productName:    string
    categorySlug?:  string
    source?:        string
    currency?:      string
    userId?:        string
  }) => track({ type: 'PRODUCT_VIEW', payload: p, userId: p.userId }),

  variantSelect: (p: {
    variantId: string
    productId: string
    color:     string
    size:      string
    userId?:   string
  }) => track({ type: 'VARIANT_SELECT', payload: p, userId: p.userId }),

  addToCart: (p: {
    variantId: string
    productId: string
    color:     string
    size:      string
    qty:       number
    userId?:   string
  }) => track({ type: 'ADD_TO_CART', payload: p, userId: p.userId }),

  removeFromCart: (p: {
    variantId: string
    productId: string
    userId?:   string
  }) => track({ type: 'REMOVE_FROM_CART', payload: p, userId: p.userId }),

  checkoutStart: (p: {
    cartId?:    string
    itemCount:  number
    totalValue: string
    currency:   string
    userId?:    string
  }) => track({ type: 'CHECKOUT_START', payload: p, userId: p.userId }),

  purchaseComplete: (p: {
    orderId:    string
    orderRef:   string
    items:      Array<{
      variantId: string
      productId: string
      color:     string
      size:      string
      qty:       number
      unitPrice: string
    }>
    totalValue: string
    currency:   string
    userId?:    string
  }) => track({ type: 'PURCHASE_COMPLETE', payload: p, userId: p.userId }),

  wishlistAdd: (p: { productId: string; variantId?: string; userId?: string }) =>
    track({ type: 'WISHLIST_ADD', payload: p, userId: p.userId }),

  wishlistRemove: (p: { productId: string; userId?: string }) =>
    track({ type: 'WISHLIST_REMOVE', payload: p, userId: p.userId }),

  notifyMeClick: (p: { variantId: string; productId: string; userId?: string }) =>
    track({ type: 'NOTIFY_ME_CLICK', payload: p, userId: p.userId }),

  // NOTE: Not yet wired. Wire when search UI is implemented (submit handler or results page).
  // Fire once per committed search after results load; include resultsCount when available.
  searchQuery: (p: { query: string; resultsCount: number; userId?: string }) =>
    track({ type: 'SEARCH_QUERY', payload: p, userId: p.userId }),

  accountCreated: (p: { userId: string; method: 'email' }) =>
    track({ type: 'ACCOUNT_CREATED', payload: p, userId: p.userId }),

  guestCheckout: (p: { orderId: string; orderRef: string }) =>
    track({ type: 'GUEST_CHECKOUT', payload: p }),

  returnSubmitted: (p: {
    returnRequestId: string
    orderId:         string
    reason:          string
    items:           Array<{
      productId: string
      variantId: string
      color:     string
      size:      string
      qty:       number
    }>
    userId?: string
  }) => track({ type: 'RETURN_SUBMITTED', payload: p, userId: p.userId }),

  // NOTE: Defined but not wired — no styling guide trigger on the PDP yet. Wire when the
  // button/link that opens the styling guide video or gallery is added (see product.stylingGuides).
  stylingGuideOpen: (p: {
    productId:   string
    productName?: string
    userId?:     string
  }) => track({ type: 'STYLING_GUIDE_OPEN', payload: p, userId: p.userId }),
}
