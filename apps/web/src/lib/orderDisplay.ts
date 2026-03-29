import { cn } from '@/lib/utils'

export interface OrderStatusBadge {
  label:     string
  className: string
}

/**
 * Customer-facing fulfilment + payment status (Modett palette).
 */
export function getOrderStatusBadge(row: {
  order_state:       string
  payment_state:     string
  fulfillment_state: string
}): OrderStatusBadge {
  if (row.order_state === 'CANCELLED') {
    return {
      label:     'Cancelled',
      className: 'bg-muted text-muted-foreground',
    }
  }
  if (row.payment_state === 'FAILED') {
    return {
      label:     'Cancelled',
      className: 'bg-muted text-muted-foreground',
    }
  }
  const fs = row.fulfillment_state
  if (fs === 'DELIVERED') {
    return {
      label:     'Delivered',
      className: 'bg-[#4A7C59]/10 text-[#4A7C59]',
    }
  }
  if (fs === 'PACKED' || fs === 'SHIPPED' || fs === 'OUT_FOR_DELIVERY') {
    return {
      label:     'On its way',
      className: 'bg-highlight/15 text-umber',
    }
  }
  // PLACED + paid or unpaid still processing
  return {
    label:     'Processing',
    className: 'bg-surface-raised text-umber',
  }
}

export const ORDER_EVENT_LABELS: Record<string, string> = {
  ORDER_PLACED:       'Order placed',
  PAYMENT_CONFIRMED:  'Payment confirmed',
  PACKED:             'Order packed',
  SHIPPED:            'Order shipped',
  DELIVERED:          'Order delivered',
  PAYMENT_FAILED:     'Payment failed',
  CANCELLED:          'Order cancelled',
}

export function orderEventDotClass(eventType: string): string {
  if (eventType === 'PAYMENT_FAILED' || eventType === 'CANCELLED') {
    return 'bg-red-400'
  }
  if (eventType === 'DELIVERED' || eventType === 'SHIPPED' || eventType === 'PACKED' || eventType === 'PAYMENT_CONFIRMED' || eventType === 'ORDER_PLACED') {
    return 'bg-[#4A7C59]'
  }
  return 'bg-muted'
}

export function orderBadgeClassName(base: string): string {
  return cn(
    'px-3 py-1 text-[11px] font-body font-light uppercase tracking-[0.1em] rounded-none',
    base,
  )
}
