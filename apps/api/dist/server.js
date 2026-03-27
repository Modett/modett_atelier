"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const env_1 = require("./lib/env");
(0, env_1.validateEnv)();
const app_1 = require("./app");
const PORT = parseInt(process.env.PORT ?? '3001', 10);
const server = app_1.app.listen(PORT, '0.0.0.0', () => {
    console.log(`✓ API running on port ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV ?? 'development'}`);
});
process.on('SIGTERM', () => {
    console.log('SIGTERM received — closing server gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000);
});
