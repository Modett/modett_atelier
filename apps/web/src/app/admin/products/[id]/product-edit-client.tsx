'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import { toast } from 'sonner'
import {
  ArrowDown,
  ArrowUp,
  Camera,
  CloudUpload,
  ExternalLink,
  Loader2,
  Star,
  Trash2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HangTagPreview } from '@/components/admin/HangTagPreview'
import { ColourPickerInput } from '@/components/admin/ColourPickerInput'
import type { AdminProductImage, AdminProductVariant } from '@modett/types'
import {
  useAdminProductDetail,
  useAdminCategories,
  useUpdateProduct,
  useDeleteProduct,
  useRegisterProductImage,
  useSetKeyImage,
  useReorderImages,
  useDeleteProductImage,
  usePatchProductImageAlt,
  useCreateVariant,
  useDeleteVariant,
  fetchProductImageUploadUrl,
} from '@/hooks/useAdminCatalog'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugFromDisplayName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const detailSchema = z.object({
  displayName: z.string().min(1).max(500),
  shortName: z.string().min(1).max(200),
  productCode: z.string().min(1).max(100),
  slug: z.string().min(1).max(200).regex(slugPattern),
  categoryId: z.string().optional(),
  description: z.string().max(20000).optional().default(''),
  fabricInfo: z.string().max(20000).optional().default(''),
  active: z.boolean(),
  isSale: z.boolean(),
})

type DetailForm = z.infer<typeof detailSchema>

const priceSchema = z.object({
  lkrAmount: z
    .string()
    .refine((s) => {
      const n = Number.parseFloat(s)
      return !Number.isNaN(n) && n >= 0
    }),
  sgdAmount: z
    .string()
    .refine((s) => {
      const n = Number.parseFloat(s)
      return !Number.isNaN(n) && n >= 0
    }),
  usdAmount: z
    .string()
    .refine((s) => {
      const n = Number.parseFloat(s)
      return !Number.isNaN(n) && n >= 0
    }),
})

type PriceForm = z.infer<typeof priceSchema>

const STANDARD_UK = [
  'UK 4',
  'UK 6',
  'UK 8',
  'UK 10',
  'UK 12',
  'UK 14',
  'UK 16',
  'UK 18',
] as const
const STANDARD_EU = ['34', '36', '38', '40', '42', '44'] as const

function KeyImageThumb({ baseUrl }: { baseUrl: string }) {
  const [phase, setPhase] = useState<'thumb' | 'base' | 'none'>('thumb')
  const src =
    phase === 'thumb'
      ? `${baseUrl}-thumb.webp`
      : phase === 'base'
        ? baseUrl
        : ''

  if (!src) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <Camera className="h-5 w-5" />
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt=""
      fill
      className="object-cover"
      sizes="40px"
      unoptimized
      onError={() => {
        if (phase === 'thumb') setPhase('base')
        else setPhase('none')
      }}
    />
  )
}

