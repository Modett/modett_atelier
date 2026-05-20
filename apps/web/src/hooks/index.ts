// Auth
export { useSession, useInvalidateSession } from './useSession'
export { useAdminSession, ADMIN_SESSION_KEY } from './useAdminSession'
export * from './useAdminDashboard'
export * from './useAdminOrders'
export * from './useAdminSettings'
export { useLogin }                         from './useLogin'
export { useRegister }                      from './useRegister'
export { useLogout }                        from './useLogout'

// Currency / Geo
export {
  useGeo,
  useCurrency,
  formatMoney,
  getCurrencyCookie,
  getCountryCookie,
} from './useCurrency'

// Catalog
export { useCategories, CATEGORIES_QUERY_KEY } from './useCategories'
export { useProducts, flattenProducts }        from './useProducts'
export { useProductSearch }                    from './useProductSearch'
export { useProduct }                          from './useProduct'
export { useProductReviews }                   from './useProductReviews'
export {
  useReviewTokenStatus,
  useMyReviews,
  useSubmitReview,
} from './useReviews'
export type { SubmitReviewInput } from './useReviews'
export {
  useAdminReviewsList,
  useHideReview,
  useShowReview,
  useFlagReview,
  useResolveFlag,
  ADMIN_REVIEWS_KEYS,
} from './useAdminReviews'
export type { AdminReviewsListParams } from './useAdminReviews'
export {
  useAdminCampaignsList,
  useAdminCampaignDetail,
  useAudienceEstimate,
  useCreateCampaign,
  useUpdateCampaign,
  useScheduleCampaign,
  useCancelCampaign,
  useSendTestEmail,
  useSendCampaignNow,
  useUploadCampaignAsset,
  ADMIN_CAMPAIGNS_KEYS,
} from './useAdminMessaging'
export type {
  AdminCampaignRow,
  AdminCampaignsListParams,
  CampaignStatusFilter,
  UploadAssetResponse,
} from './useAdminMessaging'
export {
  useAdminLoyaltyUserSearch,
  useAdminUserLoyalty,
  useAdminLoyaltyRules,
  useAdminLoyaltyTopUsers,
  useGrantPoints,
  useAdjustPoints,
  useReEvaluateTier,
  useReconcileBalance,
  useUpdateLoyaltyRules,
  ADMIN_LOYALTY_KEYS,
} from './useAdminLoyalty'
export { useHomepage }                         from './useHomepage'

// Admin reports (web-only; use @/hooks — not packages/hooks)
export {
  useReportSellers,
  useReportMostViewed,
  useReportCartAbandonment,
  useReportReturns,
  useReportTraffic,
  useReportColorsSizes,
  useReportGuestVsRegistered,
  useReportWishlist,
  useReportFunnel,
  useReportTimeSeries,
  useReportTimeSeriesByDimension,
} from './useReports'
export type { ReportPeriod } from './useReports'

// Cart
export { useCart, CART_QUERY_KEY }             from './useCart'
export { useCartCount }                        from './useCartCount'
export {
  useAddToCart,
  useUpdateCartQty,
  useRemoveFromCart,
  useClearCart,
}                                              from './useCartMutations'

// Wishlist
export {
  useWishlist,
  useIsWishlisted,
  useToggleWishlist,
  WISHLIST_QUERY_KEY,
}                                              from './useWishlist'

// Shipping
export {
  useShippingEstimate,
  SHIPPING_ESTIMATE_KEY,
}                                              from './useShippingEstimate'

// Analytics dashboard
export {
  useAnalyticsToday,
  useAnalyticsRevenue,
  useAnalyticsFunnel,
  useAnalyticsRevenueByCurrency,
  useAnalyticsTimeSeries,
  ANALYTICS_KEYS,
} from './useAnalyticsDashboard'

// Audit log
export { useAuditLog, useAdminAdminsList, AUDIT_LOG_KEYS } from './useAuditLog'

// Customer lookup
export {
  useAdminCustomerSearch,
  useAdminCustomerDetail,
  ADMIN_CUSTOMER_KEYS,
} from './useAdminCustomers'
export type { AdminCustomerDetailPayload } from './useAdminCustomers'

// Admin notification center
export {
  useAdminNotificationsSummary,
  useAdminNotificationsFeed,
  ADMIN_NOTIFICATION_KEYS,
} from './useAdminNotifications'

// Saved (tokenized) cards
export {
  useSavedCards,
  useDeleteSavedCard,
  useSetDefaultSavedCard,
  usePayWithSavedCard,
  SAVED_CARDS_QUERY_KEY,
} from './useSavedCards'
export type { SavedCardSummary } from './useSavedCards'

// Account
export {
  useOrders,
  useOrder,
  useSavedAddresses,
  useAddAddress,
  useUpdateAddress,
  useDeleteAddress,
  useLoyalty,
  useLoyaltyLedger,
  useInbox,
  useUnreadCount,
  useMarkMessageRead,
  useMarkAllRead,
  INBOX_UNREAD_COUNT_KEY,
  useUpdateProfile,
  useChangePassword,
  useSubmitReturn,
  RETURN_POLICY_VERSION,
} from './useAccount'
export type {
  OrderSummaryRow,
  OrderDetailPayload,
  OrderItemRow,
  SavedAddressRow,
  LoyaltyAccountData,
  LoyaltyLedgerRow,
  InboxMessageRow,
  SubmitReturnInput,
} from './useAccount'
