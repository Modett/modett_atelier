'use client'

import { useEffect, useId, useRef } from 'react'
import JsBarcode from 'jsbarcode'
import type { AdminInventoryUnit, RestockResult } from '@modett/types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export interface BarcodeLabelProps {
  unit: AdminInventoryUnit
  productName: string
  color: string
  size: string
}

export function BarcodeSvg({ barcodeValue }: { barcodeValue: string }) {
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
      // invalid value — leave empty
    }
  }, [barcodeValue])

  return <svg ref={ref} className="mx-auto block h-[50px] max-w-full" />
}

export function BarcodeLabel({ unit, productName, color, size }: BarcodeLabelProps) {
  return (
    <div
      className="box-border flex flex-col border border-gray-200 bg-white p-2 print:break-inside-avoid"
      style={{
        width: '90mm',
        minHeight: '50mm',
        pageBreakInside: 'avoid',
      }}
    >
      <p className="text-[8px] tracking-[0.35em] text-gray-400 uppercase">
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
    </div>
  )
}

const printStylesId = 'barcode-print-sheet-styles'

function ensurePrintStyles() {
  if (typeof document === 'undefined') return
  if (document.getElementById(printStylesId)) return
  const style = document.createElement('style')
  style.id = printStylesId
  style.textContent = `
@media print {
  body * { visibility: hidden !important; }
  #barcode-print-sheet, #barcode-print-sheet * { visibility: visible !important; }
  #barcode-print-sheet {
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
  #barcode-print-sheet { background: white; }
}
`
  document.head.appendChild(style)
}

export interface BarcodePrintSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restockResult: RestockResult | null
}

export function BarcodePrintSheet({
  open,
  onOpenChange,
  restockResult,
}: BarcodePrintSheetProps) {
  const uid = useId()

  useEffect(() => {
    ensurePrintStyles()
  }, [])

  if (!restockResult) return null

  const { newUnits, productName, color, size } = restockResult

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Barcode Sheet — {newUnits.length} labels
            </DialogTitle>
            <DialogDescription>
              {productName} · {color} · {size}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto rounded-md border bg-white p-4">
            <div
              id={`barcode-print-sheet-${uid}`}
              className="mx-auto grid max-w-[190mm] grid-cols-1 gap-4 sm:grid-cols-2"
            >
              {newUnits.map((unit) => (
                <BarcodeLabel
                  key={unit.id}
                  unit={unit}
                  productName={productName}
                  color={color}
                  size={size}
                />
              ))}
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              type="button"
              onClick={() => {
                const node = document.getElementById(`barcode-print-sheet-${uid}`)
                if (!node) {
                  window.print()
                  return
                }
                const wrapper = document.createElement('div')
                wrapper.id = 'barcode-print-sheet'
                wrapper.style.cssText = 'position:absolute;left:0;top:0;width:100%;background:white;'
                const clone = node.cloneNode(true) as HTMLElement
                clone.id = 'barcode-print-sheet-inner'
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
    </>
  )
}
