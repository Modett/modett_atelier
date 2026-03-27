/**
 * Catalog route handlers — storefront (no auth) and admin (requireAdmin).
 * Zod for body and query. Success: { data: T }.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate'
import { requireAdmin } from '../../middleware/auth'
import { imageUpload } from '../../infrastructure/upload/multer.config'
import * as catalogService from './catalog.service'
import type { AdminRequest } from '../../middleware/auth'

const router = Router()

function adminReq(req: Request): AdminRequest {
  return req as AdminRequest
}

const currencySchema = z.enum(['LKR', 'SGD', 'USD'])
type Currency = z.infer<typeof currencySchema>

function getCurrency(req: Request): Currency {
  const fromQuery = req.query.currency
  const fromCookie = req.cookies?.currency
  const value = (fromQuery as string) ?? fromCookie ?? 'LKR'
  const parsed = currencySchema.safeParse(value)
  return parsed.success ? parsed.data : 'LKR'
}

// —— Storefront (no auth) ——

/**
 * @swagger
 * /catalog/categories:
 *   get:
 *     tags: [Catalog]
 *     summary: List all active categories
 *     security: []
 *     responses:
 *       200:
 *         description: Active categories ordered by sort_order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     categories:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/Category' }
 */
router.get('/catalog/categories', async (_req: Request, res: Response) => {
  const categories = await catalogService.getCategories()
  res.status(200).json({ data: { categories } })
})

const productListSortSchema = z.enum(['newest', 'price-asc', 'price-desc'])

const productsQuerySchema = z.object({
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
  currency: currencySchema.optional(),
  q: z.string().optional(),
  sort: productListSortSchema.optional(),
})

/**
 * @swagger
 * /catalog/products:
 *   get:
 *     tags: [Catalog]
 *     summary: List products or search (pass ?q= to search)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category slug filter
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search query (min 2 chars). If present, runs search instead of listing.
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 24, maximum: 100 }
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [LKR, SGD, USD], default: LKR }
 *     responses:
 *       200:
 *         description: Paginated product list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:   { type: array, items: { $ref: '#/components/schemas/ProductListItem' } }
 *                     total:      { type: integer }
 *                     page:       { type: integer }
 *                     limit:      { type: integer }
 *                     totalPages: { type: integer }
 */
router.get('/catalog/products', async (req: Request, res: Response) => {
  const parsed = productsQuerySchema.safeParse(req.query)
  if (!parsed.success) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: parsed.error.flatten().fieldErrors,
      },
    })
  }
  const query = parsed.data
  const currency = getCurrency(req)

  if (query.q != null && String(query.q).trim().length >= 2) {
    const result = await catalogService.searchProducts({
      query: String(query.q).trim(),
      page: query.page,
      limit: query.limit,
      currency,
      sort: query.sort,
    })
    return res.status(200).json({ data: result })
  }

  const result = await catalogService.getProductListing({
    categorySlug: query.category ?? null,
    page: query.page,
    limit: query.limit,
    currency,
    sort: query.sort,
  })
  res.status(200).json({ data: result })
})

/**
 * @swagger
 * /catalog/products/{slug}:
 *   get:
 *     tags: [Catalog]
 *     summary: Get full product detail by slug
 *     security: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema: { type: string, example: sofia-dress }
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [LKR, SGD, USD], default: LKR }
 *     responses:
 *       200:
 *         description: Full product detail with variants and stock
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     product: { $ref: '#/components/schemas/ProductDetail' }
 *       404: { description: Product not found }
 */
router.get('/catalog/products/:slug', async (req: Request, res: Response) => {
  const slug = req.params.slug!
  const currency = getCurrency(req)
  const product = await catalogService.getProductDetail({ slug, currency })
  res.status(200).json({ data: { product } })
})

/**
 * @swagger
 * /catalog/homepage:
 *   get:
 *     tags: [Catalog]
 *     summary: Get homepage data (featured products + active banner)
 *     security: []
 *     parameters:
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [LKR, SGD, USD], default: LKR }
 *     responses:
 *       200:
 *         description: Homepage content
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     featuredProducts:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/ProductListItem' }
 *                     banner:
 *                       nullable: true
 *                       $ref: '#/components/schemas/Banner'
 */
router.get('/catalog/homepage', async (req: Request, res: Response) => {
  const currency = getCurrency(req)
  const result = await catalogService.getHomepage({ currency })
  res.status(200).json({ data: result })
})

