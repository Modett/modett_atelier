'use client'

import { HexColorPicker } from 'react-colorful'
import { cn } from '@/lib/utils'

export const MODETT_PRESETS = [
  { name: 'Ivory', hex: '#F5F0E8' },
  { name: 'Ecru', hex: '#EDE0C8' },
  { name: 'Sand', hex: '#C8B89A' },
  { name: 'Umber', hex: '#8B6E52' },
  { name: 'Sage', hex: '#8A9E85' },
  { name: 'Slate', hex: '#6B7B8D' },
  { name: 'Black', hex: '#1A1A18' },
  { name: 'White', hex: '#FAFAF8' },
] as const

export interface ColourPickerInputProps {
  value: string
  onChange: (hex: string) => void
  label?: string
}

function normalizeHex(input: string): string {
  const raw = input.replace(/^#/, '').slice(0, 6)
  if (/^[0-9A-Fa-f]{6}$/.test(raw)) return `#${raw.toUpperCase()}`
  return ''
}

export function ColourPickerInput({ value, onChange, label }: ColourPickerInputProps) {
  const safe = /^#[0-9A-Fa-f]{6}$/.test(value) ? value : '#F5F0E8'
  const preset = MODETT_PRESETS.find(
    (p) => p.hex.toLowerCase() === safe.toLowerCase(),
  )
  const displayName = preset?.name ?? 'Custom'

  return (
    <div className="space-y-3">
      {label ? (
        <p className="text-sm font-medium text-gray-800">{label}</p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500">Selected:</span>
        <span
          className="inline-block h-5 w-5 rounded-full border border-gray-200"
          style={{ backgroundColor: safe }}
        />
        <span className="font-medium text-gray-800">{displayName}</span>
        <span className="font-mono text-sm text-gray-500">{safe}</span>
      </div>
      <div className="rounded-md border border-gray-200 p-2">
        <HexColorPicker
          color={safe}
          onChange={(hex) => onChange(hex.toUpperCase())}
          style={{ width: '240px', height: '160px' }}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-500">Hex</span>
        <span className="text-gray-400">#</span>
        <input
          type="text"
          maxLength={6}
          value={safe.replace('#', '')}
          onChange={(e) => {
            const next = normalizeHex(e.target.value)
            if (next) onChange(next)
          }}
          className="w-24 rounded border border-gray-200 px-2 py-1 font-mono text-sm uppercase"
          aria-label="Hex colour without hash"
        />
        <span
          className="inline-block h-6 w-6 rounded-full border border-gray-200"
          style={{ backgroundColor: safe }}
        />
      </div>
      <div>
        <p className="mb-2 text-xs text-gray-500">Presets</p>
        <div className="flex flex-wrap gap-2">
          {MODETT_PRESETS.map((p) => {
            const selected = p.hex.toLowerCase() === safe.toLowerCase()
            return (
              <button
                key={p.hex}
                type="button"
                title={p.name}
                onClick={() => onChange(p.hex)}
                className={cn(
                  'h-6 w-6 rounded-full border border-gray-200 transition-shadow',
                  selected && 'ring-2 ring-gray-400 ring-offset-1',
                )}
                style={{ backgroundColor: p.hex }}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
