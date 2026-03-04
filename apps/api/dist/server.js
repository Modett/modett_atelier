"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_1 = require("./app");
const PORT = process.env.PORT || 3001;
app_1.app.listen(PORT, () => {
    console.log(`API running on port ${PORT}`);
});
//# sourceMappingURL=server.js.map