// —— Admin catalog (requireAdmin) ——

const adminProductsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
})

/**
 * @swagger
 * /admin/catalog/products:
 *   get:
 *     tags: [Admin Catalog]
 *     summary: List all products (admin)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50 }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200: { description: Paginated product list including inactive }
 */
router.get(
  '/admin/catalog/products',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = adminProductsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const query = parsed.data
    const result = await catalogService.adminGetAllProducts({
      page: query.page,
      limit: query.limit,
      includeInactive: query.includeInactive ?? false,
    })
    res.status(200).json({ data: result })
  },
)

/**
 * @swagger
 * /admin/catalog/products/{id}:
 *   get:
 *     tags: [Admin Catalog]
 *     summary: Get a single product by ID (admin)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Product detail }
 *       404: { description: Product not found }
 */
router.get(
  '/admin/catalog/products/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    const product = await catalogService.adminGetProduct({
      id: req.params.id!,
    })
    res.status(200).json({ data: { product } })
  },
)

const createProductSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  slug: z.string().min(1).max(200),
  displayName: z.string().min(1).max(500),
  shortName: z.string().min(1).max(200),
  description: z.string().optional().nullable(),
  fabricInfo: z.string().optional().nullable(),
  productCode: z.string().min(1).max(100),
  active: z.boolean().default(true),
  isSale: z.boolean().default(false),
  prices: z.object({
    lkrAmount: z.number().min(0),
    sgdAmount: z.number().min(0),
    usdAmount: z.number().min(0),
  }),
})

/**
 * @swagger
 * /admin/catalog/products:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Create a new product
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slug, displayName, shortName, productCode, prices]
 *             properties:
 *               categoryId:  { type: string, format: uuid }
 *               slug:        { type: string, example: sofia-dress }
 *               displayName: { type: string, example: Sofia Dress }
 *               shortName:   { type: string, example: Sofia }
 *               description: { type: string }
 *               fabricInfo:  { type: string }
 *               productCode: { type: string, example: MOD-001 }
 *               active:      { type: boolean, default: true }
 *               isSale:      { type: boolean, default: false }
 *               prices:
 *                 type: object
 *                 required: [lkrAmount, sgdAmount, usdAmount]
 *                 properties:
 *                   lkrAmount: { type: number, minimum: 0, example: 12500 }
 *                   sgdAmount: { type: number, minimum: 0, example: 65.00 }
 *                   usdAmount: { type: number, minimum: 0, example: 48.00 }
 *     responses:
 *       201:
 *         description: Product created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     product: { $ref: '#/components/schemas/ProductDetail' }
 */
router.post(
  '/admin/catalog/products',
  requireAdmin,
  validate(createProductSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof createProductSchema> }).body
    const product = await catalogService.adminCreateProduct({
      ...body,
      categoryId: body.categoryId ?? undefined,
    })
    res.status(201).json({ data: { product } })
  },
)

const updateProductSchema = createProductSchema.partial()

/**
 * @swagger
 * /admin/catalog/products/{id}:
 *   patch:
 *     tags: [Admin Catalog]
 *     summary: Update a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: All fields optional — only send what you want to change
 *     responses:
 *       200: { description: Product updated }
 *       404: { description: Product not found }
 */
router.patch(
  '/admin/catalog/products/:id',
  requireAdmin,
  validate(updateProductSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof updateProductSchema> }).body
    const product = await catalogService.adminUpdateProduct({
      id: req.params.id!,
      data: body,
    })
    res.status(200).json({ data: { product } })
  },
)

/**
 * @swagger
 * /admin/catalog/products/{id}:
 *   delete:
 *     tags: [Admin Catalog]
 *     summary: Soft-delete a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Product soft-deleted (sets deleted_at and active=false) }
 *       404: { description: Product not found }
 */
router.delete(
  '/admin/catalog/products/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    await catalogService.adminDeleteProduct({ id: req.params.id! })
    res.status(200).json({ data: { ok: true } })
  },
)

/**
 * @swagger
 * /admin/catalog/products/{id}/images:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Upload product images (multipart, max 6)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images: { type: array, items: { type: string, format: binary } }
 *     responses:
 *       201: { description: Images uploaded and registered }
 *       400: { description: No files or invalid type }
 */
