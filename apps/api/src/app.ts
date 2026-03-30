import 'express-async-errors'
import type { Express } from 'express'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { setupSwagger } from './docs/swagger'
import { iamRoutes } from './modules/iam'
import { catalogRoutes } from './modules/catalog'
import { inventoryRoutes } from './modules/inventory'
import { cartRoutes } from './modules/cart'
import { checkoutRoutes } from './modules/checkout'
import { paymentsRoutes } from './modules/payments'
import { ordersRoutes } from './modules/orders'
import { shippingRoutes } from './modules/shipping'
import { returnsRoutes } from './modules/returns'
import { reviewsRoutes } from './modules/reviews'
import { loyaltyRoutes } from './modules/loyalty'
import { messagingRoutes } from './modules/messaging'

export const app: Express = express()

// Railway sits behind a reverse proxy — required for correct req.ip and secure cookies
app.set('trust proxy', 1)

const extraCorsOrigins = (process.env.CORS_ALLOW_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter((s) => s.length > 0)

const rawAllowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_WWW,
  process.env.FRONTEND_URL?.replace(/^https:\/\//, 'https://www.'),
  ...extraCorsOrigins,
].filter((o): o is string => typeof o === 'string' && o.length > 0)

const ALLOWED_ORIGINS = [...new Set(rawAllowedOrigins)]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true)
    }
    console.warn(`[CORS] Blocked origin: ${origin}`)
    return callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'Cookie',
    'X-Requested-With',
  ],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 200,
}))

app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  next()
})

app.use(express.json())
app.use(cookieParser())

// Health check — Railway polls this to verify deployment
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    version: process.env.npm_package_version ?? '1.0.0',
    env: process.env.NODE_ENV ?? 'development',
    time: new Date().toISOString(),
  })
})

app.use('/api', iamRoutes)
app.use('/api', catalogRoutes)
app.use('/api', inventoryRoutes)
app.use('/api', cartRoutes)
app.use('/api', checkoutRoutes)
app.use('/api', paymentsRoutes)
app.use('/api', ordersRoutes)
app.use('/api', shippingRoutes)
app.use('/api', returnsRoutes)
app.use('/api', reviewsRoutes)
app.use('/api', loyaltyRoutes)
app.use('/api', messagingRoutes)
setupSwagger(app)

// Global error handler — catches all AppError throws from routes
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    'statusCode' in err &&
    typeof (err as { statusCode: number }).statusCode === 'number'
  ) {
    const e = err as { code: string; statusCode: number; message?: string }
    return res.status(e.statusCode).json({ error: { code: e.code, message: e.message ?? e.code } })
  }
  console.error(err)
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } })
})