'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { HangTagPreview } from '@/components/admin/HangTagPreview'
import { useAdminCategories, useCreateProduct } from '@/hooks/useAdminCatalog'

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

const formSchema = z.object({
  displayName: z.string().min(1).max(500),
  shortName: z.string().min(1).max(200),
  productCode: z.string().min(1).max(100),
  slug: z.string().min(1).max(200).regex(slugPattern, 'Use lowercase letters, numbers, and hyphens only'),
  categoryId: z.string().optional(),
  description: z.string().max(20000).optional().default(''),
  fabricInfo: z.string().max(20000).optional().default(''),
  active: z.boolean(),
  isSale: z.boolean(),
  prices: z.object({
    lkrAmount: z
      .string()
      .refine((s) => {
        const n = Number.parseFloat(s)
        return !Number.isNaN(n) && n >= 0
      }, 'Must be a non-negative number'),
    sgdAmount: z
      .string()
      .refine((s) => {
        const n = Number.parseFloat(s)
        return !Number.isNaN(n) && n >= 0
      }, 'Must be a non-negative number'),
    usdAmount: z
      .string()
      .refine((s) => {
        const n = Number.parseFloat(s)
        return !Number.isNaN(n) && n >= 0
      }, 'Must be a non-negative number'),
  }),
})

type FormValues = z.infer<typeof formSchema>

