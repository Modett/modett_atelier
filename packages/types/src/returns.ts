/**
 * Admin returns queue — camelCase view models (avoid clashing with DB entity types).
 */

import type { ReturnRequestStatus, ReturnType } from './enums'

export type ReturnStatus = ReturnRequestStatus

/** Reserved for future structured reasons; live data uses free text on the request. */
export type ReturnReason =
  | 'DOES_NOT_FIT'
  | 'NOT_AS_DESCRIBED'
  | 'WRONG_ITEM'
  | 'DAMAGED'
  | 'CHANGED_MIND'
  | 'OTHER'

export interface AdminReturnLineItem {
  id: string
  returnRequestId: string
  orderItemId: string
  qty: number
  customerReason: string
  requestStatus: ReturnStatus
  productName: string
  colour: string
  size: string
  imageUrl: string | null
  unitPrice: string
  currency: string
}

export interface AdminReturnTimelineEvent {
  id: string
  returnRequestId: string
  eventType: string
  adminId: string | null
  adminNote: string | null
  payloadJson: Record<string, unknown>
  createdAt: string
}

export interface AdminReturnRequest {
  id: string
  orderRef: string
  orderId: string
  userId: string | null
  customerName: string
  customerEmail: string
  status: ReturnStatus
  returnType: ReturnType
  eligibleUntil: string
  submittedAt: string
  updatedAt: string
}

export interface AdminReturnDetailPayload {
  request: AdminReturnRequest
  items: AdminReturnLineItem[]
  events: AdminReturnTimelineEvent[]
}

export interface AdminReturnListRow extends AdminReturnRequest {
  itemCount: number
}

export interface AdminReturnsListResponse {
  returns: AdminReturnListRow[]
  page: number
  limit: number
  total: number
}
