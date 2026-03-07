/**
 * Rate limiting middleware — Redis sliding window.
 * Key format: rl:{name}:{identifier}
 * Applied per route. Requires redis from @modett/db.
 */
import type { Request, Response, NextFunction } from 'express';
export type RateLimitOptions = {
    windowMs: number;
    max: number;
    key: (req: Request) => string;
};
export declare function rateLimit(options: {
    name: string;
    windowMs: number;
    max: number;
    key: (req: Request) => string;
}): (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitSignup: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitAdminAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitAdminInvites: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitAcceptInvite: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitCheckoutStart: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const rateLimitPaymentIntent: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=rateLimit.d.ts.map