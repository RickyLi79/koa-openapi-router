/* eslint-disable @typescript-eslint/no-var-requires */
import SwaggerParser from '@apidevtools/swagger-parser';
import extend from 'extend';
import * as fs from 'fs';
import { Next } from 'koa';
import Router, { IRouterContext } from 'koa-router';
import * as path from 'path';
import * as watch from 'watch';
import { FileOrFiles } from 'watch';
import OpenapiRouterAction, { MARKER_OPERATION_MUTED } from './OpenapiRouterAction';
import { defaultOpenapiRouterConfig } from './OpenapiRouterConfig';
import { ControllerStatusEnum, ILogger, IOpenapiRouterConfig, IOpenapiRouterOptions, IOptionalOpenapiRouterConfig, KoaControllerAction, OperationSchema, PowerPartial } from './types';

export const OPENAPI_ROUTER_LOGGER = Symbol('OpenapiRouter#openapiRouterLogger');
const OPENAPI_ROUTER_MIDDLEWARE = Symbol('OpenapiRouter#openapiRouterMiddlerware');
export const X_OAS_VER = 'x-oas-ver';
const X_IGNORE_PATHS = 'x-ignore-paths';
const X_CONTROLLER = 'x-controller';
const X_CONTROLLER_FOLDER = 'x-controller-folder';
const X_PREFIX = 'x-path-prefix';

export type KoaControllerActionInfo = { mute: boolean, file: string, func: string, action?: KoaControllerAction, ctlPath?: string, ctl?: any, proxyAction?: (ctx: IRouterContext, next?: Next) => Promise<any> };

const OPENAPI_FILE_EXTS = { '.json': true, '.yaml': true, '.yml': true };
function isDocsExt(file: string) {
  return OPENAPI_FILE_EXTS[path.extname(file).toLowerCase()] !== undefined;
}

export class OpenapiRouter {
  // #region private
  // private static filesToConnect: string[];

  private filesToConnect: string[] = [];// 延迟读取api文档的临时任务列表
  private docsRefs: { [doc: string]: Set<string> } = {};// 记录单个文档被其它哪些文档引用过

  private optInDoc: { [doc: string]: string[] } = {};// 单个api文档中包含的所有operation

  private operationMap: { [opt: string]: OperationSchema } = {};// 整个router中已注册的url所对应的schema

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

    if (!OpenapiRouter.isEggApp) {
      this._router = new Router({ prefix: config.routerPrefix });
    }
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

  private readonly _router!: Router;
  public getRouter(): Router {
    return this._router;
  }

