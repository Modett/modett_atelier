"use strict";
/**
 * Application errors — expected errors with stable codes and status codes.
 * Route handlers catch AppError and return { error: { code, message } }.
 * Unexpected errors go to global handler → Sentry → 500.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
var AppError = /** @class */ (function (_super) {
    __extends(AppError, _super);
    function AppError(code, statusCode, message) {
        var _this = _super.call(this, message !== null && message !== void 0 ? message : code) || this;
        _this.code = code;
        _this.statusCode = statusCode;
        _this.name = 'AppError';
        Object.setPrototypeOf(_this, AppError.prototype);
        return _this;
    }
    return AppError;
}(Error));
exports.AppError = AppError;
