/**
 * Fire-and-forget admin audit logging. Never throw — failures are logged only.
 */

import { db, adminAuditLog } from '@modett/db'
import type { AdminRequest } from './auth'

export interface AuditLogEntry {
  req: AdminRequest
  action: string
  entityType: string
  entityId?: string | null
  entityLabel?: string | null
  beforeJson?: Record<string, unknown> | null
  afterJson?: Record<string, unknown> | null
}

function clientIp(req: AdminRequest): string {
  const fwd = req.headers['x-forwarded-for']
  if (typeof fwd === 'string' && fwd.trim() !== '') {
    return fwd.split(',')[0]?.trim() ?? 'unknown'
  }
  if (req.ip && req.ip.trim() !== '') return req.ip
  return 'unknown'
}

export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  try {
    const { req } = entry
    const admin = req.admin
    const user = req.user as { email?: string }
    const email = typeof user.email === 'string' ? user.email : 'unknown@unknown'

    await db.insert(adminAuditLog).values({
      adminId: admin.id,
      adminEmail: email,
      adminRole: admin.role,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      entityLabel: entry.entityLabel ?? null,
      beforeJson: entry.beforeJson ?? null,
      afterJson: entry.afterJson ?? null,
      ipAddress: clientIp(req),
    })
  } catch (err) {
    console.error('[audit] Failed to write audit log:', err)
  }
}
