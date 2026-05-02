'use client'

import { useEffect, useId, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useVariantBarcodes } from '@/hooks/useAdminInventory'
import type { AdminInventoryUnit } from '@modett/types'

export interface BarcodePrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  variantId: string
  unitIds: string[]
  productName: string
  color: string
  size: string
  skuGroup: string
}


function BarcodeSvg({ barcodeValue }: { barcodeValue: string }) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    try {
      while (el.firstChild) el.removeChild(el.firstChild)
      JsBarcode(el, barcodeValue, {
        format: 'CODE128',
        width: 1.5,
        height: 50,
        displayValue: true,
        fontSize: 10,
        margin: 4,
        background: '#ffffff',
        lineColor: '#000000',
      })
    } catch {
      // invalid barcode value — leave blank
    }
  }, [barcodeValue])

  return <svg ref={ref} className="mx-auto block h-[50px] max-w-full" />
}

interface BarcodeUnit {
  id: string
  unitSku: string
  barcodeValue: string
}

function BarcodeLabel({
  unit,
  productName,
  color,
  size,
  skuGroup,
}: {
  unit: BarcodeUnit
  productName: string
  color: string
  size: string
  skuGroup: string
}) {
  return (
    <div
      className="box-border flex flex-col border border-gray-200 bg-white p-2 print:break-inside-avoid"
      style={{
        width: '90mm',
        minHeight: '50mm',
        pageBreakInside: 'avoid',
      }}
    >
      <p className="text-[8px] uppercase tracking-[0.35em] text-gray-400">
        Modett Atelier
      </p>
      <div className="my-1 border-t border-gray-200" />
      <p className="text-[11px] font-medium text-black">{productName}</p>
      <p className="text-[10px] text-gray-600">
        {color} / {size}
      </p>
      <div className="my-2 flex justify-center">
        <BarcodeSvg barcodeValue={unit.barcodeValue} />
      </div>
      <p className="text-center font-mono text-[9px] text-gray-800">
        {unit.barcodeValue}
      </p>
      <div className="my-1 border-t border-gray-200" />
      <p className="font-mono text-[8px] text-gray-500">
        Unit SKU: {unit.unitSku}
      </p>
      <p className="font-mono text-[8px] text-gray-400">{skuGroup}</p>
    </div>
  )
}

const printStylesId = 'barcode-print-dialog-styles'

function ensurePrintStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(printStylesId)) return
  const style = document.createElement('style')
  style.id = printStylesId
  style.textContent = `
@media print {
  body * { visibility: hidden !important; }
  #barcode-print-dialog, #barcode-print-dialog * { visibility: visible !important; }
  #barcode-print-dialog {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    display: block !important;
    background: white !important;
  }
  @page { size: A4 portrait; margin: 10mm; }
}
@media screen {
  #barcode-print-dialog { background: white; }
}
`
  document.head.appendChild(style)
}

export function BarcodePrintDialog({
  open,
  onOpenChange,
  variantId,
  unitIds,
  productName,
  color,
  size,
  skuGroup,
}: BarcodePrintDialogProps) {
  const uid = useId()

  const { data, isLoading, error } = useVariantBarcodes({
    variantId,
    status: 'ALL',
    unitIds: unitIds.length > 0 ? unitIds : undefined,
  })

  useEffect(() => {
    ensurePrintStyles()
  }, [])

  const units: BarcodeUnit[] = (
    (data?.units ?? []) as AdminInventoryUnit[]
  ).map((u) => ({
    id: u.id,
    unitSku: u.unitSku,
    barcodeValue: u.barcodeValue,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>
            Print Barcodes — {units.length} label{units.length !== 1 ? 's' : ''}
          </DialogTitle>
          <DialogDescription>
            {productName} · {color} · {size}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto rounded-md border bg-white p-4">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: Math.min(unitIds.length || 4, 4) }).map(
                (_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ),
              )}
            </div>
          ) : error ? (
            <p className="py-8 text-center text-red-600">
              Failed to load barcode data.
            </p>
          ) : units.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No units found to print.
            </p>
          ) : (
            <div
              id={`barcode-print-dialog-${uid}`}
              className="mx-auto grid max-w-[190mm] grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {units.map((unit) => (
                <BarcodeLabel
                  key={unit.id}
                  unit={unit}
                  productName={productName}
                  color={color}
                  size={size}
                  skuGroup={skuGroup}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <Button
            type="button"
            disabled={isLoading || units.length === 0}
            onClick={() => {
              const node = document.getElementById(
                `barcode-print-dialog-${uid}`,
              )
              if (!node) {
                window.print()
                return
              }
              const wrapper = document.createElement('div')
              wrapper.id = 'barcode-print-dialog'
              wrapper.style.cssText =
                'position:absolute;left:0;top:0;width:100%;background:white;'
              const clone = node.cloneNode(true) as HTMLElement
              wrapper.appendChild(clone)
              document.body.appendChild(wrapper)
              window.print()
              document.body.removeChild(wrapper)
            }}
          >
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
