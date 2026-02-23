-- =============================================================================
-- MODETT E-COMMERCE PLATFORM — COMPLETE DATABASE SCHEMA
-- Version: 2.0 (Architecture-Reviewed & Hardened)
-- Database: PostgreSQL 15+
-- =============================================================================
-- CONVENTIONS:
--   • All primary keys: UUID (gen_random_uuid())
--   • All timestamps: TIMESTAMPTZ (timezone-aware)
--   • Soft deletes: deleted_at TIMESTAMPTZ (NULL = active)
--   • Monetary amounts: NUMERIC(12,2) — never FLOAT
--   • ENUMs: defined as PostgreSQL TYPE before table usage
--   • Schemas: iam, catalog, inventory, cart, orders, payments,
--              returns, reviews, loyalty, messaging, shipping, analytics
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram indexes for search


-- =============================================================================
-- SCHEMAS — One per module (modular monolith boundary enforcement)
-- =============================================================================
CREATE SCHEMA IF NOT EXISTS iam;
CREATE SCHEMA IF NOT EXISTS catalog;
CREATE SCHEMA IF NOT EXISTS inventory;
CREATE SCHEMA IF NOT EXISTS cart;
CREATE SCHEMA IF NOT EXISTS orders;
CREATE SCHEMA IF NOT EXISTS payments;
CREATE SCHEMA IF NOT EXISTS returns;
CREATE SCHEMA IF NOT EXISTS reviews;
CREATE SCHEMA IF NOT EXISTS loyalty;
CREATE SCHEMA IF NOT EXISTS messaging;
CREATE SCHEMA IF NOT EXISTS shipping;
CREATE SCHEMA IF NOT EXISTS analytics;


-- =============================================================================
-- ENUM TYPES
-- =============================================================================

-- IAM
CREATE TYPE iam.admin_role        AS ENUM ('OWNER', 'ADMIN');
CREATE TYPE iam.admin_status      AS ENUM ('ACTIVE', 'INVITED', 'SUSPENDED');
CREATE TYPE iam.session_kind      AS ENUM ('CUSTOMER', 'ADMIN');

-- Catalog
CREATE TYPE catalog.styling_guide_type AS ENUM ('VIDEO', 'GALLERY', 'TEXT');

-- Inventory
CREATE TYPE inventory.unit_status AS ENUM (
    'IN_STOCK', 'HELD', 'SOLD', 'RETURNED', 'DAMAGED', 'ADJUSTED_OUT'
);

-- Cart
CREATE TYPE cart.cart_status      AS ENUM ('ACTIVE', 'ABANDONED', 'CHECKED_OUT');

-- Reservations
CREATE TYPE cart.reservation_status AS ENUM ('HELD', 'CONSUMED', 'EXPIRED');

-- Orders
CREATE TYPE orders.order_state       AS ENUM ('DRAFT', 'PLACED', 'CANCELLED');
CREATE TYPE orders.payment_state     AS ENUM (
    'UNPAID', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'
);
CREATE TYPE orders.fulfillment_state AS ENUM (
    'NOT_STARTED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'
);
CREATE TYPE orders.return_state      AS ENUM (
    'NONE', 'REQUESTED', 'PENDING_REVIEW', 'APPROVED', 'FULFILLED', 'REJECTED'
);
CREATE TYPE orders.address_kind      AS ENUM ('SHIPPING', 'BILLING');
CREATE TYPE orders.currency_code     AS ENUM ('LKR', 'SGD', 'USD');

-- Payments
CREATE TYPE payments.payment_status  AS ENUM (
    'PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'
);

-- Returns
CREATE TYPE returns.return_type      AS ENUM ('REFUND', 'EXCHANGE');
CREATE TYPE returns.return_status    AS ENUM (
    'SUBMITTED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'FULFILLED'
);

-- Reviews
CREATE TYPE reviews.review_status    AS ENUM ('VISIBLE', 'HIDDEN');
CREATE TYPE reviews.media_type       AS ENUM ('IMAGE');

-- Loyalty
CREATE TYPE loyalty.ledger_type      AS ENUM (
    'EARN', 'REDEEM', 'BONUS', 'EXPIRY', 'ADJUST'
);
CREATE TYPE loyalty.tier_level       AS ENUM ('BRONZE', 'SILVER', 'GOLD');

-- Messaging
CREATE TYPE messaging.channel        AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH');
CREATE TYPE messaging.outbox_status  AS ENUM ('PENDING', 'SENT', 'FAILED');
CREATE TYPE messaging.campaign_status AS ENUM ('DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED');
CREATE TYPE messaging.delivery_status AS ENUM ('QUEUED', 'SENT', 'FAILED', 'BOUNCED');

-- Shipping
CREATE TYPE shipping.rate_type       AS ENUM ('FLAT', 'FREE', 'CALCULATED');

-- Promotions
CREATE TYPE orders.promo_type        AS ENUM ('PERCENT', 'FIXED');


-- =============================================================================
-- MODULE: IAM (Identity & Access Management)
-- =============================================================================

CREATE TABLE iam.users (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name          TEXT            NOT NULL,
    last_name           TEXT            NOT NULL,
    email               TEXT            NOT NULL,
    password_hash       TEXT            NOT NULL,
    -- Birthday (optional — loyalty bonus; requires explicit consent)
    dob                 DATE,
    dob_consent         BOOLEAN         NOT NULL DEFAULT FALSE,
    -- Newsletter
    newsletter_opt_in   BOOLEAN         NOT NULL DEFAULT FALSE,
    newsletter_opted_at TIMESTAMPTZ,
    -- Soft fields
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
    deleted_at          TIMESTAMPTZ,                          -- GDPR account deletion

    CONSTRAINT uq_users_email UNIQUE (email)
);

-- Admin accounts (staff members who manage the platform)
CREATE TABLE iam.admins (
    id          UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID            NOT NULL REFERENCES iam.users(id),
    role        iam.admin_role  NOT NULL DEFAULT 'ADMIN',
    status      iam.admin_status NOT NULL DEFAULT 'INVITED',
    created_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_admins_user_id UNIQUE (user_id)
);

-- Invite-only admin onboarding
-- Token is a 32-byte random value; stored as SHA-256 hash
CREATE TABLE iam.admin_invites (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email               TEXT        NOT NULL,
    token_hash          TEXT        NOT NULL,                 -- SHA-256 of raw token
    expires_at          TIMESTAMPTZ NOT NULL,                 -- now() + 48 hours
    created_by_admin_id UUID        NOT NULL REFERENCES iam.admins(id),
    used_at             TIMESTAMPTZ,                          -- NULL = not yet accepted

    CONSTRAINT uq_admin_invites_token UNIQUE (token_hash)
);

