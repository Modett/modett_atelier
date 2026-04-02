/**
 * Campaign builder / email content shape (stored in campaigns.content_json).
 */
export interface CampaignContent {
  subject: string
  preheader?: string
  heroImageUrl?: string
  heroVideoUrl?: string
  heading: string
  body: string
  ctaLabel?: string
  ctaUrl?: string
  footerNote?: string
}

export const DEFAULT_CAMPAIGN_CONTENT: CampaignContent = {
  subject: '',
  heading: '',
  body: '',
}
