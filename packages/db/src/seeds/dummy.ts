/*
 * ============================================================
 * MODETT DATABASE RESET + RESEED SCRIPT
 * ============================================================
 *
 * ADMIN CREDENTIALS:
 *   Owner:  kumudikaj@modett.com  /  Modett@2025
 *   Admin:  dev@modett.com        /  DevAdmin@2025
 *
 * CUSTOMER CREDENTIALS (all use: Test@12345):
 *   amara@example.com    — Amara Silva     (SILVER, 2550 pts incl. +100 grant)
 *   priya@example.com    — Priya Krishnan  (GOLD,   6800 pts)
 *   sara@example.com     — Sara Nawaz      (BRONZE,  180 pts)
 *   nilusha@example.com  — Nilusha Bandara (SILVER,  950 pts)
 *   kavya@example.com    — Kavya Menon     (BRONZE,   50 pts)
 *
 * SIZE FORMAT: UK sizing — 'UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', 'UK 20'
 * EU→UK mapping: 34→6, 36→8, 38→10, 40→12, 42→14, 44→16, 48→20
 *
 * WARNING: This script WIPES all data. Never run on production.
 * ============================================================
 */

import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: resolve(__dirname, '../../../../apps/api/.env') })

const { Pool } = pg

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 3,
})

// ── UUID helper ───────────────────────────────────────────────────────────────
const uuid = () => crypto.randomUUID()

