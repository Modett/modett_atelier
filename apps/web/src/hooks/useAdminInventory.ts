'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { UnitStatus } from '@modett/types'
import type {
  AdminInventoryListResponse,
  AdminInventoryMovement,
  AdminInventoryUnit,
  AdminReconciliationLog,
  AdminVariantStockDetail,
  ManualReconcileResult,
  RestockResult,
  StockStatus,
} from '@modett/types'

export const ADMIN_INVENTORY_KEYS = {
  all: ['admin', 'inventory'] as const,
  list: (filters: AdminInventoryListFilters) =>
    [...ADMIN_INVENTORY_KEYS.all, 'list', filters] as const,
  variant: (variantId: string) =>
    [...ADMIN_INVENTORY_KEYS.all, 'variant', variantId] as const,
  units: (variantId: string, status?: UnitStatus) =>
    [...ADMIN_INVENTORY_KEYS.all, 'units', variantId, status ?? 'all'] as const,
  movements: (variantId: string, page: number) =>
    [...ADMIN_INVENTORY_KEYS.all, 'movements', variantId, page] as const,
  reconciliation: (variantId?: string) =>
    [...ADMIN_INVENTORY_KEYS.all, 'reconciliation', variantId ?? 'all'] as const,
} as const

export interface AdminInventoryListFilters {
  page?: number
  limit?: number
  productId?: string
  stockStatus?: StockStatus
  search?: string
}

function iso(raw: unknown): string {
  if (typeof raw === 'string') return raw
  if (raw instanceof Date) return raw.toISOString()
  return new Date(String(raw)).toISOString()
}

function mapUnitApi(raw: Record<string, unknown>): AdminInventoryUnit {
  return {
    id: String(raw.id),
    variantId: String(raw.variant_id ?? raw.variantId),
    unitSku: String(raw.unit_sku ?? raw.unitSku),
    barcodeValue: String(raw.barcode_value ?? raw.barcodeValue),
    status: (raw.status ?? 'IN_STOCK') as UnitStatus,
    createdAt: iso(raw.created_at ?? raw.createdAt),
    updatedAt: iso(raw.updated_at ?? raw.updatedAt),
  }
}

function mapMovementApi(raw: Record<string, unknown>): AdminInventoryMovement {
  return {
    id: String(raw.id),
    variantId: String(raw.variant_id ?? raw.variantId),
    deltaQty: Number(raw.delta_qty ?? raw.deltaQty ?? 0),
    reason: String(raw.reason ?? ''),
    referenceType:
      raw.reference_type != null ? String(raw.reference_type) : null,
    referenceId: raw.reference_id != null ? String(raw.reference_id) : null,
    createdByAdminId:
      raw.created_by_admin_id != null ? String(raw.created_by_admin_id) : null,
    createdAt: iso(raw.created_at ?? raw.createdAt),
    adminDisplayName:
      raw.adminDisplayName != null ? String(raw.adminDisplayName) : null,
  }
}

function mapStockDetailApi(raw: Record<string, unknown>): AdminVariantStockDetail {
  const stockRaw = (raw.stock ?? {}) as Record<string, unknown>
  const stock = {
    variantId: String(stockRaw.variantId ?? raw.variantId),
    inStockQty: Number(stockRaw.inStockQty ?? stockRaw.in_stock_qty ?? 0),
    heldQty: Number(stockRaw.heldQty ?? stockRaw.held_qty ?? 0),
    availableQty: Number(stockRaw.availableQty ?? stockRaw.available_qty ?? 0),
    lowStockThreshold: Number(
      stockRaw.lowStockThreshold ?? stockRaw.low_stock_threshold ?? 0,
    ),
    stockStatus: (stockRaw.stockStatus ?? stockRaw.stock_status ?? 'IN_STOCK') as StockStatus,
    updatedAt: iso(stockRaw.updatedAt ?? stockRaw.updated_at),
  }

  const unitsIn = Array.isArray(raw.units) ? raw.units : []
  const movementsIn = Array.isArray(raw.movements) ? raw.movements : []
  const unitCounts = (raw.unitCounts ?? raw.unit_counts ?? {}) as AdminVariantStockDetail['unitCounts']

  return {
    variantId: String(raw.variantId ?? raw.variant_id),
    productId: String(raw.productId ?? raw.product_id),
    productName: String(raw.productName ?? raw.product_name ?? ''),
    productCode: String(raw.productCode ?? raw.product_code ?? ''),
    keyImageUrl:
      raw.keyImageUrl != null
        ? String(raw.keyImageUrl)
        : raw.key_image_url != null
          ? String(raw.key_image_url)
          : null,
    color: String(raw.color ?? ''),
    colorHex:
      raw.colorHex != null
        ? String(raw.colorHex)
        : raw.color_hex != null
          ? String(raw.color_hex)
          : null,
    size: String(raw.size ?? ''),
    skuGroup: String(raw.skuGroup ?? raw.sku_group ?? ''),
    stock,
    units: unitsIn.map((u) => mapUnitApi(u as Record<string, unknown>)),
    movements: movementsIn.map((m) =>
      mapMovementApi(m as Record<string, unknown>),
    ),
    unitCounts,
  }
}