export default function AdminNewProductPage() {
  const router = useRouter()
  const slugManual = useRef(false)
  const { data: categories = [] } = useAdminCategories()
  const createMut = useCreateProduct()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema as never),
    defaultValues: {
      displayName: '',
      shortName: '',
      productCode: '',
      slug: '',
      categoryId: '',
      description: '',
      fabricInfo: '',
      active: true,
      isSale: false,
      prices: { lkrAmount: '0.00', sgdAmount: '0.00', usdAmount: '0.00' },
    },
  })

  const { register, handleSubmit, watch, setValue, formState } = form
  const displayName = watch('displayName')
  const slug = watch('slug')
  const shortName = watch('shortName')
  const productCode = watch('productCode')
  const prices = watch('prices')

  const onDisplayName = (v: string) => {
    if (!slugManual.current) {
      setValue('slug', slugFromDisplayName(v), { shouldValidate: true })
    }
  }

  const [submitting, setSubmitting] = useState(false)

  const onSubmit = (values: FormValues) => {
    setSubmitting(true)
    void createMut
      .mutateAsync({
        displayName: values.displayName,
        shortName: values.shortName,
        slug: values.slug,
        productCode: values.productCode,
        categoryId: values.categoryId?.trim() ? values.categoryId : null,
        description: values.description ?? '',
        fabricInfo: values.fabricInfo ?? '',
        active: values.active,
        isSale: values.isSale,
        prices: values.prices,
      })
      .then((product) => {
        toast.success('Product created.')
        router.push(`/admin/products/${product.id}`)
      })
      .catch((err: { message?: string }) => {
        toast.error(`Failed to create product: ${err?.message ?? 'Unknown error'}`)
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-sm text-gray-600 underline-offset-2 hover:underline"
        >
          ← Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-gray-900">New product</h1>
      </div>

      <Alert>
        <AlertTitle>Next step</AlertTitle>
        <AlertDescription>
          After saving, you&apos;ll be taken to the product editor where you can upload
          images and add size and colour variants.
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-medium text-gray-900">Basic information</h2>
            <div>
              <Label htmlFor="displayName">Display name *</Label>
              <Input
                id="displayName"
                {...register('displayName', {
                  onChange: (e) => onDisplayName(e.target.value),
                })}
              />
              {formState.errors.displayName ? (
                <p className="mt-1 text-xs text-red-600">
                  {formState.errors.displayName.message}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="shortName">Short name *</Label>
              <Input id="shortName" {...register('shortName')} />
              <p className="mt-1 text-xs text-gray-500">
                Used in cart, order emails, and hang tags.
              </p>
              {formState.errors.shortName ? (
                <p className="mt-1 text-xs text-red-600">
                  {formState.errors.shortName.message}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="productCode">Product code *</Label>
              <Input id="productCode" {...register('productCode')} />
              <p className="mt-1 text-xs text-gray-500">
                e.g. MOD-012 — must be unique across all products
              </p>
              {formState.errors.productCode ? (
                <p className="mt-1 text-xs text-red-600">
                  {formState.errors.productCode.message}
                </p>
              ) : null}
            </div>
            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                {...register('slug')}
                onFocus={() => {
                  slugManual.current = true
                }}
              />
              <p className="mt-1 text-xs text-gray-500">
                Product URL: /collections/{slug || 'your-slug'}
              </p>
              {formState.errors.slug ? (
                <p className="mt-1 text-xs text-red-600">{formState.errors.slug.message}</p>
              ) : null}
            </div>
            <div>
              <Label>Category</Label>
              <Select
                value={watch('categoryId') || '__none__'}
                onValueChange={(v) =>
                  setValue(
                    'categoryId',
                    !v || v === '__none__' ? '' : v,
                    { shouldValidate: true },
                  )
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
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-medium text-gray-900">Product copy</h2>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={5}
                {...register('description')}
                placeholder="Shown on the product detail page."
              />
              <p className="mt-1 text-xs text-gray-500">
                Modett brand voice: elegant, precise, understated.
              </p>
            </div>
            <div>
              <Label htmlFor="fabricInfo">Fabric &amp; care</Label>
              <Textarea
                id="fabricInfo"
                rows={3}
                {...register('fabricInfo')}
                placeholder="e.g. 100% Mulberry Silk. Dry clean only."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-medium text-gray-900">Flags</h2>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3">
              <div>
                <p className="font-medium text-gray-900">Visible on storefront</p>
                <p className="text-xs text-gray-500">
                  When off, the product will not appear in collections or search.
                </p>
              </div>
              <Switch
                checked={watch('active')}
                onCheckedChange={(v) => setValue('active', v)}
                aria-label="Active"
              />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-100 p-3">
              <div>
                <p className="font-medium text-gray-900">Sale item</p>
                <p className="text-xs text-gray-500">
                  Shows sale badge on collection grid and PDP.
                </p>
              </div>
              <Switch
                checked={watch('isSale')}
                onCheckedChange={(v) => setValue('isSale', v)}
                aria-label="Sale"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-4">
            <h2 className="text-lg font-medium text-gray-900">Pricing</h2>
            <p className="text-sm text-amber-800">
              All three currencies are required. There is no automatic conversion — enter
              the correct price for each market.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="lkr">LKR (Sri Lanka)</Label>
                <p className="mb-1 text-xs text-gray-500">Rs.</p>
                <Input
                  id="lkr"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...register('prices.lkrAmount')}
                />
              </div>
              <div>
                <Label htmlFor="sgd">SGD (Singapore)</Label>
                <p className="mb-1 text-xs text-gray-500">S$</p>
                <Input
                  id="sgd"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...register('prices.sgdAmount')}
                />
              </div>
              <div>
                <Label htmlFor="usd">USD (global)</Label>
                <p className="mb-1 text-xs text-gray-500">$</p>
                <Input
                  id="usd"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...register('prices.usdAmount')}
                />
              </div>
            </div>
            {(formState.errors.prices?.lkrAmount ||
              formState.errors.prices?.sgdAmount ||
              formState.errors.prices?.usdAmount) && (
              <p className="text-xs text-red-600">Check all price fields.</p>
            )}
            <div className="flex justify-end pt-2">
              <HangTagPreview
                displayName={displayName}
                productCode={productCode}
                lkrAmount={prices.lkrAmount}
                sgdAmount={prices.sgdAmount}
                usdAmount={prices.usdAmount}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button
            type="submit"
            disabled={submitting || createMut.isPending}
            className="w-full sm:w-auto"
          >
            {(submitting || createMut.isPending) && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create product &amp; continue to editor
          </Button>
        </div>
      </form>
    </div>
  )
}
