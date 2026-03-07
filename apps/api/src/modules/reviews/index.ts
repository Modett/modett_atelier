/**
 * Reviews module — token-gated verified reviews, moderation, aggregates.
 * Export routes and generateTokensAfterDelivery for Orders module (post-delivery hook).
 */

export { default as reviewsRoutes } from './reviews.routes'
export { generateTokensAfterDelivery } from './reviews.service'
