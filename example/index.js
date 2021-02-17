"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const koa_1 = tslib_1.__importDefault(require("koa"));
const koa_openapi_router_1 = require("koa-openapi-router");
const koa_router_1 = tslib_1.__importDefault(require("koa-router"));
const koa_bodyparser_1 = tslib_1.__importDefault(require("koa-bodyparser"));
const path_1 = tslib_1.__importDefault(require("path"));
const PORT = 5500;
const app = new koa_1.default();
app.use(koa_bodyparser_1.default());
const config = koa_openapi_router_1.getConfig({
    controllerDir: path_1.default.join(process.cwd(), 'controller'),
    docsDir: path_1.default.join(process.cwd(), 'oas-doc'),
});
const router = new koa_router_1.default({ prefix: '/my/api' });
koa_openapi_router_1.OpenapiRouter.Start(app, { router, config });
app.listen(PORT);
