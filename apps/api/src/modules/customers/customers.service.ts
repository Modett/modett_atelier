/**
 * Admin customer lookup — orchestration only.
 */

import {
  getUserById,
  listSavedAddresses,
  getNotificationPreferences,
  getLoyaltyAccount,
  listAdminCustomerOrders,
  listAdminCustomerReviews,
  listAdminCustomerReturns,
  listLoyaltyLedgerForUser,
  searchAdminCustomers,
} from '@modett/db'
import { AppError } from '../../lib/errors'

function publicUser(user: NonNullable<Awaited<ReturnType<typeof getUserById>>>) {
  const { passwordHash: _p, ...rest } = user
  return rest
}

export async function adminSearchCustomers({
  q,
  page,
  limit,
}: {
  q: string
  page: number
  limit: number
}) {
  return searchAdminCustomers({ q, page, limit })
}

export async function adminGetCustomerDetail({ userId }: { userId: string }) {
  const user = await getUserById({ id: userId })
  if (!user) throw new AppError('USER_NOT_FOUND', 404)

  const [
    loyaltyAccount,
    orders,
    reviews,
    returns,
    addresses,
    preferences,
    ledger,
  ] = await Promise.all([
    getLoyaltyAccount({ userId }),
    listAdminCustomerOrders({ userId, limit: 10 }),
    listAdminCustomerReviews({ userId, limit: 5 }),
    listAdminCustomerReturns({ userId }),
    listSavedAddresses({ userId }),
    getNotificationPreferences({ userId }),
    listLoyaltyLedgerForUser({ userId, limit: 10 }),
  ])

  return {
    user: publicUser(user),
    loyalty: {
      account: loyaltyAccount,
      ledger,
    },
    orders,
    reviews,
    returns,
    addresses,
    preferences,
  }
}
