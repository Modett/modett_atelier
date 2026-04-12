-- Ensure color_hex column exists (idempotent; covers DBs missing 0004)
ALTER TABLE inventory.product_variants
  ADD COLUMN IF NOT EXISTS color_hex TEXT;

-- Backfill variant_stock for variants missing a row (variant_availability view requires JOIN)
INSERT INTO inventory.variant_stock (variant_id, in_stock_qty, held_qty, low_stock_threshold)
SELECT pv.id, 0, 0, 3
FROM inventory.product_variants pv
WHERE pv.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM inventory.variant_stock vs WHERE vs.variant_id = pv.id
  );
