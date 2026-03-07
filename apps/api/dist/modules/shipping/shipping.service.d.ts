/**
 * Shipping service — rate resolution, storefront methods, admin CRUD. RORO.
 * Uses Decimal.js for money. Throws AppError. Exports used by Checkout module.
 */
import type { ShippingZone, ShippingMethod } from '@modett/db';
type CurrencyCode = 'LKR' | 'SGD' | 'USD';
export declare function resolveShippingCost({ method, currency, }: {
    method: ShippingMethod;
    currency: CurrencyCode;
}): {
    amount: string;
    currency: CurrencyCode;
} | null;
export interface ShippingMethodOption {
    id: string;
    name: string;
    carrier: string | null;
    estimatedDays: string | null;
    rateType: 'FLAT' | 'FREE' | 'CALCULATED';
    cost: {
        amount: string;
        currency: CurrencyCode;
    } | null;
}
export declare function getMethodsForCheckout({ countryCode, currency, }: {
    countryCode: string;
    currency: CurrencyCode;
}): Promise<ShippingMethodOption[]>;
export declare function getMethodForOrder({ methodId, currency, }: {
    methodId: string;
    currency: CurrencyCode;
}): Promise<{
    method: ShippingMethod;
    cost: {
        amount: string;
        currency: CurrencyCode;
    } | null;
}>;
export interface AdminZoneWithMethods {
    id: string;
    name: string;
    countries: string[];
    createdAt: Date;
    methods: ShippingMethod[];
}
export declare function adminGetAllZones(): Promise<AdminZoneWithMethods[]>;
export declare function adminGetZone({ id, }: {
    id: string;
}): Promise<{
    zone: ShippingZone;
    countries: string[];
    methods: ShippingMethod[];
}>;
export declare function adminCreateZone({ name, countries, }: {
    name: string;
    countries: string[];
}): Promise<ShippingZone>;
export declare function adminUpdateZone({ id, name, }: {
    id: string;
    name: string;
}): Promise<ShippingZone>;
export declare function adminAddCountryToZone({ zoneId, countryCode, }: {
    zoneId: string;
    countryCode: string;
}): Promise<void>;
export declare function adminRemoveCountryFromZone({ zoneId, countryCode, }: {
    zoneId: string;
    countryCode: string;
}): Promise<void>;
export declare function adminDeleteZone({ id }: {
    id: string;
}): Promise<void>;
export declare function adminGetMethodsForZone({ zoneId, includeInactive, }: {
    zoneId: string;
    includeInactive?: boolean;
}): Promise<ShippingMethod[]>;
export declare function adminCreateMethod({ zoneId, name, carrier, rateType, flatRateLkr, flatRateSgd, flatRateUsd, estimatedDays, }: {
    zoneId: string;
    name: string;
    carrier?: string | null;
    rateType: 'FLAT' | 'FREE' | 'CALCULATED';
    flatRateLkr?: number | null;
    flatRateSgd?: number | null;
    flatRateUsd?: number | null;
    estimatedDays?: string | null;
}): Promise<ShippingMethod & {
    resolvedRates: {
        LKR: {
            amount: string;
            currency: string;
        } | null;
        SGD: {
            amount: string;
            currency: string;
        } | null;
        USD: {
            amount: string;
            currency: string;
        } | null;
    };
}>;
export declare function adminUpdateMethod({ id, name, carrier, estimatedDays, flatRateLkr, flatRateSgd, flatRateUsd, }: {
    id: string;
    name?: string;
    carrier?: string | null;
    estimatedDays?: string | null;
    flatRateLkr?: number | null;
    flatRateSgd?: number | null;
    flatRateUsd?: number | null;
}): Promise<ShippingMethod>;
export declare function adminActivateMethod({ id }: {
    id: string;
}): Promise<void>;
export declare function adminDeactivateMethod({ id, }: {
    id: string;
}): Promise<void>;
export declare function adminDeleteMethod({ id }: {
    id: string;
}): Promise<void>;
export {};
//# sourceMappingURL=shipping.service.d.ts.map