-- Session table (audit trail; live sessions also mirrored in Redis with TTL)
-- Redis is the authority for "is this session still active?"
-- DB stores long-lived remember_me sessions and audit history
CREATE TABLE iam.sessions (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    user_id             UUID                NOT NULL REFERENCES iam.users(id),
    kind                iam.session_kind    NOT NULL,
    expires_at          TIMESTAMPTZ         NOT NULL,
    last_seen_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
    remember_me_until   TIMESTAMPTZ,                          -- Only for CUSTOMER kind
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),
    invalidated_at      TIMESTAMPTZ,                          -- Explicit logout

    CONSTRAINT pk_sessions PRIMARY KEY (id)
    -- Note: Admin sessions have NO remember_me_until (enforced at app layer)
    -- Note: Admin idle timeout (15 min) enforced by Redis TTL, not this table
);


-- =============================================================================
-- MODULE: CATALOG
-- =============================================================================

CREATE TABLE catalog.categories (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL,
    slug        TEXT        NOT NULL,
    active      BOOLEAN     NOT NULL DEFAULT TRUE,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_categories_slug UNIQUE (slug)
);

CREATE TABLE catalog.products (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id     UUID        REFERENCES catalog.categories(id),
    slug            TEXT        NOT NULL,
    display_name    TEXT        NOT NULL,
    short_name      TEXT        NOT NULL,
    description     TEXT,
    fabric_info     TEXT,
    product_code    TEXT        NOT NULL,                      -- Internal SKU/code
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    is_sale         BOOLEAN     NOT NULL DEFAULT FALSE,        -- Blocks loyalty stacking
    key_image_id    UUID,                                      -- FK set after images inserted (see below)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ,                               -- Soft-delete; never hard-delete

    CONSTRAINT uq_products_slug         UNIQUE (slug),
    CONSTRAINT uq_products_product_code UNIQUE (product_code)
);

-- Prices stored explicitly per currency — no runtime FX conversion
CREATE TABLE catalog.product_prices (
    product_id  UUID            NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    lkr_amount  NUMERIC(12,2)   NOT NULL CHECK (lkr_amount >= 0),
    sgd_amount  NUMERIC(12,2)   NOT NULL CHECK (sgd_amount >= 0),
    usd_amount  NUMERIC(12,2)   NOT NULL CHECK (usd_amount >= 0),
    updated_at  TIMESTAMPTZ     NOT NULL DEFAULT now(),

    PRIMARY KEY (product_id)
);