  public static isEggApp = false;
  private static app: any;
  public static testMode = false;
  public static options: IOpenapiRouterOptions;
  public static async Start(app: any, configs: IOptionalOpenapiRouterConfig | (IOptionalOpenapiRouterConfig[]), options?: PowerPartial<IOpenapiRouterOptions>) {
    this.options = extend(true, {},
      {
        absChar: '~',

        isEggApp: false,

        useAllowedMethods: false,

        testMode: false,
        recursive: true,

        watcher: {
          enabled: false, interval: 3000,
        },
        validSchema: {
          request: true,
          useDefault: true,
          reponse: false,
        },
        options,
      },
      options);
    if (this.options.logger) this.logger = this.options.logger;
    this.proxyAction = this.options.proxyAction;
    this.testMode = !!this.options.testMode;
    this.app = app;
    this.isEggApp = !!this.options.isEggApp;
    if (!Array.isArray(configs)) { configs = [ configs ]; }
    const promiseArr: Promise<boolean>[] = [];
    for (const iConfig of configs) {
      const openapiRouter = new OpenapiRouter(iConfig);
      promiseArr.push(openapiRouter.loadOpenapi());
      if (!this.isEggApp) {
        app.use(openapiRouter._router.routes());
        if (this.options.useAllowedMethods) {
          app.use(openapiRouter._router.allowedMethods());
        }
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
  /*
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
 */
  // #endregion

  public static proxyAction?: KoaControllerAction;

  private koaControllerActionMap: { [opt: string]: KoaControllerActionInfo } = {};

  /**
   * @private
   */
  public getKoaControllerAction(opt: string, qry?: { ctlPath: string, prefix: string, mute: boolean, method: string, path: string }, force = false): KoaControllerActionInfo {
    if (OpenapiRouter.proxyAction) {
      return {
        file: '---',
        func: '<proxy action>',
        // action: this.proxyAction,
        proxyAction: OpenapiRouter.proxyAction,
        mute: qry?.mute ?? false,
        ctlPath: qry?.ctlPath,
      };
    }
    let actionInfo: KoaControllerActionInfo = this.koaControllerActionMap[opt];
    if (!force && (actionInfo !== undefined || qry === undefined)) {
      return actionInfo;
    }
    // const operation: any = this.getOperationByOpt(opt);
    qry = qry!;
    const ctlPath: string = qry.ctlPath;
    actionInfo = { ctlPath: qry.ctlPath, mute: qry.mute, file: ctlPath + '.js', func: qry.method.toUpperCase() + ' ' + qry.path };

    let ctl: any;
    if (OpenapiRouter.isEggApp) {
      ctl = OpenapiRouter.app.controller;
      const ctlDirs = this.config.controllerDir.split('/');
      for (const iDir of ctlDirs) {
        if (iDir === '') continue;
        ctl = ctl?.[iDir];
        if (!ctl) { break; }
      }
      const controllerPath = ctlPath.split('/');

      for (const iPath of controllerPath) {
        if (iPath === '') continue;
        ctl = ctl?.[iPath];
        if (!ctl) { break; }
      }
    } else {

      try {
        const ctlCls = require(path.join(this.config.controllerDir, ctlPath));
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
      const absPath = opt.split(' ')[1];
      const absChar = OpenapiRouter.options.absChar;
      let func = qry.method.toUpperCase() + ' ' + qry.path;
      actionInfo.action = ctl[func];
      if (!actionInfo.action) {
        func = `${absChar}${qry.method.toUpperCase()} ${absPath}`;
        actionInfo.action = ctl[func];
      }
      if (!actionInfo.action) {
        func = 'ALL ' + qry.path;
        actionInfo.action = ctl[func];
      }
      if (!actionInfo.action) {
        func = `${absChar}ALL ${absPath}`;
        actionInfo.action = ctl[func];
      }
      if (!actionInfo.action) {
        func = qry.path;
        actionInfo.action = ctl[func];
      }
      if (!actionInfo.action) {
        func = `${absChar}${absPath}`;
        actionInfo.action = ctl[func];
      }

      if (!actionInfo.action) {
        func = qry.method.toUpperCase() + ' ' + qry.path;
      }

      actionInfo.func = func;
      if (typeof actionInfo.action === 'function') {
        actionInfo.ctl = ctl;
        // actionInfo.action = actionInfo.action.bind(ctl);
      } else {
        actionInfo.action = undefined;
      }
      this.koaControllerActionMap[opt] = actionInfo;
    }
    if (actionInfo.file.startsWith('/')) {
      actionInfo.file = actionInfo.file.substr(1);
    }
    return actionInfo;
  }

  /**
   * @private
   */
  public getKoaControllerActionFile(opt: string) {
    const operation: any = this.getOperationByOpt(opt);
    const tag = operation[X_CONTROLLER] ?? 'default';
    return path.join(this.config.controllerDir, tag);
  }

  // #endregion

  private watchMonitor!: watch.Monitor;
  // private watchMonitorOutter: watch.Monitor;
  /**
   * 重新扫描读取openapi文档
   *
   * load/reload OpenApi-doc
   */
  private loadOpenapi() {
    return new Promise<boolean>((resolve, rejects) => {
      let docsDir = this.config.docsDir;
      if (!fs.existsSync(docsDir)) {
        const err = new Error(`no such directory, stat '${docsDir}',  prefix='${this.config.routerPrefix}'`);
        this.logger.error(err);
        rejects(err);
      }

      this.close();

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
        this.logger.info(`scan file : ${docFilename}`);
      } else {
        this.logger.info(`scan dir : ${docsDir}`);
      }

      watch.createMonitor(docsDir,
        {
          interval: OpenapiRouter.options.watcher.interval / 1000,
          filter: (file, stat) => {
            if (docFilename !== '') {
              return file === docFilename;
            }

            if (stat.isDirectory()) {
              return OpenapiRouter.options.recursive;
            }
            return isDocsExt(file);
          },
        },
        async monitor => {
          this.watchMonitor = monitor;
          const promisArr: Promise<any>[] = [];
          for (const iFilename in monitor.files) {
            const fsState: fs.Stats = monitor.files[iFilename];
            if (fsState.isFile()) {
              promisArr.push(this.connectOneApi(iFilename));
            }
          }
          if (!OpenapiRouter.options.watcher.enabled) {
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
  public close() {
    // reset
    this.watchMonitor?.stop();
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

    if (api[X_IGNORE_PATHS] === true) {
      this.logger.info(`SKIPPED '${filename}' by '${X_IGNORE_PATHS}'`);
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

        if (OpenapiRouter.options.watcher.enabled) {
          if (!this.wactchingFile.has(iFilename)) {
            OpenapiRouter.watchOutterFile(this, iFilename);
          }
        }
      }
    }
    const prefix = api[X_PREFIX] ?? '';
    const ctlPath = getControllerStr(api[X_CONTROLLER_FOLDER], true);
    const appEnv = OpenapiRouter.app.config?.env ?? OpenapiRouter.app.env;
    let docMuteArr = (api['x-mute-env'] as string | string[]) ?? [];
    if (!Array.isArray(docMuteArr)) docMuteArr = [ docMuteArr ];
    for (const iPath in api.paths) {
      const iPathItem = api.paths[iPath];
      for (const iMethod in iPathItem) {
        const iOperation = iPathItem[iMethod];
        const iPrefix = prefix + (iOperation[X_PREFIX] ?? '');
        const iCtlPath = ctlPath + getControllerStr(iOperation[X_CONTROLLER], false);
        const iPath2 = iPath.replace(/{/g, ':').replace(/}/g, ''); // /api/{user}/{id} => /api/:user/:id
        const opt = iMethod.toUpperCase() + ' ' + this.config.routerPrefix + iPrefix + iPath2;
        if (this.operationMap[opt] !== undefined) {
          this.logger.warn(`duplicate operation : '${opt}' in '${filename}' OVERWRITED`);
          // continue;
        }
        this.optInDoc[filename] = this.optInDoc[filename] ?? [];
        this.optInDoc[filename].push(opt);
        this.operationMap[opt] = iOperation;

        iOperation[X_OAS_VER] = specVersion;
        let mute = docMuteArr.includes(appEnv);
        if (!mute) {
          let optMuteArr = (iOperation['x-mute-env'] as string | string[]) ?? [];
          if (!Array.isArray(optMuteArr)) optMuteArr = [ optMuteArr ];
          mute = optMuteArr.includes(appEnv);
        }
        iOperation[MARKER_OPERATION_MUTED] = mute;
        const actionInfo = this.getKoaControllerAction(opt, { mute, ctlPath: iCtlPath, prefix: iPrefix, method: iMethod, path: iPath2 }, true);
        this.addRouter(iMethod, iPrefix + iPath2, actionInfo);
        if (!actionInfo.mute) {

          if (actionInfo.proxyAction !== undefined) {
            this.markControllerStats(ControllerStatusEnum.PROXY, iMethod, `${opt}`, '<proxyAction>)');
          } else if (actionInfo.action !== undefined) {
            this.markControllerStats(ControllerStatusEnum.CONNECTED, iMethod, `${opt}`, `'${actionInfo.file}' # '${actionInfo.func}'`);
          } else {
            this.markControllerStats(ControllerStatusEnum.NotImpelemented, iMethod, `${opt}`, `'${actionInfo.file}' # '${actionInfo.func}'`);
          }
        } else {
          this.markControllerStats(ControllerStatusEnum.MUTED, iMethod, `${opt}`, '<null>', `app.env==='${appEnv}', x-mute-env==='${JSON.stringify(iOperation['x-mute-env'])}`);
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

  private addRouter(method: string, path: string, actionInfo: KoaControllerActionInfo) {
    if (OpenapiRouter.isEggApp) {
      path = this.config.routerPrefix + path;
      if (actionInfo.action) {
        OpenapiRouter.app.router[method.toLowerCase()](
          path,
          this.action, proxyActionMw,
          actionInfo.action,
        );
      } else {
        OpenapiRouter.app.router[method.toLowerCase()](
          path,
          this.action, proxyActionMw,
        );
      }
    } else {
      this._router[method.toLowerCase()](
        path,
        this.action,
      );
    }
  }

  private markControllerStats(status: ControllerStatusEnum, method: string, path: string, dest: string, extraMsg?: string) {
    const message = `[${status}] : method='${method.toUpperCase()}' path='${path}' from > ${dest} ${extraMsg ? '| ' + extraMsg : ''}`;
    switch (status) {
      case ControllerStatusEnum.NotImpelemented:
        this.logger.error(message);
        break;

      default:
        this.logger.info(message);
        break;
    }
  }
}


async function proxyActionMw(ctx: IRouterContext, next: Next) {
  const proxyAction = OpenapiRouter.proxyAction;
  let re: any;
  if (proxyAction) {
    re = proxyAction(<any>ctx, next);
  } else {
    re = next();
  }
  if (re instanceof Promise) {
    re = await re;
  }
}


function getControllerStr(str: string | string[], isFolder: boolean) {
  str = str ?? '';

  if (Array.isArray(str)) {
    str = str[0];
  }
  if (typeof str !== 'string') {
    throw new Error(`'${X_CONTROLLER_FOLDER}' or '${X_CONTROLLER}' MUST be \`string\``);
  }

  if (!str.startsWith('/')) {
    str = '/' + str;
  }
  if (str.endsWith('/')) {
    str = str.substr(0, str.length - 1);
  }
  if (str === '' && !isFolder) {
    str = '/default';
  }

  return str;
}