export function useAdminInventoryList(filters: AdminInventoryListFilters = {}) {
  const page = filters.page ?? 1
  const limit = filters.limit ?? 50
  const productId = filters.productId
  const stockStatus = filters.stockStatus
  const search = filters.search

  return useQuery({
    queryKey: ADMIN_INVENTORY_KEYS.list({
      page,
      limit,
      productId,
      stockStatus,
      search: search ?? '',
    }),
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      }
      if (productId) params.productId = productId
      if (stockStatus) params.stockStatus = stockStatus
      if (search?.trim()) params.search = search.trim()

      const res = await api.get<{ data: AdminInventoryListResponse }>(
        '/admin/inventory',
        { params },
      )
      return res.data
    },
    staleTime: 20 * 1000,
  })
}

export function useAdminVariantStock(variantId: string | null) {
  return useQuery({
    queryKey: ADMIN_INVENTORY_KEYS.variant(variantId ?? '__none__'),
    queryFn: async () => {
      if (!variantId) throw new Error('No variant')
      const res = await api.get<{ data: Record<string, unknown> }>(
        `/admin/inventory/variants/${variantId}/stock`,
      )
      return mapStockDetailApi(res.data)
    },
    enabled: Boolean(variantId),
    staleTime: 10 * 1000,
  })
}

export function useAdminVariantUnits(
  variantId: string | null,
  status?: UnitStatus,
) {
  return useQuery({
    queryKey: ADMIN_INVENTORY_KEYS.units(variantId ?? '__none__', status),
    queryFn: async () => {
      if (!variantId) throw new Error('No variant')
      const params: Record<string, string> = {}
      if (status) params.status = status
      const res = await api.get<{
        data: { units: Record<string, unknown>[] }
      }>(`/admin/inventory/variants/${variantId}/units`, { params })
      return {
        units: res.data.units.map((u) => mapUnitApi(u)),
      }
    },
    enabled: Boolean(variantId),
    staleTime: 5 * 1000,
  })
}

export function useAdminMovementHistory(
  variantId: string | null,
  page = 1,
) {
  return useQuery({
    queryKey: ADMIN_INVENTORY_KEYS.movements(variantId ?? '__none__', page),
    queryFn: async () => {
      if (!variantId) throw new Error('No variant')
      const res = await api.get<{
        data: {
          movements: Record<string, unknown>[]
          page: number
          limit: number
          total: number
        }
      }>(`/admin/inventory/variants/${variantId}/movements`, {
        params: { page: String(page), limit: '20' },
      })
      return {
        movements: res.data.movements.map((m) => mapMovementApi(m)),
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
      }
    },
    enabled: Boolean(variantId),
    staleTime: 10 * 1000,
  })
}

export function useAdminUnresolvedDrift(variantId?: string) {
  return useQuery({
    queryKey: ADMIN_INVENTORY_KEYS.reconciliation(variantId),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (variantId) params.variantId = variantId
      const res = await api.get<{ data: { logs: AdminReconciliationLog[] } }>(
        '/admin/inventory/reconciliation/unresolved',
        { params },
      )
      return { logs: res.data.logs }
    },
    staleTime: 15 * 1000,
  })
}

