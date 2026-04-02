/**
 * Messaging route handlers — preferences, inbox, BIS/price-drop subscriptions,
 * notify-me, admin campaigns. Success: { data: T }. No try/catch.
 */

import crypto from 'node:crypto'
import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin, optionalAuth } from '../../middleware/auth'
import type { AuthRequest, AdminRequest } from '../../middleware/auth'
import { validate, validateQuery, type ValidatedBody } from '../../middleware/validate'
import { rateLimit } from '../../middleware/rateLimit'
import { campaignAssetUpload } from '../../infrastructure/upload/multer.config'
import { getStorageService } from '../../infrastructure/storage/storage.service'
import { sendEmail, CONTACT_INBOX } from '../../infrastructure/email/email.service'
import {
  contactNotificationEmail,
  contactConfirmationEmail,
  newsletterWelcomeEmail,
} from '../../infrastructure/email/templates'
import * as messagingService from './messaging.service'

const router: IRouter = Router()

const channelEnum = z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH'])

// —— Customer: GET /notifications/preferences ——

router.get(
  '/notifications/preferences',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const preferences = await messagingService.getMyPreferences({
      userId: authReq.user.id,
    })
    res.status(200).json({ data: { preferences } })
  },
)

// —— Customer: PATCH /notifications/preferences ——

const patchPreferencesBodySchema = z.object({
  emailOptIn: z.boolean().optional(),
  smsOptIn: z.boolean().optional(),
  whatsappOptIn: z.boolean().optional(),
  pushOptIn: z.boolean().optional(),
})

router.patch(
  '/notifications/preferences',
  requireAuth,
  validate(patchPreferencesBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const body = (req as Request & { body: z.infer<typeof patchPreferencesBodySchema> }).body
    const preferences = await messagingService.updateMyPreferences({
      userId: authReq.user.id,
      ...body,
    })
    res.status(200).json({ data: { preferences } })
  },
)

// —— Customer: GET /inbox ——

const getInboxQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  unreadOnly: z
    .string()
    .optional()
    .default('false')
    .transform((s) => s === 'true'),
})

