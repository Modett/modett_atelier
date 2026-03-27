"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.payableConfig = void 0;
exports.generateCheckValue = generateCheckValue;
exports.verifyCallbackCheckValue = verifyCallbackCheckValue;
exports.toAlpha3 = toAlpha3;
const node_crypto_1 = __importDefault(require("node:crypto"));
const sha512 = (s) => node_crypto_1.default.createHash('sha512').update(s).digest('hex').toUpperCase();
exports.payableConfig = {
    merchantKey: process.env.PAYABLE_MERCHANT_KEY ?? '',
    merchantToken: process.env.PAYABLE_MERCHANT_TOKEN ?? '',
    apiUrl: process.env.API_URL ?? 'http://localhost:3001',
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
    logoUrl: process.env.PAYABLE_LOGO_URL ?? '',
    get sandboxMode() {
        return process.env.NODE_ENV !== 'production';
    },
};
if (!exports.payableConfig.merchantKey || !exports.payableConfig.merchantToken) {
    console.error('⚠️  PAYABLE_MERCHANT_KEY or PAYABLE_MERCHANT_TOKEN not set in .env');
}
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
        `${String(payload.statusCode)}|` +
        tokenHash);
    return expected === payload.checkValue;
}
const ALPHA2_TO_ALPHA3 = {
    LK: 'LKA', SG: 'SGP', US: 'USA', GB: 'GBR',
    AU: 'AUS', CA: 'CAN', DE: 'DEU', FR: 'FRA',
    JP: 'JPN', AE: 'ARE', IN: 'IND',
};
function toAlpha3(alpha2) {
    return ALPHA2_TO_ALPHA3[alpha2.toUpperCase()] ?? 'LKA';
}
