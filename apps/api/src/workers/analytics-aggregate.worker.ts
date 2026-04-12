/**
 * Hourly roll-up of raw analytics.events into analytics.analytics_aggregates.
 * Idempotent: INSERT ... ON CONFLICT DO UPDATE.
 */

import { sql } from 'drizzle-orm'
import { db } from '@modett/db'

const ON_AGG = sql`
  ON CONFLICT (metric, period, period_start, dimension_json)
  DO UPDATE SET value = EXCLUDED.value, computed_at = now()`

export async function runAnalyticsAggregation(): Promise<void> {
  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'product_views', jsonb_build_object('product_id', product_id),
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT payload_json->>'productId' AS product_id,
             date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'PRODUCT_VIEW'
        AND created_at >= now() - interval '2 hours'
    ) s
    WHERE product_id IS NOT NULL AND btrim(product_id) != ''
    GROUP BY product_id, day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'add_to_cart',
           jsonb_build_object(
             'product_id', product_id,
             'color', color,
             'size', size
           ),
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT payload_json->>'productId' AS product_id,
             payload_json->>'color' AS color,
             payload_json->>'size' AS size,
             date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'ADD_TO_CART'
        AND created_at >= now() - interval '2 hours'
    ) s
    WHERE product_id IS NOT NULL AND btrim(product_id) != ''
    GROUP BY product_id, color, size, day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'purchases',
           jsonb_build_object(
             'product_id', item->>'productId',
             'color', item->>'color',
             'size', item->>'size'
           ),
           SUM((item->>'qty')::int)::numeric,
           'daily',
           date_trunc('day', created_at)
    FROM analytics.events,
         jsonb_array_elements(payload_json->'items') AS item
    WHERE type = 'PURCHASE_COMPLETE'
      AND created_at >= now() - interval '2 hours'
      AND jsonb_typeof(payload_json->'items') = 'array'
    GROUP BY item->>'productId', item->>'color', item->>'size', date_trunc('day', created_at)
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'traffic_source',
           jsonb_build_object('source', src, 'utm_source', utm_src),
           COUNT(DISTINCT session_id)::numeric, 'daily', day_start
    FROM (
      SELECT session_id,
             date_trunc('day', created_at) AS day_start,
             COALESCE(
               nullif(btrim(payload_json->'utmParams'->>'utm_source'), ''),
               CASE
                 WHEN payload_json->>'referrer' ILIKE '%google%' THEN 'google'
                 WHEN payload_json->>'referrer' ILIKE '%facebook%' THEN 'facebook'
                 WHEN payload_json->>'referrer' ILIKE '%instagram%' THEN 'instagram'
                 WHEN payload_json->>'referrer' ILIKE '%tiktok%' THEN 'tiktok'
                 WHEN coalesce(payload_json->>'referrer', '') = '' THEN 'direct'
                 ELSE 'other'
               END
             ) AS utm_src,
             CASE
               WHEN payload_json->>'referrer' ILIKE '%google%' THEN 'google'
               WHEN payload_json->>'referrer' ILIKE '%facebook%' THEN 'facebook'
               WHEN payload_json->>'referrer' ILIKE '%instagram%' THEN 'instagram'
               WHEN payload_json->>'referrer' ILIKE '%tiktok%' THEN 'tiktok'
               WHEN coalesce(payload_json->>'referrer', '') = '' THEN 'direct'
               WHEN payload_json->>'referrer' IS NULL THEN 'direct'
               ELSE 'other'
             END AS src
      FROM analytics.events
      WHERE type = 'PAGE_VIEW'
        AND created_at >= now() - interval '2 hours'
    ) x
    GROUP BY src, utm_src, day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'device_type',
           jsonb_build_object('device_type', coalesce(device_type, 'unknown')),
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT device_type, date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'PAGE_VIEW'
        AND created_at >= now() - interval '2 hours'
    ) s
    GROUP BY device_type, day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'wishlist_adds',
           jsonb_build_object('product_id', product_id),
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT payload_json->>'productId' AS product_id,
             date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'WISHLIST_ADD'
        AND created_at >= now() - interval '2 hours'
    ) s
    WHERE product_id IS NOT NULL AND btrim(product_id) != ''
    GROUP BY product_id, day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'checkout_starts', '{}'::jsonb,
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'CHECKOUT_START'
        AND created_at >= now() - interval '2 hours'
    ) s
    GROUP BY day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'purchase_count', '{}'::jsonb,
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'PURCHASE_COMPLETE'
        AND created_at >= now() - interval '2 hours'
    ) s
    GROUP BY day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'user_type_purchase',
           jsonb_build_object('user_type', user_type),
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT CASE WHEN user_id IS NULL THEN 'guest' ELSE 'registered' END AS user_type,
             date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'PURCHASE_COMPLETE'
        AND created_at >= now() - interval '2 hours'
    ) s
    GROUP BY user_type, day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'account_creations', '{}'::jsonb,
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'ACCOUNT_CREATED'
        AND created_at >= now() - interval '2 hours'
    ) s
    GROUP BY day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'variant_select_color',
           jsonb_build_object('color', color),
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT payload_json->>'color' AS color,
             date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'VARIANT_SELECT'
        AND created_at >= now() - interval '2 hours'
    ) s
    WHERE color IS NOT NULL AND btrim(color) != ''
    GROUP BY color, day_start
    ${ON_AGG}
  `)

  await db.execute(sql`
    INSERT INTO analytics.analytics_aggregates (metric, dimension_json, value, period, period_start)
    SELECT 'variant_select_size',
           jsonb_build_object('size', size),
           COUNT(*)::numeric, 'daily', day_start
    FROM (
      SELECT payload_json->>'size' AS size,
             date_trunc('day', created_at) AS day_start
      FROM analytics.events
      WHERE type = 'VARIANT_SELECT'
        AND created_at >= now() - interval '2 hours'
    ) s
    WHERE size IS NOT NULL AND btrim(size) != ''
    GROUP BY size, day_start
    ${ON_AGG}
  `)
}
