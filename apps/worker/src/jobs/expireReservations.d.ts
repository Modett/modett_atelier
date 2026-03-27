/**
 * Reservation expiry job — runs every 60s.
 * Finds reservations due for expiry (two-window check via view),
 * claims atomically, releases stock holds, stamps hold_released_at.
 * Does NOT send emails or correct stock drift; reconciliation worker flags drift.
 */
export declare function expireReservations(): Promise<void>;
//# sourceMappingURL=expireReservations.d.ts.map