router.get(
  '/inbox',
  requireAuth,
  validateQuery(getInboxQuerySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const query = (req as Request & { validatedQuery: z.infer<typeof getInboxQuerySchema> }).validatedQuery
    const result = await messagingService.getMyInbox({
      userId: authReq.user.id,
      page: query.page,
      limit: query.limit,
      unreadOnly: query.unreadOnly,
    })
    res.status(200).json({
      data: {
        messages: result.messages,
        unreadCount: result.unreadCount,
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    })
  },
)

// —— Customer: POST /inbox/:messageId/read ——

router.post(
  '/inbox/:messageId/read',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const messageId = req.params.messageId as string
    await messagingService.markRead({
      messageId,
      userId: authReq.user.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Customer: POST /inbox/read-all ——

router.post(
  '/inbox/read-all',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    await messagingService.markAllRead({ userId: authReq.user.id })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Customer: GET /inbox/unread-count ——

router.get(
  '/inbox/unread-count',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const count = await messagingService.getMyInboxUnreadCount({
      userId: authReq.user.id,
    })
    res.status(200).json({ data: { count } })
  },
)

// —— Customer: POST /notifications/back-in-stock ——

const postBackInStockBodySchema = z.object({
  variantId: z.string().uuid(),
  channels: z.array(channelEnum).optional(),
})

router.post(
  '/notifications/back-in-stock',
  requireAuth,
  validate(postBackInStockBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const body = (req as Request & { body: z.infer<typeof postBackInStockBodySchema> }).body
    await messagingService.subscribeBackInStock({
      userId: authReq.user.id,
      variantId: body.variantId,
      channels: body.channels,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Customer: DELETE /notifications/back-in-stock/:variantId ——

router.delete(
  '/notifications/back-in-stock/:variantId',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const variantId = req.params.variantId as string
    await messagingService.unsubscribeBackInStock({
      userId: authReq.user.id,
      variantId,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Customer: POST /notifications/price-drop ——

const postPriceDropBodySchema = z.object({
  variantId: z.string().uuid(),
  targetPrice: z.number().positive().optional(),
  channels: z.array(channelEnum).optional(),
})

router.post(
  '/notifications/price-drop',
  requireAuth,
  validate(postPriceDropBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const body = (req as Request & { body: z.infer<typeof postPriceDropBodySchema> }).body
    await messagingService.subscribePriceDrop({
      userId: authReq.user.id,
      variantId: body.variantId,
      targetPrice: body.targetPrice,
      channels: body.channels,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Customer: DELETE /notifications/price-drop/:variantId ——

router.delete(
  '/notifications/price-drop/:variantId',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const variantId = req.params.variantId as string
    await messagingService.unsubscribePriceDrop({
      userId: authReq.user.id,
      variantId,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Notify-me (optionalAuth — guest or logged-in) ——

const postNotifyMeBodySchema = z.object({
  variantId: z.string().uuid(),
  sessionId: z.string().min(1),
})

router.post(
  '/notifications/notify-me',
  optionalAuth,
  validate(postNotifyMeBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const body = (req as Request & { body: z.infer<typeof postNotifyMeBodySchema> }).body
    await messagingService.recordNotifyMe({
      variantId: body.variantId,
      userId: authReq.user?.id,
      sessionId: body.sessionId,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Public: POST /newsletter/subscribe ——

const newsletterSubscribeSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
})

router.post(
  '/newsletter/subscribe',
  rateLimit({
    name: 'newsletter-subscribe',
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => req.ip ?? 'unknown',
  }),
  validate(newsletterSubscribeSchema),
  async (req: Request, res: Response) => {
    const body = (req as ValidatedBody<typeof newsletterSubscribeSchema>).body
    const { promoCode } = await messagingService.recordNewsletterSignup({
      email: body.email,
      ipAddress: req.ip ?? null,
    })

    const template = newsletterWelcomeEmail({ promoCode })
    sendEmail({
      to: body.email.toLowerCase().trim(),
      subject: template.subject,
      html: template.html,
      text: template.text,
    }).catch((err: unknown) => {
      console.error('[newsletter] Email send failed:', err)
    })

    res.status(201).json({
      data: {
        ok: true,
        promoCode,
      },
    })
  },
)

// —— Public: POST /messaging/contact (Resend — not queued) ——

const contactBodySchema = z.object({
  name: z.string().max(200).optional().default(''),
  email: z.string().email('Invalid email address'),
  message: z.string().min(1, 'Message is required').max(5000),
})

router.post(
  '/messaging/contact',
  rateLimit({
    name: 'contact-form',
    windowMs: 15 * 60 * 1000,
    max: 5,
    key: (req) => req.ip ?? 'unknown',
  }),
  validate(contactBodySchema),
  async (req: Request, res: Response) => {
    const body = (req as ValidatedBody<typeof contactBodySchema>).body

    res.status(200).json({ data: { ok: true } })

    const notification = contactNotificationEmail({
      name: body.name,
      email: body.email,
      message: body.message,
    })

    const confirmation = contactConfirmationEmail({
      name: body.name,
    })

    Promise.all([
      sendEmail({
        to: CONTACT_INBOX,
        subject: notification.subject,
        html: notification.html,
        text: notification.text,
        replyTo: body.email,
      }),
      sendEmail({
        to: body.email,
        subject: confirmation.subject,
        html: confirmation.html,
        text: confirmation.text,
      }),
    ]).catch((err: unknown) => {
      console.error('[contact-form] Email delivery failed:', err)
    })
  },
)

// —— Admin: GET /admin/notifications/notify-me-demand ——

const getNotifyMeDemandQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
})

router.get(
  '/admin/notifications/notify-me-demand',
  requireAdmin,
  validateQuery(getNotifyMeDemandQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof getNotifyMeDemandQuerySchema> }).validatedQuery
    const demand = await messagingService.getNotifyMeDemand({ limit: query.limit })
    res.status(200).json({ data: { demand } })
  },
)

// —— Admin: GET /admin/campaigns ——

const getCampaignsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  status: z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED']).optional(),
})

router.get(
  '/admin/campaigns',
  requireAdmin,
  validateQuery(getCampaignsQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof getCampaignsQuerySchema> }).validatedQuery
    const result = await messagingService.adminListCampaigns({
      page: query.page,
      limit: query.limit,
      status: query.status,
    })
    res.status(200).json({
      data: {
        campaigns: result.campaigns,
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    })
  },
)

// —— Admin: GET /admin/campaigns/audience-estimate ——

const audienceEstimateQuerySchema = z.object({
  filter: z
    .string()
    .optional()
    .default('{}')
    .transform((s) => {
      if (!s || s.trim() === '') return {}
      try {
        const parsed: unknown = JSON.parse(s)
        return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
          ? (parsed as Record<string, unknown>)
          : {}
      } catch {
        return {}
      }
    }),
})

router.get(
  '/admin/campaigns/audience-estimate',
  requireAdmin,
  validateQuery(audienceEstimateQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof audienceEstimateQuerySchema> }).validatedQuery
    const result = await messagingService.adminAudienceEstimate({
      audienceFilterJson: query.filter,
    })
    res.status(200).json({ data: result })
  },
)

// —— Admin: POST /admin/campaigns/upload-asset ——

router.post(
  '/admin/campaigns/upload-asset',
  requireAdmin,
  (req: Request, res: Response, next: () => void) => {
    const handler = campaignAssetUpload.single('asset')
    handler(
      req as unknown as Parameters<typeof handler>[0],
      res as unknown as Parameters<typeof handler>[1],
      (err: unknown) => {
        if (err) {
          const message = err instanceof Error ? err.message : 'Upload failed'
          res.status(400).json({
            error: { code: 'UPLOAD_ERROR', message },
          })
          return
        }
        next()
      },
    )
  },
  async (req: Request, res: Response) => {
    const file = (req as Request & { file?: Express.Multer.File }).file
    if (!file?.buffer) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Missing asset file' },
      })
      return
    }
    const storage = getStorageService()
    const mime = file.mimetype

    if (mime.startsWith('image/')) {
      const safeName = (file.originalname || 'image')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .slice(0, 120)
      const subPath = `images/${crypto.randomUUID()}-${safeName}`
      const uploaded = await storage.uploadFile(
        'campaigns',
        subPath,
        file.buffer,
        mime,
      )
      res.status(200).json({
        data: {
          url: uploaded.url,
          type: 'image' as const,
          method: 'direct' as const,
        },
      })
      return
    }

    if (mime === 'video/mp4' || mime === 'video/quicktime') {
      const ext = mime === 'video/quicktime' ? 'mov' : 'mp4'
      const subPath = `videos/${crypto.randomUUID()}.${ext}`
      const presign = await storage.getPresignedUploadUrl(
        'campaigns',
        subPath,
        mime,
        3600,
      )
      const publicUrl = storage.getPublicUrl(presign.key)
      res.status(200).json({
        data: {
          url: publicUrl,
          uploadUrl: presign.uploadUrl,
          type: 'video' as const,
          method: 'presigned' as const,
        },
      })
      return
    }

    res.status(400).json({
      error: { code: 'UPLOAD_ERROR', message: 'Unsupported file type' },
    })
  },
)

// —— Admin: GET /admin/campaigns/:id ——

router.get(
  '/admin/campaigns/:id',
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const campaign = await messagingService.adminGetCampaign({ id })
    res.status(200).json({ data: { campaign } })
  },
)

// —— Admin: POST /admin/campaigns ——

const postCampaignBodySchema = z.object({
  name: z.string().min(1).max(200),
  contentJson: z.record(z.unknown()),
  channelsJson: z.array(channelEnum).optional(),
  audienceFilterJson: z.record(z.unknown()).optional(),
})

router.post(
  '/admin/campaigns',
  requireAdmin,
  validate(postCampaignBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    const body = (req as Request & { body: z.infer<typeof postCampaignBodySchema> }).body
    const campaign = await messagingService.adminCreateCampaign({
      name: body.name,
      contentJson: body.contentJson as Record<string, unknown>,
      channelsJson: body.channelsJson,
      audienceFilterJson: body.audienceFilterJson as Record<string, unknown> | undefined,
      adminId: authReq.admin.id,
    })
    res.status(201).json({ data: { campaign } })
  },
)

// —— Admin: PATCH /admin/campaigns/:id ——

const patchCampaignBodySchema = z.object({
  name: z.string().min(1).max(200).optional(),
  contentJson: z.record(z.unknown()).optional(),
  channelsJson: z.array(channelEnum).optional(),
  audienceFilterJson: z.record(z.unknown()).optional(),
})

router.patch(
  '/admin/campaigns/:id',
  requireAdmin,
  validate(patchCampaignBodySchema),
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const body = (req as Request & { body: z.infer<typeof patchCampaignBodySchema> }).body
    const campaign = await messagingService.adminUpdateCampaign({
      id,
      name: body.name,
      contentJson: body.contentJson as Record<string, unknown> | undefined,
      channelsJson: body.channelsJson,
      audienceFilterJson: body.audienceFilterJson as Record<string, unknown> | undefined,
    })
    res.status(200).json({ data: { campaign } })
  },
)

// —— Admin: POST /admin/campaigns/:id/schedule ——

const scheduleCampaignBodySchema = z.object({
  scheduledAt: z.string().datetime(),
})

router.post(
  '/admin/campaigns/:id/schedule',
  requireAdmin,
  validate(scheduleCampaignBodySchema),
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const body = (req as Request & { body: z.infer<typeof scheduleCampaignBodySchema> }).body
    await messagingService.adminScheduleCampaign({
      id,
      scheduledAt: new Date(body.scheduledAt),
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/campaigns/:id/cancel ——

router.post(
  '/admin/campaigns/:id/cancel',
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    await messagingService.adminCancelCampaign({ id })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/campaigns/:id/send-test ——

const sendTestEmailBodySchema = z.object({
  recipientEmail: z.string().email(),
})

router.post(
  '/admin/campaigns/:id/send-test',
  requireAdmin,
  validate(sendTestEmailBodySchema),
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const body = (req as Request & { body: z.infer<typeof sendTestEmailBodySchema> }).body
    await messagingService.adminSendTestEmail({
      campaignId: id,
      recipientEmail: body.recipientEmail,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/campaigns/:id/send-now ——

router.post(
  '/admin/campaigns/:id/send-now',
  requireAdmin,
  async (req: Request, res: Response) => {
    const id = req.params.id as string
    const result = await messagingService.adminSendCampaignNow({
      campaignId: id,
    })
    res.status(200).json({
      data: {
        ok: true,
        recipientCount: result.recipientCount,
        sentCount: result.sentCount,
      },
    })
  },
)

export const messagingRoutes = router
