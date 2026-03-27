"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveShippingCost = resolveShippingCost;
exports.getMethodsForCheckout = getMethodsForCheckout;
exports.getMethodForOrder = getMethodForOrder;
exports.adminGetAllZones = adminGetAllZones;
exports.adminGetZone = adminGetZone;
exports.adminCreateZone = adminCreateZone;
exports.adminUpdateZone = adminUpdateZone;
exports.adminAddCountryToZone = adminAddCountryToZone;
exports.adminRemoveCountryFromZone = adminRemoveCountryFromZone;
exports.adminDeleteZone = adminDeleteZone;
exports.adminGetMethodsForZone = adminGetMethodsForZone;
exports.adminCreateMethod = adminCreateMethod;
exports.adminUpdateMethod = adminUpdateMethod;
exports.adminActivateMethod = adminActivateMethod;
exports.adminDeactivateMethod = adminDeactivateMethod;
exports.adminDeleteMethod = adminDeleteMethod;
exports.resolveShippingCostWithThreshold = resolveShippingCostWithThreshold;
exports.getShippingEstimate = getShippingEstimate;
exports.adminGetShippingSettings = adminGetShippingSettings;
exports.adminUpdateShippingSettings = adminUpdateShippingSettings;
const decimal_js_1 = __importDefault(require("decimal.js"));
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
function resolveShippingCost({ method, currency, }) {
    if (method.rate_type === 'FREE') {
        return { amount: '0.00', currency };
    }
    if (method.rate_type === 'CALCULATED') {
        return null;
    }
    if (method.rate_type === 'FLAT') {
        const raw = currency === 'LKR'
            ? method.flat_rate_lkr
            : currency === 'SGD'
                ? method.flat_rate_sgd
                : method.flat_rate_usd;
        if (raw == null)
            throw new errors_1.AppError('RATE_NOT_SET_FOR_CURRENCY', 400);
        return { amount: new decimal_js_1.default(raw).toFixed(2), currency };
    }
    return null;
}
async function getMethodsForCheckout({ countryCode, currency, subtotal, }) {
    if (!subtotal) {
        const methods = await (0, db_1.getMethodsForCountry)({ countryCode });
        return methods.map((method) => {
            const cost = resolveShippingCost({ method, currency });
            return {
                id: method.id,
                name: method.name,
                carrier: method.carrier ?? null,
                estimatedDays: method.estimated_days ?? null,
                rateType: method.rate_type,
                cost,
            };
        });
    }
    const settings = await (0, db_1.getShippingSettings)();
    const methods = await (0, db_1.getMethodsForCountry)({ countryCode });
    return Promise.all(methods.map(async (method) => {
        const resolved = await resolveShippingCostWithThreshold({
            method,
            currency,
            subtotal,
            settings,
        });
        return {
            id: method.id,
            name: method.name,
            carrier: method.carrier ?? null,
            estimatedDays: method.estimated_days ?? null,
            rateType: method.rate_type,
            cost: resolved,
        };
    }));
}
async function getMethodForOrder({ methodId, currency, }) {
    const method = await (0, db_1.getActiveMethodById)({ id: methodId });
    if (!method)
        throw new errors_1.AppError('SHIPPING_METHOD_NOT_FOUND', 404);
    const cost = resolveShippingCost({ method, currency });
    return { method, cost };
}
async function adminGetAllZones() {
    const zones = await (0, db_1.getAllZones)();
    const result = [];
    for (const zone of zones) {
        const methods = await (0, db_1.getMethodsForZone)({
            zoneId: zone.id,
            includeInactive: true,
        });
        const countries = Array.isArray(zone.countries_json)
            ? zone.countries_json
            : [];
        result.push({
            id: zone.id,
            name: zone.name,
            countries,
            createdAt: zone.created_at,
            methods,
        });
    }
    return result;
}
async function adminGetZone({ id, }) {
    const zone = await (0, db_1.getZoneById)({ id });
    if (!zone)
        throw new errors_1.AppError('SHIPPING_ZONE_NOT_FOUND', 404);
    const methods = await (0, db_1.getMethodsForZone)({
        zoneId: id,
        includeInactive: true,
    });
    const countries = Array.isArray(zone.countries_json)
        ? zone.countries_json
        : [];
    return { zone, countries, methods };
}
const COUNTRY_CODE_REGEX = /^[A-Z]{2}$/;
async function adminCreateZone({ name, countries, }) {
    for (const code of countries) {
        if (!COUNTRY_CODE_REGEX.test(code)) {
            throw new errors_1.AppError('INVALID_COUNTRY_CODE', 400);
        }
    }
    for (const countryCode of countries) {
        const existing = await (0, db_1.getZoneByCountryCode)({ countryCode });
        if (existing) {
            throw new errors_1.AppError('COUNTRY_ALREADY_IN_ZONE', 409, `Country ${countryCode} already in zone ${existing.id}`);
        }
    }
    return (0, db_1.createZone)({ name, countriesJson: countries });
}
async function adminUpdateZone({ id, name, }) {
    return (0, db_1.updateZoneName)({ id, name });
}
async function adminAddCountryToZone({ zoneId, countryCode, }) {
    if (!COUNTRY_CODE_REGEX.test(countryCode)) {
        throw new errors_1.AppError('INVALID_COUNTRY_CODE', 400);
    }
    await (0, db_1.addCountryToZone)({ zoneId, countryCode });
}
async function adminRemoveCountryFromZone({ zoneId, countryCode, }) {
    await (0, db_1.removeCountryFromZone)({ zoneId, countryCode });
}
async function adminDeleteZone({ id }) {
    await (0, db_1.deleteZone)({ id });
}
async function adminGetMethodsForZone({ zoneId, includeInactive = false, }) {
    return (0, db_1.getMethodsForZone)({ zoneId, includeInactive });
}
async function adminCreateMethod({ zoneId, name, carrier, rateType, flatRateLkr, flatRateSgd, flatRateUsd, estimatedDays, }) {
    const zone = await (0, db_1.getZoneById)({ id: zoneId });
    if (!zone)
        throw new errors_1.AppError('SHIPPING_ZONE_NOT_FOUND', 404);
    if (rateType === 'FLAT') {
        if (flatRateLkr == null ||
            flatRateSgd == null ||
            flatRateUsd == null ||
            flatRateLkr < 0 ||
            flatRateSgd < 0 ||
            flatRateUsd < 0) {
            throw new errors_1.AppError('FLAT_RATE_INCOMPLETE', 400);
        }
    }
    const method = await (0, db_1.createMethod)({
        zoneId,
        name,
        carrier,
        rateType,
        flatRateLkr: rateType === 'FLAT' && flatRateLkr != null ? String(flatRateLkr) : null,
        flatRateSgd: rateType === 'FLAT' && flatRateSgd != null ? String(flatRateSgd) : null,
        flatRateUsd: rateType === 'FLAT' && flatRateUsd != null ? String(flatRateUsd) : null,
        estimatedDays,
    });
    return {
        ...method,
        resolvedRates: {
            LKR: resolveShippingCost({ method, currency: 'LKR' }),
            SGD: resolveShippingCost({ method, currency: 'SGD' }),
            USD: resolveShippingCost({ method, currency: 'USD' }),
        },
    };
}
async function adminUpdateMethod({ id, name, carrier, estimatedDays, flatRateLkr, flatRateSgd, flatRateUsd, }) {
    const method = await (0, db_1.getMethodById)({ id });
    if (!method)
        throw new errors_1.AppError('SHIPPING_METHOD_NOT_FOUND', 404);
    if ((method.rate_type === 'FREE' || method.rate_type === 'CALCULATED') &&
        (flatRateLkr !== undefined ||
            flatRateSgd !== undefined ||
            flatRateUsd !== undefined)) {
        throw new errors_1.AppError('RATE_TYPE_MISMATCH', 400);
    }
    return (0, db_1.updateMethod)({
        id,
        name,
        carrier,
        estimatedDays,
        flatRateLkr: flatRateLkr !== undefined
            ? flatRateLkr == null
                ? null
                : String(flatRateLkr)
            : undefined,
        flatRateSgd: flatRateSgd !== undefined
            ? flatRateSgd == null
                ? null
                : String(flatRateSgd)
            : undefined,
        flatRateUsd: flatRateUsd !== undefined
            ? flatRateUsd == null
                ? null
                : String(flatRateUsd)
            : undefined,
    });
}
async function adminActivateMethod({ id }) {
    await (0, db_1.setMethodActive)({ id, active: true });
}
async function adminDeactivateMethod({ id, }) {
    await (0, db_1.setMethodActive)({ id, active: false });
}
async function adminDeleteMethod({ id }) {
    await (0, db_1.deleteMethod)({ id });
}
async function resolveShippingCostWithThreshold({ method, currency, subtotal, settings, }) {
    const rawCost = resolveShippingCost({ method, currency });
    const label = settings?.freeShippingLabel ?? 'Free Shipping';
    if (method.rate_type === 'FREE') {
        return {
            amount: '0.00',
            currency,
            isFree: true,
            originalAmount: null,
            label,
        };
    }
    if (!subtotal || !rawCost) {
        return {
            amount: rawCost?.amount ?? '0.00',
            currency,
            isFree: false,
            originalAmount: null,
            label,
        };
    }
    const threshold = settings
        ? (currency === 'LKR'
            ? settings.freeThresholdLkr
            : currency === 'SGD'
                ? settings.freeThresholdSgd
                : settings.freeThresholdUsd)
        : null;
    if (threshold !== null && threshold !== undefined) {
        const subtotalDecimal = new decimal_js_1.default(subtotal);
        const thresholdDecimal = new decimal_js_1.default(threshold);
        if (subtotalDecimal.greaterThanOrEqualTo(thresholdDecimal)) {
            return {
                amount: '0.00',
                currency,
                isFree: true,
                originalAmount: rawCost.amount,
                label,
            };
        }
    }
    return {
        amount: rawCost.amount,
        currency,
        isFree: false,
        originalAmount: null,
        label,
    };
}
async function getShippingEstimate({ countryCode, currency, subtotal, }) {
    const settings = await (0, db_1.getShippingSettings)();
    const methods = await (0, db_1.getMethodsForCountry)({ countryCode });
    if (methods.length === 0) {
        return {
            available: false,
            methods: [],
            thresholdAmount: null,
            thresholdCurrency: currency,
            freeShippingLabel: settings?.freeShippingLabel ?? 'Free Shipping',
            amountUntilFree: null,
        };
    }
    const resolvedMethods = await Promise.all(methods.map(async (method) => {
        const resolved = await resolveShippingCostWithThreshold({
            method,
            currency,
            subtotal,
            settings,
        });
        return {
            id: method.id,
            name: method.name,
            carrier: method.carrier ?? null,
            estimatedDays: method.estimated_days ?? null,
            rateType: method.rate_type,
            cost: resolved,
        };
    }));
    const threshold = settings
        ? (currency === 'LKR'
            ? settings.freeThresholdLkr
            : currency === 'SGD'
                ? settings.freeThresholdSgd
                : settings.freeThresholdUsd)
        : null;
    const anyFree = resolvedMethods.some((m) => m.cost.isFree);
    return {
        available: true,
        methods: resolvedMethods,
        thresholdAmount: threshold ? String(threshold) : null,
        thresholdCurrency: currency,
        freeShippingLabel: settings?.freeShippingLabel ?? 'Free Shipping',
        amountUntilFree: threshold && !anyFree
            ? new decimal_js_1.default(threshold).minus(subtotal).toFixed(2)
            : null,
    };
}
async function adminGetShippingSettings() {
    return (0, db_1.getShippingSettings)();
}
async function adminUpdateShippingSettings({ freeThresholdLkr, freeThresholdSgd, freeThresholdUsd, freeShippingLabel, adminId, }) {
    if (freeThresholdLkr !== null && freeThresholdLkr !== undefined && freeThresholdLkr < 0) {
        throw new errors_1.AppError('INVALID_THRESHOLD', 400);
    }
    if (freeThresholdSgd !== null && freeThresholdSgd !== undefined && freeThresholdSgd < 0) {
        throw new errors_1.AppError('INVALID_THRESHOLD', 400);
    }
    if (freeThresholdUsd !== null && freeThresholdUsd !== undefined && freeThresholdUsd < 0) {
        throw new errors_1.AppError('INVALID_THRESHOLD', 400);
    }
    return (0, db_1.updateShippingSettings)({
        freeThresholdLkr,
        freeThresholdSgd,
        freeThresholdUsd,
        freeShippingLabel,
        adminId,
    });
}
