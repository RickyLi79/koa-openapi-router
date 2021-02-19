/* eslint-disable @typescript-eslint/no-var-requires */
import SwaggerParser from '@apidevtools/swagger-parser';
import extend from 'extend';
import * as fs from 'fs';
import Router from 'koa-router';
import * as path from 'path';
import * as watch from 'watch';
import { FileOrFiles } from 'watch';
import OpenapiRouterAction from './OpenapiRouterAction';
import { defaultOpenapiRouterConfig } from './OpenapiRouterConfig';
import { ILogger, IOpenapiRouterConfig, IOpenapiRouterOptions, IOptionalOpenapiRouterConfig, KoaControllerAction, OperationSchema } from './types';

export const OPENAPI_ROUTER_LOGGER = Symbol('OpenapiRouter#openapiRouterLogger');
const OPENAPI_ROUTER_MIDDLEWARE = Symbol('OpenapiRouter#openapiRouterMiddlerware');
export const X_OAS_VER = 'x-oas-ver';
const X_CONTROLLER = 'x-controller';

type KoaControllerActionInfo = { file: string, func: string, action?: KoaControllerAction };

const OPENAPI_FILE_EXTS = { '.json': true, '.yaml': true, '.yml': true };
function isDocsExt(file: string) {
  return OPENAPI_FILE_EXTS[path.extname(file).toLowerCase()] !== undefined;
}

export class OpenapiRouter {
  // #region private
  // private static filesToConnect: string[];

  private filesToConnect: string[];// 延迟读取api文档的临时任务列表
  private docsRefs: { [doc: string]: Set<string> };// 记录单个文档被其它哪些文档引用过

  private optInDoc: { [doc: string]: string[] };// 单个api文档中包含的所有operation

  private operationMap: { [opt: string]: OperationSchema };// 整个router中已注册的url所对应的schema
  /**
   * @private
   */
  public getOperationByOpt(opt: string) {
    return this.operationMap[opt];
  }
  // #endregion

  // #region init

  public static get logger(): ILogger {
    return this[OPENAPI_ROUTER_LOGGER] ?? console;
  }

  public static set logger(value: ILogger) {
    this[OPENAPI_ROUTER_LOGGER] = value;
  }

  public readonly config: IOpenapiRouterConfig;

  public constructor(config: IOptionalOpenapiRouterConfig) {

    this.config = extend(true, {}, defaultOpenapiRouterConfig, config);

    this._router = new Router({ prefix: config.routerPrefix });
    this.proxyAction = config.proxyAction;
    OpenapiRouter._openapiRouters.push(this);
  }

  /**
   * dispose all working OpenapiRouter
   */
  public static closeAll() {
    while (this._openapiRouters.length > 0) {
      const iOr = this._openapiRouters.shift();
      iOr?.close();
    }
  }

  public toString() {
    return `[OpenapiRouter (prefix=${this.config.routerPrefix})]`;
  }

  private readonly _router: Router;
  public getRouter(): Router {
    return this._router;
  }

  public static isEggApp = false;
  private static app: any;
  public static async Start(app: any, configs: IOptionalOpenapiRouterConfig | (IOptionalOpenapiRouterConfig[]), options?: IOpenapiRouterOptions) {
    if (options?.logger) this.logger = options?.logger;
    this.app = app;
    this.isEggApp = !!options?.isEggApp;
    if (!Array.isArray(configs)) { configs = [ configs ]; }
    const promiseArr: Promise<boolean>[] = [];
    for (const iConfig of configs) {
      const openapiRouter = new OpenapiRouter(iConfig);
      promiseArr.push(openapiRouter.loadOpenapi());
      app.use(openapiRouter._router.routes());
      if (options?.useAllowedMethods) {
        app.use(openapiRouter._router.allowedMethods());
      }
    }
    await Promise.all(promiseArr);
  }

  // #endregion

  // #region getter
  private get logger() {
    return OpenapiRouter.logger;
  }

  // #region global file watcher
  private static readonly _openapiRouters: OpenapiRouter[] = [];
  public static getOpenapiRouters() {
    return this._openapiRouters;
  }

  /**
   * 记录指定outter file已经被哪些OpenapiRouter监控中
   */
  private static readonly filewatchsByOr: { [filename: string]: Set<OpenapiRouter> } = {};
  private static readonly filewatchs: { [filename: string]: fs.FSWatcher } = {};

  /**
   * 本OpenapiRouter正在监控的file
   */
  private readonly wactchingFile: Set<string> = new Set<string>();

