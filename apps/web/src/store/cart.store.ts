/**
 * Cart state is managed by TanStack Query, not Zustand.
 *
 * To read the cart:           useCart()        → apps/web/src/hooks/useCart.ts
 * To read just the count:     useCartCount()   → apps/web/src/hooks/useCartCount.ts
 * To add / remove / update:   useCartMutations → apps/web/src/hooks/useCartMutations.ts
 *
 * This file is intentionally empty. Do not add Zustand state here
 * unless there is a specific piece of UI-only cart state that cannot
 * live in TanStack Query (e.g. a local "just added" flash state that
 * doesn't need to survive page refresh).
 */
