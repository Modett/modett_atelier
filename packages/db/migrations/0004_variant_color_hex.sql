-- Add optional colour hex for admin / storefront swatches
ALTER TABLE inventory.product_variants
  ADD COLUMN IF NOT EXISTS color_hex TEXT;
