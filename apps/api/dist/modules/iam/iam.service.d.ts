/**
 * IAM service layer — business logic, validation, errors.
 * RORO. Uses query functions from @modett/db. Throws AppError for expected failures.
 */
import { createAdminInvite } from '@modett/db';
import type { User, Admin, SavedAddress, SavedPaymentMethod } from '@modett/db';
type SanitisedUser = Omit<User, 'passwordHash'>;
export declare function signup({ firstName, lastName, email, password, newsletterOptIn, }: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    newsletterOptIn?: boolean;
}): Promise<{
    user: SanitisedUser;
    sessionId: string;
}>;
export declare function login({ email, password, rememberMe, }: {
    email: string;
    password: string;
    rememberMe?: boolean;
}): Promise<{
    user: SanitisedUser;
    sessionId: string;
}>;
export declare function logout({ sessionId }: {
    sessionId: string;
}): Promise<void>;
export declare function getMe({ userId, }: {
    userId: string;
}): Promise<SanitisedUser>;
export declare function updateMe({ userId, data, }: {
    userId: string;
    data: {
        firstName?: string;
        lastName?: string;
        dob?: string;
        dobConsent?: boolean;
        newsletterOptIn?: boolean;
    };
}): Promise<SanitisedUser>;
export declare function changePassword({ userId, currentPassword, newPassword, }: {
    userId: string;
    currentPassword: string;
    newPassword: string;
}): Promise<{
    sessionId: string;
}>;
export declare function listSavedAddressesForUser({ userId, }: {
    userId: string;
}): Promise<SavedAddress[]>;
export declare function createSavedAddressForUser({ userId, label, addressJson, countryCode, isDefault, }: {
    userId: string;
    label?: string;
    addressJson: unknown;
    countryCode: string;
    isDefault?: boolean;
}): Promise<SavedAddress>;
export declare function updateSavedAddressForUser({ id, userId, data, }: {
    id: string;
    userId: string;
    data: Partial<{
        label: string;
        addressJson: unknown;
        countryCode: string;
        isDefault: boolean;
    }>;
}): Promise<SavedAddress>;
export declare function deleteSavedAddressForUser({ id, userId, }: {
    id: string;
    userId: string;
}): Promise<void>;
export declare function listSavedPaymentMethodsForUser({ userId, }: {
    userId: string;
}): Promise<SavedPaymentMethod[]>;
export declare function deleteSavedPaymentMethodForUser({ id, userId, }: {
    id: string;
    userId: string;
}): Promise<void>;
export declare function adminLogin({ email, password, }: {
    email: string;
    password: string;
}): Promise<{
    user: SanitisedUser;
    admin: Admin;
    sessionId: string;
}>;
export declare function adminLogout({ sessionId, }: {
    sessionId: string;
}): Promise<void>;
export declare function createAdminInviteForOwner({ email, createdByAdminId, }: {
    email: string;
    createdByAdminId: string;
}): Promise<{
    invite: Awaited<ReturnType<typeof createAdminInvite>>;
    rawToken: string;
}>;
export declare function acceptAdminInvite({ rawToken, firstName, lastName, password, }: {
    rawToken: string;
    firstName: string;
    lastName: string;
    password: string;
}): Promise<{
    user: SanitisedUser;
    admin: Admin;
}>;
export declare function listAdminsForOwner(): Promise<Array<Admin & {
    user: SanitisedUser;
}>>;
export declare function updateAdminRoleForOwner({ targetAdminId, role, requestingAdminId, }: {
    targetAdminId: string;
    role: 'OWNER' | 'ADMIN';
    requestingAdminId: string;
}): Promise<Admin>;
export declare function suspendAdminForOwner({ targetAdminId, requestingAdminId, }: {
    targetAdminId: string;
    requestingAdminId: string;
}): Promise<void>;
export {};
//# sourceMappingURL=iam.service.d.ts.map