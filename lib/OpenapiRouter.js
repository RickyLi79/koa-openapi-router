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
const OpenapiRouterConfig_1 = tslib_1.__importDefault(require("./OpenapiRouterConfig"));
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
        this.config = extend_1.default(true, {}, OpenapiRouterConfig_1.default, config);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3BlbmFwaVJvdXRlci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk9wZW5hcGlSb3V0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7OztBQUFBLHVEQUF1RDtBQUN2RCx5RkFBd0Q7QUFDeEQsNERBQTRCO0FBQzVCLCtDQUF5QjtBQUV6QixvRUFBZ0M7QUFDaEMsbURBQTZCO0FBQzdCLHFEQUErQjtBQUUvQix3RkFBd0Q7QUFDeEQsd0ZBQStEO0FBRy9ELE1BQU0scUJBQXFCLEdBQUcsTUFBTSxDQUFDLG1DQUFtQyxDQUFDLENBQUM7QUFDMUUsTUFBTSx5QkFBeUIsR0FBRyxNQUFNLENBQUMsd0NBQXdDLENBQUMsQ0FBQztBQUN0RSxRQUFBLFNBQVMsR0FBRyxXQUFXLENBQUM7QUFFckMsTUFBTSxpQkFBaUIsR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUM7QUFDekUsU0FBUyxTQUFTLENBQUMsSUFBWTtJQUM3QixPQUFPLGlCQUFpQixDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxTQUFTLENBQUM7QUFDM0UsQ0FBQztBQUVELE1BQWEsYUFBYTtJQTBCeEIsWUFBbUIsTUFBYyxFQUFFLE1BQW1DO1FBNER0RTs7V0FFRztRQUNjLGtCQUFhLEdBQWdCLElBQUksR0FBRyxFQUFVLENBQUM7UUE2RHhELDJCQUFzQixHQUEyQyxFQUFFLENBQUM7UUEzSDFFLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFDO1FBQ3RCLElBQUksQ0FBQyxNQUFNLEdBQUcsZ0JBQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLDZCQUEwQixFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRW5FLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7UUFDM0MsYUFBYSxDQUFDLGVBQWUs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