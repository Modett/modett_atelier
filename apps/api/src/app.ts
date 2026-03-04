import type { Express } from 'express'
import express from 'express'
import cookieParser from 'cookie-parser'
import { setupSwagger } from './docs/swagger'
import { iamRoutes } from './modules/iam'
import { catalogRoutes } from './modules/catalog'
import { inventoryRoutes } from './modules/inventory'

export const app: Express = express()

app.use(express.json())
app.use(cookieParser())

app.use('/api', iamRoutes)
app.use('/api', catalogRoutes)
app.use('/api', inventoryRoutes)
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