export function useRestockVariant() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      variantId,
      qty,
    }: {
      variantId: string
      qty: number
    }) => {
      const res = await api.post<{ data: RestockResult }>(
        `/admin/inventory/variants/${variantId}/restock`,
        { qty },
      )
      return res.data
    },
    onSuccess: (_, { variantId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_KEYS.all })
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INVENTORY_KEYS.variant(variantId),
      })
    },
  })
}

export function useSetLowStockThreshold() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      variantId,
      threshold,
    }: {
      variantId: string
      threshold: number
    }) => {
      await api.patch(`/admin/inventory/variants/${variantId}/threshold`, {
        threshold,
      })
    },
    onSuccess: (_, { variantId }) => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INVENTORY_KEYS.variant(variantId),
      })
      void queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_KEYS.all })
    },
  })
}

export function useMarkUnitsDamaged() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      variantId,
      unitIds,
    }: {
      variantId: string
      unitIds: string[]
    }) => {
      const res = await api.post<{ data: { markedCount: number } }>(
        `/admin/inventory/variants/${variantId}/damage`,
        { unitIds },
      )
      return res.data
    },
    onSuccess: (_, { variantId }) => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INVENTORY_KEYS.variant(variantId),
      })
      void queryClient.invalidateQueries({
        queryKey: [...ADMIN_INVENTORY_KEYS.all, 'units', variantId],
      })
      void queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_KEYS.all })
    },
  })
}

export function useAdjustUnitsOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      variantId,
      unitIds,
      note,
    }: {
      variantId: string
      unitIds: string[]
      note?: string
    }) => {
      const res = await api.post<{ data: { markedCount: number } }>(
        `/admin/inventory/variants/${variantId}/adjust-out`,
        { unitIds, note },
      )
      return res.data
    },
    onSuccess: (_, { variantId }) => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INVENTORY_KEYS.variant(variantId),
      })
      void queryClient.invalidateQueries({
        queryKey: [...ADMIN_INVENTORY_KEYS.all, 'units', variantId],
      })
      void queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_KEYS.all })
    },
  })
}

export function useRunReconciliation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ variantId }: { variantId: string }) => {
      const res = await api.post<{ data: ManualReconcileResult }>(
        `/admin/inventory/variants/${variantId}/reconcile`,
        {},
      )
      return res.data
    },
    onSuccess: (_, { variantId }) => {
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INVENTORY_KEYS.reconciliation(),
      })
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INVENTORY_KEYS.reconciliation(variantId),
      })
      void queryClient.invalidateQueries({
        queryKey: ADMIN_INVENTORY_KEYS.variant(variantId),
      })
      void queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_KEYS.all })
    },
  })
}

export function useVariantBarcodes({
  variantId,
  status,
  unitIds,
}: {
  variantId: string
  status: 'IN_STOCK' | 'ALL'
  unitIds?: string[]
}) {
  return useQuery({
    queryKey: [
      ...ADMIN_INVENTORY_KEYS.variant(variantId),
      'barcodes',
      status,
      unitIds?.join(',') ?? '',
    ] as const,
    queryFn: async () => {
      const params: Record<string, string> = { status }
      if (unitIds != null && unitIds.length > 0) {
        params.unitIds = unitIds.join(',')
      }
      const res = await api.get<{
        data: {
          units: AdminInventoryUnit[]
          variant: {
            id: string
            color: string
            size: string
            skuGroup: string
          }
          product: { displayName: string; productCode: string }
        }
      }>(`/admin/inventory/variants/${variantId}/barcodes`, { params })
      return res.data
    },
    enabled: Boolean(variantId),
  })
}

export function useResolveReconciliation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      logId,
      resolvedNote,
    }: {
      logId: string
      resolvedNote: string
    }) => {
      await api.patch(`/admin/inventory/reconciliation/${logId}/resolve`, {
        resolvedNote,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [...ADMIN_INVENTORY_KEYS.all, 'reconciliation'],
      })
      void queryClient.invalidateQueries({ queryKey: ADMIN_INVENTORY_KEYS.all })
    },
  })
}