router.post(
  '/admin/catalog/products/:id/images',
  requireAdmin,
  (req: Request, res: Response, next: () => void) => {
    const multerHandler = imageUpload.array('images', 6)
    multerHandler(
      req as unknown as Parameters<typeof multerHandler>[0],
      res as unknown as Parameters<typeof multerHandler>[1],
      (err: unknown) => {
      if (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        return res.status(400).json({
          error: { code: 'UPLOAD_ERROR', message },
        })
      }
      next()
    },
    )
  },
  async (req: Request, res: Response) => {
    const files = (req as Request & { files: Express.Multer.File[] }).files
    if (!files?.length) {
      return res.status(400).json({
        error: { code: 'NO_FILES', message: 'At least one image is required' },
      })
    }
    const images = await catalogService.adminUploadProductImagesFromFiles({
      productId: req.params.id!,
      files: files.map((f) => ({
        buffer: f.buffer,
        originalname: f.originalname,
        mimetype: f.mimetype,
      })),
    })
    res.status(201).json({ data: { images } })
  },
)

/**
 * @swagger
 * /admin/catalog/products/{id}/images/{imageId}:
 *   delete:
 *     tags: [Admin Catalog]
 *     summary: Remove a product image
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: imageId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Image removed }
 */
router.delete(
  '/admin/catalog/products/:id/images/:imageId',
  requireAdmin,
  async (req: Request, res: Response) => {
    await catalogService.adminDeleteProductImage({
      productId: req.params.id!,
      imageId: req.params.imageId!,
    })
    res.status(204).send()
  },
)

const setKeyImageSchema = z.object({
  imageId: z.string().uuid(),
})

/**
 * @swagger
 * /admin/catalog/products/{id}/images/key:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Set the key image for a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageId]
 *             properties:
 *               imageId: { type: string, format: uuid }
 *     responses:
 *       200: { description: Key image updated }
 */
