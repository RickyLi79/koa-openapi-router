import { Next } from 'koa';
import Router, { IRouterOptions, IRouterContext } from 'koa-router';
export interface ILogger {
  error(msg: any, ...args: any[]): void;
  warn(msg: any, ...args: any[]): void;
  info(msg: any, ...args: any[]): void;
  debug(msg: any, ...args: any[]): void;
}
export declare type KoaControllerAction = (ctx: IRouterContext, next?: Next) => Promise<any>;
export declare type IOptionalOpenapiRouterConfig = PowerPartial<IOpenapiRouterConfig> & {
  controllerDir: string;
  docsDir: string;
};
export declare type IOpenapiRouterConfig = {
  /**
     * controller folder name
     * @example
     * ```typescript
     * path.join(process.cwd(), "controller/openapi")
     * ```
     */
  controllerDir: string;
  /**
     * folder of openapi docs
     * @example
     * ```typescript
     * path.join(process.cwd(), "openapi-doc")
     * ```
     */
  docsDir: string;
  /**
     * wath file/dir
     */
  watcher: {
    enabled: boolean;
    interval: number;
  };
  /**
     * @default true
     */
  recursive: boolean;

  /**
     * validation config
     */
  validSchema: {
    request: boolean;
    reponse: boolean;
  };
  proxyAction?: KoaControllerAction;

  /**
   * @private
   */
  test: {
    enabled: boolean;
    controllerFileExt: '.ts' | '.js';
  };
};
export declare type IOpenapiRouterFactoryConfig = {
  router: Router | IRouterOptions;
  config: IOptionalOpenapiRouterConfig;
};
export declare const OPERATION_SCHEMA = 'operation-schema';
export declare type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends object ? PowerPartial<T[U]> : T[U];
};
