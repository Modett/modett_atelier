/**
 * IAM query functions — users, sessions, admins, admin_invites, saved_addresses, saved_payment_methods.
 * No business logic. RORO signatures. Return null when not found.
 */
import type { User, NewUser, Admin, Session, AdminInvite, SavedAddress, NewSavedAddress, SavedPaymentMethod } from '../schema/iam.schema';
export declare function getUserByEmail({ email, }: {
    email: string;
}): Promise<User | null>;
export declare function getUserById({ id }: {
    id: string;
}): Promise<User | null>;
export declare function createUser({ firstName, lastName, email, passwordHash, newsletterOptIn, }: {
    firstName: string;
    lastName: string;
    email: string;
    passwordHash: string;
    newsletterOptIn?: boolean;
}): Promise<User>;
export declare function updateUser({ id, data, }: {
    id: string;
    data: Partial<NewUser>;
}): Promise<User | null>;
export declare function createSession({ userId, kind, expiresAt, rememberMeUntil, }: {
    userId: string;
    kind: 'CUSTOMER' | 'ADMIN';
    expiresAt: Date;
    rememberMeUntil?: Date | null;
}): Promise<Session>;
export declare function getSession({ sessionId, }: {
    sessionId: string;
}): Promise<Session | null>;
export declare function refreshSession({ sessionId, }: {
    sessionId: string;
}): Promise<void>;
export declare function invalidateSession({ sessionId, }: {
    sessionId: string;
}): Promise<void>;
export declare function getActiveSessionsByUserId({ userId, }: {
    userId: string;
}): Promise<Session[]>;
export declare function getAdminByUserId({ userId, }: {
    userId: string;
}): Promise<Admin | null>;
export declare function getAdminById({ id }: {
    id: string;
}): Promise<Admin | null>;
export declare function createAdmin({ userId, role, }: {
    userId: string;
    role: 'OWNER' | 'ADMIN';
}): Promise<Admin>;
export declare function updateAdminStatus({ id, status, }: {
    id: string;
    status: 'ACTIVE' | 'INVITED' | 'SUSPENDED';
}): Promise<Admin | null>;
export declare function updateAdminRole({ id, role, }: {
    id: string;
    role: 'OWNER' | 'ADMIN';
}): Promise<Admin | null>;
export declare function listAdmins(): Promise<Array<Admin & {
    user: User;
}>>;
export declare function createAdminInvite({ email, tokenHash, expiresAt, createdByAdminId, }: {
    email: string;
    tokenHash: string;
    expiresAt: Date;
    createdByAdminId: string;
}): Promise<AdminInvite>;
export declare function getAdminInviteByTokenHash({ tokenHash, }: {
    tokenHash: string;
}): Promise<AdminInvite | null>;
export declare function markAdminInviteUsed({ id }: {
    id: string;
}): Promise<void>;
export declare function acceptAdminInviteTransaction({ inviteId, email, firstName, lastName, passwordHash, }: {
    inviteId: string;
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
}): Promise<{
    user: User;
    admin: Admin;
}>;
export declare function listSavedAddresses({ userId, }: {
    userId: string;
}): Promise<SavedAddress[]>;
export declare function createSavedAddress({ userId, label, addressJson, countryCode, isDefault, }: {
    userId: string;
    label?: string | null;
    addressJson: unknown;
    countryCode: string;
    isDefault?: boolean;
}): Promise<SavedAddress>;
export declare function updateSavedAddress({ id, userId, data, }: {
    id: string;
    userId: string;
    data: Partial<NewSavedAddress>;
}): Promise<SavedAddress | null>;
export declare function deleteSavedAddress({ id, userId, }: {
    id: string;
    userId: string;
}): Promise<void>;
export declare function listSavedPaymentMethods({ userId, }: {
    userId: string;
}): Promise<SavedPaymentMethod[]>;
export declare function createSavedPaymentMethod({ userId, provider, token, brand, lastFour, expiryMonth, expiryYear, isDefault, }: {
    userId: string;
    provider: string;
    token: string;
    brand?: string | null;
    lastFour?: string | null;
    expiryMonth?: number | null;
    expiryYear?: number | null;
    isDefault?: boolean;
}): Promise<SavedPaymentMethod>;
export declare function deleteSavedPaymentMethod({ id, userId, }: {
    id: string;
    userId: string;
}): Promise<void>;
//# sourceMappingURL=iam.d.ts.map