function ProductImageCard({
  image,
  productId,
  keyImageId,
  index,
  total,
  sortedIds,
}: {
  image: AdminProductImage
  productId: string
  keyImageId: string | null
  index: number
  total: number
  sortedIds: string[]
}) {
  const [phase, setPhase] = useState<'card' | 'base' | 'none'>('card')
  const [confirmDel, setConfirmDel] = useState(false)
  const setKey = useSetKeyImage()
  const reorder = useReorderImages()
  const delImg = useDeleteProductImage()
  const patchAlt = usePatchProductImageAlt()
  const [alt, setAlt] = useState(image.altText ?? '')

  useEffect(() => {
    setAlt(image.altText ?? '')
  }, [image.altText])

  const src =
    phase === 'card'
      ? `${image.url}-card.webp`
      : phase === 'base'
        ? image.url
        : ''

  const isKey = keyImageId === image.id

  const move = (dir: -1 | 1) => {
    const next = [...sortedIds]
    const j = index + dir
    if (j < 0 || j >= total) return
    ;[next[index], next[j]] = [next[j], next[index]]
    void reorder.mutateAsync({ productId, imageIds: next })
  }

  const onAltBlur = () => {
    if (alt !== (image.altText ?? '')) {
      void patchAlt.mutateAsync({ productId, imageId: image.id, altText: alt })
    }
  }

  return (
    <div className="space-y-2">
      <div
        className={`relative overflow-hidden rounded-lg border bg-gray-50 ${
          isKey ? 'ring-2 ring-yellow-400' : 'border-gray-200'
        }`}
      >
        <div className="relative aspect-[3/4] w-full">
          {src ? (
            <Image
              src={src}
              alt={alt || ''}
              fill
              className="object-cover"
              sizes="(max-width:768px) 50vw, 33vw"
              unoptimized
              onError={() => {
                if (phase === 'card') setPhase('base')
                else setPhase('none')
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gray-100 text-gray-400">
              <Camera className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between gap-1 border-t border-gray-200 bg-white px-2 py-1.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isKey}
            title="Set as key image"
            onClick={() =>
              void setKey.mutateAsync({ productId, imageId: image.id }).then(() =>
                toast.success('Key image updated.'),
              )
            }
          >
            <Star
              className={`h-4 w-4 ${isKey ? 'fill-yellow-400 text-yellow-500' : ''}`}
            />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={index === 0}
            onClick={() => move(-1)}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={index >= total - 1}
            onClick={() => move(1)}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
          {confirmDel ? (
            <div className="flex flex-wrap items-center gap-1">
              {isKey ? (
                <span className="text-[10px] text-amber-700">
                  Key image will reassign.
                </span>
              ) : null}
              <Button
                size="sm"
                variant="destructive"
                className="h-7 text-xs"
                onClick={() =>
                  void delImg
                    .mutateAsync({ productId, imageId: image.id })
                    .then(() => toast.success('Image removed.'))
                }
              >
                ✓
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setConfirmDel(false)}
              >
                ✗
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-red-600"
              onClick={() => setConfirmDel(true)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <Input
        value={alt}
        onChange={(e) => setAlt(e.target.value)}
        onBlur={onAltBlur}
        placeholder="Alt text"
        className="text-xs"
      />
    </div>
  )
}

export function ProductEditClient({ productId }: { productId: string }) {
  const router = useRouter()
  const { data: product, isLoading } = useAdminProductDetail(productId)
  const { data: categories = [] } = useAdminCategories()
  const updateMut = useUpdateProduct()
  const deleteMut = useDeleteProduct()
  const registerImg = useRegisterProductImage()

  const slugManual = useRef(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<Record<string, boolean>>({})

  const detailForm = useForm<DetailForm>({
    resolver: zodResolver(detailSchema as never),
  })

  const priceForm = useForm<PriceForm>({
    resolver: zodResolver(priceSchema as never),
  })

  useEffect(() => {
    if (!product) return
    detailForm.reset({
      displayName: product.displayName,
      shortName: product.shortName,
      productCode: product.productCode,
      slug: product.slug,
      categoryId: product.categoryId ?? '',
      description: product.description ?? '',
      fabricInfo: product.fabricInfo ?? '',
      active: product.active,
      isSale: product.isSale,
    })
    slugManual.current = false
    if (product.prices) {
      priceForm.reset({
        lkrAmount: product.prices.lkrAmount,
        sgdAmount: product.prices.sgdAmount,
        usdAmount: product.prices.usdAmount,
      })
    }
  }, [product, detailForm, priceForm])

  const sortedImages = useMemo(() => {
    if (!product) return []
    return [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)
  }, [product])

  const sortedIds = useMemo(() => sortedImages.map((i) => i.id), [sortedImages])

  const onDrop = useCallback(
    async (accepted: File[]) => {
      if (!product) return
      const batch = accepted.slice(0, 10)
      for (let i = 0; i < batch.length; i++) {
        const file = batch[i]!
        const uid = `${file.name}-${file.size}-${i}`
        setUploadErrors((e) => {
          const n = { ...e }
          delete n[uid]
          return n
        })
        setUploading((u) => ({ ...u, [uid]: true }))
        try {
          const { uploadUrl, publicUrl } = await fetchProductImageUploadUrl({
            productId: product.id,
            filename: file.name,
            contentType: file.type,
          })
          const put = await fetch(uploadUrl, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type },
          })
          if (!put.ok) {
            throw new Error(`Upload failed (${put.status})`)
          }
          const isFirst = product.images.length === 0 && i === 0
          await registerImg.mutateAsync({
            productId: product.id,
            url: publicUrl,
            setAsKey: isFirst,
          })
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Upload failed'
          setUploadErrors((e) => ({ ...e, [uid]: msg }))
        } finally {
          setUploading((u) => {
            const n = { ...u }
            delete n[uid]
            return n
          })
        }
      }
    },
    [product, registerImg],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': [],
      'image/png': [],
      'image/webp': [],
      'image/tiff': [],
    },
    maxSize: 20 * 1024 * 1024,
    maxFiles: 10,
    disabled: !product,
  })

  const variantsByColor = useMemo(() => {
    if (!product) return []
    const map = new Map<
      string,
      { color: string; colorHex: string | null; rows: AdminProductVariant[] }
    >()
    for (const v of product.variants) {
      if (v.deletedAt) continue
      const key = `${v.color}\0${v.colorHex ?? ''}`
      const cur = map.get(key)
      if (cur) cur.rows.push(v)
      else map.set(key, { color: v.color, colorHex: v.colorHex, rows: [v] })
    }
    return [...map.values()]
  }, [product])

  const createVar = useCreateVariant()
  const deleteVar = useDeleteVariant()
  const [colorName, setColorName] = useState('')
  const [hex, setHex] = useState('#F5F0E8')
  const [skuGroup, setSkuGroup] = useState('')
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set())
  const [customSize, setCustomSize] = useState('')
  const [variantBusy, setVariantBusy] = useState(false)

  useEffect(() => {
    if (!product) return
    const sug = `${product.productCode}-${colorName.slice(0, 3).toUpperCase() || 'CLR'}`
    if (!skuGroup || skuGroup === `${product.productCode}-`) {
      setSkuGroup(sug)
    }
  }, [colorName, product, skuGroup])

  const toggleSize = (s: string) => {
    setSelectedSizes((prev) => {
      const n = new Set(prev)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })
  }

  const addVariants = async () => {
    if (!product) return
    if (!colorName.trim() || !skuGroup.trim() || selectedSizes.size === 0) {
      toast.error('Colour name, SKU group, and at least one size are required.')
      return
    }
    const hexNorm = /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : '#F5F0E8'
    setVariantBusy(true)
    const sizes = [...selectedSizes]
    const failed: string[] = []
    for (const size of sizes) {
      try {
        await createVar.mutateAsync({
          productId: product.id,
          color: colorName.trim(),
          colorHex: hexNorm,
          size,
          skuGroup: skuGroup.trim(),
        })
      } catch {
        failed.push(size)
      }
    }
    setVariantBusy(false)
    if (failed.length === 0) {
      toast.success('Colour and sizes added.')
      setColorName('')
      setSelectedSizes(new Set())
      setCustomSize('')
      setSkuGroup(`${product.productCode}-`)
    } else {
      toast.error(`Some sizes failed: ${failed.join(', ')}`)
    }
  }

  if (isLoading || !product) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    )
  }

  const keyThumb = product.keyImageId
    ? product.images.find((i) => i.id === product.keyImageId)
    : product.images[0]

  const saveDetails = detailForm.handleSubmit((values) => {
    void updateMut
      .mutateAsync({
        id: product.id,
        data: {
          displayName: values.displayName,
          shortName: values.shortName,
          productCode: values.productCode,
          slug: values.slug,
          categoryId: values.categoryId?.trim() ? values.categoryId : null,
          description: values.description ?? '',
          fabricInfo: values.fabricInfo ?? '',
          active: values.active,
          isSale: values.isSale,
        },
      })
      .then(() => toast.success('Changes saved.'))
      .catch((e: { message?: string }) =>
        toast.error(e?.message ?? 'Failed to save changes.'),
      )
  })

  const savePrices = priceForm.handleSubmit((values) => {
    void updateMut
      .mutateAsync({
        id: product.id,
        data: { prices: values },
      })
      .then(() => toast.success('Prices saved.'))
      .catch((e: { message?: string }) =>
        toast.error(e?.message ?? 'Failed to save prices.'),
      )
  })

  const pw = priceForm.watch()

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-sm text-gray-600 underline-offset-2 hover:underline"
        >
          ← Back to products
        </Link>
      </div>

      <div className="flex flex-col gap-4 border-b border-gray-200 pb-4 sm:flex-row sm:items-start">
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
          {keyThumb ? <KeyImageThumb baseUrl={keyThumb.url} /> : (
            <div className="flex h-full items-center justify-center text-gray-400">
              <Camera className="h-5 w-5" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-gray-900 sm:text-2xl">
              {product.displayName}
            </h1>
            {product.active ? (
              <Badge className="bg-green-100 text-green-800">Active</Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-600">Inactive</Badge>
            )}
            {product.isSale ? (
              <Badge className="bg-red-100 text-red-800">Sale</Badge>
            ) : null}
          </div>
          <p className="text-sm text-gray-500">{product.productCode}</p>
          {product.active ? (
            <a
              href={`/collections/${product.slug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
            >
              View on storefront <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
          <TabsTrigger value="variants">Variants</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div>
                <Label htmlFor="ed-displayName">Display name *</Label>
                <Input
                  id="ed-displayName"
                  {...detailForm.register('displayName', {
                    onChange: (e) => {
                      if (!slugManual.current) {
                        detailForm.setValue('slug', slugFromDisplayName(e.target.value), {
                          shouldValidate: true,
                        })
                      }
                    },
                  })}
                />
              </div>
              <div>
                <Label htmlFor="ed-shortName">Short name *</Label>
                <Input id="ed-shortName" {...detailForm.register('shortName')} />
              </div>
              <div>
                <Label htmlFor="ed-productCode">Product code *</Label>
                <Input id="ed-productCode" {...detailForm.register('productCode')} />
              </div>
              <div>
                <Label htmlFor="ed-slug">Slug *</Label>
                <Input
                  id="ed-slug"
                  {...detailForm.register('slug')}
                  onFocus={() => {
                    slugManual.current = true
                  }}
                />
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={detailForm.watch('categoryId') || '__none__'}
                  onValueChange={(v) =>
                    detailForm.setValue('categoryId', !v || v === '__none__' ? '' : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ed-desc">Description</Label>
                <Textarea id="ed-desc" rows={5} {...detailForm.register('description')} />
              </div>
              <div>
                <Label htmlFor="ed-fabric">Fabric &amp; care</Label>
                <Textarea id="ed-fabric" rows={3} {...detailForm.register('fabricInfo')} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Visible on storefront</span>
                <Switch
                  checked={detailForm.watch('active')}
                  onCheckedChange={(v) => detailForm.setValue('active', v)}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">Sale item</span>
                <Switch
                  checked={detailForm.watch('isSale')}
                  onCheckedChange={(v) => detailForm.setValue('isSale', v)}
                />
              </div>
              <Button
                type="button"
                onClick={() => void saveDetails()}
                disabled={updateMut.isPending}
              >
                {updateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>

              <div className="mt-8 rounded-lg border border-red-200 bg-red-50/50 p-4">
                <h3 className="font-medium text-red-900">Danger zone</h3>
                <p className="mt-2 text-sm text-red-800">
                  Delete this product. Removes it from the storefront; data is kept for
                  order history.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="mt-3"
                  onClick={() => setDeleteOpen(true)}
                >
                  Delete product
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="images" className="space-y-4">
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragActive ? 'border-gray-400 bg-gray-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            <CloudUpload className="mx-auto h-10 w-10 text-gray-400" />
            <p className="mt-2 text-sm font-medium text-gray-700">
              Drop product images here, or click to browse
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, WebP, TIFF — max 20MB each — high resolution recommended
            </p>
            {Object.keys(uploading).length > 0 ? (
              <p className="mt-2 text-sm text-gray-600">Uploading…</p>
            ) : null}
          </div>
          {Object.entries(uploadErrors).map(([k, msg]) => (
            <p key={k} className="text-sm text-red-600">
              {msg}
            </p>
          ))}

          {sortedImages.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              <p>No images yet. Upload your first product photo above.</p>
              <p className="mt-1 text-sm">
                Add at least one image before publishing this product.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
              {sortedImages.map((img, idx) => (
                <ProductImageCard
                  key={img.id}
                  image={img}
                  productId={product.id}
                  keyImageId={product.keyImageId}
                  index={idx}
                  total={sortedImages.length}
                  sortedIds={sortedIds}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="variants" className="space-y-6">
          {variantsByColor.map((group) => (
            <Card key={`${group.color}-${group.colorHex ?? ''}`}>
              <CardContent className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <span
                    className="inline-block h-5 w-5 rounded-full border border-gray-200"
                    style={{
                      backgroundColor:
                        group.colorHex && /^#[0-9A-Fa-f]{6}$/i.test(group.colorHex)
                          ? group.colorHex
                          : '#e5e7eb',
                    }}
                  />
                  <span className="font-semibold uppercase">{group.color}</span>
                  {group.colorHex ? (
                    <span className="font-mono text-xs text-gray-500">{group.colorHex}</span>
                  ) : null}
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-gray-500">
                        <th className="py-2 pr-4">Size</th>
                        <th className="py-2 pr-4">SKU group</th>
                        <th className="py-2 pr-4">Stock</th>
                        <th className="py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.rows.map((v) => {
                        const st = v.stock
                        const avail = st?.availableQty ?? 0
                        const low = st?.lowStockThreshold ?? 3
                        let stockCell: React.ReactNode = String(avail)
                        if (avail === 0) {
                          stockCell = <span className="text-red-600">0 ✕</span>
                        } else if (avail > 0 && avail <= low) {
                          stockCell = (
                            <span className="text-orange-600">
                              {avail} ⚠️
                            </span>
                          )
                        }
                        return (
                          <VariantRow
                            key={v.id}
                            v={v}
                            stockCell={stockCell}
                            productId={product.id}
                            deleteVar={deleteVar}
                          />
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardContent className="space-y-4 p-4">
              <h3 className="font-medium text-gray-900">Add new variant</h3>
              <div>
                <Label>Colour name *</Label>
                <Input
                  value={colorName}
                  onChange={(e) => setColorName(e.target.value)}
                  placeholder="e.g. Ivory"
                />
              </div>
              <ColourPickerInput value={hex} onChange={setHex} label="Colour (hex) *" />
              <div>
                <Label>SKU group *</Label>
                <Input
                  value={skuGroup}
                  onChange={(e) => setSkuGroup(e.target.value)}
                  placeholder="e.g. MOD-001-IVORY"
                />
                <p className="mt-1 text-xs text-gray-500">
                  All sizes of this colour share one SKU group.
                </p>
              </div>
              <div>
                <Label>Sizes *</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {[...STANDARD_UK, ...STANDARD_EU].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`rounded border px-2 py-1 text-xs ${
                        selectedSizes.has(s)
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <Input
                    placeholder="Add custom size"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        const t = customSize.trim()
                        if (t) {
                          toggleSize(t)
                          setCustomSize('')
                        }
                      }
                    }}
                    className="max-w-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const t = customSize.trim()
                      if (t) {
                        toggleSize(t)
                        setCustomSize('')
                      }
                    }}
                  >
                    Add size
                  </Button>
                </div>
              </div>
              <Button type="button" onClick={() => void addVariants()} disabled={variantBusy}>
                {variantBusy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add colour &amp; sizes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pricing">
          <Card>
            <CardContent className="space-y-4 p-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label>LKR</Label>
                  <Input type="number" step="0.01" {...priceForm.register('lkrAmount')} />
                </div>
                <div>
                  <Label>SGD</Label>
                  <Input type="number" step="0.01" {...priceForm.register('sgdAmount')} />
                </div>
                <div>
                  <Label>USD</Label>
                  <Input type="number" step="0.01" {...priceForm.register('usdAmount')} />
                </div>
              </div>
              {product.prices ? (
                <p className="text-xs text-gray-500">
                  Last updated:{' '}
                  {new Date(product.prices.updatedAt).toLocaleString(undefined, {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </p>
              ) : null}
              <Button type="button" onClick={() => void savePrices()} disabled={updateMut.isPending}>
                {updateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save prices
              </Button>
              <p className="text-xs text-amber-800">
                Price changes take effect immediately on the storefront. Exchange rates
                between LKR, SGD, and USD are not auto-converted — update all three when
                repricing.
              </p>
              <div className="flex justify-end border-t pt-4">
                <HangTagPreview
                  displayName={product.displayName}
                  productCode={product.productCode}
                  lkrAmount={pw.lkrAmount ?? '0'}
                  sgdAmount={pw.sgdAmount ?? '0'}
                  usdAmount={pw.usdAmount ?? '0'}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {product.displayName}? This soft-deletes the
              product and removes it from the storefront.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() =>
                void deleteMut.mutateAsync({ id: product.id }).then(() => {
                  toast.success('Product deleted.')
                  router.push('/admin/products')
                })
              }
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function VariantRow({
  v,
  stockCell,
  productId,
  deleteVar,
}: {
  v: AdminProductVariant
  stockCell: React.ReactNode
  productId: string
  deleteVar: ReturnType<typeof useDeleteVariant>
}) {
  const [confirm, setConfirm] = useState(false)
  return (
    <tr className="border-b border-gray-100">
      <td className="py-2 pr-4">{v.size}</td>
      <td className="py-2 pr-4 font-mono text-xs">{v.skuGroup}</td>
      <td className="py-2 pr-4">{stockCell}</td>
      <td className="py-2">
        {confirm ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-gray-600">
              Removed from storefront; orders unchanged.
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="h-7 text-xs"
              onClick={() =>
                void deleteVar.mutateAsync({ productId, variantId: v.id }).then(() => {
                  toast.success('Variant removed.')
                  setConfirm(false)
                })
              }
            >
              Confirm
            </Button>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setConfirm(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            onClick={() => setConfirm(true)}
          >
            Delete
          </Button>
        )}
      </td>
    </tr>
  )
}
