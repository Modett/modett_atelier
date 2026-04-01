import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const API_URL = process.env.TEST_API_URL ?? 'http://localhost:3001/api'
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL ?? 'admin@modett.com'
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD ?? 'AdminPassword123'

/** Build `Cookie` header value from a login response (Node fetch may emit multiple Set-Cookie). */
function cookieHeaderFromResponse(res: Response): string {
  const getter = res.headers.getSetCookie?.bind(res.headers)
  const setCookies = getter?.() ?? []
  if (setCookies.length > 0) {
    return setCookies
      .map((line) => line.split(';')[0]?.trim())
      .filter((pair): pair is string => Boolean(pair))
      .join('; ')
  }
  const single = res.headers.get('set-cookie')
  if (!single) return ''
  return single
    .split(/,(?=[^;]+?=)/)
    .map((part) => part.split(';')[0]?.trim())
    .filter((pair): pair is string => Boolean(pair))
    .join('; ')
}

let cookies = ''
let testOrderId = ''

describe('Admin Orders Module', () => {
  beforeAll(async () => {
    const loginRes = await fetch(`${API_URL}/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    })

    expect(loginRes.ok).toBe(true)
    cookies = cookieHeaderFromResponse(loginRes)
    expect(cookies).toBeTruthy()
  })

  afterAll(async () => {
    if (!cookies) return
    await fetch(`${API_URL}/admin/auth/logout`, {
      method: 'POST',
      headers: { Cookie: cookies },
    })
  })

  describe('Dashboard Endpoints', () => {
    it('should fetch recent orders', async () => {
      const res = await fetch(`${API_URL}/admin/orders?page=1&limit=10`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as {
        data: { orders: { id: string }[]; total: number }
      }
      expect(data.data).toHaveProperty('orders')
      expect(data.data).toHaveProperty('total')
      expect(Array.isArray(data.data.orders)).toBe(true)

      if (data.data.orders.length > 0) {
        testOrderId = data.data.orders[0]!.id
      }
    })

    it('should fetch pending returns', async () => {
      const res = await fetch(`${API_URL}/admin/returns?status=SUBMITTED&limit=50`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as { data: { returns: unknown } }
      expect(data.data).toHaveProperty('returns')
    })

    it('should fetch notify-me demand', async () => {
      const res = await fetch(`${API_URL}/admin/notifications/notify-me-demand?limit=20`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as { data: { demand: unknown } }
      expect(data.data).toHaveProperty('demand')
    })

    it('should fetch flagged reviews', async () => {
      const res = await fetch(`${API_URL}/admin/reviews/flagged?limit=10`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as { data: { reviews: unknown } }
      expect(data.data).toHaveProperty('reviews')
    })
  })

  describe('Orders List Endpoints', () => {
    it('should list orders with pagination', async () => {
      const res = await fetch(`${API_URL}/admin/orders?page=1&limit=25`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as { data: { page: number; limit: number } }
      expect(data.data.page).toBe(1)
      expect(data.data.limit).toBe(25)
    })

    it('should filter by fulfillment state', async () => {
      const res = await fetch(`${API_URL}/admin/orders?fulfillmentState=NOT_STARTED`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as {
        data: { orders: { fulfillment_state: string }[] }
      }

      for (const order of data.data.orders) {
        expect(order.fulfillment_state).toBe('NOT_STARTED')
      }
    })

    it('should filter by payment state', async () => {
      const res = await fetch(`${API_URL}/admin/orders?paymentState=PAID`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as {
        data: { orders: { payment_state: string }[] }
      }

      for (const order of data.data.orders) {
        expect(order.payment_state).toBe('PAID')
      }
    })

    it('should search by order ref', async () => {
      const res = await fetch(`${API_URL}/admin/orders?search=MOD`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
    })
  })

  describe('Order Detail Endpoints', () => {
    it('should fetch order detail', async () => {
      if (!testOrderId) {
        console.warn('No test order ID available, skipping')
        return
      }

      const res = await fetch(`${API_URL}/admin/orders/${testOrderId}`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as {
        data: Record<string, unknown>
      }

      expect(data.data).toHaveProperty('order')
      expect(data.data).toHaveProperty('items')
      expect(data.data).toHaveProperty('addresses')
      expect(data.data).toHaveProperty('events')
      expect(data.data).toHaveProperty('allocations')
    })

    it('should return 404 for non-existent order', async () => {
      const res = await fetch(`${API_URL}/admin/orders/00000000-0000-0000-0000-000000000000`, {
        headers: { Cookie: cookies },
      })

      expect(res.status).toBe(404)
    })

    it('should fetch packing status', async () => {
      if (!testOrderId) {
        console.warn('No test order ID available, skipping')
        return
      }

      const res = await fetch(`${API_URL}/admin/orders/${testOrderId}/packing-status`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as {
        data: { orderId: string; isFullyPacked: boolean; items: unknown }
      }

      expect(data.data).toHaveProperty('orderId')
      expect(data.data).toHaveProperty('isFullyPacked')
      expect(data.data).toHaveProperty('items')
    })
  })

  describe('Authentication', () => {
    it('should reject unauthenticated requests', async () => {
      const res = await fetch(`${API_URL}/admin/orders`)
      expect(res.status).toBe(401)
    })

    it('should verify admin session', async () => {
      const res = await fetch(`${API_URL}/admin/me`, {
        headers: { Cookie: cookies },
      })

      expect(res.ok).toBe(true)
      const data = (await res.json()) as { data: { user: unknown; admin: unknown } }
      expect(data.data).toHaveProperty('user')
      expect(data.data).toHaveProperty('admin')
    })
  })
})