router.post(
  '/admin/catalog/products/:id/images/key',
  requireAdmin,
  validate(setKeyImageSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof setKeyImageSchema> }).body
    await catalogService.adminSetKeyImage({
      productId: req.params.id!,
      imageId: body.imageId,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

router.patch(
  '/admin/catalog/products/:id/images/key',
  requireAdmin,
  validate(setKeyImageSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof setKeyImageSchema> }).body
    await catalogService.adminSetKeyImage({
      productId: req.params.id!,
      imageId: body.imageId,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

const reorderImagesSchema = z.object({
  imageIds: z.array(z.string().uuid()),
})

/**
 * @swagger
 * /admin/catalog/products/{id}/images/reorder:
 *   patch:
 *     tags: [Admin Catalog]
 *     summary: Reorder product images
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageIds]
 *             properties:
 *               imageIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Images reordered }
 */
router.patch(
  '/admin/catalog/products/:id/images/reorder',
  requireAdmin,
  validate(reorderImagesSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof reorderImagesSchema> }).body
    await catalogService.adminReorderImages({
      productId: req.params.id!,
      imageIds: body.imageIds,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

const createVariantSchema = z.object({
  color: z.string().min(1),
  size: z.string().min(1),
  skuGroup: z.string().min(1),
})

/**
 * @swagger
 * /admin/catalog/products/{id}/variants:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Add a variant to a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [color, size, skuGroup]
 *             properties:
 *               color:    { type: string, example: Ivory }
 *               size:     { type: string, example: S }
 *               skuGroup: { type: string, example: MOD-001-IVORY }
 *     responses:
 *       201:
 *         description: Variant created with stock row initialised at 0
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     variant: { $ref: '#/components/schemas/VariantWithStock' }
 */
router.post(
  '/admin/catalog/products/:id/variants',
  requireAdmin,
  validate(createVariantSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof createVariantSchema> }).body
    const variant = await catalogService.adminCreateVariant({
      productId: req.params.id!,
      ...body,
    })
    res.status(201).json({ data: { variant } })
  },
)

/**
 * @swagger
 * /admin/catalog/products/{productId}/variants/{variantId}:
 *   delete:
 *     tags: [Admin Catalog]
 *     summary: Remove a variant from a product
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: variantId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Variant removed }
 */
router.delete(
  '/admin/catalog/products/:productId/variants/:variantId',
  requireAdmin,
  async (req: Request, res: Response) => {
    await catalogService.adminDeleteVariant({
      productId: req.params.productId!,
      variantId: req.params.variantId!,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

const presignedUploadUrlSchema = z.object({
  contentType: z.string().min(1),
  fileName: z.string().min(1),
})

/**
 * @swagger
 * /admin/catalog/products/{id}/styling-guides/upload-url:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Get presigned URL for styling guide video upload
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [contentType, fileName]
 *             properties:
 *               contentType: { type: string, example: video/mp4 }
 *               fileName: { type: string, example: lookbook.mp4 }
 *     responses:
 *       200: { description: Presigned URL and key }
 */
router.post(
  '/admin/catalog/products/:id/styling-guides/upload-url',
  requireAdmin,
  validate(presignedUploadUrlSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof presignedUploadUrlSchema> }).body
    const result = await catalogService.adminGetPresignedStylingGuideUploadUrl({
      productId: req.params.id!,
      contentType: body.contentType,
      fileName: body.fileName,
    })
    res.status(200).json({ data: result })
  },
)

const confirmStylingGuideSchema = z.object({
  key: z.string().min(1),
  type: z.literal('VIDEO'),
  linkUrl: z.string().url().optional().nullable(),
})

/**
 * @swagger
 * /admin/catalog/products/{id}/styling-guides:
 *   post:
 *     tags: [Admin Catalog]
 *     summary: Confirm styling guide video upload and save record
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key, type]
 *             properties:
 *               key: { type: string }
 *               type: { type: string, enum: [VIDEO] }
 *               linkUrl: { type: string, format: uri }
 *     responses:
 *       200: { description: Styling guide saved }
 */
router.post(
  '/admin/catalog/products/:id/styling-guides',
  requireAdmin,
  validate(confirmStylingGuideSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof confirmStylingGuideSchema> }).body
    const stylingGuide = await catalogService.adminConfirmStylingGuideVideo({
      productId: req.params.id!,
      key: body.key,
      linkUrl: body.linkUrl ?? undefined,
    })
    res.status(200).json({ data: { stylingGuide } })
  },
)

const stylingGuideSchema = z.object({
  type: z.enum(['VIDEO', 'GALLERY', 'TEXT']),
  linkUrl: z.string().url().optional().nullable(),
  contentJson: z.record(z.unknown()).optional().nullable(),
  active: z.boolean().default(true),
})

/**
 * @swagger
 * /admin/catalog/products/{id}/styling-guide:
 *   put:
 *     tags: [Admin Catalog]
 *     summary: Create or update product styling guide
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type: { type: string, enum: [VIDEO, GALLERY, TEXT] }
 *               linkUrl: { type: string, format: uri }
 *               contentJson: { type: object }
 *               active: { type: boolean }
 *     responses:
 *       200: { description: Styling guide saved }
 */
router.put(
  '/admin/catalog/products/:id/styling-guide',
  requireAdmin,
  validate(stylingGuideSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof stylingGuideSchema> }).body
    const stylingGuide = await catalogService.adminUpsertStylingGuide({
      productId: req.params.id!,
      ...body,
    })
    res.status(200).json({ data: { stylingGuide } })
  },
)

/**
 * @swagger
 * /admin/catalog/bestsellers:
 *   get:
 *     tags: [Admin Bestsellers]
 *     summary: Get the curated bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     responses:
 *       200: { description: Bestseller list ordered by sort_order }
 */
router.get(
  '/admin/catalog/bestsellers',
  requireAdmin,
  async (_req: Request, res: Response) => {
    const bestsellers = await catalogService.adminGetBestsellerList()
    res.status(200).json({ data: { bestsellers } })
  },
)

const addBestsellerSchema = z.object({
  productId: z.string().uuid(),
  sortOrder: z.number().int().min(0).optional().default(0),
})

/**
 * @swagger
 * /admin/catalog/bestsellers:
 *   post:
 *     tags: [Admin Bestsellers]
 *     summary: Add a product to the bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               sortOrder: { type: integer, default: 0 }
 *     responses:
 *       201: { description: Added to bestseller list }
 */
router.post(
  '/admin/catalog/bestsellers',
  requireAdmin,
  validate(addBestsellerSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof addBestsellerSchema> }).body
    const entry = await catalogService.adminAddToBestsellerList({
      productId: body.productId,
      sortOrder: body.sortOrder,
      adminId: adminReq(req).admin!.id,
    })
    res.status(201).json({ data: { entry } })
  },
)

/**
 * @swagger
 * /admin/catalog/bestsellers/{productId}:
 *   delete:
 *     tags: [Admin Bestsellers]
 *     summary: Remove a product from the bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Removed from bestseller list }
 */
