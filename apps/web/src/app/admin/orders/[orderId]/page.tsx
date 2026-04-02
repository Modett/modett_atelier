'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Decimal from 'decimal.js'
import {
  ArrowLeft,
  Package,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  Gift,
  User,
  Edit2,
  Loader2,
  AlertTriangle,
  Barcode,
  Check,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  useAdminOrderDetail,
  useOrderPackingStatus,
  useMarkOrderPacked,
  useMarkOrderShipped,
  useMarkOrderOutForDelivery,
  useMarkOrderDelivered,
  useCancelOrder,
  useScanUnit,
  useRemoveAllocation,
  useUpdateOrderShippingAddress,
} from '@/hooks/useAdminOrders'
import type { ApiError } from '@/types'
import type {
  OrderDetailResponse,
  OrderEvent,
  FulfillmentState,
  PaymentState,
  PackingItemStatus,
} from '@/types/admin'

function formatMoney(amount: string, currency: string): string {
  const num = Number.parseFloat(amount)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

function formatDateTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatEventType(eventType: string): string {
  const map: Record<string, string> = {
    ORDER_CREATED: 'Order Created',
    ORDER_PLACED: 'Order Placed',
    PAYMENT_SUBMITTED: 'Payment Submitted',
    PAYMENT_CONFIRMED: 'Payment Confirmed',
    PAYMENT_FAILED: 'Payment Failed',
    FULFILLMENT_UPDATED: 'Fulfillment Updated',
    ORDER_CANCELLED: 'Order Cancelled',
    ADDRESS_UPDATED: 'Address Updated',
    SHIPPING_INFO_UPDATED: 'Shipping Info Updated',
  }
  return map[eventType] ?? eventType.replace(/_/g, ' ')
}

function FulfillmentBadge({ state }: { state: FulfillmentState }) {
  const config: Record<FulfillmentState, { label: string; className: string }> = {
    NOT_STARTED: { label: 'Pending', className: 'bg-gray-100 text-gray-800' },
    PACKED: { label: 'Packed', className: 'bg-blue-100 text-blue-800' },
    SHIPPED: { label: 'Shipped', className: 'bg-purple-100 text-purple-800' },
    OUT_FOR_DELIVERY: { label: 'Out for Delivery', className: 'bg-indigo-100 text-indigo-800' },
    DELIVERED: { label: 'Delivered', className: 'bg-green-100 text-green-800' },
  }
  const { label, className } = config[state] ?? { label: state, className: 'bg-gray-100' }
  return <Badge className={className}>{label}</Badge>
}

function PaymentBadge({ state }: { state: PaymentState }) {
  const config: Record<PaymentState, { label: string; className: string }> = {
    UNPAID: { label: 'Unpaid', className: 'bg-yellow-100 text-yellow-800' },
    PAID: { label: 'Paid', className: 'bg-green-100 text-green-800' },
    FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
    REFUNDED: { label: 'Refunded', className: 'bg-gray-100 text-gray-800' },
    PARTIALLY_REFUNDED: { label: 'Partial Refund', className: 'bg-orange-100 text-orange-800' },
  }
  const { label, className } = config[state] ?? { label: state, className: 'bg-gray-100' }
  return <Badge className={className}>{label}</Badge>
}

export default function AdminOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params.orderId as string

  const { data, isLoading, error } = useAdminOrderDetail(orderId)

  if (isLoading) {
    return <OrderDetailSkeleton />
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Button>
        <Card>
          <CardContent className="p-12 text-center">
            <XCircle className="mx-auto mb-4 h-12 w-12 text-red-300" />
            <p className="text-gray-500">Order not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <OrderDetailContent data={data} orderId={orderId} />
}

function OrderDetailContent({ data, orderId }: { data: OrderDetailResponse; orderId: string }) {
  const router = useRouter()
  const { order, items, addresses, contact, events } = data

  const [showShipModal, setShowShipModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [showPackingInterface, setShowPackingInterface] = useState(false)

  const packMutation = useMarkOrderPacked()
  const shipMutation = useMarkOrderShipped()
  const outForDeliveryMutation = useMarkOrderOutForDelivery()
  const deliverMutation = useMarkOrderDelivered()
  const cancelMutation = useCancelOrder()
  const updateAddrMut = useUpdateOrderShippingAddress()

  const [editingShippingAddress, setEditingShippingAddress] = useState(false)
  const [addrForm, setAddrForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    countryCode: '',
  })

  const canPack = order.fulfillmentState === 'NOT_STARTED' && order.paymentState === 'PAID'
  const canShip = order.fulfillmentState === 'PACKED'
  const canMarkOutForDelivery = order.fulfillmentState === 'SHIPPED'
  const canDeliver = order.fulfillmentState === 'OUT_FOR_DELIVERY'
  const canCancel = order.orderState === 'PLACED' && order.fulfillmentState === 'NOT_STARTED'

  const shippingAddress = addresses.find((a) => a.kind === 'SHIPPING')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/orders')}
            className="-ml-2 mb-2 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-gray-900">{order.orderRef}</h1>
            {order.orderState === 'CANCELLED' && <Badge variant="destructive">Cancelled</Badge>}
          </div>
          <p className="mt-1 text-sm text-gray-500">Placed {formatDateTime(order.placedAt)}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {canPack && (
            <Button onClick={() => setShowPackingInterface(true)} className="gap-2">
              <Barcode className="h-4 w-4" />
              Scan &amp; Pack
            </Button>
          )}
          {canShip && (
            <Button onClick={() => setShowShipModal(true)} className="gap-2">
              <Truck className="h-4 w-4" />
              Mark Shipped
            </Button>
          )}
          {canMarkOutForDelivery && (
            <Button
              onClick={() => outForDeliveryMutation.mutate({ orderId })}
              disabled={outForDeliveryMutation.isPending}
              className="gap-2"
            >
              <Truck className="h-4 w-4" />
              Out for Delivery
            </Button>
          )}
          {canDeliver && (
            <Button
              onClick={() => deliverMutation.mutate({ orderId })}
              disabled={deliverMutation.isPending}
              variant="default"
              className="gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Delivered
            </Button>
          )}
          {canCancel && (
            <Button
              variant="outline"
              onClick={() => setShowCancelModal(true)}
              className="gap-2 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <XCircle className="h-4 w-4" />
              Cancel Order
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 text-sm text-gray-500">Fulfillment</div>
            <FulfillmentBadge state={order.fulfillmentState} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 text-sm text-gray-500">Payment</div>
            <PaymentBadge state={order.paymentState} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 text-sm text-gray-500">Total</div>
            <div className="text-lg font-semibold">{formatMoney(order.total, order.currency)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-1 text-sm text-gray-500">Items</div>
            <div className="text-lg font-semibold">{items.length}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Items</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4">
                    <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100">
                      {item.productSnapshot.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- R2 / arbitrary URLs
                        <img
                          src={item.productSnapshot.imageUrl}
                          alt={item.productSnapshot.displayName}
                          className="h-full w-full rounded-lg object-cover"
                        />
                      ) : (
                        <Package className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{item.productSnapshot.displayName}</div>
                      <div className="text-sm text-gray-500">
                        {item.productSnapshot.color} · {item.productSnapshot.size}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        SKU: {item.productSnapshot.productCode}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">
                        {formatMoney(item.unitPriceAmount, item.unitPriceCurrency)}
                      </div>
                      <div className="text-sm text-gray-500">Qty: {item.qty}</div>
                      {item.qty > 1 && (
                        <div className="text-xs text-gray-400">
                          {formatMoney(
                            new Decimal(item.unitPriceAmount).times(item.qty).toFixed(2),
                            item.unitPriceCurrency,
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2 border-t border-gray-200 p-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span>{formatMoney(order.subtotal, order.currency)}</span>
                </div>
                {Number.parseFloat(order.discountAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="text-green-600">
                      -{formatMoney(order.discountAmount, order.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Shipping</span>
                  <span>{formatMoney(order.shippingCost, order.currency)}</span>
                </div>
                {Number.parseFloat(order.taxAmount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Tax</span>
                    <span>{formatMoney(order.taxAmount, order.currency)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>{formatMoney(order.total, order.currency)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {events.map((event: OrderEvent, idx) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`h-2 w-2 rounded-full ${idx === 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
                        />
                        {idx < events.length - 1 && (
                          <div className="my-1 h-full w-px bg-gray-200" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="text-sm font-medium">{formatEventType(event.eventType)}</div>
                        <div className="text-xs text-gray-500">{formatDateTime(event.createdAt)}</div>
                        {event.adminNote && (
                          <div className="mt-1 rounded bg-gray-50 p-2 text-sm text-gray-600">
                            {event.adminNote}
                          </div>
                        )}
                        {event.payloadJson && Object.keys(event.payloadJson).length > 0 && (
                          <div className="mt-1 text-xs text-gray-400">
                            {JSON.stringify(event.payloadJson)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Email</div>
                <div className="font-medium">{order.guestEmail ?? 'Registered customer'}</div>
              </div>
              {contact && (
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div className="font-medium">{contact.primaryPhone}</div>
                  {contact.extraPhones.length > 0 && (
                    <div className="text-sm text-gray-500">{contact.extraPhones.join(', ')}</div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {shippingAddress && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Shipping Address
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    type="button"
                    onClick={() => {
                      if (editingShippingAddress) {
                        setEditingShippingAddress(false)
                        return
                      }
                      const nm = shippingAddress.addressJson.fullName.trim().split(/\s+/)
                      setAddrForm({
                        firstName: nm[0] ?? '',
                        lastName: nm.slice(1).join(' ') ?? '',
                        phone: contact?.primaryPhone ?? '',
                        line1: shippingAddress.addressJson.line1,
                        line2: shippingAddress.addressJson.line2 ?? '',
                        city: shippingAddress.addressJson.city,
                        state: shippingAddress.addressJson.state ?? '',
                        postalCode: shippingAddress.addressJson.postalCode,
                        country: shippingAddress.addressJson.country,
                        countryCode: shippingAddress.countryCode,
                      })
                      setEditingShippingAddress(true)
                    }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editingShippingAddress ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="addr-fn">First name</Label>
                        <Input
                          id="addr-fn"
                          value={addrForm.firstName}
                          onChange={(e) =>
                            setAddrForm((f) => ({ ...f, firstName: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="addr-ln">Last name</Label>
                        <Input
                          id="addr-ln"
                          value={addrForm.lastName}
                          onChange={(e) =>
                            setAddrForm((f) => ({ ...f, lastName: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="addr-ph">Phone</Label>
                      <Input
                        id="addr-ph"
                        value={addrForm.phone}
                        onChange={(e) => setAddrForm((f) => ({ ...f, phone: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-l1">Address line 1</Label>
                      <Input
                        id="addr-l1"
                        value={addrForm.line1}
                        onChange={(e) => setAddrForm((f) => ({ ...f, line1: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="addr-l2">Address line 2</Label>
                      <Input
                        id="addr-l2"
                        value={addrForm.line2}
                        onChange={(e) => setAddrForm((f) => ({ ...f, line2: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="addr-city">City</Label>
                        <Input
                          id="addr-city"
                          value={addrForm.city}
                          onChange={(e) => setAddrForm((f) => ({ ...f, city: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="addr-st">State / region</Label>
                        <Input
                          id="addr-st"
                          value={addrForm.state}
                          onChange={(e) => setAddrForm((f) => ({ ...f, state: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="addr-pc">Postal code</Label>
                        <Input
                          id="addr-pc"
                          value={addrForm.postalCode}
                          onChange={(e) =>
                            setAddrForm((f) => ({ ...f, postalCode: e.target.value }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="addr-cc">Country code</Label>
                        <Input
                          id="addr-cc"
                          value={addrForm.countryCode}
                          onChange={(e) =>
                            setAddrForm((f) => ({
                              ...f,
                              countryCode: e.target.value.toUpperCase().slice(0, 2),
                            }))
                          }
                          maxLength={2}
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="addr-ct">Country</Label>
                      <Input
                        id="addr-ct"
                        value={addrForm.country}
                        onChange={(e) => setAddrForm((f) => ({ ...f, country: e.target.value }))}
                      />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={updateAddrMut.isPending}
                        onClick={() => {
                          void updateAddrMut
                            .mutateAsync({
                              orderId,
                              countryCode: addrForm.countryCode.trim().toUpperCase(),
                              addressJson: {
                                fullName:
                                  `${addrForm.firstName} ${addrForm.lastName}`.trim(),
                                line1: addrForm.line1.trim(),
                                line2: addrForm.line2.trim() || undefined,
                                city: addrForm.city.trim(),
                                state: addrForm.state.trim() || undefined,
                                postalCode: addrForm.postalCode.trim(),
                                country: addrForm.country.trim(),
                                ...(addrForm.phone.trim()
                                  ? { phone: addrForm.phone.trim() }
                                  : {}),
                              },
                            })
                            .then(() => {
                              toast.success('Shipping address updated.')
                              setEditingShippingAddress(false)
                            })
                            .catch((e: ApiError) => {
                              toast.error(e.message ?? 'Update failed')
                            })
                        }}
                      >
                        Save address
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingShippingAddress(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1 text-sm">
                    <div className="font-medium">{shippingAddress.addressJson.fullName}</div>
                    <div>{shippingAddress.addressJson.line1}</div>
                    {shippingAddress.addressJson.line2 && (
                      <div>{shippingAddress.addressJson.line2}</div>
                    )}
                    <div>
                      {shippingAddress.addressJson.city}
                      {shippingAddress.addressJson.state &&
                        `, ${shippingAddress.addressJson.state}`}{' '}
                      {shippingAddress.addressJson.postalCode}
                    </div>
                    <div>{shippingAddress.addressJson.country}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.isGift && contact?.giftReceiver && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Gift className="h-4 w-4" />
                  Gift Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <div className="text-sm text-gray-500">Recipient</div>
                  <div className="font-medium">{contact.giftReceiver.name}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Phone</div>
                  <div>{contact.giftReceiver.phone}</div>
                </div>
                {contact.giftReceiver.message && (
                  <div>
                    <div className="text-sm text-gray-500">Message</div>
                    <div className="text-sm italic">&quot;{contact.giftReceiver.message}&quot;</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {order.shippingMethodSnapshot && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Shipping Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-medium">{order.shippingMethodSnapshot}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ShipModal
        open={showShipModal}
        onClose={() => setShowShipModal(false)}
        onConfirm={(trackingNumber, carrier, note) => {
          shipMutation.mutate(
            { orderId, trackingNumber, carrier, note },
            { onSuccess: () => setShowShipModal(false) },
          )
        }}
        isPending={shipMutation.isPending}
      />

      <CancelModal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={(reason) => {
          cancelMutation.mutate(
            { orderId, reason },
            { onSuccess: () => setShowCancelModal(false) },
          )
        }}
        isPending={cancelMutation.isPending}
      />

      <PackingInterface
        open={showPackingInterface}
        onClose={() => setShowPackingInterface(false)}
        orderId={orderId}
        onPackComplete={() => {
          packMutation.mutate(
            { orderId },
            { onSuccess: () => setShowPackingInterface(false) },
          )
        }}
        isPacking={packMutation.isPending}
      />
    </div>
  )
}

function ShipModal({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (trackingNumber?: string, carrier?: string, note?: string) => void
  isPending: boolean
}) {
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [note, setNote] = useState('')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Order as Shipped</DialogTitle>
          <DialogDescription>
            Enter shipping details to mark this order as shipped.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Tracking Number (optional)
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="e.g. 1Z999AA10123456784"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Carrier (optional)</label>
            <input
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. DHL, FedEx, Aramex"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Internal note..."
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onConfirm(
                trackingNumber.trim() || undefined,
                carrier.trim() || undefined,
                note.trim() || undefined,
              )
            }
            disabled={isPending}
          >
            {isPending ? 'Marking...' : 'Mark as Shipped'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CancelModal({
  open,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (reason: string) => void
  isPending: boolean
}) {
  const [reason, setReason] = useState('')

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancel Order
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. The customer will be notified.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Cancellation Reason *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason for cancellation..."
            rows={3}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-400 focus:outline-none"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Keep Order
          </Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(reason)}
            disabled={isPending || !reason.trim()}
          >
            {isPending ? 'Cancelling...' : 'Cancel Order'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PackingInterface({
  open,
  onClose,
  orderId,
  onPackComplete,
  isPacking,
}: {
  open: boolean
  onClose: () => void
  orderId: string
  onPackComplete: () => void
  isPacking: boolean
}) {
  const { data: packingStatus, isLoading, refetch } = useOrderPackingStatus(
    open ? orderId : null,
  )
  const scanMutation = useScanUnit()
  const removeMutation = useRemoveAllocation()

  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  useEffect(() => {
    if (packingStatus && !selectedItemId) {
      const firstIncomplete = packingStatus.items.find((item) => !item.isComplete)
      if (firstIncomplete) {
        setSelectedItemId(firstIncomplete.orderItemId)
      }
    }
  }, [packingStatus, selectedItemId])

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim() || !selectedItemId) return

    setScanError(null)
    setSuccess(null)

    try {
      await scanMutation.mutateAsync({
        barcodeValue: barcodeInput.trim(),
        orderItemId: selectedItemId,
        orderId,
      })
      setSuccess(`Scanned: ${barcodeInput.trim()}`)
      setBarcodeInput('')
      inputRef.current?.focus()
    } catch (err: unknown) {
      const apiErr = err as ApiError
      const errorMessages: Record<string, string> = {
        BARCODE_NOT_FOUND: 'Barcode not found in inventory',
        UNIT_NOT_IN_STOCK: 'This unit is not available (already sold or damaged)',
        UNIT_VARIANT_MISMATCH: 'This unit does not match the selected item',
        ORDER_ITEM_FULLY_ALLOCATED: 'This item is already fully packed',
      }
      setScanError(errorMessages[apiErr.code ?? ''] ?? apiErr.message ?? 'Scan failed')
      setBarcodeInput('')
      inputRef.current?.focus()
    }
  }

  const handleRemoveUnit = async (inventoryUnitId: string) => {
    setScanError(null)
    setSuccess(null)
    try {
      await removeMutation.mutateAsync({ orderId, inventoryUnitId })
      setSuccess('Unit removed')
    } catch {
      setScanError('Failed to remove unit')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Scan-to-Pack
          </DialogTitle>
          <DialogDescription>
            Scan barcodes to allocate inventory units to this order.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : packingStatus ? (
          <div className="space-y-4">
            <form onSubmit={handleScan} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={barcodeInput}
                onChange={(e) => setBarcodeInput(e.target.value)}
                placeholder="Scan or enter barcode..."
                className="flex-1 rounded border border-gray-300 px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              <Button
                type="submit"
                disabled={!barcodeInput.trim() || !selectedItemId || scanMutation.isPending}
              >
                {scanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
              </Button>
              <Button type="button" variant="outline" onClick={() => void refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </form>

            {scanError && (
              <Alert variant="destructive">
                <AlertDescription>{scanError}</AlertDescription>
              </Alert>
            )}
            {success && (
              <Alert className="border-green-200 bg-green-50">
                <Check className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">{success}</AlertDescription>
              </Alert>
            )}

            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {packingStatus.items.map((item) => (
                  <PackingItemRow
                    key={item.orderItemId}
                    item={item}
                    isSelected={selectedItemId === item.orderItemId}
                    onSelect={() => setSelectedItemId(item.orderItemId)}
                    onRemoveUnit={handleRemoveUnit}
                  />
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-gray-500">
                {packingStatus.items.filter((i) => i.isComplete).length} of{' '}
                {packingStatus.items.length} items packed
              </div>
              {packingStatus.isFullyPacked && (
                <Badge className="bg-green-100 text-green-800">
                  <Check className="mr-1 h-3 w-3" />
                  Ready to ship
                </Badge>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {packingStatus?.isFullyPacked && (
            <Button
              onClick={onPackComplete}
              disabled={isPacking}
              className="bg-green-600 hover:bg-green-700"
            >
              <Package className="mr-2 h-4 w-4" />
              {isPacking ? 'Marking...' : 'Mark as Packed'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function PackingItemRow({
  item,
  isSelected,
  onSelect,
  onRemoveUnit,
}: {
  item: PackingItemStatus
  isSelected: boolean
  onSelect: () => void
  onRemoveUnit: (unitId: string) => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
      className={`cursor-pointer rounded-lg border-2 p-3 transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : item.isComplete
            ? 'border-green-200 bg-green-50'
            : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <div className="font-medium">{item.productName}</div>
          <div className="text-sm text-gray-500">
            {item.color} · {item.size}
          </div>
        </div>
        <div className="text-right">
          <div className={`font-semibold ${item.isComplete ? 'text-green-600' : ''}`}>
            {item.allocated} / {item.required}
          </div>
          {item.isComplete && <Check className="inline h-4 w-4 text-green-600" />}
        </div>
      </div>

      {item.allocatedUnits.length > 0 && (
        <div className="mt-2 space-y-1">
          {item.allocatedUnits.map((unit) => (
            <div
              key={unit.inventoryUnitId}
              className="flex items-center justify-between rounded bg-white px-2 py-1 text-xs"
            >
              <span className="font-mono">{unit.barcodeValue}</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">{unit.scannedByName}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    void onRemoveUnit(unit.inventoryUnitId)
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-64" />
      </div>
    </div>
  )
}
