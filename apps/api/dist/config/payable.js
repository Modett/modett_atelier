"use strict";
/**
 * PAYable IPG config — check_value generation and webhook verification.
 * Credentials from env; never hard-coded.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payableConfig = void 0;
exports.generateCheckValue = generateCheckValue;
exports.verifyCallbackCheckValue = verifyCallbackCheckValue;
const node_crypto_1 = __importDefault(require("node:crypto"));
const sha512 = (s) => node_crypto_1.default.createHash('sha512').update(s).digest('hex').toUpperCase();
exports.payableConfig = {
    merchantKey: process.env.PAYABLE_MERCHANT_KEY ?? '',
    merchantToken: process.env.PAYABLE_MERCHANT_TOKEN ?? '',
    sandboxMode: process.env.NODE_ENV !== 'production',
};
function generateCheckValue({ invoiceId, amount, currencyCode, }) {
    const { merchantKey, merchantToken } = exports.payableConfig;
    const tokenHash = sha512(merchantToken);
    return sha512(`${merchantKey}|${invoiceId}|${amount}|${currencyCode}|${tokenHash}`);
}
function verifyCallbackCheckValue(payload) {
    const { merchantToken } = exports.payableConfig;
    const tokenHash = sha512(merchantToken);
    const expected = sha512(`${payload.merchantKey}|` +
        `${payload.payableOrderId}|` +
        `${payload.payableTransactionId}|` +
        `${payload.payableAmount}|` +
        `${payload.payableCurrency}|` +
        `${payload.invoiceNo}|` +
        `${payload.statusCode}|` +
        tokenHash);
    return expected === payload.checkValue;
}
//# sourceMappingURL=payable.js.map