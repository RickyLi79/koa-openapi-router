"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOpenapiRouterConfigByDefault = exports.createOpenapiRouterConfig = exports.defaultOpenapiRouterConfig = void 0;
const tslib_1 = require("tslib");
const extend_1 = tslib_1.__importDefault(require("extend"));
/**
 * recommanded config in production env
 */
exports.defaultOpenapiRouterConfig = {
    routerPrefix: '',
    controllerDir: '',
    docsDir: '',
    recursive: true,
    watcher: {
        enabled: false,
        interval: 3000,
    },
    validSchema: {
        request: true,
        reponse: false,
    },
};
/**
 * create a OpenapiRouterConfig , extend the default value
 * @see #defaultOpenapiRouterConfig
 */
function createOpenapiRouterConfig(config, ...configs) {
    return extend_1.default(true, {}, exports.defaultOpenapiRouterConfig, config, ...configs);
}
exports.createOpenapiRouterConfig = createOpenapiRouterConfig;
function createOpenapiRouterConfigByDefault(configs) {
    const result = [];
    for (const iConfig of configs) {
        result.push(extend_1.default(true, {}, exports.defaultOpenapiRouterConfig, iConfig));
    }
    return result;
}
exports.createOpenapiRouterConfigByDefault = createOpenapiRouterConfigByDefault;