CREATE TABLE catalog.product_images (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID        NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    url         TEXT        NOT NULL,
    alt_text    TEXT,
    sort_order  INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Now add FK for key_image_id (deferred to avoid circular dependency)
ALTER TABLE catalog.products
    ADD CONSTRAINT fk_products_key_image
    FOREIGN KEY (key_image_id) REFERENCES catalog.product_images(id)
    DEFERRABLE INITIALLY DEFERRED;

-- Similar/related product links (bidirectional; application enforces both directions)
CREATE TABLE catalog.product_relations (
    product_id          UUID    NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    related_product_id  UUID    NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    relation_type       TEXT    NOT NULL DEFAULT 'SIMILAR',

    PRIMARY KEY (product_id, related_product_id),
    CONSTRAINT chk_no_self_relation CHECK (product_id <> related_product_id)
);

-- Styling guides (video, photo gallery, or text tips) per product
CREATE TABLE catalog.product_styling_guides (
    id          UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID                        NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    type        catalog.styling_guide_type  NOT NULL,
    link_url    TEXT,
    content_json JSONB,
    active      BOOLEAN                     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ                 NOT NULL DEFAULT now()
);

-- Manual bestseller merchandising list (admin curates this)
CREATE TABLE catalog.bestseller_list (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id          UUID        NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    sort_order          INTEGER     NOT NULL DEFAULT 0,
    added_by_admin_id   UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    added_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_bestseller_product UNIQUE (product_id)
);

-- Top banner (one active record at a time; admin manages via toggle)
CREATE TABLE catalog.banners (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    message     TEXT        NOT NULL,
    link_url    TEXT,
    enabled     BOOLEAN     NOT NULL DEFAULT FALSE,
    start_at    TIMESTAMPTZ,                                  -- NULL = show immediately when enabled
    end_at      TIMESTAMPTZ,                                  -- NULL = no scheduled end
    created_by  UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- MODULE: INVENTORY
-- =============================================================================

-- Variants: the sellable unit (Product + Color + Size)
CREATE TABLE inventory.product_variants (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id  UUID        NOT NULL REFERENCES catalog.products(id) ON DELETE RESTRICT,
    color       TEXT        NOT NULL,
    size        TEXT        NOT NULL,
    sku_group   TEXT        NOT NULL,                         -- Groups variants for reporting
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at  TIMESTAMPTZ,                                  -- Soft-delete; never hard-delete

    CONSTRAINT uq_variant_product_color_size UNIQUE (product_id, color, size)
);

-- VariantStock: cached aggregate for fast storefront reads
-- available_qty is a generated column: in_stock_qty - held_qty
-- CRITICAL: Only updated via atomic SQL UPDATE — never direct SET
CREATE TABLE inventory.variant_stock (
    variant_id          UUID        PRIMARY KEY REFERENCES inventory.product_variants(id),
    in_stock_qty        INTEGER     NOT NULL DEFAULT 0 CHECK (in_stock_qty >= 0),
    held_qty            INTEGER     NOT NULL DEFAULT 0 CHECK (held_qty >= 0),
    -- available_qty computed as generated column
    available_qty       INTEGER     GENERATED ALWAYS AS (in_stock_qty - held_qty) STORED,
    low_stock_threshold INTEGER     NOT NULL DEFAULT 3,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT chk_held_not_exceed_stock CHECK (held_qty <= in_stock_qty)
);

-- Individual physical units — each has a unique barcode
CREATE TABLE inventory.inventory_units (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID                    NOT NULL REFERENCES inventory.product_variants(id),
    unit_sku        TEXT                    NOT NULL,
    barcode_value   TEXT                    NOT NULL,
    status          inventory.unit_status   NOT NULL DEFAULT 'IN_STOCK',
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),

    CONSTRAINT uq_inventory_units_sku      UNIQUE (unit_sku),
    CONSTRAINT uq_inventory_units_barcode  UNIQUE (barcode_value)
);

-- Full audit trail for every stock change
CREATE TABLE inventory.inventory_movements (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id          UUID        NOT NULL REFERENCES inventory.product_variants(id),
    delta_qty           INTEGER     NOT NULL,                 -- Positive = added, negative = removed
    reason              TEXT        NOT NULL,                 -- 'RESTOCK', 'SALE', 'DAMAGE', 'ADJUSTMENT', etc.
    reference_type      TEXT,                                 -- 'order', 'reservation', 'manual_adjustment'
    reference_id        UUID,                                 -- FK to relevant entity (polymorphic)
    created_by_admin_id UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Daily reconciliation: compare unit counts vs aggregate
CREATE TABLE inventory.inventory_reconciliation_log (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID        NOT NULL REFERENCES inventory.product_variants(id),
    actual_count    INTEGER     NOT NULL,                     -- COUNT(*) from inventory_units WHERE status=IN_STOCK
    aggregate_count INTEGER     NOT NULL,                     -- variant_stock.in_stock_qty
    delta           INTEGER     NOT NULL GENERATED ALWAYS AS (actual_count - aggregate_count) STORED,
    detected_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at     TIMESTAMPTZ,
    resolved_note   TEXT
);


-- =============================================================================
-- MODULE: CART
-- =============================================================================

CREATE TABLE cart.carts (
    id          UUID                NOT NULL DEFAULT gen_random_uuid(),
    user_id     UUID                REFERENCES iam.users(id) ON DELETE SET NULL,
    session_id  TEXT                NOT NULL,                 -- Browser session cookie ID
    status      cart.cart_status    NOT NULL DEFAULT 'ACTIVE',
    expires_at  TIMESTAMPTZ         NOT NULL DEFAULT (now() + INTERVAL '21 days'),
    created_at  TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT pk_carts PRIMARY KEY (id)
);

CREATE TABLE cart.cart_items (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    cart_id     UUID        NOT NULL REFERENCES cart.carts(id) ON DELETE CASCADE,
    variant_id  UUID        NOT NULL REFERENCES inventory.product_variants(id),
    qty         INTEGER     NOT NULL DEFAULT 1 CHECK (qty > 0),
    added_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_cart_items_cart_variant UNIQUE (cart_id, variant_id)
);

-- =============================================================================
-- RESERVATIONS (stock holds during checkout)
-- Two-window model:
--   Window 1: expires_at          = checkout_start + 30 min
--   Window 2: grace_expires_at    = payment_submitted_at + 10 min
--
-- Expiry worker query:
--   WHERE status = 'HELD'
--     AND expires_at < now()
--     AND (payment_submitted_at IS NULL OR grace_expires_at < now())
-- =============================================================================

CREATE TABLE cart.reservations (
    id                      UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID                        REFERENCES iam.users(id) ON DELETE SET NULL,
    cart_id                 UUID                        NOT NULL REFERENCES cart.carts(id),
    status                  cart.reservation_status     NOT NULL DEFAULT 'HELD',

    -- Window 1: 30-minute checkout hold
    expires_at              TIMESTAMPTZ                 NOT NULL DEFAULT (now() + INTERVAL '30 minutes'),

    -- Window 2: 10-minute grace period (activated when payment is submitted)
    payment_submitted_at    TIMESTAMPTZ,                        -- Stamped at POST /payments/intent
    grace_expires_at        TIMESTAMPTZ,                        -- = payment_submitted_at + 10 min

    -- Crash-safe worker columns
    worker_lock_id          UUID,                               -- Claimed by expiry worker
    processed_at            TIMESTAMPTZ,                        -- Set atomically with EXPIRED status
    hold_released_at        TIMESTAMPTZ,                        -- Confirms held_qty decremented

    created_at              TIMESTAMPTZ                 NOT NULL DEFAULT now(),

    -- Ensure grace window is set consistently
    CONSTRAINT chk_grace_set_together CHECK (
        (payment_submitted_at IS NULL AND grace_expires_at IS NULL) OR
        (payment_submitted_at IS NOT NULL AND grace_expires_at IS NOT NULL)
    )
);

CREATE TABLE cart.reservation_items (
    id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id  UUID    NOT NULL REFERENCES cart.reservations(id) ON DELETE CASCADE,
    variant_id      UUID    NOT NULL REFERENCES inventory.product_variants(id),
    qty             INTEGER NOT NULL CHECK (qty > 0)
);


-- =============================================================================
-- MODULE: SHIPPING
-- =============================================================================

CREATE TABLE shipping.shipping_zones (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT        NOT NULL,
    countries_json  JSONB       NOT NULL DEFAULT '[]',        -- ISO 3166-1 alpha-2 country codes
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shipping.shipping_methods (
    id              UUID                NOT NULL DEFAULT gen_random_uuid(),
    zone_id         UUID                NOT NULL REFERENCES shipping.shipping_zones(id),
    name            TEXT                NOT NULL,
    carrier         TEXT,
    rate_type       shipping.rate_type  NOT NULL DEFAULT 'FLAT',
    -- Flat rates per currency (NULL if rate_type != FLAT)
    flat_rate_lkr   NUMERIC(12,2)       CHECK (flat_rate_lkr >= 0),
    flat_rate_sgd   NUMERIC(12,2)       CHECK (flat_rate_sgd >= 0),
    flat_rate_usd   NUMERIC(12,2)       CHECK (flat_rate_usd >= 0),
    estimated_days  TEXT,                                     -- e.g. '3-5', '1-2'
    active          BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT pk_shipping_methods PRIMARY KEY (id)
);


-- =============================================================================
-- MODULE: PROMOTIONS (scaffolded — feature built later)
-- =============================================================================

CREATE TABLE orders.promo_codes (
    id                  UUID                NOT NULL DEFAULT gen_random_uuid(),
    code                TEXT                NOT NULL,
    type                orders.promo_type   NOT NULL,
    value               NUMERIC(12,2)       NOT NULL CHECK (value > 0),
    -- For FIXED type: currency required. For PERCENT: currency is NULL (applies to any)
    currency            orders.currency_code,
    min_order_amount    NUMERIC(12,2)       CHECK (min_order_amount >= 0),
    max_uses            INTEGER,                              -- NULL = unlimited
    uses_count          INTEGER             NOT NULL DEFAULT 0 CHECK (uses_count >= 0),
    valid_from          TIMESTAMPTZ,
    valid_until         TIMESTAMPTZ,
    active              BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT pk_promo_codes PRIMARY KEY (id),
    CONSTRAINT uq_promo_code  UNIQUE (code)
);


-- =============================================================================
-- MODULE: ORDERS
-- =============================================================================

CREATE TABLE orders.orders (
    id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_ref           TEXT                        NOT NULL,             -- Human-readable e.g. MOD-20260001
    user_id             UUID                        REFERENCES iam.users(id) ON DELETE SET NULL,
    guest_email         TEXT,                                             -- For guest checkouts (user_id IS NULL)

    -- State machine (separate columns, not one combined status)
    order_state         orders.order_state          NOT NULL DEFAULT 'DRAFT',
    payment_state       orders.payment_state        NOT NULL DEFAULT 'UNPAID',
    fulfillment_state   orders.fulfillment_state    NOT NULL DEFAULT 'NOT_STARTED',
    return_state        orders.return_state         NOT NULL DEFAULT 'NONE',

    -- Locale snapshot (locked at purchase time)
    currency            orders.currency_code        NOT NULL,
    country_code        TEXT                        NOT NULL,

    -- Financial snapshot
    subtotal            NUMERIC(12,2)               NOT NULL CHECK (subtotal >= 0),
    discount_amount     NUMERIC(12,2)               NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    shipping_cost       NUMERIC(12,2)               NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    tax_amount          NUMERIC(12,2)               NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    tax_rate_snapshot   NUMERIC(5,4)                NOT NULL DEFAULT 0,   -- e.g. 0.0900 for 9% GST
    total               NUMERIC(12,2)               NOT NULL CHECK (total >= 0),

    -- Shipping
    shipping_method_id  UUID                        REFERENCES shipping.shipping_methods(id) ON DELETE SET NULL,
    shipping_method_snapshot TEXT,                                        -- Name/carrier at time of order

    -- Promo (nullable FK; scaffolded for future)
    promo_code_id       UUID                        REFERENCES orders.promo_codes(id) ON DELETE SET NULL,

    -- Gift order
    is_gift             BOOLEAN                     NOT NULL DEFAULT FALSE,

    -- Timestamps
    placed_at           TIMESTAMPTZ,                                      -- When payment confirmed
    created_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),

    CONSTRAINT uq_orders_ref       UNIQUE (order_ref),
    -- Either user_id or guest_email must be present
    CONSTRAINT chk_order_identity  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

-- Promo redemptions (separate table for per-user enforcement)
CREATE TABLE orders.promo_redemptions (
    id              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    promo_code_id   UUID            NOT NULL REFERENCES orders.promo_codes(id),
    order_id        UUID            NOT NULL REFERENCES orders.orders(id),
    user_id         UUID            REFERENCES iam.users(id) ON DELETE SET NULL,
    discount_amount NUMERIC(12,2)   NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT now(),

    CONSTRAINT uq_promo_redemption_order UNIQUE (promo_code_id, order_id)
);

-- Line items — snapshot everything at purchase time
CREATE TABLE orders.order_items (
    id                              UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id                        UUID            NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    variant_id                      UUID            REFERENCES inventory.product_variants(id) ON DELETE SET NULL,
    qty                             INTEGER         NOT NULL CHECK (qty > 0),

    -- Price snapshot (explicit currency — not buried in JSON)
    unit_price_snapshot_amount      NUMERIC(12,2)   NOT NULL CHECK (unit_price_snapshot_amount >= 0),
    unit_price_snapshot_currency    orders.currency_code NOT NULL,
    tax_amount                      NUMERIC(12,2)   NOT NULL DEFAULT 0,

    -- Full product snapshot for historical display (even if product deleted later)
    product_snapshot_json           JSONB           NOT NULL,

    created_at                      TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- Address snapshots — never altered after order placed
CREATE TABLE orders.order_addresses (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id        UUID                    NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    kind            orders.address_kind     NOT NULL,
    address_json    JSONB                   NOT NULL,         -- Full locale-aware address fields
    country_code    TEXT                    NOT NULL,

    CONSTRAINT uq_order_address_kind UNIQUE (order_id, kind)
);

-- Contact info (primary + optional extras + gift receiver)
CREATE TABLE orders.order_contacts (
    id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID    NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    primary_phone       TEXT    NOT NULL,
    extra_phones_json   JSONB   NOT NULL DEFAULT '[]',
    gift_receiver_json  JSONB,                                -- NULL if not a gift order

    CONSTRAINT uq_order_contacts UNIQUE (order_id)
);

-- Full timeline of all order events (immutable append-only)
CREATE TABLE orders.order_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID        NOT NULL REFERENCES orders.orders(id) ON DELETE CASCADE,
    event_type          TEXT        NOT NULL,                 -- 'STATUS_UPDATED', 'ADDRESS_EDITED', 'CANCELLED', etc.
    payload_json        JSONB       NOT NULL DEFAULT '{}',
    created_by_admin_id UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    admin_note          TEXT,                                 -- Internal note; NOT sent to customer
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Scan-to-pack: barcode scanning binds physical units to order items
CREATE TABLE orders.order_unit_allocations (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id           UUID        NOT NULL REFERENCES orders.order_items(id) ON DELETE CASCADE,
    inventory_unit_id       UUID        NOT NULL REFERENCES inventory.inventory_units(id),
    scanned_by_admin_id     UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    scanned_by_name_snapshot TEXT       NOT NULL,             -- Name preserved even if admin suspended
    scanned_at              TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_unit_allocation_unit UNIQUE (inventory_unit_id)  -- One unit can't be in two orders
);


-- =============================================================================
-- MODULE: PAYMENTS
-- =============================================================================

CREATE TABLE payments.payment_intents (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID                    NOT NULL REFERENCES orders.orders(id),
    provider            TEXT                    NOT NULL,     -- 'stripe', 'adyen', etc.
    provider_intent_id  TEXT                    NOT NULL,
    amount              NUMERIC(12,2)           NOT NULL,
    currency            orders.currency_code    NOT NULL,
    status              payments.payment_status NOT NULL DEFAULT 'PENDING',
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT now(),

    CONSTRAINT uq_payment_intent_provider_id UNIQUE (provider_intent_id)
);

-- Payment webhook events — UNIQUE on provider_charge_id enforces idempotency at DB level
-- Combined with Redis cache (24h TTL on event IDs) = two-layer idempotency
CREATE TABLE payments.payment_transactions (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID                    NOT NULL REFERENCES orders.orders(id),
    provider            TEXT                    NOT NULL,
    provider_charge_id  TEXT                    NOT NULL,     -- UNIQUE — idempotency guarantee
    status              payments.payment_status NOT NULL,
    amount              NUMERIC(12,2)           NOT NULL,
    currency            orders.currency_code    NOT NULL,
    raw_payload_json    JSONB                   NOT NULL,     -- Full provider webhook payload
    received_at         TIMESTAMPTZ             NOT NULL DEFAULT now(),

    CONSTRAINT uq_payment_transactions_charge UNIQUE (provider_charge_id)
);


-- =============================================================================
-- MODULE: RETURNS
-- =============================================================================

CREATE TABLE returns.return_requests (
    id                  UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id            UUID                    NOT NULL REFERENCES orders.orders(id),
    type                returns.return_type     NOT NULL,
    status              returns.return_status   NOT NULL DEFAULT 'SUBMITTED',
    reason              TEXT                    NOT NULL,
    policy_accepted_at  TIMESTAMPTZ             NOT NULL,
    policy_version      TEXT                    NOT NULL,     -- Which policy text the customer agreed to
    eligible_until      TIMESTAMPTZ             NOT NULL,     -- Computed: delivered_at + return_window
    created_at          TIMESTAMPTZ             NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ             NOT NULL DEFAULT now()
);

-- Item-level return selections.
-- request_status is denormalised from the parent return_request row so the
-- partial unique index can reference a plain column — PostgreSQL does not
-- allow subqueries inside index predicates.
-- Application layer must update request_status whenever the parent
-- return_requests.status changes (same transaction).
CREATE TABLE returns.return_request_items (
    id                              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id               UUID                    NOT NULL REFERENCES returns.return_requests(id) ON DELETE CASCADE,
    order_item_id                   UUID                    NOT NULL REFERENCES orders.order_items(id),
    qty                             INTEGER                 NOT NULL CHECK (qty > 0),
    requested_variant_change_json   JSONB,                  -- For EXCHANGE: desired new color/size
    -- Denormalised from parent return_request; kept in sync by application layer
    request_status                  returns.return_status   NOT NULL DEFAULT 'SUBMITTED',
    created_at                      TIMESTAMPTZ             NOT NULL DEFAULT now()
);

-- Prevent duplicate active returns for the same order item.
-- A REJECTED return can be re-submitted; any other status blocks a new one.
-- Plain column predicate — no subquery (PostgreSQL index predicate limitation).
CREATE UNIQUE INDEX uix_return_items_active
    ON returns.return_request_items (order_item_id)
    WHERE request_status != 'REJECTED';

-- Immutable event log for each return
CREATE TABLE returns.return_events (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    return_request_id   UUID        NOT NULL REFERENCES returns.return_requests(id) ON DELETE CASCADE,
    event_type          TEXT        NOT NULL,
    payload_json        JSONB       NOT NULL DEFAULT '{}',
    admin_id            UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    admin_note          TEXT,                                 -- Internal only; not sent to customer
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- MODULE: REVIEWS
-- =============================================================================

-- Review request tokens (sent after delivery; single-use, 30-day expiry)
CREATE TABLE reviews.review_request_tokens (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    order_item_id   UUID        NOT NULL REFERENCES orders.order_items(id) ON DELETE CASCADE,
    token_hash      TEXT        NOT NULL,
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    used_at         TIMESTAMPTZ,

    CONSTRAINT uq_review_token UNIQUE (token_hash)
);

-- Reviews are tied to specific order items for verified-purchase enforcement
CREATE TABLE reviews.reviews (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                    NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    order_id        UUID                    NOT NULL REFERENCES orders.orders(id),
    order_item_id   UUID                    NOT NULL REFERENCES orders.order_items(id),
    product_id      UUID                    NOT NULL REFERENCES catalog.products(id),
    variant_id      UUID                    REFERENCES inventory.product_variants(id) ON DELETE SET NULL,
    rating          SMALLINT                NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body            TEXT,
    status          reviews.review_status   NOT NULL DEFAULT 'VISIBLE',
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),

    -- One review per order item
    CONSTRAINT uq_review_per_order_item UNIQUE (order_item_id)
);

CREATE TABLE reviews.review_media (
    id          UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id   UUID                NOT NULL REFERENCES reviews.reviews(id) ON DELETE CASCADE,
    url         TEXT                NOT NULL,
    type        reviews.media_type  NOT NULL DEFAULT 'IMAGE',
    sort_order  INTEGER             NOT NULL DEFAULT 0
);

-- Flags for moderation (auto-flagged on rating 1-2; manual from admin)
CREATE TABLE reviews.review_flags (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id               UUID        NOT NULL REFERENCES reviews.reviews(id) ON DELETE CASCADE,
    reason                  TEXT        NOT NULL,
    auto_flagged            BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at             TIMESTAMPTZ,
    resolved_by_admin_id    UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,

    -- One active (unresolved) flag per review
    CONSTRAINT uq_active_flag_per_review UNIQUE (review_id)
    -- Application should insert/ignore on conflict; resolved flags are archived separately
);


-- =============================================================================
-- MODULE: LOYALTY
-- =============================================================================

-- One account per user; balance is a cache of the ledger sum
CREATE TABLE loyalty.loyalty_accounts (
    user_id             UUID                NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    balance             INTEGER             NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned     INTEGER             NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
    tier                loyalty.tier_level  NOT NULL DEFAULT 'BRONZE',
    tier_evaluated_at   TIMESTAMPTZ         NOT NULL DEFAULT now(),
    last_activity_at    TIMESTAMPTZ         NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id)
);

-- Immutable ledger — append only, never UPDATE existing rows
CREATE TABLE loyalty.loyalty_ledger (
    id          UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID                    NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    type        loyalty.ledger_type     NOT NULL,
    points      INTEGER                 NOT NULL,             -- Positive = earned/bonus, Negative = redeemed/expired
    order_id    UUID                    REFERENCES orders.orders(id) ON DELETE SET NULL,
    metadata_json JSONB                 NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ             NOT NULL DEFAULT now()
);

-- Loyalty rules — single active row; OWNER manages
-- redemption_rate_by_currency_json stores per-currency rates:
-- { "LKR": { "points": 100, "value": 150 }, "SGD": { "points": 100, "value": 1.50 }, ... }
CREATE TABLE loyalty.loyalty_rules (
    id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Earn rates per currency (points per unit spent)
    earn_rate_json              JSONB       NOT NULL,
    -- Redemption rates by currency
    redemption_rate_by_currency_json JSONB  NOT NULL,
    -- Tier thresholds (points earned in rolling 12 months)
    tier_thresholds_json        JSONB       NOT NULL,
    -- Tier multipliers
    multipliers_json            JSONB       NOT NULL,
    -- Redemption constraints
    min_redeem                  INTEGER     NOT NULL DEFAULT 200,
    max_redeem_percent          NUMERIC(5,2) NOT NULL DEFAULT 15.00,  -- Max % of cart value
    no_stack_with_sale          BOOLEAN     NOT NULL DEFAULT TRUE,
    -- Audit
    updated_by_admin_id         UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Manual point grants by admins (OWNER permission)
CREATE TABLE loyalty.loyalty_grants (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    points              INTEGER     NOT NULL,
    reason              TEXT        NOT NULL,
    granted_by_admin_id UUID        REFERENCES iam.admins(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- MODULE: MESSAGING & NOTIFICATIONS
-- =============================================================================

-- In-app inbox messages for customers
CREATE TABLE messaging.inbox_messages (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    type        TEXT        NOT NULL,                         -- 'ORDER_UPDATE', 'CARE_GUIDE', 'REVIEW_REQUEST', etc.
    title       TEXT        NOT NULL,
    body        TEXT        NOT NULL,
    cta_label   TEXT,
    cta_url     TEXT,
    metadata_json JSONB     NOT NULL DEFAULT '{}',
    is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Channel opt-in preferences per user
CREATE TABLE messaging.notification_preferences (
    user_id         UUID    NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    email_opt_in    BOOLEAN NOT NULL DEFAULT TRUE,
    sms_opt_in      BOOLEAN NOT NULL DEFAULT FALSE,
    whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    push_opt_in     BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

    PRIMARY KEY (user_id)
);

-- Outbox pattern: write here before sending; worker polls and sends
-- dedupe_key prevents the same logical event from creating duplicate sends
CREATE TABLE messaging.notification_outbox (
    id              UUID                    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                    REFERENCES iam.users(id) ON DELETE SET NULL,
    channel         messaging.channel       NOT NULL,
    template_key    TEXT                    NOT NULL,
    payload_json    JSONB                   NOT NULL,
    dedupe_key      TEXT                    NOT NULL,         -- e.g. 'order:abc:RECEIPT:EMAIL'
    status          messaging.outbox_status NOT NULL DEFAULT 'PENDING',
    attempts        SMALLINT                NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ             NOT NULL DEFAULT now(),
    sent_at         TIMESTAMPTZ,
    failed_at       TIMESTAMPTZ,

    CONSTRAINT uq_outbox_dedupe UNIQUE (dedupe_key)
);

-- Delivery log per sent message
CREATE TABLE messaging.email_delivery_log (
    id                      UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID                        REFERENCES iam.users(id) ON DELETE SET NULL,
    notification_outbox_id  UUID                        NOT NULL REFERENCES messaging.notification_outbox(id),
    provider_message_id     TEXT,
    status                  messaging.delivery_status   NOT NULL,
    created_at              TIMESTAMPTZ                 NOT NULL DEFAULT now()
);

-- Back-in-stock subscriptions
-- UNIQUE on (user_id, variant_id) prevents duplicate subscriptions and notifications
CREATE TABLE messaging.back_in_stock_subscriptions (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                REFERENCES iam.users(id) ON DELETE SET NULL,
    variant_id      UUID                NOT NULL REFERENCES inventory.product_variants(id) ON DELETE CASCADE,
    channels_json   JSONB               NOT NULL DEFAULT '["EMAIL"]',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),
    notified_at     TIMESTAMPTZ,                              -- NULL = not yet notified

    -- Prevent duplicate subscriptions per user+variant
    CONSTRAINT uq_back_in_stock_user_variant UNIQUE (user_id, variant_id)
);

-- Price-drop subscriptions (variant-level; not product-level for precision)
CREATE TABLE messaging.price_drop_subscriptions (
    id              UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID                REFERENCES iam.users(id) ON DELETE SET NULL,
    variant_id      UUID                NOT NULL REFERENCES inventory.product_variants(id) ON DELETE CASCADE,
    target_price    NUMERIC(12,2)       CHECK (target_price > 0),  -- NULL = notify on any drop
    channels_json   JSONB               NOT NULL DEFAULT '["EMAIL"]',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT now(),

    CONSTRAINT uq_price_drop_user_variant UNIQUE (user_id, variant_id)
);

-- Admin-built campaigns (newsletters, promotions, back-in-stock blasts)
CREATE TABLE messaging.campaigns (
    id                  UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT                        NOT NULL,
    content_json        JSONB                       NOT NULL,
    channels_json       JSONB                       NOT NULL DEFAULT '["EMAIL"]',
    audience_filter_json JSONB                      NOT NULL DEFAULT '{}',
    status              messaging.campaign_status   NOT NULL DEFAULT 'DRAFT',
    created_by_admin_id UUID                        REFERENCES iam.admins(id) ON DELETE SET NULL,
    scheduled_at        TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ                 NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ                 NOT NULL DEFAULT now()
);

-- Per-user delivery tracking for campaigns
CREATE TABLE messaging.campaign_deliveries (
    id              UUID                        PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id     UUID                        NOT NULL REFERENCES messaging.campaigns(id) ON DELETE CASCADE,
    user_id         UUID                        REFERENCES iam.users(id) ON DELETE SET NULL,
    channel         messaging.channel           NOT NULL,
    status          messaging.delivery_status   NOT NULL DEFAULT 'QUEUED',
    created_at      TIMESTAMPTZ                 NOT NULL DEFAULT now()
);

-- Raw notify-me click events (demand analytics — separate from subscriptions)
CREATE TABLE messaging.notify_me_events (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    variant_id      UUID        NOT NULL REFERENCES inventory.product_variants(id) ON DELETE CASCADE,
    user_id         UUID        REFERENCES iam.users(id) ON DELETE SET NULL,
    session_id      TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- MODULE: CUSTOMER PROFILE (wishlist + saved addresses + payment tokens)
-- =============================================================================

CREATE TABLE iam.wishlists (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    product_id  UUID        NOT NULL REFERENCES catalog.products(id) ON DELETE CASCADE,
    variant_id  UUID        REFERENCES inventory.product_variants(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_wishlist_user_product UNIQUE (user_id, product_id)
);

-- Saved shipping addresses (not order snapshots — these are the profile defaults)
CREATE TABLE iam.saved_addresses (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    label           TEXT,                                     -- e.g. 'Home', 'Office'
    address_json    JSONB       NOT NULL,
    country_code    TEXT        NOT NULL,
    is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payment method tokens (stored at provider; we keep the reference)
CREATE TABLE iam.saved_payment_methods (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID        NOT NULL REFERENCES iam.users(id) ON DELETE CASCADE,
    provider        TEXT        NOT NULL,                     -- 'stripe', etc.
    token           TEXT        NOT NULL,                     -- Provider token — NOT a card number
    brand           TEXT,                                     -- 'Visa', 'Mastercard', etc.
    last_four       TEXT,                                     -- Last 4 digits for display only
    expiry_month    SMALLINT,
    expiry_year     SMALLINT,
    is_default      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =============================================================================
-- MODULE: ANALYTICS (partitioned events table)
-- =============================================================================

-- Parent table — partitioned by month from day one
-- Child partitions created by worker job each month
-- CRITICAL: Do NOT query this table directly in application code for large ranges
--           Use the pre-aggregated analytics_aggregates table for dashboards
CREATE TABLE analytics.events (
    id              UUID        NOT NULL DEFAULT gen_random_uuid(),
    session_id      TEXT        NOT NULL,
    user_id         UUID        REFERENCES iam.users(id) ON DELETE SET NULL,
    type            TEXT        NOT NULL,
    payload_json    JSONB       NOT NULL DEFAULT '{}',
    currency        orders.currency_code,
    country_code    TEXT,
    device_type     TEXT,                                     -- 'mobile', 'desktop', 'tablet'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);

-- Initial partitions (create more via worker job on the 25th of each month)
CREATE TABLE analytics.events_2026_01 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE analytics.events_2026_02 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE analytics.events_2026_03 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE analytics.events_2026_04 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE analytics.events_2026_05 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE analytics.events_2026_06 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE analytics.events_2026_07 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE analytics.events_2026_08 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

CREATE TABLE analytics.events_2026_09 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-09-01') TO ('2026-10-01');

CREATE TABLE analytics.events_2026_10 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-10-01') TO ('2026-11-01');

CREATE TABLE analytics.events_2026_11 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-11-01') TO ('2026-12-01');

CREATE TABLE analytics.events_2026_12 PARTITION OF analytics.events
    FOR VALUES FROM ('2026-12-01') TO ('2027-01-01');

-- Pre-aggregated dashboard metrics (populated by hourly worker job)
-- Avoids scanning the full events table for dashboard queries
CREATE TABLE analytics.analytics_aggregates (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    metric          TEXT        NOT NULL,                     -- 'product_views', 'add_to_cart', etc.
    dimension_json  JSONB       NOT NULL DEFAULT '{}',        -- e.g. {"product_id": "...", "date": "2026-02-23"}
    value           NUMERIC     NOT NULL,
    period          TEXT        NOT NULL,                     -- 'hourly', 'daily', 'weekly', 'monthly'
    period_start    TIMESTAMPTZ NOT NULL,
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_aggregate UNIQUE (metric, period, period_start, dimension_json)
);


-- =============================================================================
-- INDEXES — All performance-critical paths covered
-- =============================================================================

-- IAM
CREATE INDEX idx_users_email           ON iam.users (email);
CREATE INDEX idx_users_deleted         ON iam.users (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_admins_user_id        ON iam.admins (user_id);
CREATE INDEX idx_sessions_user_id      ON iam.sessions (user_id);
CREATE INDEX idx_sessions_expires      ON iam.sessions (expires_at) WHERE invalidated_at IS NULL;

-- Catalog
CREATE INDEX idx_products_category     ON catalog.products (category_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_products_active       ON catalog.products (active, deleted_at);
CREATE INDEX idx_products_slug         ON catalog.products (slug);
CREATE INDEX idx_product_images_product ON catalog.product_images (product_id);

-- Inventory
CREATE INDEX idx_variants_product      ON inventory.product_variants (product_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_units_variant_status  ON inventory.inventory_units (variant_id, status);
CREATE INDEX idx_movements_variant     ON inventory.inventory_movements (variant_id, created_at DESC);
CREATE INDEX idx_recon_variant         ON inventory.inventory_reconciliation_log (variant_id, detected_at DESC);

-- Cart
CREATE INDEX idx_carts_user            ON cart.carts (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_carts_session         ON cart.carts (session_id);
CREATE INDEX idx_carts_expires         ON cart.carts (expires_at) WHERE status = 'ACTIVE';
CREATE INDEX idx_cart_items_cart       ON cart.cart_items (cart_id);

-- Reservations (critical for expiry worker)
CREATE INDEX idx_reservations_expiry   ON cart.reservations (status, expires_at, worker_lock_id)
    WHERE status = 'HELD';
CREATE INDEX idx_reservations_user     ON cart.reservations (user_id) WHERE user_id IS NOT NULL;

-- Orders
CREATE INDEX idx_orders_user           ON orders.orders (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_orders_guest_email    ON orders.orders (guest_email) WHERE guest_email IS NOT NULL;
CREATE INDEX idx_orders_states         ON orders.orders (order_state, payment_state, fulfillment_state);
CREATE INDEX idx_orders_placed_at      ON orders.orders (placed_at DESC) WHERE placed_at IS NOT NULL;
CREATE INDEX idx_order_items_order     ON orders.order_items (order_id);
CREATE INDEX idx_order_items_variant   ON orders.order_items (variant_id);
CREATE INDEX idx_order_events_order    ON orders.order_events (order_id, created_at DESC);

-- Payments (idempotency lookups)
CREATE INDEX idx_payment_intents_order ON payments.payment_intents (order_id);
CREATE INDEX idx_payment_tx_order      ON payments.payment_transactions (order_id);

-- Returns
CREATE INDEX idx_returns_order         ON returns.return_requests (order_id);
CREATE INDEX idx_return_items_request  ON returns.return_request_items (return_request_id);

-- Reviews
CREATE INDEX idx_reviews_product       ON reviews.reviews (product_id);
CREATE INDEX idx_reviews_user          ON reviews.reviews (user_id);
CREATE INDEX idx_reviews_rating        ON reviews.reviews (rating) WHERE status = 'VISIBLE';
CREATE INDEX idx_review_flags_unresolved ON reviews.review_flags (review_id)
    WHERE resolved_at IS NULL;

-- Loyalty
CREATE INDEX idx_ledger_user_date      ON loyalty.loyalty_ledger (user_id, created_at DESC);
CREATE INDEX idx_accounts_tier         ON loyalty.loyalty_accounts (tier, tier_evaluated_at);
CREATE INDEX idx_accounts_activity     ON loyalty.loyalty_accounts (last_activity_at);

-- Messaging
CREATE INDEX idx_outbox_pending        ON messaging.notification_outbox (status, created_at)
    WHERE status = 'PENDING';
CREATE INDEX idx_inbox_user_unread     ON messaging.inbox_messages (user_id, created_at DESC)
    WHERE is_read = FALSE;
CREATE INDEX idx_bis_variant           ON messaging.back_in_stock_subscriptions (variant_id)
    WHERE notified_at IS NULL;
CREATE INDEX idx_notify_events_variant ON messaging.notify_me_events (variant_id, created_at DESC);
CREATE INDEX idx_campaign_deliveries   ON messaging.campaign_deliveries (campaign_id, status);

-- Analytics (per-partition indexes inherit automatically in PG15+)
CREATE INDEX idx_events_type_date      ON analytics.events (type, created_at DESC);
CREATE INDEX idx_events_user           ON analytics.events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX idx_events_session        ON analytics.events (session_id, created_at DESC);
CREATE INDEX idx_aggregates_metric     ON analytics.analytics_aggregates (metric, period, period_start DESC);


-- =============================================================================
-- SEED DATA — Minimum required to boot the application
-- =============================================================================

-- Default loyalty rules
INSERT INTO loyalty.loyalty_rules (
    earn_rate_json,
    redemption_rate_by_currency_json,
    tier_thresholds_json,
    multipliers_json,
    min_redeem,
    max_redeem_percent,
    no_stack_with_sale
) VALUES (
    -- 1 point per LKR 100; 1 point per SGD 1; 1 point per USD 1
    '{"LKR": {"points": 1, "per_amount": 100}, "SGD": {"points": 1, "per_amount": 1}, "USD": {"points": 1, "per_amount": 1}}',
    -- 100 points = LKR 150 / SGD 1.50 / USD 1.50
    '{"LKR": {"points": 100, "value": 150.00}, "SGD": {"points": 100, "value": 1.50}, "USD": {"points": 100, "value": 1.50}}',
    -- Tier thresholds (points earned in rolling 12 months)
    '{"BRONZE": 0, "SILVER": 1000, "GOLD": 5000}',
    -- Tier earn multipliers
    '{"BRONZE": 1.0, "SILVER": 1.25, "GOLD": 1.5}',
    200,    -- min_redeem (points)
    15.00,  -- max_redeem_percent (% of cart value)
    TRUE    -- no_stack_with_sale
);

-- Default shipping zones
INSERT INTO shipping.shipping_zones (id, name, countries_json) VALUES
    (gen_random_uuid(), 'Sri Lanka',     '["LK"]'),
    (gen_random_uuid(), 'Singapore',     '["SG"]'),
    (gen_random_uuid(), 'International', '["US","GB","AU","CA","DE","FR","JP","AE","IN"]');


-- =============================================================================
-- USEFUL VIEWS (application layer shortcuts)
-- =============================================================================

-- Active products with prices (storefront listing query base)
CREATE VIEW catalog.active_products_with_prices AS
    SELECT
        p.id,
        p.slug,
        p.display_name,
        p.short_name,
        p.description,
        p.fabric_info,
        p.product_code,
        p.is_sale,
        p.key_image_id,
        p.category_id,
        pp.lkr_amount,
        pp.sgd_amount,
        pp.usd_amount
    FROM catalog.products p
    JOIN catalog.product_prices pp ON pp.product_id = p.id
    WHERE p.active = TRUE
      AND p.deleted_at IS NULL;

-- Variant stock with low-stock flag (PDP + cart stock hints)
CREATE VIEW inventory.variant_availability AS
    SELECT
        pv.id AS variant_id,
        pv.product_id,
        pv.color,
        pv.size,
        vs.in_stock_qty,
        vs.held_qty,
        vs.available_qty,
        vs.low_stock_threshold,
        CASE
            WHEN vs.available_qty <= 0 THEN 'OUT_OF_STOCK'
            WHEN vs.available_qty <= vs.low_stock_threshold THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
        END AS stock_status
    FROM inventory.product_variants pv
    JOIN inventory.variant_stock vs ON vs.variant_id = pv.id
    WHERE pv.deleted_at IS NULL;

-- Pending reservation expiry candidates (used by expiry worker)
CREATE VIEW cart.reservations_due_for_expiry AS
    SELECT *
    FROM cart.reservations
    WHERE status = 'HELD'
      AND expires_at < now()
      AND (payment_submitted_at IS NULL OR grace_expires_at < now())
      AND worker_lock_id IS NULL;

-- Order summary view (admin dashboard)
CREATE VIEW orders.order_summary AS
    SELECT
        o.id,
        o.order_ref,
        o.user_id,
        o.guest_email,
        o.order_state,
        o.payment_state,
        o.fulfillment_state,
        o.return_state,
        o.currency,
        o.total,
        o.placed_at,
        o.created_at,
        COUNT(oi.id) AS item_count
    FROM orders.orders o
    LEFT JOIN orders.order_items oi ON oi.order_id = o.id
    GROUP BY o.id;

-- Notify-me demand ranking (admin dashboard — restocking priority)
CREATE VIEW messaging.notify_me_demand AS
    SELECT
        variant_id,
        COUNT(*) AS click_count,
        COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL) AS registered_user_count,
        MAX(created_at) AS last_click_at
    FROM messaging.notify_me_events
    GROUP BY variant_id
    ORDER BY click_count DESC;


-- =============================================================================
-- COMMENTS — Inline documentation for future developers
-- =============================================================================

COMMENT ON TABLE cart.reservations IS
    'Two-window checkout hold system.
     Window 1 (expires_at): 30 min from checkout start.
     Window 2 (grace_expires_at): payment_submitted_at + 10 min — protects in-flight payments.
     Expiry worker query: WHERE status=HELD AND expires_at < now() AND (payment_submitted_at IS NULL OR grace_expires_at < now()).
     worker_lock_id prevents double processing on worker crash/restart.';

COMMENT ON TABLE inventory.variant_stock IS
    'Cached aggregate for fast storefront reads.
     NEVER update directly. All mutations via atomic SQL:
     UPDATE variant_stock SET held_qty = held_qty + N WHERE available_qty >= N RETURNING *
     Check rows_affected = 0 → insufficient stock → return 409.
     Acquire Redis lock (lock:variant:{id} NX EX 5) BEFORE this UPDATE. Release in finally block.';

COMMENT ON TABLE payments.payment_transactions IS
    'provider_charge_id is UNIQUE at DB level — primary idempotency guard.
     Redis cache (24h TTL on event IDs) is the first layer; this is the second.
     ALWAYS verify HMAC signature from payment provider before processing webhook.';

COMMENT ON TABLE loyalty.loyalty_ledger IS
    'IMMUTABLE — append only. Never UPDATE or DELETE rows.
     Balance in loyalty_accounts is a cached sum; reconcile with SUM(points) on discrepancy.';

COMMENT ON TABLE analytics.events IS
    'Partitioned by RANGE (created_at), monthly partitions.
     New partition created by worker job on 25th of each preceding month.
     Do NOT use for dashboard queries — use analytics_aggregates instead.';

COMMENT ON TABLE returns.return_request_items IS
    'Partial unique index (uix_return_items_active) prevents duplicate active returns per item.
     Rejected returns can be re-submitted; application layer checks eligibility window.';

COMMENT ON COLUMN orders.orders.tax_rate_snapshot IS
    'Tax rate at time of purchase. e.g. 0.0900 = 9% GST (Singapore).
     Sri Lanka: 0.1800 = 18% VAT (prices shown inclusive; rate stored for accounting).
     USD orders: 0.0000 (no tax collected).';

COMMENT ON COLUMN orders.order_unit_allocations.scanned_by_name_snapshot IS
    'Admin full name captured at scan time. Preserved even if admin account is later suspended.
     Do not rely solely on scanned_by_admin_id FK for audit — use this snapshot.';
