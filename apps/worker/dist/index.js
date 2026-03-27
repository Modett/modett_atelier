"use strict";
/**
 * Modett Worker — scheduled jobs (reservation expiry, etc.).
 * Separate Railway service; same codebase as API, different entry point.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const expireReservations_1 = require("./jobs/expireReservations");
const EXPIRY_INTERVAL_MS = 60 * 1000; // 60 seconds
console.log('Modett Worker starting...');
async function runExpiry() {
    try {
        await (0, expireReservations_1.expireReservations)();
    }
    catch (err) {
        console.error('[worker] expireReservations top-level error:', err);
    }
}
runExpiry();
setInterval(runExpiry, EXPIRY_INTERVAL_MS);
process.on('SIGTERM', () => {
    console.log('Worker shutting down...');
    process.exit(0);
});