router.delete(
  '/admin/catalog/bestsellers/:productId',
  requireAdmin,
  async (req: Request, res: Response) => {
    await catalogService.adminRemoveFromBestsellerList({
      productId: req.params.productId!,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

const reorderBestsellersSchema = z.object({
  orderedProductIds: z.array(z.string().uuid()),
})

/**
 * @swagger
 * /admin/catalog/bestsellers/reorder:
 *   patch:
 *     tags: [Admin Bestsellers]
 *     summary: Reorder the bestseller list
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderedProductIds]
 *             properties:
 *               orderedProductIds: { type: array, items: { type: string, format: uuid } }
 *     responses:
 *       200: { description: Bestsellers reordered }
 */
router.patch(
  '/admin/catalog/bestsellers/reorder',
  requireAdmin,
  validate(reorderBestsellersSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof reorderBestsellersSchema> })
      .body
    await catalogService.adminReorderBestsellerList({
      orderedProductIds: body.orderedProductIds,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

/**
 * @swagger
 * /admin/catalog/banners:
 *   get:
 *     tags: [Admin Banners]
 *     summary: List all banners
 *     security: [{ adminCookieAuth: [] }]
 *     responses:
 *       200: { description: All banners ordered by created_at desc }
 */
router.get(
  '/admin/catalog/banners',
  requireAdmin,
  async (_req: Request, res: Response) => {
    const banners = await catalogService.adminListBanners()
    res.status(200).json({ data: { banners } })
  },
)

const createBannerSchema = z.object({
  message: z.string().min(1),
  linkUrl: z.string().url().optional().nullable(),
  startAt: z.string().datetime().optional().nullable(),
  endAt: z.string().datetime().optional().nullable(),
})

/**
 * @swagger
 * /admin/catalog/banners:
 *   post:
 *     tags: [Admin Banners]
 *     summary: Create a new banner (disabled by default)
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string, example: 'Free shipping this weekend!' }
 *               linkUrl: { type: string, format: uri }
 *               startAt: { type: string, format: date-time }
 *               endAt:   { type: string, format: date-time }
 *     responses:
 *       201: { description: Banner created (enabled=false) }
 */
router.post(
  '/admin/catalog/banners',
  requireAdmin,
  validate(createBannerSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof createBannerSchema> }).body
    const banner = await catalogService.adminCreateBanner({
      ...body,
      adminId: adminReq(req).admin!.id,
    })
    res.status(201).json({ data: { banner } })
  },
)

const updateBannerSchema = createBannerSchema.partial()

/**
 * @swagger
 * /admin/catalog/banners/{id}:
 *   patch:
 *     tags: [Admin Banners]
 *     summary: Update a banner
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message: { type: string }
 *               linkUrl: { type: string, format: uri }
 *               startAt: { type: string, format: date-time }
 *               endAt:   { type: string, format: date-time }
 *     responses:
 *       200: { description: Banner updated }
 */
router.patch(
  '/admin/catalog/banners/:id',
  requireAdmin,
  validate(updateBannerSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof updateBannerSchema> }).body
    const data: Partial<{
      message: string
      linkUrl: string | null
      startAt: Date | null
      endAt: Date | null
    }> = {}
    if (body.message != null) data.message = body.message
    if (body.linkUrl != null) data.linkUrl = body.linkUrl
    if (body.startAt != null) data.startAt = new Date(body.startAt)
    if (body.endAt != null) data.endAt = new Date(body.endAt)
    const banner = await catalogService.adminUpdateBanner({
      id: req.params.id!,
      data,
    })
    res.status(200).json({ data: { banner } })
  },
)

/**
 * @swagger
 * /admin/catalog/banners/{id}/enable:
 *   post:
 *     tags: [Admin Banners]
 *     summary: Enable a banner
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Banner enabled }
 */
router.post(
  '/admin/catalog/banners/:id/enable',
  requireAdmin,
  async (req: Request, res: Response) => {
    const banner = await catalogService.adminEnableBanner({
      id: req.params.id!,
    })
    res.status(200).json({ data: { banner } })
  },
)

/**
 * @swagger
 * /admin/catalog/banners/{id}/disable:
 *   post:
 *     tags: [Admin Banners]
 *     summary: Disable a banner
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Banner disabled }
 */
router.post(
  '/admin/catalog/banners/:id/disable',
  requireAdmin,
  async (req: Request, res: Response) => {
    const banner = await catalogService.adminDisableBanner({
      id: req.params.id!,
    })
    res.status(200).json({ data: { banner } })
  },
)

export const catalogRoutes: IRouter = router
