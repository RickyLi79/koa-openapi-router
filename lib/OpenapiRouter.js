"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenapiRouter = exports.X_OAS_VER = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-var-requires */
const swagger_parser_1 = tslib_1.__importDefault(require("@apidevtools/swagger-parser"));
const extend_1 = tslib_1.__importDefault(require("extend"));
const fs = tslib_1.__importStar(require("fs"));
const koa_router_1 = tslib_1.__importDefault(require("koa-router"));
const path = tslib_1.__importStar(require("path"));
const watch = tslib_1.__importStar(require("watch"));
const OpenapiRouterAction_1 = tslib_1.__importDefault(require("./OpenapiRouterAction"));
const OpenapiRouterConfig_1 = require("./OpenapiRouterConfig");
const OPENAPI_ROUTER_LOGGER = Symbol('OpenapiRouter#openapiRouterLogger');
const OPENAPI_ROUTER_MIDDLEWARE = Symbol('OpenapiRouter#openapiRouterMiddlerware');
exports.X_OAS_VER = 'x-oas-ver';
const OPENAPI_FILE_EXTS = { '.json': true, '.yaml': true, '.yml': true };
function isDocsExt(file) {
    return OPENAPI_FILE_EXTS[path.extname(file).toLowerCase()] !== undefined;
}
class OpenapiRouter {
    constructor(router, config) {
        /**
         * 本OpenapiRouter正在监控的file
         */
        this.wactchingFile = new Set();
        this.koaControllerActionMap = {};
        this._router = router;
        this.config = extend_1.default(true, {}, OpenapiRouterConfig_1.defaultOpenapiRouterConfig, config);
        this.proxyAction = this.config.proxyAction;
        OpenapiRouter._openapiRouters.push(this);
    }
    getOperationByOpt(opt) {
        return this.operationMap[opt];
    }
    // #endregion
    // #region init
    static get logger() {
        var _a;
        return (_a = this[OPENAPI_ROUTER_LOGGER]) !== null && _a !== void 0 ? _a : console;
    }
    static set logger(value) {
        this[OPENAPI_ROUTER_LOGGER] = value;
    }
    static closeAll() {
        while (this._openapiRouters.length > 0) {
            const iOr = this._openapiRouters.shift();
            iOr === null || iOr === void 0 ? void 0 : iOr.close();
        }
    }
    toString() {
        return `[OpenapiRouter (prefix=${this.routerPrefix})]`;
    }
    get routerPrefix() {
        var _a, _b;
        return (_b = (_a = this._router.opts) === null || _a === void 0 ? void 0 : _a.prefix) !== null && _b !== void 0 ? _b : '';
    }
    getRouter() {
        return this._router;
    }
    static async Start(app, configs, logger) {
        if (logger)
            this.logger = logger;
        if (!Array.isArray(configs)) {
            configs = [configs];
        }
        const promiseArr = [];
        for (const iConfig of configs) {
            const router = (iConfig.router instanceof koa_router_1.default) ? iConfig.router : new koa_router_1.default(iConfig.router);
            const openapiRouter = new OpenapiRouter(router, iConfig.config);
            promiseArr.push(openapiRouter.loadOpenapi());
            app.use(router.routes());
        }
        await Promise.all(promiseArr);
    }
    // #endregion
    // #region getter
    get logger() {
        return OpenapiRouter.logger;
    }
    static getOpenapiRouters() {
        return this._openapiRouters;
    }
    static watchOutterFile(openapiRouter, filename) {
        const handler = (event) => {
            // this.logger.debug('outterFilewatchEventHandler', event, filename);
            if (event === 'change') {
                this.filewatchsByOr[filename].forEach(or => {
                    if (or.docsRefs[filename]) {
                        or.checkDocUpdated(filename, true);
                    }
                });
            }
        };
        setTimeout(() => {
            var _a, _b;
            let isWatching = false;
            if (((_a = this.filewatchsByOr[filename]) === null || _a === void 0 ? void 0 : _a.size) > 0) {
                isWatching = true;
            }
            else {
                for (const iOr of this._openapiRouters) {
                    if (iOr.wactchingFile.has(filename)) {
                        isWatching = true;
                        break;
                    }
                }
            }
            if (!isWatching) {
                const fw = fs.watch(filename);
                fw.on('change', handler)
                    .on('error', handler);
                const orWatchs = this.filewatchsByOr[filename] = (_b = this.filewatchsByOr[filename]) !== null && _b !== void 0 ? _b : new Set();
                orWatchs.add(openapiRouter);
                this.filewatchs[filename] = fw;
            }
        }, 1000);
    }
    static unwatchOutterFile(openapiRouter, filename) {
        var _a, _b, _c;
        if (((_a = this.filewatchsByOr[filename]) === null || _a === void 0 ? void 0 : _a.size) === 0) {
            return;
        }
        (_b = this.filewatchsByOr[filename]) === null || _b === void 0 ? void 0 : _b.delete(openapiRouter);
        if (((_c = this.filewatchsByOr[filename]) === null || _c === void 0 ? void 0 : _c.size) === 0) {
            this.filewatchs[filename].close();
            delete this.filewatchs[filename];
        }
    }
    static outterFilewatchEventHandler(event, filename) {
        this.logger.debug('outterFilewatchEventHandler', event, filename);
        if (event === 'change') {
            this.filewatchsByOr[filename].forEach(or => {
                if (or.wactchingFile.has(filename)) {
                    or.checkDocUpdated(filename, true);
                }
            });
        }
    }
    getKoaControllerAction(opt, qry) {
        var _a, _b, _c, _d;
        if (this.proxyAction) {
            return this.proxyAction;
        }
        let action = this.koaControllerActionMap[opt];
        if (action !== undefined || qry === undefined) {
            return action;
        }
        const operation = this.getOperationByOpt(opt);
        {
            let ctl;
            const tag = (_b = (_a = operation.tags) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 'default';
            try {
                const ctlCls = require(path.join(this.config.controllerDir, tag));
                if (ctlCls.__esModule) {
                    if (typeof ctlCls.default === 'function') {
                        ctl = new ctlCls.default();
                    }
                    else if (typeof ctlCls.default === 'object') {
                        ctl = ctlCls.default;
                    }
                }
                else {
                    ctl = ctlCls;
                }
                action = (_d = (_c = ctl[qry.method.toUpperCase() + ' ' + qry.path]) !== null && _c !== void 0 ? _c : ctl['ALL ' + qry.path]) !== null && _d !== void 0 ? _d : ctl[qry.path]; //
            }
            catch (e) {
                // this.logger.error(e);
            }
        }
        this.koaControllerActionMap[opt] = action;
        return action;
    }
    getKoaControllerActionFile(opt) {
        var _a, _b;
        const operation = this.getOperationByOpt(opt);
        const tag = (_b = (_a = operation.tags) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 'default';
        return path.join(this.config.controllerDir, tag);
    }
    /**
         * 重新扫描读取openapi文档
         */
    async loadOpenapi() {
        return new Promise((resolve, rejects) => {
            let docsDir = this.config.docsDir;
            if (!fs.existsSync(docsDir)) {
                const err = new Error(`no such directory, stat '${docsDir}',  prefix='${this.routerPrefix}'`);
                this.logger.error(err);
                rejects(err);
            }
            this.close();
            const handler = (f, curr, prev) => {
                if (curr.isDirectory()) {
                    return;
                }
                const filename = f;
                if (prev === null) {
                    // this.app.logger.info(`a new file created : ${filename}`);
                    this.addDocToConnect(filename);
                }
                else if (curr.nlink === 0) {
                    // this.app.logger.info(`a file was removed : ${filename}`);
                    this.checkDocUpdated(filename, false);
                }
                else {
                    // this.app.logger.info(`a file was changed : ${filename}`);
                    this.checkDocUpdated(filename, false);
                }
            };
            this.logger.debug(`watch dir : ${docsDir}`);
            let docFilename = '';
            if (fs.statSync(docsDir).isFile()) {
                docFilename = docsDir;
                docsDir = path.dirname(docFilename);
            }
            watch.createMonitor(docsDir, {
                interval: this.config.watcher.interval / 1000,
                filter: (file, stat) => {
                    if (docFilename !== '') {
                        return file === docFilename;
                    }
                    if (stat.isDirectory()) {
                        return this.config.recursive;
                    }
                    return isDocsExt(file);
                },
            }, async (monitor) => {
                this.watchMonitor = monitor;
                // this.logger.info(monitor.files);
                const promisArr = [];
                for (const iFilename in monitor.files) {
                    const fsState = monitor.files[iFilename];
                    if (fsState.isFile()) {
                        promisArr.push(this.connectOneApi(iFilename));
                        // promisArr.push(this.connectOneApi(iFilename));
                    }
                }
                if (!this.config.watcher.enabled) {
                    watch.unwatchTree(docsDir);
                }
                else {
                    monitor.setMaxListeners(100);
                    monitor.on('changed', handler).on('created', handler).on('created', handler);
                }
                await Promise.all(promisArr);
                resolve(true);
            });
        });
    }
    close() {
        var _a;
        // reset
        (_a = this.watchMonitor) === null || _a === void 0 ? void 0 : _a.stop();
        // watch.unwatchTree(docsDir);
        this.filesToConnect = [];
        this.operationMap = {};
        this.docsRefs = {};
        this.optInDoc = {};
        for (const iFilename of this.wactchingFile.values()) {
            OpenapiRouter.unwatchOutterFile(this, iFilename);
        }
        this.wactchingFile.clear();
    }
    checkDocUpdated(filename, isOutterDoc) {
        var _a;
        const arr = (_a = this.docsRefs[filename]) !== null && _a !== void 0 ? _a : new Set();
        if (!isOutterDoc) {
            this.addDocToConnect(filename);
        }
        else {
            // this.logger.debug('checkDocUpdated isOutterDoc', filename);
        }
        for (const iDoc of arr.values()) {
            // this.logger.info(`a doc updated : '${filename}' -> $ref by '${iDoc}'`);
            this.addDocToConnect(iDoc);
        }
    }
    addDocToConnect(filename) {
        if (!this.filesToConnect.includes(filename)) {
            this.filesToConnect.push(filename);
            if (!this.addDocTimer) {
                this.addDocTimer = setTimeout(async () => {
                    let iFile = this.filesToConnect.shift();
                    while (iFile) {
                        await this.connectOneApi(iFile);
                        iFile = this.filesToConnect.shift();
                    }
                    this.addDocTimer = undefined;
                }, 500);
            }
        }
    }
    async connectOneApi(filename) {
        var _a, _b;
        this.wactchingFile.add(filename);
        {
            // 注销$ref关系
            for (const iDoc in this.docsRefs) {
                this.docsRefs[iDoc].delete(filename);
            }
            // 注销operationMap
            const opts = (_a = this.optInDoc[filename]) !== null && _a !== void 0 ? _a : [];
            for (const iOpt of opts) {
                delete this.operationMap[iOpt];
            }
            this.optInDoc[filename] = [];
        }
        let api;
        try {
            api = await swagger_parser_1.default.dereference(filename);
        }
        catch (err) {
            this.logger.debug(`${filename} is not an openapi-schema, SKIPPED`);
            return false;
        }
        const specVersion = api.swagger ? 2 : Number.parseInt(api.openapi);
        {
            // 记录$ref关系
            const resolve = await swagger_parser_1.default.resolve(filename);
            const resolvePaths = resolve.paths();
            for (const iFilename of resolvePaths) {
                if (this.docsRefs[iFilename] === undefined) {
                    this.docsRefs[iFilename] = new Set();
                }
                this.docsRefs[iFilename].add(filename);
                if (this.config.watcher.enabled) {
                    if (!this.wactchingFile.has(iFilename)) {
                        OpenapiRouter.watchOutterFile(this, iFilename);
                    }
                }
            }
        }
        for (const iPath in api.paths) {
            const iPathItem = api.paths[iPath];
            for (const iMethod in iPathItem) {
                const iPath2 = iPath.replace(/{/g, ':').replace(/}/g, ''); // /api/{user}/{id} => /api/:user/:id
                const opt = iMethod.toUpperCase() + ' ' + iPath2;
                if (this.operationMap[opt] !== undefined) {
                    this.logger.warn(`duplicate operation : '${opt}' in '${filename}' OVERWRITED`);
                    // continue;
                }
                this.optInDoc[filename] = (_b = this.optInDoc[filename]) !== null && _b !== void 0 ? _b : [];
                this.optInDoc[filename].push(opt);
                const iOperation = iPathItem[iMethod];
                iOperation[exports.X_OAS_VER] = specVersion;
                this.operationMap[opt] = iOperation;
                const action = this.getKoaControllerAction(opt, { method: iMethod, path: iPath2 });
                this.addRouter(opt, iMethod, iPath2);
                const fullOpt = `${iMethod.toUpperCase()} ${this.routerPrefix}${iPath2}`;
                if (action !== undefined) {
                    this.logger.debug(`openapi-router connected : opt='${fullOpt}'`);
                }
                else {
                    this.logger.error(`Can not connnect router : opt='${fullOpt}'`);
                }
            }
        }
        return true;
    }
    get action() {
        if (!this[OPENAPI_ROUTER_MIDDLEWARE]) {
            this[OPENAPI_ROUTER_MIDDLEWARE] = OpenapiRouterAction_1.default(this);
        }
        return this[OPENAPI_ROUTER_MIDDLEWARE];
    }
    addRouter(opt, method, path) {
        this._router[method.toLowerCase()](path, this.action);
    }
}
exports.OpenapiRouter = OpenapiRouter;
// #region global file watcher
OpenapiRouter._openapiRouters = [];
/**
 * 记录指定outter file已经被哪些OpenapiRouter监控中
 */
OpenapiRouter.filewatchsByOr = {};
OpenapiRouter.filewatchs = {};
