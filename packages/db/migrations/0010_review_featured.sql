-- Add admin-controlled featured flag to reviews
-- Featured reviews appear in the homepage "In Their Own Words" section
ALTER TABLE reviews.reviews
  ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_reviews_featured
  ON reviews.reviews (featured)
  WHERE featured = TRUE;
