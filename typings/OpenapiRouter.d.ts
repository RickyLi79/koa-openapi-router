/// <reference types="koa-bodyparser" />
import Koa from 'koa';
import Router from 'koa-router';
import { ILogger, IOpenapiRouterConfig as OpenapiRouterConfig, IOpenapiRouterFactoryConfig as OpenapiRouterFactoryConfig, IOptionalOpenapiRouterConfig as OptionalOpenapiRouterConfig, KoaControllerAction } from './types';
export declare const X_OAS_VER = 'x-oas-ver';
export declare class OpenapiRouter {
  getOperationByOpt(opt: string): any;
  static get logger(): ILogger;
  static set logger(value: ILogger);
  readonly config: OpenapiRouterConfig;
  constructor(router: Router, config: OptionalOpenapiRouterConfig);
  static closeAll(): void;
  toString(): string;
  get routerPrefix(): any;
  getRouter(): Router;
  static Start(app: Koa, configs: OpenapiRouterFactoryConfig | (OpenapiRouterFactoryConfig[]), logger?: ILogger): Promise<void>;
  static getOpenapiRouters(): OpenapiRouter[];
  proxyAction: KoaControllerAction | undefined;
  getKoaControllerAction(opt: string, qry?: {
    method: string;
    path: string;
  }): KoaControllerAction | undefined;
  getKoaControllerActionFile(opt: string): string;
  /**
         * 重新扫描读取openapi文档
         */
  loadOpenapi(): Promise<boolean>;
  close(): void;
}
