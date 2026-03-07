/**
 * Auth middleware — requireAuth (customer), requireAdmin, requireOwner.
 * Reads 'sid' cookie, validates session via Redis/DB, attaches user/admin.
 */
import type { Request, Response, NextFunction, RequestHandler } from 'express';
export type AuthRequest = Request & {
    user: {
        id: string;
        [k: string]: unknown;
    };
    sessionId: string;
};
export type AdminRequest = Request & {
    user: {
        id: string;
        [k: string]: unknown;
    };
    admin: {
        id: string;
        role: string;
        [k: string]: unknown;
    };
    sessionId: string;
};
/** Wraps an AdminRequest handler so it can be passed to router.get/post etc. (avoids Request vs AdminRequest variance). */
export declare function withAdmin(handler: (req: AdminRequest, res: Response) => void | Promise<void>): RequestHandler;
/**
 * Optional auth — for cart routes. If 'sid' cookie present and valid CUSTOMER session,
 * sets req.user. If missing or invalid, continues without error (guest cart).
 * Admin sessions are ignored (no req.user).
 */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireAuth(req: Request, res: Response, next: NextFunction): void;
export declare function requireAdmin(req: Request, res: Response, next: NextFunction): void;
export declare function requireOwner(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.d.ts.map