  private static watchOutterFile(openapiRouter: OpenapiRouter, filename: string) {
    const handler = (event: string) => {
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
      let isWatching = false;
      if (this.filewatchsByOr[filename]?.size > 0) {
        isWatching = true;
      } else {
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
        const orWatchs = this.filewatchsByOr[filename] = this.filewatchsByOr[filename] ?? new Set<OpenapiRouter>();
        orWatchs.add(openapiRouter);
        this.filewatchs[filename] = fw;
      }
    }, 1000);
  }

  private static unwatchOutterFile(openapiRouter: OpenapiRouter, filename: string) {
    if (this.filewatchsByOr[filename]?.size === 0) {
      return;
    }
    this.filewatchsByOr[filename]?.delete(openapiRouter);
    if (this.filewatchsByOr[filename]?.size === 0) {
      this.filewatchs[filename].close();
      delete this.filewatchs[filename];
    }
  }

  private static outterFilewatchEventHandler(event: string, filename: string) {
    this.logger.debug('outterFilewatchEventHandler', event, filename);
    if (event === 'change') {
      this.filewatchsByOr[filename].forEach(or => {
        if (or.wactchingFile.has(filename)) {
          or.checkDocUpdated(filename, true);
        }
      });
    }
  }

  // #endregion

  /**
   * if set, all request will lead to this method.
   *
   * set `undefined` to resume normal mode
   */
  public proxyAction?: KoaControllerAction;
  private koaControllerActionMap: { [opt: string]: KoaControllerActionInfo } = {};

  /**
   * @private
   */
  public getKoaControllerAction(opt: string, qry?: { method: string, path: string }): KoaControllerActionInfo {
    if (this.proxyAction) {
      return {
        file: '---',
        func: '<proxy action>',
        action: this.proxyAction,
      };
    }
    let actionInfo: KoaControllerActionInfo = this.koaControllerActionMap[opt];
    if (actionInfo !== undefined || qry === undefined) {
      return actionInfo;
    }
    const operation: any = this.getOperationByOpt(opt);
    const tag: string = operation[X_CONTROLLER] ?? operation.tags?.[0] ?? 'default';
    actionInfo = { file: tag + '.js', func: qry.method.toUpperCase() + ' ' + qry.path };


    let ctl: any;
    if (OpenapiRouter.isEggApp) {
      const controllerPath = tag.split('/');
      ctl = OpenapiRouter.app.controller;
      for (const iPath of controllerPath) {
        ctl = ctl?.[iPath];
      }
    } else {

      try {
        const ctlCls = require(path.join(this.config.controllerDir, tag));
        if (ctlCls.__esModule) {
          if (typeof ctlCls.default === 'function') {
            ctl = new ctlCls.default();
          } else if (typeof ctlCls.default === 'object') {
            ctl = ctlCls.default;
          }
        } else {
          ctl = ctlCls;
        }

      } catch (e) {
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
        this.koaControllerActionMap[opt] = actionInfo;
      }
    }
    return actionInfo;
  }

  /**
   * @private
   */
  public getKoaControllerActionFile(opt: string) {
    const operation: any = this.getOperationByOpt(opt);
    const tag = operation.tags?.[0] ?? 'default';
    return path.join(this.config.controllerDir, tag);
  }

  // #endregion

  private watchMonitor: watch.Monitor;
  private watchMonitorOutter: watch.Monitor;
  /**
   * 重新扫描读取openapi文档
   *
   * load/reload OpenApi-doc
   */
  public loadOpenapi() {
    return new Promise<boolean>((resolve, rejects) => {
      let docsDir = this.config.docsDir;
      if (!fs.existsSync(docsDir)) {
        const err = new Error(`no such directory, stat '${docsDir}',  prefix='${this.config.routerPrefix}'`);
        this.logger.error(err);
        rejects(err);
      }

      this.close(false);

      const handler = (f: FileOrFiles, curr: fs.Stats, prev: fs.Stats) => {
        if (curr.isDirectory()) {
          return;
        }
        const filename: string = <any>f;
        if (prev === null) {
          // this.app.logger.info(`a new file created : ${filename}`);
          this.addDocToConnect(filename);
        } else if (curr.nlink === 0) {
          // this.app.logger.info(`a file was removed : ${filename}`);
          this.checkDocUpdated(filename, false);
        } else {
          // this.app.logger.info(`a file was changed : ${filename}`);
          this.checkDocUpdated(filename, false);
        }
      };


      let docFilename = '';
      if (fs.statSync(docsDir).isFile()) {
        docFilename = docsDir;
        docsDir = path.dirname(docFilename);
        this.logger.info(`scan file : ${docsDir}`);
      } else {
        this.logger.info(`scan dir : ${docsDir}`);
      }

      watch.createMonitor(docsDir,
        {
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
        },
        async monitor => {
          this.watchMonitor = monitor;
          // this.logger.info(monitor.files);
          const promisArr: Promise<any>[] = [];
          for (const iFilename in monitor.files) {
            const fsState: fs.Stats = monitor.files[iFilename];
            if (fsState.isFile()) {
              promisArr.push(this.connectOneApi(iFilename));
              // promisArr.push(this.connectOneApi(iFilename));
            }
          }
          if (!this.config.watcher.enabled) {
            watch.unwatchTree(docsDir);
          } else {
            this.logger.info(`file watcher enabled : ${docsDir}`);
            monitor.setMaxListeners(100);
            monitor.on('changed', handler).on('created', handler).on('created', handler);
          }
          await Promise.all(promisArr);
          resolve(true);
        },
      );
    });
  }

  /**
   * dispose current OpeanapiRouter
   */
  public close(dispose = true) {
    // reset
    this.watchMonitor?.stop();
    // watch.unwatchTree(docsDir);
    this.filesToConnect = [];
    this.operationMap = {};
    this.docsRefs = {};
    this.optInDoc = {};
    if (dispose) { this.proxyAction = undefined; }
    for (const iFilename of this.wactchingFile.values()) {
      OpenapiRouter.unwatchOutterFile(this, iFilename);
    }
    this.wactchingFile.clear();
  }

  private checkDocUpdated(filename: string, isOutterDoc: boolean) {
    const arr = this.docsRefs[filename] ?? new Set<string>();
    if (!isOutterDoc) {
      this.addDocToConnect(filename);
    } else {
      // this.logger.debug('checkDocUpdated isOutterDoc', filename);
    }
    for (const iDoc of arr.values()) {
      // this.logger.info(`a doc updated : '${filename}' -> $ref by '${iDoc}'`);
      this.addDocToConnect(iDoc);
    }
  }

  private addDocTimer?: NodeJS.Timer;
  private addDocToConnect(filename: string) {
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

  private async connectOneApi(filename: string) {
    this.wactchingFile.add(filename);

    {
      // 注销$ref关系
      for (const iDoc in this.docsRefs) {
        this.docsRefs[iDoc].delete(filename);
      }

      // 注销operationMap
      const opts = this.optInDoc[filename] ?? [];
      for (const iOpt of opts) {
        delete this.operationMap[iOpt];
      }
      this.optInDoc[filename] = [];
    }

    let api: any;
    try {
      api = await SwaggerParser.dereference(filename);
    } catch (err) {
      this.logger.debug(`${filename} is not an openapi-schema, SKIPPED`);
      return false;
    }

    const specVersion = api.swagger ? 2 : Number.parseInt(api.openapi);

    {
      // 记录$ref关系
      const resolve = await SwaggerParser.resolve(filename);
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
        this.optInDoc[filename] = this.optInDoc[filename] ?? [];
        this.optInDoc[filename].push(opt);

        const iOperation = iPathItem[iMethod];
        iOperation[X_OAS_VER] = specVersion;
        this.operationMap[opt] = iOperation;
        const actionInfo = this.getKoaControllerAction(opt, { method: iMethod, path: iPath2 });
        this.addRouter(iMethod, iPath2);
        // const fullOpt = `${iMethod.toUpperCase()} ${this.routerPrefix}${iPath2}`;
        if (actionInfo.action !== undefined) {
          this.logger.debug(`openapi-router connected success : method='${iMethod.toUpperCase()}' path='${this.config.routerPrefix}${iPath2}' from >   ${actionInfo.file}#'${actionInfo.func}'`);
        } else {
          this.logger.error(`openapi-router connect failed : method='${iMethod.toUpperCase()}' path='${this.config.routerPrefix}${iPath2}' from >   ${actionInfo.file}#'${actionInfo.func}'`);
        }
      }
    }

    return true;
  }

  private get action() {
    if (!this[OPENAPI_ROUTER_MIDDLEWARE]) {
      this[OPENAPI_ROUTER_MIDDLEWARE] = OpenapiRouterAction(this);
    }
    return this[OPENAPI_ROUTER_MIDDLEWARE];
  }

  private addRouter(method: string, path: string) {
    this._router[method.toLowerCase()](
      path,
      this.action,
    );
  }
}
