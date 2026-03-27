"use strict";
/**
 * Loyalty query functions — accounts, ledger, rules, grants, balance mutations.
 * No business logic. RORO. Balance mutations use withLoyaltyLock + db.transaction();
 * ledger INSERT + accounts UPDATE in same tx. Never UPDATE/DELETE ledger rows.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withLoyaltyLock = withLoyaltyLock;
exports.createLoyaltyAccount = createLoyaltyAccount;
exports.getLoyaltyAccount = getLoyaltyAccount;
exports.getLoyaltyAccountOrThrow = getLoyaltyAccountOrThrow;
exports.getLoyaltyRules = getLoyaltyRules;
exports.updateLoyaltyRules = updateLoyaltyRules;
exports.getLedgerForUser = getLedgerForUser;
exports.getRolling12MonthEarned = getRolling12MonthEarned;
exports.reconcileBalance = reconcileBalance;
exports.earnPoints = earnPoints;
exports.redeemPoints = redeemPoints;
exports.adjustPoints = adjustPoints;
exports.grantPoints = grantPoints;
exports.updateTier = updateTier;
const node_crypto_1 = require("node:crypto");
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const redis_1 = require("../redis");
const loyalty_1 = require("../schema/loyalty");
const errors_1 = require("../errors");
// —— Lock helper (RULE 3) ——
async function withLoyaltyLock(userId, fn) {
    const key = `lock:loyalty:${userId}`;
    const lockId = (0, node_crypto_1.randomUUID)();
    const acquired = await redis_1.redis.set(key, lockId, 'EX', 5, 'NX');
    if (!acquired) {
        throw new errors_1.LoyaltyLockNotAcquiredError();
    }
    try {
        return await fn();
    }
    finally {
        await redis_1.redis.eval(`if redis.call('get', KEYS[1]) == ARGV[1]
       then return redis.call('del', KEYS[1])
       else return 0
       end`, 1, key, lockId);
    }
}
// —— Account queries ——
async function createLoyaltyAccount({ userId, }) {
    await client_1.db
        .insert(loyalty_1.loyaltyAccounts)
        .values({
        user_id: userId,
        balance: 0,
        lifetime_earned: 0,
        tier: 'BRONZE',
    })
        .onConflictDoNothing({ target: loyalty_1.loyaltyAccounts.user_id });
}
async function getLoyaltyAccount({ userId, }) {
    const rows = await client_1.db
        .select()
        .from(loyalty_1.loyaltyAccounts)
        .where((0, drizzle_orm_1.eq)(loyalty_1.loyaltyAccounts.user_id, userId));
    return rows[0] ?? null;
}
async function getLoyaltyAccountOrThrow({ userId, }) {
    const account = await getLoyaltyAccount({ userId });
    if (!account)
        throw new errors_1.LoyaltyAccountNotFoundError();
    return account;
}
// —— Rules query ——
async function getLoyaltyRules() {
    const rows = await client_1.db
        .select()
        .from(loyalty_1.loyaltyRules)
        .orderBy((0, drizzle_orm_1.desc)(loyalty_1.loyaltyRules.updated_at))
        .limit(1);
    const row = rows[0];
    if (!row)
        throw new errors_1.LoyaltyRulesNotFoundError(500);
    return row;
}
async function updateLoyaltyRules({ earnRateJson, redemptionRateByCurrencyJson, tierThresholdsJson, multipliersJson, minRedeem, maxRedeemPercent, noStackWithSale, updatedByAdminId, }) {
    const updates = {
        updated_at: new Date(),
        updated_by_admin_id: updatedByAdminId,
    };
    if (earnRateJson !== undefined)
        updates.earn_rate_json = earnRateJson;
    if (redemptionRateByCurrencyJson !== undefined)
        updates.redemption_rate_by_currency_json = redemptionRateByCurrencyJson;
    if (tierThresholdsJson !== undefined)
        updates.tier_thresholds_json = tierThresholdsJson;
    if (multipliersJson !== undefined)
        updates.multipliers_json = multipliersJson;
    if (minRedeem !== undefined)
        updates.min_redeem = minRedeem;
    if (maxRedeemPercent !== undefined)
        updates.max_redeem_percent = String(maxRedeemPercent);
    if (noStackWithSale !== undefined)
        updates.no_stack_with_sale = noStackWithSale;
    const result = await client_1.db
        .update(loyalty_1.loyaltyRules)
        .set(updates)
        .returning();
    if (result.length === 0)
        throw new errors_1.LoyaltyRulesNotFoundError(404);
    return result[0];
}
async function getLedgerForUser({ userId, page = 1, limit = 20, type: ledgerType, }) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (page - 1) * safeLimit;
    const countResult = ledgerType === undefined
        ? await client_1.db.execute((0, drizzle_orm_1.sql) `
          SELECT COUNT(*)::int AS total
          FROM loyalty.loyalty_ledger
          WHERE user_id = ${userId}
        `)
        : await client_1.db.execute((0, drizzle_orm_1.sql) `
          SELECT COUNT(*)::int AS total
          FROM loyalty.loyalty_ledger
          WHERE user_id = ${userId}
            AND type = ${ledgerType}
        `);
    const total = countResult.rows[0]?.total ?? 0;
    const where = ledgerType === undefined
        ? (0, drizzle_orm_1.eq)(loyalty_1.loyaltyLedger.user_id, userId)
        : (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(loyalty_1.loyaltyLedger.user_id, userId), (0, drizzle_orm_1.eq)(loyalty_1.loyaltyLedger.type, ledgerType));
    const ledger = await client_1.db
        .select()
        .from(loyalty_1.loyaltyLedger)
        .where(where)
        .orderBy((0, drizzle_orm_1.desc)(loyalty_1.loyaltyLedger.created_at))
        .limit(safeLimit)
        .offset(offset);
    return { ledger, page, limit: safeLimit, total };
}
async function getRolling12MonthEarned({ userId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT COALESCE(SUM(points), 0)::int AS earned
    FROM loyalty.loyalty_ledger
    WHERE user_id = ${userId}
      AND type IN ('EARN', 'BONUS')
      AND points > 0
      AND created_at >= now() - INTERVAL '12 months'
  `);
    const row = result.rows[0];
    return row?.earned ?? 0;
}
async function reconcileBalance({ userId, }) {
    return withLoyaltyLock(userId, async () => {
        const sumResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
      SELECT COALESCE(SUM(points), 0)::int AS ledger_sum
      FROM loyalty.loyalty_ledger
      WHERE user_id = ${userId}
    `);
        const ledgerSum = sumResult.rows[0]?.ledger_sum ?? 0;
        const updateResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE loyalty.loyalty_accounts
      SET balance = ${ledgerSum}, last_activity_at = now()
      WHERE user_id = ${userId}
      RETURNING balance
    `);
        if (updateResult.rows.length === 0)
            throw new errors_1.LoyaltyAccountNotFoundError();
        const correctedBalance = updateResult.rows[0]
            .balance;
        return { correctedBalance, ledgerSum };
    });
}
// —— Balance mutation queries (all use withLoyaltyLock + db.transaction) ——
async function earnPoints({ userId, points, orderId, metadataJson, }) {
    return withLoyaltyLock(userId, async () => {
        return client_1.db.transaction(async (tx) => {
            await tx.insert(loyalty_1.loyaltyLedger).values({
                user_id: userId,
                type: 'EARN',
                points,
                order_id: orderId ?? null,
                metadata_json: metadataJson ?? {},
            });
            const result = await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE loyalty.loyalty_accounts
        SET balance = balance + ${points},
            lifetime_earned = lifetime_earned + ${points},
            last_activity_at = now()
        WHERE user_id = ${userId}
        RETURNING balance
      `);
            if (result.rows.length === 0)
                throw new errors_1.LoyaltyAccountNotFoundError();
            return {
                newBalance: result.rows[0].balance,
            };
        });
    });
}
async function redeemPoints({ userId, points, orderId, metadataJson, }) {
    return withLoyaltyLock(userId, async () => {
        return client_1.db.transaction(async (tx) => {
            await tx.insert(loyalty_1.loyaltyLedger).values({
                user_id: userId,
                type: 'REDEEM',
                points: -points,
                order_id: orderId,
                metadata_json: metadataJson ?? {},
            });
            const result = await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE loyalty.loyalty_accounts
        SET balance = balance - ${points},
            last_activity_at = now()
        WHERE user_id = ${userId}
          AND balance >= ${points}
        RETURNING balance
      `);
            if (result.rows.length === 0)
                throw new errors_1.InsufficientPointsError();
            return {
                newBalance: result.rows[0].balance,
            };
        });
    });
}
async function adjustPoints({ userId, points, reason, adminId, }) {
    return withLoyaltyLock(userId, async () => {
        return client_1.db.transaction(async (tx) => {
            const balanceRow = await tx.execute((0, drizzle_orm_1.sql) `
        SELECT balance FROM loyalty.loyalty_accounts
        WHERE user_id = ${userId}
        FOR UPDATE
      `);
            const balanceResult = balanceRow.rows[0];
            if (!balanceResult)
                throw new errors_1.LoyaltyAccountNotFoundError();
            const balance = balanceResult.balance;
            if (balance + points < 0)
                throw new errors_1.BalanceWouldGoNegativeError();
            await tx.insert(loyalty_1.loyaltyLedger).values({
                user_id: userId,
                type: 'ADJUST',
                points,
                order_id: null,
                metadata_json: { reason, adminId },
            });
            const result = await tx.execute((0, drizzle_orm_1.sql) `
        UPDATE loyalty.loyalty_accounts
        SET balance = balance + ${points},
            last_activity_at = now()
        WHERE user_id = ${userId}
        RETURNING balance
      `);
            if (result.rows.length === 0)
                throw new errors_1.LoyaltyAccountNotFoundError();
            return {
                newBalance: result.rows[0].balance,
            };
        });
    });
}
async function grantPoints({ userId, points, reason, adminId, }) {
    const [grantRow] = await client_1.db
        .insert(loyalty_1.loyaltyGrants)
        .values({
        user_id: userId,
        points,
        reason,
        granted_by_admin_id: adminId,
    })
        .returning({ id: loyalty_1.loyaltyGrants.id });
    const grantId = grantRow?.id;
    return earnPoints({
        userId,
        points,
        orderId: null,
        metadataJson: {
            type: 'admin_grant',
            grantId,
            reason,
        },
    });
}
async function updateTier({ userId, }) {
    const earned12m = await getRolling12MonthEarned({ userId });
    const rules = await getLoyaltyRules();
    const thresholds = rules.tier_thresholds_json;
    const newTier = earned12m >= thresholds.GOLD
        ? 'GOLD'
        : earned12m >= thresholds.SILVER
            ? 'SILVER'
            : 'BRONZE';
    const result = await client_1.db
        .update(loyalty_1.loyaltyAccounts)
        .set({
        tier: newTier,
        tier_evaluated_at: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(loyalty_1.loyaltyAccounts.user_id, userId))
        .returning({ tier: loyalty_1.loyaltyAccounts.tier });
    if (result.length === 0)
        throw new errors_1.LoyaltyAccountNotFoundError();
    return {
        newTier: result[0].tier,
        earned12m,
    };
}
