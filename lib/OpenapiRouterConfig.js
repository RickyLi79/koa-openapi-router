"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getConfig = exports.defaultOpenapiRouterConfig = void 0;
const tslib_1 = require("tslib");
const extend_1 = tslib_1.__importDefault(require("extend"));
exports.defaultOpenapiRouterConfig = {
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
    test: {
        enabled: false,
        controllerFileExt: '.js',
    },
};
function getConfig(config) {
    return extend_1.default(true, {}, exports.defaultOpenapiRouterConfig, config);
}
exports.getConfig = getConfig;
