"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpec = void 0;
exports.setupSwagger = setupSwagger;
const path_1 = __importDefault(require("path"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swaggerUi = __importStar(require("swagger-ui-express"));
const apiPort = process.env.PORT || '3001';
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Modett API',
            version: '1.0.0',
            description: 'Modett e-commerce platform API — development use only',
        },
        servers: [
            {
                url: `http://localhost:${apiPort}/api`,
                description: 'Local development',
            },
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'sid',
                    description: 'Session cookie. Obtained via POST /auth/login or POST /auth/signup.',
                },
                adminCookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'sid',
                    description: 'Admin session cookie. Obtained via POST /admin/auth/login.',
                },
            },
            schemas: {
                Money: {
                    type: 'object',
                    required: ['amount', 'currency'],
                    properties: {
                        amount: {
                            type: 'string',
                            example: '1250.00',
                            description: 'Monetary amount as string — never a number',
                        },
                        currency: {
                            type: 'string',
                            enum: ['LKR', 'SGD', 'USD'],
                            example: 'LKR',
                        },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    required: ['error'],
                    properties: {
                        error: {
                            type: 'object',
                            required: ['code', 'message'],
                            properties: {
                                code: { type: 'string', example: 'VALIDATION_ERROR' },
                                message: { type: 'string', example: 'Invalid input' },
                            },
                        },
                    },
                },
                ValidationError: {
                    allOf: [
                        { $ref: '#/components/schemas/ErrorResponse' },
                        {
                            example: {
                                error: { code: 'VALIDATION_ERROR', message: 'Invalid input' },
                            },
                        },
                    ],
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        firstName: { type: 'string', example: 'Kumudika' },
                        lastName: { type: 'string', example: 'Jayawardena' },
                        email: { type: 'string', format: 'email' },
                        dob: { type: 'string', format: 'date', nullable: true },
                        dobConsent: { type: 'boolean' },
                        newsletterOptIn: { type: 'boolean' },
                        newsletterOptedAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true,
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Admin: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        role: { type: 'string', enum: ['OWNER', 'ADMIN'] },
                        status: {
                            type: 'string',
                            enum: ['ACTIVE', 'INVITED', 'SUSPENDED'],
                        },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                SavedAddress: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        userId: { type: 'string', format: 'uuid' },
                        label: { type: 'string', nullable: true, example: 'Home' },
                        addressJson: {
                            type: 'object',
                            description: 'Locale-specific address fields',
                        },
                        countryCode: { type: 'string', example: 'LK' },
                        isDefault: { type: 'boolean' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                SavedPaymentMethod: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        provider: { type: 'string', example: 'stripe' },
                        brand: { type: 'string', nullable: true, example: 'Visa' },
                        lastFour: { type: 'string', nullable: true, example: '4242' },
                        expiryMonth: { type: 'integer', nullable: true, example: 12 },
                        expiryYear: { type: 'integer', nullable: true, example: 2027 },
                        isDefault: { type: 'boolean' },
                    },
                },
                AdminInvite: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        email: { type: 'string', format: 'email' },
                        expiresAt: { type: 'string', format: 'date-time' },
                        createdByAdminId: { type: 'string', format: 'uuid' },
                        usedAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                },
                Category: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string', example: 'Dresses' },
                        slug: { type: 'string', example: 'dresses' },
                        active: { type: 'boolean' },
                        sortOrder: { type: 'integer' },
                    },
                },
                ProductImage: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        url: { type: 'string', format: 'uri' },
                        altText: { type: 'string', nullable: true },
                        sortOrder: { type: 'integer' },
                    },
                },
                VariantWithStock: {
                    type: 'object',
                    properties: {
                        variantId: { type: 'string', format: 'uuid' },
                        color: { type: 'string', example: 'Ivory' },
                        size: { type: 'string', example: 'S' },
                        availableQty: { type: 'integer' },
                        lowStockThreshold: { type: 'integer' },
                        stockStatus: {
                            type: 'string',
                            enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
                        },
                    },
                },
                ProductListItem: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        slug: { type: 'string', example: 'sofia-dress' },
                        displayName: { type: 'string', example: 'Sofia Dress' },
                        shortName: { type: 'string', example: 'Sofia' },
                        isSale: { type: 'boolean' },
                        price: { $ref: '#/components/schemas/Money' },
                        keyImage: {
                            type: 'object',
                            nullable: true,
                            properties: {
                                url: { type: 'string', format: 'uri' },
                                altText: { type: 'string', nullable: true },
                            },
                        },
                        stockStatus: {
                            type: 'string',
                            enum: ['IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'],
                        },
                    },
                },
                ProductDetail: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        slug: { type: 'string' },
                        displayName: { type: 'string' },
                        shortName: { type: 'string' },
                        description: { type: 'string', nullable: true },
                        fabricInfo: { type: 'string', nullable: true },
                        isSale: { type: 'boolean' },
                        price: { $ref: '#/components/schemas/Money' },
                        images: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ProductImage' },
                        },
                        variants: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/VariantWithStock' },
                        },
                        category: {
                            $ref: '#/components/schemas/Category',
                            nullable: true,
                        },
                        relatedProducts: {
                            type: 'array',
                            items: { $ref: '#/components/schemas/ProductListItem' },
                        },
                    },
                },
                Banner: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        message: {
                            type: 'string',
                            example: 'Free shipping on orders over LKR 10,000',
                        },
                        linkUrl: { type: 'string', nullable: true },
                        enabled: { type: 'boolean' },
                        startAt: { type: 'string', format: 'date-time', nullable: true },
                        endAt: { type: 'string', format: 'date-time', nullable: true },
                    },
                },
            },
        },
        tags: [
            { name: 'Auth', description: 'Customer authentication' },
            { name: 'Me', description: 'Current customer profile' },
            { name: 'Admin Auth', description: 'Admin authentication' },
            {
                name: 'Admin Management',
                description: 'Admin user management (OWNER only)',
            },
            { name: 'Catalog', description: 'Public product catalog' },
            { name: 'Admin Catalog', description: 'Admin product management' },
            { name: 'Admin Banners', description: 'Homepage banner management' },
            {
                name: 'Admin Bestsellers',
                description: 'Bestseller list management',
            },
            { name: 'Shipping', description: 'Storefront shipping methods' },
            { name: 'Shipping Admin', description: 'Admin shipping zones and methods' },
            { name: 'Returns', description: 'Customer return requests' },
            { name: 'Admin Returns', description: 'Admin return review and transitions' },
        ],
    },
    apis: [
        path_1.default.join(process.cwd(), 'src/modules/iam/iam.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/catalog/catalog.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/cart/cart.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/checkout/checkout.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/payments/payments.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/orders/orders.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/shipping/shipping.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/returns/returns.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/reviews/reviews.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/loyalty/loyalty.routes.ts'),
        path_1.default.join(process.cwd(), 'src/modules/messaging/messaging.routes.ts'),
    ],
};
exports.swaggerSpec = (0, swagger_jsdoc_1.default)(options);
function setupSwagger(app) {
    if (process.env.NODE_ENV === 'production' && process.env.SWAGGER_ENABLED !== '1')
        return;
    const serveHandlers = Array.isArray(swaggerUi.serve)
        ? swaggerUi.serve
        : [swaggerUi.serve];
    app.use('/docs', ...serveHandlers, swaggerUi.setup(exports.swaggerSpec, {
        customSiteTitle: 'Modett API Docs',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            tryItOutEnabled: true,
        },
    }));
    app.get('/docs/spec.json', (req, res) => {
        res.json(exports.swaggerSpec);
    });
    console.log(`Swagger UI available at http://localhost:${apiPort}/docs`);
}
