"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenapiRouter = exports.X_OAS_VER = exports.OPENAPI_ROUTER_LOGGER = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-var-requires */
const swagger_parser_1 = tslib_1.__importDefault(require("@apidevtools/swagger-parser"));
const extend_1 = tslib_1.__importDefault(require("extend"));
const fs = tslib_1.__importStar(require("fs"));
const koa_router_1 = tslib_1.__importDefault(require("koa-router"));
const path = tslib_1.__importStar(require("path"));
const watch = tslib_1.__importStar(require("watch"));
const OpenapiRouterAction_1 = tslib_1.__importStar(require("./OpenapiRouterAction"));
const OpenapiRouterConfig_1 = require("./OpenapiRouterConfig");
exports.OPENAPI_ROUTER_LOGGER = Symbol('OpenapiRouter#openapiRouterLogger');
const OPENAPI_ROUTER_MIDDLEWARE = Symbol('OpenapiRouter#openapiRouterMiddlerware');
exports.X_OAS_VER = 'x-oas-ver';
const X_CONTROLLER = 'x-controller';
const OPENAPI_FILE_EXTS = { '.json': true, '.yaml': true, '.yml': true };
function isDocsExt(file) {
    return OPENAPI_FILE_EXTS[path.extname(file).toLowerCase()] !== undefined;
}
class OpenapiRouter {
    constructor(config) {
        /**
         * 本OpenapiRouter正在监控的file
         */
        this.wactchingFile = new Set();
        this.koaControllerActionMap = {};
        this.config = extend_1.default(true, {}, OpenapiRouterConfig_1.defaultOpenapiRouterConfig, config);
        if (!OpenapiRouter.isEggApp) {
            this._router = new koa_router_1.default({ prefix: config.routerPrefix });
        }
        this.proxyAction = config.proxyAction;
        OpenapiRouter._openapiRouters.push(this);
    }
    /**
     * @private
     */
    getOperationByOpt(opt) {
        return this.operationMap[opt];
    }
    // #endregion
    // #region init
    static get logger() {
        var _a;
        return (_a = this[exports.OPENAPI_ROUTER_LOGGER]) !== null && _a !== void 0 ? _a : console;
    }
    static set logger(value) {
        this[exports.OPENAPI_ROUTER_LOGGER] = value;
    }
    /**
     * dispose all working OpenapiRouter
     */
    static closeAll() {
        while (this._openapiRouters.length > 0) {
            const iOr = this._openapiRouters.shift();
            iOr === null || iOr === void 0 ? void 0 : iOr.close();
        }
    }
    toString() {
        return `[OpenapiRouter (prefix=${this.config.routerPrefix})]`;
    }
    getRouter() {
        return this._router;
    }
    static async Start(app, configs, options) {
        if (options === null || options === void 0 ? void 0 : options.logger)
            this.logger = options === null || options === void 0 ? void 0 : options.logger;
        if ((options === null || options === void 0 ? void 0 : options.proxyAcition) !== undefined)
            this.proxyAction = options.proxyAcition;
        this.app = app;
        this.isEggApp = !!(options === null || options === void 0 ? void 0 : options.isEggApp);
        if (!Array.isArray(configs)) {
            configs = [configs];
        }
        const promiseArr = [];
        for (const iConfig of configs) {
            const openapiRouter = new OpenapiRouter(iConfig);
            promiseArr.push(openapiRouter.loadOpenapi());
            if (!this.isEggApp) {
                app.use(openapiRouter._router.routes());
                if (options === null || options === void 0 ? void 0 : options.useAllowedMethods) {
                    app.use(openapiRouter._router.allowedMethods());
                }
            }
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
    /**
     * if set, all request will lead to this method.
     *
     * set `undefined` to resume normal mode
     */
    get proxyAction() {
        var _a;
        return (_a = this._proxyAction) !== null && _a !== void 0 ? _a : OpenapiRouter.proxyAction;
    }
    set proxyAction(value) {
        this._proxyAction = value;
    }
    /**
     * @private
     */
    getKoaControllerAction(opt, qry, force = false) {
        var _a, _b, _c;
        if (this.proxyAction) {
            return {
                file: '---',
                func: '<proxy action>',
                // action: this.proxyAction,
                proxyAction: this.proxyAction,
            };
        }
        let actionInfo = this.koaControllerActionMap[opt];
        if (!force && (actionInfo !== undefined || qry === undefined)) {
            return actionInfo;
        }
        const operation = this.getOperationByOpt(opt);
        const tag = (_c = (_a = operation[X_CONTROLLER]) !== null && _a !== void 0 ? _a : (_b = operation.tags) === null || _b === void 0 ? void 0 : _b[0]) !== null && _c !== void 0 ? _c : 'default';
        qry = qry;
        actionInfo = { file: tag + '.js', func: qry.method.toUpperCase() + ' ' + qry.path };
        let ctl;
        if (OpenapiRouter.isEggApp) {
            ctl = OpenapiRouter.app.controller;
            const ctlDirs = this.config.controllerDir.split('/');
            for (const iDir of ctlDirs) {
                if (iDir === '')
                    continue;
                ctl = ctl === null || ctl === void 0 ? void 0 : ctl[iDir];
                if (!ctl) {
                    break;
                }
            }
            const controllerPath = tag.split('/');
            for (const iPath of controllerPath) {
                if (iPath === '')
                    continue;
                ctl = ctl === null || ctl === void 0 ? void 0 : ctl[iPath];
                if (!ctl) {
                    break;
                }
            }
        }
        else {
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
            }
            catch (e) {
                // this.logger.error(e);
            }
        }
        if (ctl) {
            let func = qry.method.toUpperCase() + ' ' + qry.path;
            actionInfo.action = ctl[func];
            if (!actionInfo.action) {
                func = 'ALL ' + qry.path;
                actionInfo.action = ctl[func];
            }
            if (!actionInfo.action) {
                func = qry.path;
                actionInfo.action = ctl[func];
            }
            if (!actionInfo.action) {
                func = qry.method.toUpperCase() + ' ' + qry.path;
            }
            actionInfo.func = func;
            if (typeof actionInfo.action === 'function') {
                actionInfo.ctl = ctl;
                // actionInfo.action = actionInfo.action.bind(ctl);
            }
            else {
                actionInfo.action = undefined;
            }
            this.koaControllerActionMap[opt] = actionInfo;
        }
        return actionInfo;
    }
    /**
     * @private
     */
    getKoaControllerActionFile(opt) {
        var _a, _b;
        const operation = this.getOperationByOpt(opt);
        const tag = (_b = (_a = operation.tags) === null || _a === void 0 ? void 0 : _a[0]) !== null && _b !== void 0 ? _b : 'default';
        return path.join(this.config.controllerDir, tag);
    }
    /**
     * 重新扫描读取openapi文档
     *
     * load/reload OpenApi-doc
     */
    loadOpenapi() {
        return new Promise((resolve, rejects) => {
            let docsDir = this.config.docsDir;
            if (!fs.existsSync(docsDir)) {
                const err = new Error(`no such directory, stat '${docsDir}',  prefix='${this.config.routerPrefix}'`);
                this.logger.error(err);
                rejects(err);
            }
            this.close(false);
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
            let docFilename = '';
            if (fs.statSync(docsDir).isFile()) {
                docFilename = docsDir;
                docsDir = path.dirname(docFilename);
                this.logger.info(`scan file : ${docsDir}`);
            }
            else {
                this.logger.info(`scan dir : ${docsDir}`);
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
                    this.logger.info(`file watcher enabled : ${docsDir}`);
                    monitor.setMaxListeners(100);
                    monitor.on('changed', handler).on('created', handler).on('created', handler);
                }
                await Promise.all(promisArr);
                resolve(true);
            });
        });
    }
    /**
     * dispose current OpeanapiRouter
     */
    close(dispose = true) {
        var _a;
        // reset
        (_a = this.watchMonitor) === null || _a === void 0 ? void 0 : _a.stop();
        // watch.unwatchTree(docsDir);
        this.filesToConnect = [];
        this.operationMap = {};
        this.docsRefs = {};
        this.optInDoc = {};
        if (dispose) {
            this.proxyAction = undefined;
        }
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
                const opt = iMethod.toUpperCase() + ' ' + this.config.routerPrefix + iPath2;
                if (this.operationMap[opt] !== undefined) {
                    this.logger.warn(`duplicate operation : '${opt}' in '${filename}' OVERWRITED`);
                    // continue;
                }
                this.optInDoc[filename] = (_b = this.optInDoc[filename]) !== null && _b !== void 0 ? _b : [];
                this.optInDoc[filename].push(opt);
                const iOperation = iPathItem[iMethod];
                iOperation[exports.X_OAS_VER] = specVersion;
                this.operationMap[opt] = iOperation;
                const actionInfo = this.getKoaControllerAction(opt, { method: iMethod, path: iPath2 });
                this.addRouter(iMethod, iPath2, actionInfo);
                // const fullOpt = `${iMethod.toUpperCase()} ${this.routerPrefix}${iPath2}`;
                if (actionInfo.action !== undefined) {
                    this.logger.debug(`openapi-router connected success : method='${iMethod.toUpperCase()}' path='${this.config.routerPrefix}${iPath2}' from >   ${actionInfo.file}#'${actionInfo.func}'`);
                }
                else {
                    this.logger.error(`openapi-router connect failed : method='${iMethod.toUpperCase()}' path='${this.config.routerPrefix}${iPath2}' from >   ${actionInfo.file}#'${actionInfo.func}'`);
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
    addRouter(method, path, actionInfo) {
        if (OpenapiRouter.isEggApp) {
            path = this.config.routerPrefix + path;
            if (actionInfo.action) {
                OpenapiRouter.app.router[method.toLowerCase()](path, this.action, proxyActionMw, actionInfo.action);
            }
            else {
                OpenapiRouter.app.router[method.toLowerCase()](path, this.action, proxyActionMw);
            }
        }
        else {
            this._router[method.toLowerCase()](path, this.action);
        }
    }
}
exports.OpenapiRouter = OpenapiRouter;
OpenapiRouter.isEggApp = false;
// #region global file watcher
OpenapiRouter._openapiRouters = [];
/**
 * 记录指定outter file已经被哪些OpenapiRouter监控中
 */
OpenapiRouter.filewatchsByOr = {};
OpenapiRouter.filewatchs = {};
function proxyActionMw(ctx, next) {
    var _a;
    const proxyAction = (_a = ctx[OpenapiRouterAction_1.CTX_OPEANAPI_ROUTER]) === null || _a === void 0 ? void 0 : _a.proxyAction;
    if (proxyAction) {
        proxyAction(ctx, next);
    }
    else {
        next();
    }
}