// ── Date helper ───────────────────────────────────────────────────────────────
function ago(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

// ── Pre-generated IDs ─────────────────────────────────────────────────────────

const OWNER_USER_ID = uuid()
const ADMIN_USER_ID = uuid()
const CUSTOMER_1_ID = uuid() // amara
const CUSTOMER_2_ID = uuid() // priya
const CUSTOMER_3_ID = uuid() // sara
const CUSTOMER_4_ID = uuid() // nilusha
const CUSTOMER_5_ID = uuid() // kavya

const OWNER_ADMIN_ID = uuid()
const ADMIN_ADMIN_ID = uuid()

const CAT_DRESSES_ID   = uuid()
const CAT_TOPS_ID      = uuid()
const CAT_BOTTOMS_ID   = uuid()
const CAT_OUTERWEAR_ID = uuid()
const CAT_SKIRTS_ID    = uuid()
const CAT_SHORTS_ID    = uuid()

const PROD_1_ID  = uuid()  // Crispy Silk Midi Skirt
const PROD_2_ID  = uuid()  // Linen Column Dress
const PROD_3_ID  = uuid()  // Silk Wrap Dress
const PROD_4_ID  = uuid()  // Draped Midi Dress (SALE)
const PROD_5_ID  = uuid()  // Silk Charmeuse Blouse
const PROD_6_ID  = uuid()  // Cashmere Knit Top (SALE)
const PROD_7_ID  = uuid()  // Wide Leg Linen Trousers
const PROD_8_ID  = uuid()  // Straight Leg Trouser
const PROD_9_ID  = uuid()  // Oversized Wool Blazer
const PROD_10_ID = uuid()  // Tailored Cashmere Blazer
const PROD_11_ID = uuid()  // Linen Tailored Shorts

// ── R2 image URLs ─────────────────────────────────────────────────────────────
const R2 = 'https://pub-8804bb39c26f4399a33c5a5d1c2182f9.r2.dev/product_images'

const IMAGES = {
  skirt1: [
    `${R2}/skirts/skirt1/33.webp`,
    `${R2}/skirts/skirt1/34.webp`,
    `${R2}/skirts/skirt1/35.jpeg`,
    `${R2}/skirts/skirt1/36.webp`,
    `${R2}/skirts/skirt1/37.webp`,
    `${R2}/skirts/skirt1/38.webp`,
  ],
  dress1: [
    `${R2}/dresses/dress1/1.avif`,
    `${R2}/dresses/dress1/2.jpg`,
    `${R2}/dresses/dress1/3.avif`,
    `${R2}/dresses/dress1/4.avif`,
  ],
  dress2: [
    `${R2}/dresses/dress2/1.webp`,
    `${R2}/dresses/dress2/2.webp`,
    `${R2}/dresses/dress2/3.webp`,
    `${R2}/dresses/dress2/4.webp`,
  ],
  dress3: [
    `${R2}/dresses/dress3/19.webp`,
    `${R2}/dresses/dress3/20.webp`,
    `${R2}/dresses/dress3/21.jpeg`,
    `${R2}/dresses/dress3/22.webp`,
  ],
  top1: [
    `${R2}/tops/top1/1.jpeg`,
    `${R2}/tops/top1/2.jpeg`,
    `${R2}/tops/top1/3.jpeg`,
  ],
  top2: [
    `${R2}/tops/top2/5.jpeg`,
    `${R2}/tops/top2/6.jpeg`,
  ],
  pant1: [
    `${R2}/pant/pant1/8.jpeg`,
    `${R2}/pant/pant1/9.webp`,
    `${R2}/pant/pant1/10.webp`,
  ],
  pant2: [
    `${R2}/pant/pant2/11.webp`,
    `${R2}/pant/pant2/12.webp`,
    `${R2}/pant/pant2/13.webp`,
  ],
  blazer1: [
    `${R2}/blazer/blazer1/23.webp`,
    `${R2}/blazer/blazer1/24.webp`,
    `${R2}/blazer/blazer1/25.jpeg`,
    `${R2}/blazer/blazer1/26.jpeg`,
    `${R2}/blazer/blazer1/27.webp`,
  ],
  blazer2: [
    `${R2}/blazer/blazer2/28.webp`,
    `${R2}/blazer/blazer2/29.webp`,
    `${R2}/blazer/blazer2/30.webp`,
    `${R2}/blazer/blazer2/31.webp`,
    `${R2}/blazer/blazer2/32.webp`,
  ],
  short1: [
    `${R2}/shorts/short1/39.webp`,
    `${R2}/shorts/short1/40.webp`,
    `${R2}/shorts/short1/41.webp`,
    `${R2}/shorts/short1/42.webp`,
    `${R2}/shorts/short1/43.webp`,
    `${R2}/shorts/short1/44.webp`,
  ],
}

// ── Step 1: Reset ─────────────────────────────────────────────────────────────

async function resetDatabase(client: pg.PoolClient) {
  console.log('🗑  Resetting database...')

  await client.query(`
    TRUNCATE TABLE
      catalog.bestseller_list,
      catalog.product_relations,
      analytics.analytics_aggregates,
      messaging.email_delivery_log,
      messaging.notification_outbox,
      messaging.campaign_deliveries,
      messaging.campaigns,
      messaging.notify_me_events,
      messaging.price_drop_subscriptions,
      messaging.back_in_stock_subscriptions,
      reviews.review_flags,
      reviews.review_media,
      reviews.reviews,
      reviews.review_request_tokens,
      iam.admin_invites,
      loyalty.loyalty_grants,
      loyalty.loyalty_ledger,
      loyalty.loyalty_accounts,
      messaging.inbox_messages,
      returns.return_events,
      returns.return_request_items,
      returns.return_requests,
      orders.order_events,
      orders.order_contacts,
      orders.order_addresses,
      orders.order_items,
      orders.orders,
      inventory.inventory_movements,
      inventory.inventory_units,
      inventory.variant_stock,
      inventory.product_variants,
      catalog.product_images,
      catalog.product_prices,
      catalog.products,
      catalog.categories,
      catalog.banners,
      messaging.notification_preferences,
      iam.saved_addresses,
      iam.wishlists,
      iam.admins,
      iam.sessions,
      iam.users,
      shipping.shipping_methods
    CASCADE
  `)

  console.log('   ✓ All tables cleared (loyalty_rules preserved)')
}

// ── Step 2: IAM ───────────────────────────────────────────────────────────────

async function seedIam(client: pg.PoolClient) {
  console.log('👤 Seeding IAM...')

  const ownerHash    = await bcrypt.hash('Modett@2025',  10)
  const adminHash    = await bcrypt.hash('DevAdmin@2025', 10)
  const customerHash = await bcrypt.hash('Test@12345',   10)

  await client.query(`
    INSERT INTO iam.users
      (id, first_name, last_name, email, password_hash,
       newsletter_opt_in, newsletter_opted_at, created_at, updated_at)
    VALUES
      ($1,  'Kumudika', 'Fernando',  'kumudikaj@modett.com', $2,  true,  $8,  NOW(), NOW()),
      ($3,  'Dev',      'Admin',     'dev@modett.com',       $4,  false, NULL, NOW(), NOW()),
      ($5,  'Amara',    'Silva',     'amara@example.com',    $6,  true,  $9,  NOW(), NOW()),
      ($7,  'Priya',    'Krishnan',  'priya@example.com',    $6,  true,  $10, NOW(), NOW()),
      ($11, 'Sara',     'Nawaz',     'sara@example.com',     $6,  false, NULL, NOW(), NOW()),
      ($12, 'Nilusha',  'Bandara',   'nilusha@example.com',  $6,  true,  $13, NOW(), NOW()),
      ($14, 'Kavya',    'Menon',     'kavya@example.com',    $6,  false, NULL, NOW(), NOW())
  `, [
    OWNER_USER_ID,
    ownerHash,
    ADMIN_USER_ID,
    adminHash,
    CUSTOMER_1_ID,
    customerHash,
    CUSTOMER_2_ID,
    ago(90), // $8  owner newsletter_opted_at
    ago(90), // $9  amara newsletter_opted_at
    ago(60), // $10 priya newsletter_opted_at
    CUSTOMER_3_ID, // $11 sara
    CUSTOMER_4_ID, // $12 nilusha
    ago(30), // $13 nilusha newsletter_opted_at
    CUSTOMER_5_ID, // $14 kavya
  ])

  await client.query(`
    INSERT INTO iam.admins (id, user_id, role, status, created_at, updated_at)
    VALUES
      ($1, $2, 'OWNER', 'ACTIVE', NOW(), NOW()),
      ($3, $4, 'ADMIN', 'ACTIVE', NOW(), NOW())
  `, [OWNER_ADMIN_ID, OWNER_USER_ID, ADMIN_ADMIN_ID, ADMIN_USER_ID])

  // Saved addresses
  await client.query(`
    INSERT INTO iam.saved_addresses
      (id, user_id, label, address_json, country_code, is_default, created_at, updated_at)
    VALUES
      ($1, $4, 'Home', $7, 'LK', true, NOW(), NOW()),
      ($2, $5, 'Home', $8, 'SG', true, NOW(), NOW()),
      ($3, $6, 'Home', $9, 'LK', true, NOW(), NOW())
  `, [
    uuid(), uuid(), uuid(),
    CUSTOMER_1_ID, CUSTOMER_2_ID, CUSTOMER_3_ID,
    JSON.stringify({ line1: '42 Galle Road', line2: 'Apt 3B', city: 'Colombo', district: 'Colombo', postal_code: '00300' }),
    JSON.stringify({ line1: '18 Orchard Boulevard', unit: '#08-22', city: 'Singapore', postal_code: '238839' }),
    JSON.stringify({ line1: '7 Marine Terrace', city: 'Colombo', district: 'Colombo', postal_code: '00400' }),
  ])

  // Notification preferences
  await client.query(`
    INSERT INTO messaging.notification_preferences
      (user_id, email_opt_in, sms_opt_in, whatsapp_opt_in, push_opt_in, updated_at)
    VALUES
      ($1, true,  false, false, false, NOW()),
      ($2, true,  false, false, false, NOW()),
      ($3, false, false, false, false, NOW()),
      ($4, true,  false, false, false, NOW()),
      ($5, false, false, false, false, NOW())
  `, [CUSTOMER_1_ID, CUSTOMER_2_ID, CUSTOMER_3_ID, CUSTOMER_4_ID, CUSTOMER_5_ID])

  console.log('   ✓ 2 admins + 5 customers + addresses + notification prefs')
}

// ── Step 3: Shipping ──────────────────────────────────────────────────────────

async function seedShippingMethods(client: pg.PoolClient) {
  console.log('🚚 Seeding shipping methods...')

  const { rows: zones } = await client.query(`
    SELECT id, name FROM shipping.shipping_zones ORDER BY name
  `)

  const zoneMap = new Map<string, string>()
  for (const z of zones) {
    zoneMap.set(z.name, z.id)
  }

  const intlId = zoneMap.get('International')
  const sgId   = zoneMap.get('Singapore')
  const lkId   = zoneMap.get('Sri Lanka')

  if (!intlId || !sgId || !lkId) {
    throw new Error('Shipping zones not found — run DB migrations first')
  }

  await client.query(`
    INSERT INTO shipping.shipping_methods
      (id, zone_id, name, carrier, rate_type,
       flat_rate_lkr, flat_rate_sgd, flat_rate_usd,
       estimated_days, active, created_at, updated_at)
    VALUES
      ($1,  $8,  'Colombo Central',         'Modett Express',  'FLAT', '50.00',  NULL,    NULL,    '1-2 working days',   true, NOW(), NOW()),
      ($2,  $8,  'Greater Colombo',          'Modett Express',  'FLAT', '75.00',  NULL,    NULL,    '2-3 working days',   true, NOW(), NOW()),
      ($3,  $8,  'Islandwide Delivery',      'Modett Standard', 'FLAT', '100.00', NULL,    NULL,    '3-5 working days',   true, NOW(), NOW()),
      ($4,  $9,  'Standard Delivery',        'SingPost',        'FLAT', NULL,    '0.50',  NULL,    '3-5 working days',   true, NOW(), NOW()),
      ($5,  $9,  'Express Delivery',         'DHL Express SG',  'FLAT', NULL,    '1.00',  NULL,    '1-2 working days',   true, NOW(), NOW()),
      ($6,  $10, 'International Standard',   'DHL Express',     'FLAT', NULL,    NULL,    '0.50',  '7-14 working days',  true, NOW(), NOW()),
      ($7,  $10, 'International Express',    'DHL Express',     'FLAT', NULL,    NULL,    '1.00',  '3-5 working days',   true, NOW(), NOW())
  `, [
    uuid(), uuid(), uuid(),
    uuid(), uuid(), uuid(), uuid(),
    lkId, sgId, intlId,
  ])

  // Low free-shipping thresholds for test environment
  await client.query(`
    UPDATE shipping.shipping_settings
    SET free_threshold_lkr = 1000.00,
        free_threshold_sgd = 4.00,
        free_threshold_usd = 3.00,
        free_shipping_label = 'Free Shipping',
        updated_at = NOW()
  `)

  console.log('   ✓ 7 shipping methods + free threshold updated')
}

// ── Step 4: Categories ────────────────────────────────────────────────────────

async function seedCategories(client: pg.PoolClient) {
  console.log('📁 Seeding categories...')

  await client.query(`
    INSERT INTO catalog.categories (id, name, slug, active, sort_order, created_at, updated_at)
    VALUES
      ($1, 'Dresses',  'dresses',  true, 1, NOW(), NOW()),
      ($2, 'Tops',     'tops',     true, 2, NOW(), NOW()),
      ($3, 'Bottoms',  'bottoms',  true, 3, NOW(), NOW()),
      ($4, 'Outerwear','outerwear',true, 4, NOW(), NOW()),
      ($5, 'Skirts',   'skirts',   true, 5, NOW(), NOW()),
      ($6, 'Shorts',   'shorts',   true, 6, NOW(), NOW())
  `, [CAT_DRESSES_ID, CAT_TOPS_ID, CAT_BOTTOMS_ID, CAT_OUTERWEAR_ID, CAT_SKIRTS_ID, CAT_SHORTS_ID])

  console.log('   ✓ 6 categories')
}

// ── Step 5: Products ──────────────────────────────────────────────────────────

// UK size format: 'UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', 'UK 20'
// EU → UK: 34→6, 36→8, 38→10, 40→12, 42→14, 44→16, 48→20
//
// stockOverrides keys use UK size strings e.g. 'UK 10': 0
// Default stock per variant is 8 units; override with 0 (OOS) or 2 (low stock)

interface ProductDef {
  id: string
  categoryId: string
  slug: string
  displayName: string
  shortName: string
  description: string
  fabricInfo: string
  productCode: string
  isSale: boolean
  lkr: string
  sgd: string
  usd: string
  images: string[]
  colours: { name: string; stockOverrides?: Record<string, number> }[]
  sizes: string[]
}

const PRODUCTS: ProductDef[] = [
  {
    id: PROD_1_ID, categoryId: CAT_SKIRTS_ID,
    slug: 'crispy-silk-midi-skirt', displayName: 'Crispy Silk Midi Skirt',
    shortName: 'Silk Midi Skirt',
    description: 'Crafted from pure crispy silk, this midi skirt moves with effortless grace. The structured fabric holds its shape beautifully, offering a silhouette that is both refined and relaxed. A wardrobe investment that transcends seasons.',
    fabricInfo: '100% Mulberry Silk. Dry clean only. Store folded in a breathable cotton bag.',
    productCode: 'MOD-001', isSale: false,
    lkr: '310.00', sgd: '1.35', usd: '1.00',
    images: IMAGES.skirt1,
    colours: [
      // IVORY: UK 6 OOS, UK 8 low stock (2 units), rest normal
      { name: 'IVORY', stockOverrides: { 'UK 6': 0, 'UK 8': 2 } },
      { name: 'SAGE' },
      { name: 'UMBER' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_2_ID, categoryId: CAT_DRESSES_ID,
    slug: 'linen-column-dress', displayName: 'Linen Column Dress',
    shortName: 'Column Dress',
    description: 'A masterclass in understated elegance. This column dress in washed linen drapes effortlessly against the body, softening with every wear. The clean silhouette speaks for itself — no embellishment needed when the fabric and cut are this precise.',
    fabricInfo: '100% European Linen. Machine wash cold, gentle cycle. Lay flat to dry.',
    productCode: 'MOD-002', isSale: false,
    lkr: '465.00', sgd: '2.00', usd: '1.50',
    images: IMAGES.dress1,
    colours: [
      // ECRU: UK 10 low stock (2 units)
      { name: 'ECRU', stockOverrides: { 'UK 10': 2 } },
      { name: 'SAND' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_3_ID, categoryId: CAT_DRESSES_ID,
    slug: 'silk-wrap-dress', displayName: 'Silk Wrap Dress',
    shortName: 'Wrap Dress',
    description: 'The wrap silhouette reinterpreted in heavyweight silk. This dress moves with you — the self-tie waist creates a figure that flatters every body. Day to evening, season to season, it earns its place in every wardrobe.',
    fabricInfo: '100% Silk Crepe de Chine. Hand wash cold. Lay flat to dry. Iron on low heat.',
    productCode: 'MOD-003', isSale: false,
    lkr: '620.00', sgd: '2.70', usd: '2.00',
    images: IMAGES.dress2,
    colours: [
      // IVORY: UK 6 OOS
      { name: 'IVORY', stockOverrides: { 'UK 6': 0 } },
      { name: 'BLUSH' },
      { name: 'SLATE' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14'],
  },
  {
    id: PROD_4_ID, categoryId: CAT_DRESSES_ID,
    slug: 'draped-midi-dress', displayName: 'Draped Midi Dress',
    shortName: 'Midi Dress',
    description: 'Cut on the bias from fluid viscose, this draped midi dress moves like water. The gathered waist creates effortless shape while the midi hem strikes the perfect balance between formal and relaxed. An instant classic.',
    fabricInfo: '100% Viscose. Hand wash or dry clean. Store hanging to maintain drape.',
    productCode: 'MOD-004', isSale: true,
    lkr: '390.00', sgd: '1.70', usd: '1.25',
    images: IMAGES.dress3,
    colours: [
      { name: 'UMBER' },
      { name: 'BLACK' },
      { name: 'SAGE' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_5_ID, categoryId: CAT_TOPS_ID,
    slug: 'silk-charmeuse-blouse', displayName: 'Silk Charmeuse Blouse',
    shortName: 'Charmeuse Blouse',
    description: 'The blouse that belongs in every rotation. Cut from liquid silk charmeuse, it catches the light beautifully and falls with an ease that makes dressing feel effortless. Tuck it in, leave it out — it works both ways.',
    fabricInfo: '100% Silk Charmeuse. Hand wash or dry clean. Iron on low heat with pressing cloth.',
    productCode: 'MOD-005', isSale: false,
    lkr: '310.00', sgd: '1.35', usd: '1.00',
    images: IMAGES.top1,
    colours: [
      { name: 'IVORY' },
      { name: 'SLATE' },
      // BLACK: UK 8 OOS
      { name: 'BLACK', stockOverrides: { 'UK 8': 0 } },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_6_ID, categoryId: CAT_TOPS_ID,
    slug: 'cashmere-knit-top', displayName: 'Cashmere Knit Top',
    shortName: 'Cashmere Top',
    description: 'Pure cashmere, fine-gauge knit, cut with a relaxed elegance. This is the piece you pull on when you want to feel put-together without effort. Pairs with everything — from tailored trousers to your favourite linen skirt.',
    fabricInfo: '100% Grade A Mongolian Cashmere. Hand wash cold or dry clean. Lay flat to dry.',
    productCode: 'MOD-006', isSale: true,
    lkr: '465.00', sgd: '2.00', usd: '1.50',
    images: IMAGES.top2,
    colours: [
      { name: 'IVORY' },
      { name: 'UMBER' },
      // SAGE: UK 10 low stock (2 units)
      { name: 'SAGE', stockOverrides: { 'UK 10': 2 } },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_7_ID, categoryId: CAT_BOTTOMS_ID,
    slug: 'wide-leg-linen-trousers', displayName: 'Wide Leg Linen Trousers',
    shortName: 'Linen Trousers',
    description: 'Cut wide through the leg and high at the waist, these linen trousers redefine comfort dressing. The natural fabric breathes beautifully in warm weather and softens with every wash, becoming more distinctly yours over time.',
    fabricInfo: '100% Belgian Linen. Machine wash cold. Press with steam while damp for best results.',
    productCode: 'MOD-007', isSale: false,
    lkr: '390.00', sgd: '1.70', usd: '1.25',
    images: IMAGES.pant1,
    colours: [
      { name: 'ECRU' },
      { name: 'BLACK' },
      { name: 'SAGE' },
    ],
    // Includes UK 20 (was EU 48) as an extended size
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', 'UK 20'],
  },
  {
    id: PROD_8_ID, categoryId: CAT_BOTTOMS_ID,
    slug: 'straight-leg-trouser', displayName: 'Straight Leg Trouser',
    shortName: 'Straight Trouser',
    description: 'The straight-leg trouser is the backbone of any considered wardrobe. Cut from a wool-blend with a clean front pleat, this pair hits the perfect balance between tailored and relaxed. Timeless by design.',
    fabricInfo: '70% Wool, 30% Polyester. Dry clean preferred. Press with a damp cloth to restore shape.',
    productCode: 'MOD-008', isSale: false,
    lkr: '465.00', sgd: '2.00', usd: '1.50',
    images: IMAGES.pant2,
    colours: [
      { name: 'CHARCOAL' },
      { name: 'CAMEL' },
      { name: 'ECRU' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_9_ID, categoryId: CAT_OUTERWEAR_ID,
    slug: 'oversized-wool-blazer', displayName: 'Oversized Wool Blazer',
    shortName: 'Wool Blazer',
    description: 'Oversized through the shoulder, structured at the waist — this blazer manages to feel both relaxed and composed. The wool blend holds its shape impeccably and improves with every wear. A signature piece for the considered wardrobe.',
    fabricInfo: '80% Wool, 20% Cashmere. Dry clean only. Store on a wide padded hanger.',
    productCode: 'MOD-009', isSale: false,
    lkr: '620.00', sgd: '2.70', usd: '2.00',
    images: IMAGES.blazer1,
    colours: [
      { name: 'CAMEL' },
      { name: 'CHARCOAL' },
      { name: 'IVORY' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_10_ID, categoryId: CAT_OUTERWEAR_ID,
    slug: 'tailored-cashmere-blazer', displayName: 'Tailored Cashmere Blazer',
    shortName: 'Cashmere Blazer',
    description: 'The blazer that made the collection. Pure cashmere, tailored for an effortless fit. The structured shoulders and nipped waist create a silhouette that feels both powerful and refined. Gets better with every wear.',
    fabricInfo: '100% Grade A Cashmere. Dry clean only. Store on a wide shoulder hanger in a breathable garment bag.',
    productCode: 'MOD-010', isSale: false,
    lkr: '620.00', sgd: '2.70', usd: '2.00',
    images: IMAGES.blazer2,
    colours: [
      // CAMEL: UK 12 low stock (2 units)
      { name: 'CAMEL', stockOverrides: { 'UK 12': 2 } },
      { name: 'CHARCOAL' },
      { name: 'BLACK' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
  {
    id: PROD_11_ID, categoryId: CAT_SHORTS_ID,
    slug: 'linen-tailored-shorts', displayName: 'Linen Tailored Shorts',
    shortName: 'Linen Shorts',
    description: 'Tailored from pure linen with a high waist and a relaxed wide leg, these shorts elevate casual dressing without effort. The structured waistband and clean front sit make them as polished as any trouser.',
    fabricInfo: '100% Stonewashed Linen. Machine wash cold. Pull into shape while damp and lay flat to dry.',
    productCode: 'MOD-011', isSale: false,
    lkr: '310.00', sgd: '1.35', usd: '1.00',
    images: IMAGES.short1,
    colours: [
      { name: 'ECRU' },
      { name: 'BLACK' },
      { name: 'SAGE' },
    ],
    sizes: ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16'],
  },
]

async function seedProducts(client: pg.PoolClient) {
  console.log('👗 Seeding products...')

  let totalVariants = 0
  let totalUnits = 0

  for (const p of PRODUCTS) {
    // Product row
    await client.query(`
      INSERT INTO catalog.products
        (id, category_id, slug, display_name, short_name,
         description, fabric_info, product_code, active, is_sale,
         created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$9,NOW(),NOW())
    `, [p.id, p.categoryId, p.slug, p.displayName, p.shortName,
        p.description, p.fabricInfo, p.productCode, p.isSale])

    // Prices — product_id is the PK, no separate id column
    await client.query(`
      INSERT INTO catalog.product_prices
        (product_id, lkr_amount, sgd_amount, usd_amount, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
    `, [p.id, p.lkr, p.sgd, p.usd])

    // Images
    const imageIds: string[] = []
    for (const [i, url] of p.images.entries()) {
      const imgId = uuid()
      imageIds.push(imgId)
      await client.query(`
        INSERT INTO catalog.product_images
          (id, product_id, url, alt_text, sort_order, created_at)
        VALUES ($1,$2,$3,$4,$5,NOW())
      `, [imgId, p.id, url, `${p.displayName} — view ${i + 1}`, i])
    }

    // Set key_image_id to first image
    await client.query(`
      UPDATE catalog.products SET key_image_id = $1 WHERE id = $2
    `, [imageIds[0], p.id])

    // Variants + stock + inventory units
    // Size stored exactly as the UK string e.g. 'UK 6', 'UK 8', 'UK 10'
    for (const colour of p.colours) {
      // sku_group uses first 3 chars of colour and the numeric part of the UK size
      // e.g. IVORY UK 6 → MOD-001-IVO-6
      const colourCode = colour.name.slice(0, 3).toUpperCase()
      for (const size of p.sizes) {
        const variantId = uuid()
        const stockQty  = colour.stockOverrides?.[size] ?? 8

        // sku_group: product code + colour code (no size — groups all sizes of same colour)
        const skuGroup = `${p.productCode}-${colourCode}`

        await client.query(`
          INSERT INTO inventory.product_variants
            (id, product_id, color, size, sku_group, created_at, updated_at)
          VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
        `, [variantId, p.id, colour.name, size, skuGroup])

        await client.query(`
          INSERT INTO inventory.variant_stock
            (variant_id, in_stock_qty, held_qty, low_stock_threshold, updated_at)
          VALUES ($1,$2,0,3,NOW())
        `, [variantId, stockQty])

        totalVariants++

        // Inventory units — barcode uses numeric size part for readability
        // e.g. MOD-001-IVO-UK6-0001
        const sizeCode = size.replace(' ', '')  // 'UK6', 'UK8', etc.
        for (let seq = 1; seq <= stockQty; seq++) {
          const barcode = `${skuGroup}-${sizeCode}-${String(seq).padStart(4, '0')}`
          await client.query(`
            INSERT INTO inventory.inventory_units
              (id, variant_id, unit_sku, barcode_value, status, created_at, updated_at)
            VALUES ($1,$2,$3,$3,'IN_STOCK',NOW(),NOW())
          `, [uuid(), variantId, barcode])
          totalUnits++
        }
      }
    }
  }

  console.log(`   ✓ 11 products, ${totalVariants} variants, ${totalUnits} units`)
}

// ── Step 6: Bestseller list ───────────────────────────────────────────────────

async function seedBestsellerList(client: pg.PoolClient) {
  console.log('⭐ Seeding bestseller list...')

  const bestsellers = [
    { productId: PROD_2_ID,  sortOrder: 1 },
    { productId: PROD_1_ID,  sortOrder: 2 },
    { productId: PROD_9_ID,  sortOrder: 3 },
    { productId: PROD_5_ID,  sortOrder: 4 },
    { productId: PROD_10_ID, sortOrder: 5 },
    { productId: PROD_7_ID,  sortOrder: 6 },
    { productId: PROD_3_ID,  sortOrder: 7 },
  ]

  for (const b of bestsellers) {
    await client.query(`
      INSERT INTO catalog.bestseller_list
        (id, product_id, sort_order, added_by_admin_id, added_at)
      VALUES ($1,$2,$3,$4,NOW())
    `, [uuid(), b.productId, b.sortOrder, OWNER_ADMIN_ID])
  }

  console.log('   ✓ 7 bestsellers')
}

// ── Step 7: Banner ────────────────────────────────────────────────────────────

async function seedBanner(client: pg.PoolClient) {
  await client.query(`
    INSERT INTO catalog.banners
      (id, message, link_url, enabled, start_at, created_at, updated_at)
    VALUES ($1,$2,'/collections',true,NOW(),NOW(),NOW())
  `, [uuid(), 'Complimentary shipping on all orders over LKR 1,000 — Shop now'])

  console.log('   ✓ Banner seeded')
}

// ── Step 8: Loyalty ───────────────────────────────────────────────────────────

async function seedLoyalty(client: pg.PoolClient) {
  console.log('💎 Seeding loyalty...')

  const accounts = [
    { userId: CUSTOMER_1_ID, balance: 2450, lifetime: 3200, tier: 'SILVER' },
    { userId: CUSTOMER_2_ID, balance: 6800, lifetime: 8500, tier: 'GOLD'   },
    { userId: CUSTOMER_3_ID, balance: 180,  lifetime: 180,  tier: 'BRONZE' },
    { userId: CUSTOMER_4_ID, balance: 950,  lifetime: 1200, tier: 'SILVER' },
    { userId: CUSTOMER_5_ID, balance: 50,   lifetime: 50,   tier: 'BRONZE' },
  ]

  for (const a of accounts) {
    await client.query(`
      INSERT INTO loyalty.loyalty_accounts
        (user_id, balance, lifetime_earned, tier,
         tier_evaluated_at, last_activity_at)
      VALUES ($1,$2,$3,$4::loyalty.tier_level,NOW(),NOW())
    `, [a.userId, a.balance, a.lifetime, a.tier])

    // Two ledger entries per customer (append-only)
    await client.query(`
      INSERT INTO loyalty.loyalty_ledger
        (id, user_id, type, points, metadata_json, created_at)
      VALUES
        ($1,$2,'EARN',$3,'{"reason":"Purchase — MOD-2025-001"}',$4),
        ($5,$2,'EARN',$6,'{"reason":"Purchase — MOD-2025-002"}',$7)
    `, [
      uuid(), a.userId, Math.floor(a.lifetime * 0.6), ago(180),
      uuid(),           Math.floor(a.lifetime * 0.4), ago(60),
    ])
  }

  console.log('   ✓ 5 loyalty accounts + 10 ledger entries')
}

// ── Step 9: Orders ────────────────────────────────────────────────────────────

// Orders reference UK sizes — must match what was seeded in product variants
interface OrderSeed {
  orderId: string
  orderRef: string
  customerId: string
  countryCode: string
  productId: string
  variantColour: string
  variantSize: string   // UK size string e.g. 'UK 10'
  amount: string
  snapshot: Record<string, unknown>
}

const ORDER_SEEDS: OrderSeed[] = [
  {
    orderId: uuid(), orderRef: 'MOD-202600001',
    customerId: CUSTOMER_1_ID, countryCode: 'LK',
    productId: PROD_2_ID, variantColour: 'ECRU', variantSize: 'UK 10',
    amount: '465.00',
    snapshot: { display_name: 'Linen Column Dress', short_name: 'Column Dress', color: 'ECRU', size: 'UK 10', product_code: 'MOD-002' },
  },
  {
    orderId: uuid(), orderRef: 'MOD-202600002',
    customerId: CUSTOMER_2_ID, countryCode: 'SG',
    productId: PROD_1_ID, variantColour: 'SAGE', variantSize: 'UK 8',
    amount: '310.00',
    snapshot: { display_name: 'Crispy Silk Midi Skirt', short_name: 'Silk Midi Skirt', color: 'SAGE', size: 'UK 8', product_code: 'MOD-001' },
  },
  {
    orderId: uuid(), orderRef: 'MOD-202600003',
    customerId: CUSTOMER_3_ID, countryCode: 'LK',
    productId: PROD_9_ID, variantColour: 'CAMEL', variantSize: 'UK 10',
    amount: '620.00',
    snapshot: { display_name: 'Oversized Wool Blazer', short_name: 'Wool Blazer', color: 'CAMEL', size: 'UK 10', product_code: 'MOD-009' },
  },
  {
    orderId: uuid(), orderRef: 'MOD-202600004',
    customerId: CUSTOMER_4_ID, countryCode: 'LK',
    productId: PROD_5_ID, variantColour: 'IVORY', variantSize: 'UK 8',
    amount: '310.00',
    snapshot: { display_name: 'Silk Charmeuse Blouse', short_name: 'Charmeuse Blouse', color: 'IVORY', size: 'UK 8', product_code: 'MOD-005' },
  },
]

// Exported so seedReviews can reference the same order IDs
const seededOrderItemIds: Record<string, { orderId: string; orderItemId: string }> = {}

async function seedOrders(client: pg.PoolClient) {
  console.log('📦 Seeding orders...')

  for (const o of ORDER_SEEDS) {
    const { rows: varRows } = await client.query(`
      SELECT id FROM inventory.product_variants
      WHERE product_id = $1 AND color = $2 AND size = $3
      LIMIT 1
    `, [o.productId, o.variantColour, o.variantSize])
    const variantId = varRows[0]?.id ?? null

    const currency = o.countryCode === 'SG' ? 'SGD' : 'LKR'
    const taxRate  = o.countryCode === 'SG' ? '0.0900' : '0.1800'

    await client.query(`
      INSERT INTO orders.orders
        (id, order_ref, user_id,
         order_state, payment_state, fulfillment_state, return_state,
         currency, country_code,
         subtotal, discount_amount, shipping_cost, tax_amount, tax_rate_snapshot, total,
         placed_at, created_at, updated_at)
      VALUES ($1,$2,$3,
              'PLACED','PAID','DELIVERED','NONE',
              $4,$5,
              $6,0,0,0,$7,$6,
              $8,$8,$8)
    `, [o.orderId, o.orderRef, o.customerId,
        currency, o.countryCode,
        o.amount, taxRate,
        ago(120)])

    const orderItemId = uuid()
    await client.query(`
      INSERT INTO orders.order_items
        (id, order_id, variant_id, qty,
         unit_price_snapshot_amount, unit_price_snapshot_currency,
         tax_amount, product_snapshot_json, created_at)
      VALUES ($1,$2,$3,1,$4,$5,0,$6,$7)
    `, [orderItemId, o.orderId, variantId, o.amount, currency,
        JSON.stringify(o.snapshot), ago(120)])

    // Shipping address
    const addressJson = o.countryCode === 'SG'
      ? { line1: '18 Orchard Boulevard', unit: '#08-22', city: 'Singapore', postal_code: '238839' }
      : { line1: '42 Galle Road', city: 'Colombo', district: 'Colombo', postal_code: '00300' }
    const phone = o.countryCode === 'SG' ? '+6591234567' : '+94771234567'

    await client.query(`
      INSERT INTO orders.order_addresses
        (id, order_id, kind, address_json, country_code)
      VALUES ($1,$2,'SHIPPING',$3,$4)
    `, [uuid(), o.orderId, JSON.stringify(addressJson), o.countryCode])

    await client.query(`
      INSERT INTO orders.order_contacts
        (id, order_id, primary_phone, extra_phones_json)
      VALUES ($1,$2,$3,'[]')
    `, [uuid(), o.orderId, phone])

    // Order events timeline
    const events: [string, number][] = [
      ['ORDER_PLACED', 120], ['PAYMENT_CONFIRMED', 120],
      ['PACKED', 119],       ['SHIPPED', 118], ['DELIVERED', 115],
    ]
    for (const [eventType, daysAgo] of events) {
      await client.query(`
        INSERT INTO orders.order_events
          (id, order_id, event_type, payload_json, created_at)
        VALUES ($1,$2,$3,'{}', $4)
      `, [uuid(), o.orderId, eventType, ago(daysAgo)])
    }

    seededOrderItemIds[o.orderRef] = { orderId: o.orderId, orderItemId }
  }

  console.log('   ✓ 4 completed orders + addresses + contacts + events')
}

// ── Step 10: Reviews ──────────────────────────────────────────────────────────

async function seedReviews(client: pg.PoolClient) {
  console.log('⭐ Seeding reviews...')

  const reviews = [
    {
      orderRef: 'MOD-202600001', customerId: CUSTOMER_1_ID, productId: PROD_2_ID,
      rating: 5,
      body: "This dress is everything I hoped it would be. The linen is incredibly soft and the fit is perfect. I've already worn it three times this month and it still looks brand new. Worth every rupee.",
      daysAgo: 90,
    },
    {
      orderRef: 'MOD-202600002', customerId: CUSTOMER_2_ID, productId: PROD_1_ID,
      rating: 5,
      body: 'The quality is exceptional — you can tell immediately that this is made from real silk. The midi length is perfect and the sage colour photographs beautifully. Fast shipping and excellent packaging.',
      daysAgo: 60,
    },
    {
      orderRef: 'MOD-202600003', customerId: CUSTOMER_3_ID, productId: PROD_9_ID,
      rating: 4,
      body: 'Beautiful blazer and the wool-cashmere blend is as soft as described. I sized up one size for a more relaxed fit which worked perfectly. Took off one star only because the lining could be a touch more generous, but that is a very minor point.',
      daysAgo: 42,
    },
    {
      orderRef: 'MOD-202600004', customerId: CUSTOMER_4_ID, productId: PROD_5_ID,
      rating: 5,
      body: "I was hesitant about the price but this blouse has completely changed how I feel about getting dressed. It makes every outfit look intentional. The ivory is so versatile — I've worn it tucked into trousers and loose over a skirt.",
      daysAgo: 30,
    },
  ]

  for (const r of reviews) {
    const refs = seededOrderItemIds[r.orderRef]
    if (!refs) continue

    // Look up variant for the review FK
    const { rows: varRows } = await client.query(`
      SELECT oi.variant_id FROM orders.order_items oi WHERE oi.id = $1
    `, [refs.orderItemId])
    const variantId = varRows[0]?.variant_id ?? null

    await client.query(`
      INSERT INTO reviews.reviews
        (id, user_id, order_id, order_item_id, product_id, variant_id,
         rating, body, status, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'VISIBLE',$9,$9)
    `, [
      uuid(), r.customerId, refs.orderId, refs.orderItemId,
      r.productId, variantId, r.rating, r.body, ago(r.daysAgo),
    ])
  }

  console.log('   ✓ 4 reviews (VISIBLE)')
}

// ── Step 11: Product relations ────────────────────────────────────────────────

async function seedProductRelations(client: pg.PoolClient) {
  console.log('🔗 Seeding product relations...')

  const pairs: [string, string][] = [
    [PROD_1_ID,  PROD_5_ID],  // Silk Skirt ↔ Charmeuse Blouse
    [PROD_2_ID,  PROD_7_ID],  // Column Dress ↔ Linen Trousers
    [PROD_3_ID,  PROD_9_ID],  // Wrap Dress ↔ Wool Blazer
    [PROD_4_ID,  PROD_10_ID], // Midi Dress ↔ Cashmere Blazer
    [PROD_6_ID,  PROD_7_ID],  // Cashmere Top ↔ Linen Trousers
    [PROD_8_ID,  PROD_9_ID],  // Straight Trouser ↔ Wool Blazer
    [PROD_11_ID, PROD_5_ID],  // Linen Shorts ↔ Charmeuse Blouse
  ]

  for (const [a, b] of pairs) {
    await client.query(`
      INSERT INTO catalog.product_relations
        (product_id, related_product_id, relation_type)
      VALUES ($1,$2,'SIMILAR'),($2,$1,'SIMILAR')
      ON CONFLICT DO NOTHING
    `, [a, b])
  }

  console.log('   ✓ 14 product relations (bidirectional)')
}

// ── Step 12: Inbox messages ───────────────────────────────────────────────────

async function seedInboxMessages(client: pg.PoolClient) {
  console.log('📬 Seeding inbox messages...')

  const messages = [
    {
      userId: CUSTOMER_1_ID,
      type: 'ORDER_UPDATE',
      title: 'Your order has been delivered',
      body: 'Your Modett order MOD-202600001 was delivered on time. We hope you love your new pieces.',
      ctaLabel: 'View Order',
      ctaUrl: '/account/orders/MOD-202600001',
      isRead: false,
    },
    {
      userId: CUSTOMER_1_ID,
      type: 'LOYALTY_TIER',
      title: "You've reached Silver tier",
      body: "Congratulations — you've earned enough points to reach Silver tier. Enjoy 1.25× points on every purchase.",
      ctaLabel: 'View Loyalty',
      ctaUrl: '/account/loyalty',
      isRead: true,
    },
    {
      userId: CUSTOMER_1_ID,
      type: 'REVIEW_REQUEST',
      title: 'How was your Linen Column Dress?',
      body: "We'd love to hear your thoughts on your recent purchase. Your review helps other customers make confident choices.",
      ctaLabel: 'Leave a Review',
      ctaUrl: '/account/orders/MOD-202600001',
      isRead: false,
    },
  ]

  for (const m of messages) {
    await client.query(`
      INSERT INTO messaging.inbox_messages
        (id, user_id, type, title, body,
         cta_label, cta_url, metadata_json, is_read, created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,'{}',$8,NOW())
    `, [uuid(), m.userId, m.type, m.title, m.body,
        m.ctaLabel, m.ctaUrl, m.isRead])
  }

  console.log('   ✓ 3 inbox messages for amara')
}

async function seedLoyaltyRules(client: pg.PoolClient) {
  console.log('📐 Seeding loyalty rules...')

  const earnRate = JSON.stringify({
    LKR: { points: 1, per_amount: 100 },
    SGD: { points: 1, per_amount: 1 },
    USD: { points: 1, per_amount: 1 },
  })
  const redemptionRates = JSON.stringify({
    LKR: { points: 100, value: 150.0 },
    SGD: { points: 100, value: 1.5 },
    USD: { points: 100, value: 1.5 },
  })
  const tierThresholds = JSON.stringify({ BRONZE: 0, SILVER: 6.0, GOLD: 12.0 })
  const multipliers = JSON.stringify({ BRONZE: 1.0, SILVER: 1.25, GOLD: 1.5 })
  const ruleParams = [earnRate, redemptionRates, tierThresholds, multipliers]

  const updateResult = await client.query(
    `
    UPDATE loyalty.loyalty_rules
    SET
      earn_rate_json = $1,
      redemption_rate_by_currency_json = $2,
      tier_thresholds_json = $3,
      multipliers_json = $4,
      min_redeem = 200,
      max_redeem_percent = '15.00',
      no_stack_with_sale = true,
      updated_at = NOW()
  `,
    ruleParams,
  )

  if (updateResult.rowCount === 0) {
    await client.query(
      `
      INSERT INTO loyalty.loyalty_rules (
        earn_rate_json,
        redemption_rate_by_currency_json,
        tier_thresholds_json,
        multipliers_json,
        min_redeem,
        max_redeem_percent,
        no_stack_with_sale
      )
      VALUES ($1, $2, $3, $4, 200, '15.00', true)
    `,
      ruleParams,
    )
    console.log('   ✓ Loyalty rules inserted (dual-axis tier system — table was empty)')
    return
  }

  console.log('   ✓ Loyalty rules updated (dual-axis tier system)')
}

async function seedLoyaltyGrants(client: pg.PoolClient) {
  console.log('🎁 Seeding loyalty grants...')

  const grantId = uuid()
  const grantAt = ago(30)

  await client.query(
    `
    INSERT INTO loyalty.loyalty_grants
      (id, user_id, points, reason, granted_by_admin_id, created_at)
    VALUES ($1, $2, 100, 'Welcome bonus — valued customer', $3, $4)
  `,
    [grantId, CUSTOMER_1_ID, OWNER_ADMIN_ID, grantAt],
  )

  await client.query(
    `
    INSERT INTO loyalty.loyalty_ledger
      (id, user_id, type, points, metadata_json, created_at)
    VALUES ($1, $2, 'BONUS', 100, $3, $4)
  `,
    [
      uuid(),
      CUSTOMER_1_ID,
      JSON.stringify({
        type: 'admin_grant',
        grantId,
        reason: 'Welcome bonus — valued customer',
        adminId: OWNER_ADMIN_ID,
      }),
      grantAt,
    ],
  )

  await client.query(
    `
    UPDATE loyalty.loyalty_accounts
    SET balance = balance + 100,
        lifetime_earned = lifetime_earned + 100,
        last_activity_at = NOW()
    WHERE user_id = $1
  `,
    [CUSTOMER_1_ID],
  )

  console.log('   ✓ 1 admin loyalty grant (amara +100 pts)')
}

async function seedAdminInvites(client: pg.PoolClient) {
  console.log('📨 Seeding admin invites...')

  const fakeTokenHash = 'seed_demo_token_' + uuid().replace(/-/g, '')

  await client.query(
    `
    INSERT INTO iam.admin_invites
      (id, email, token_hash, expires_at, created_by_admin_id, used_at)
    VALUES ($1, $2, $3, $4, $5, NULL)
  `,
    [
      uuid(),
      'kate@agency.com',
      fakeTokenHash,
      new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      OWNER_ADMIN_ID,
    ],
  )

  console.log('   ✓ 1 pending admin invite (kate@agency.com)')
}

async function seedReturnAndFlags(client: pg.PoolClient) {
  console.log('↩️  Seeding return + review flag...')

  const refs3 = seededOrderItemIds['MOD-202600003']
  if (refs3) {
    const returnId = uuid()
    const t = ago(5)
    await client.query(
      `
      INSERT INTO returns.return_requests
        (id, order_id, type, status, reason,
         policy_accepted_at, policy_version, eligible_until, created_at, updated_at)
      VALUES ($1, $2, 'REFUND', 'SUBMITTED', 'DOES_NOT_FIT',
              $3, '2025-v1', $4, $5, $5)
    `,
      [
        returnId,
        refs3.orderId,
        t,
        new Date(Date.now() + 9 * 24 * 60 * 60 * 1000).toISOString(),
        t,
      ],
    )

    await client.query(
      `
      INSERT INTO returns.return_request_items
        (id, return_request_id, order_item_id, qty, request_status)
      VALUES ($1, $2, $3, 1, 'SUBMITTED')
    `,
      [uuid(), returnId, refs3.orderItemId],
    )

    await client.query(
      `
      INSERT INTO returns.return_events
        (id, return_request_id, event_type, payload_json,
         admin_id, admin_note, created_at)
      VALUES ($1, $2, 'RETURN_SUBMITTED', '{}', NULL, NULL, $3)
    `,
      [uuid(), returnId, t],
    )
  }

  const { rows: saraReview } = await client.query(
    `SELECT id FROM reviews.reviews WHERE user_id = $1 LIMIT 1`,
    [CUSTOMER_3_ID],
  )

  if (saraReview.length > 0) {
    await client.query(
      `
      INSERT INTO reviews.review_flags
        (id, review_id, reason, auto_flagged, created_at, resolved_at, resolved_by_admin_id)
      VALUES ($1, $2, 'Admin flagged for quality check', false, $3, NULL, NULL)
      ON CONFLICT (review_id) DO NOTHING
    `,
      [uuid(), saraReview[0].id, ago(3)],
    )
  }

  console.log('   ✓ 1 SUBMITTED return (sara) · 1 review flag')
}

async function seedCampaigns(client: pg.PoolClient) {
  console.log('📣 Seeding campaigns...')

  const draftId = uuid()
  const sentId = uuid()

  const draftContent = JSON.stringify({
    subject: 'New arrivals — Silk Summer Collection',
    preheader: "The pieces you've been waiting for.",
    heading: 'Summer arrives at Modett',
    body:
      'Our new silk summer collection is here. Each piece is crafted from the finest natural fibres, designed to move with you through warm evenings and sun-filled days.',
    ctaLabel: 'Shop the Collection',
    ctaUrl: 'https://modett.com/collections',
    footerNote: 'Free shipping on orders over LKR 1,000.',
  })

  const sentContent = JSON.stringify({
    subject: 'Thank you for being a Modett customer',
    heading: 'Elegance, amplified.',
    body:
      'We created Modett to bring you clothing that lasts — in quality, in style, and in memory. Thank you for being part of this journey.',
    ctaLabel: 'Explore the Collection',
    ctaUrl: 'https://modett.com/collections',
  })

  const sentAt = ago(30)

  await client.query(
    `
    INSERT INTO messaging.campaigns
      (id, name, content_json, channels_json, audience_filter_json,
       status, created_by_admin_id, scheduled_at, sent_at, created_at, updated_at)
    VALUES
      ($1, 'Summer Collection Launch', $2, '["EMAIL"]', '{}',
       'DRAFT', $5, NULL, NULL, NOW(), NOW()),
      ($3, 'Brand Welcome — March 2025', $4, '["EMAIL"]', '{}',
       'SENT', $5, $6, $6, $7, $7)
  `,
    [draftId, draftContent, sentId, sentContent, OWNER_ADMIN_ID, sentAt, sentAt],
  )

  await client.query(
    `
    INSERT INTO messaging.campaign_deliveries
      (id, campaign_id, user_id, channel, status, created_at)
    VALUES
      ($1, $2, $3, 'EMAIL', 'SENT', $5),
      ($4, $2, $6, 'EMAIL', 'SENT', $5)
  `,
    [uuid(), sentId, CUSTOMER_1_ID, uuid(), CUSTOMER_2_ID, sentAt],
  )

  console.log('   ✓ 2 campaigns (1 DRAFT, 1 SENT) + 2 delivery records')
}

async function seedNotifyMeEvents(client: pg.PoolClient) {
  console.log('🔔 Seeding notify-me events...')

  const { rows } = await client.query(
    `
    SELECT pv.id
    FROM inventory.product_variants pv
    JOIN inventory.variant_stock vs ON vs.variant_id = pv.id
    WHERE pv.product_id = $1
      AND pv.color = 'IVORY'
      AND pv.size = 'UK 6'
      AND vs.available_qty = 0
    LIMIT 1
  `,
    [PROD_1_ID],
  )

  if (rows.length === 0) return

  const variantId = rows[0].id

  const sessions = ['sess_aaa111', 'sess_bbb222', 'sess_ccc333']
  const userIds: (string | null)[] = [CUSTOMER_3_ID, null, null]

  for (let i = 0; i < 3; i++) {
    await client.query(
      `
      INSERT INTO messaging.notify_me_events
        (id, variant_id, user_id, session_id, created_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
      [uuid(), variantId, userIds[i], sessions[i], ago(i * 3)],
    )
  }

  console.log('   ✓ 3 notify-me events (1 logged-in, 2 guest)')
}

async function seedAnalyticsAggregates(client: pg.PoolClient) {
  console.log('📊 Seeding analytics aggregates...')

  const productViewData = [
    { productId: PROD_1_ID, avgViews: 12 },
    { productId: PROD_2_ID, avgViews: 18 },
    { productId: PROD_3_ID, avgViews: 9 },
    { productId: PROD_9_ID, avgViews: 14 },
    { productId: PROD_5_ID, avgViews: 8 },
  ]

  for (const p of productViewData) {
    for (let d = 14; d >= 1; d--) {
      const periodStart = new Date()
      periodStart.setDate(periodStart.getDate() - d)
      periodStart.setHours(0, 0, 0, 0)

      const views = p.avgViews + Math.floor(Math.random() * 6 - 3)
      await client.query(
        `
        INSERT INTO analytics.analytics_aggregates
          (id, metric, dimension_json, value, period, period_start, computed_at)
        VALUES ($1, 'product_views', $2, $3, 'daily', $4, NOW())
        ON CONFLICT (metric, period, period_start, dimension_json) DO UPDATE
          SET value = EXCLUDED.value, computed_at = NOW()
      `,
        [
          uuid(),
          JSON.stringify({ product_id: p.productId }),
          String(Math.max(1, views)),
          periodStart.toISOString(),
        ],
      )
    }
  }

  const purchaseData = [
    { productId: PROD_2_ID, color: 'ECRU', size: 'UK 10', units: 3 },
    { productId: PROD_1_ID, color: 'SAGE', size: 'UK 8', units: 2 },
    { productId: PROD_9_ID, color: 'CAMEL', size: 'UK 10', units: 1 },
  ]

  for (const p of purchaseData) {
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - 7)
    periodStart.setHours(0, 0, 0, 0)

    await client.query(
      `
      INSERT INTO analytics.analytics_aggregates
        (id, metric, dimension_json, value, period, period_start, computed_at)
      VALUES ($1, 'purchases', $2, $3, 'daily', $4, NOW())
      ON CONFLICT (metric, period, period_start, dimension_json) DO UPDATE
        SET value = EXCLUDED.value, computed_at = NOW()
    `,
      [
        uuid(),
        JSON.stringify({ product_id: p.productId, color: p.color, size: p.size }),
        String(p.units),
        periodStart.toISOString(),
      ],
    )
  }

  const sources = [
    { source: 'google', sessions: 45 },
    { source: 'instagram', sessions: 28 },
    { source: 'direct', sessions: 32 },
    { source: 'facebook', sessions: 12 },
  ]

  for (const s of sources) {
    for (let d = 7; d >= 1; d--) {
      const periodStart = new Date()
      periodStart.setDate(periodStart.getDate() - d)
      periodStart.setHours(0, 0, 0, 0)

      const sessionCount = s.sessions + Math.floor(Math.random() * 10 - 5)
      await client.query(
        `
        INSERT INTO analytics.analytics_aggregates
          (id, metric, dimension_json, value, period, period_start, computed_at)
        VALUES ($1, 'traffic_source', $2, $3, 'daily', $4, NOW())
        ON CONFLICT (metric, period, period_start, dimension_json) DO UPDATE
          SET value = EXCLUDED.value, computed_at = NOW()
      `,
        [
          uuid(),
          JSON.stringify({ source: s.source, utm_source: s.source }),
          String(Math.max(1, sessionCount)),
          periodStart.toISOString(),
        ],
      )
    }
  }

  for (let d = 14; d >= 1; d--) {
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - d)
    periodStart.setHours(0, 0, 0, 0)
    const iso = periodStart.toISOString()

    await client.query(
      `
      INSERT INTO analytics.analytics_aggregates
        (id, metric, dimension_json, value, period, period_start, computed_at)
      VALUES
        ($1, 'checkout_starts', '{}'::jsonb, $2, 'daily', $3, NOW()),
        ($4, 'purchase_count',  '{}'::jsonb, $5, 'daily', $3, NOW()),
        ($6, 'account_creations', '{}'::jsonb, $7, 'daily', $3, NOW())
      ON CONFLICT (metric, period, period_start, dimension_json) DO UPDATE
        SET value = EXCLUDED.value, computed_at = NOW()
    `,
      [
        uuid(),
        String(3 + Math.floor(Math.random() * 5)),
        iso,
        uuid(),
        String(1 + Math.floor(Math.random() * 3)),
        uuid(),
        String(Math.random() > 0.7 ? 1 : 0),
      ],
    )
  }

  for (let d = 14; d >= 1; d--) {
    const periodStart = new Date()
    periodStart.setDate(periodStart.getDate() - d)
    periodStart.setHours(0, 0, 0, 0)
    const iso = periodStart.toISOString()

    await client.query(
      `
      INSERT INTO analytics.analytics_aggregates
        (id, metric, dimension_json, value, period, period_start, computed_at)
      VALUES
        ($1, 'user_type_purchase', '{"user_type":"registered"}'::jsonb, $2, 'daily', $3, NOW()),
        ($4, 'user_type_purchase', '{"user_type":"guest"}'::jsonb,      $5, 'daily', $3, NOW())
      ON CONFLICT (metric, period, period_start, dimension_json) DO UPDATE
        SET value = EXCLUDED.value, computed_at = NOW()
    `,
      [
        uuid(),
        String(1 + Math.floor(Math.random() * 2)),
        iso,
        uuid(),
        String(Math.random() > 0.5 ? 1 : 0),
      ],
    )
  }

  console.log(
    '   ✓ Analytics aggregates: 14d product views, funnel, traffic, guest/registered',
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await resetDatabase(client)
    await seedIam(client)
    await seedShippingMethods(client)
    await seedCategories(client)
    await seedProducts(client)
    await seedBestsellerList(client)
    await seedBanner(client)
    await seedLoyalty(client)
    await seedOrders(client)
    await seedReviews(client)
    await seedProductRelations(client)
    await seedInboxMessages(client)
    await seedLoyaltyRules(client)
    await seedLoyaltyGrants(client)
    await seedAdminInvites(client)
    await seedReturnAndFlags(client)
    await seedCampaigns(client)
    await seedNotifyMeEvents(client)
    await seedAnalyticsAggregates(client)

    await client.query('COMMIT')

    console.log('\n✅ SEED COMPLETE')
    console.log('   11 products · 6 categories · 7 bestsellers')
    console.log('   4 completed orders · 4 reviews · 7 shipping methods')
    console.log('   1 SUBMITTED return (sara) · 1 review flag')
    console.log('   2 campaigns (1 DRAFT, 1 SENT) · 3 notify-me events')
    console.log('   14 days of analytics aggregates')
    console.log('   1 pending admin invite (kate@agency.com)')
    console.log('   Loyalty rules: dual-axis tier (60% frequency / 40% spend)')
    console.log('   Sizes: UK 6 · UK 8 · UK 10 · UK 12 · UK 14 · UK 16 (+ UK 20)')
    console.log('   Owner:  kumudikaj@modett.com / Modett@2025')
    console.log('   Admin:  dev@modett.com / DevAdmin@2025')
    console.log('   Customers (password: Test@12345):')
    console.log('     amara@example.com  priya@example.com  sara@example.com')
    console.log('     nilusha@example.com  kavya@example.com')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('\n❌ Seed failed — rolled back:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed()