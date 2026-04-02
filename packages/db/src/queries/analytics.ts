/**
 * Analytics — append-only event inserts. No reads here (reports use aggregates).
 */

import { db } from '../client'
import { events } from '../schema/analytics.schema'

export interface InsertAnalyticsEventInput {
  sessionId:   string
  userId:      string | null
  type:        string
  payloadJson: Record<string, unknown>
  deviceType:  string | null
  countryCode: string | null
  createdAt:   Date
}

export async function insertAnalyticsEvent({
  sessionId,
  userId,
  type,
  payloadJson,
  deviceType,
  countryCode,
  createdAt,
}: InsertAnalyticsEventInput): Promise<void> {
  await db.insert(events).values({
    session_id:   sessionId,
    user_id:      userId,
    type,
    payload_json: payloadJson,
    device_type:  deviceType,
    country_code: countryCode,
    created_at:   createdAt,
  })
}
