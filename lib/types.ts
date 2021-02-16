import { Next } from 'koa';
import Router, { IRouterOptions, IRouterContext } from 'koa-router';

export interface ILogger {
  error(msg: any, ...args: any[]): void;
  warn(msg: any, ...args: any[]): void;
  info(msg: any, ...args: any[]): void;
  debug(msg: any, ...args: any[]): void;
}

export type KoaControllerAction = (ctx: IRouterContext, next?: Next) => Promise<any>;

export type IOptionalOpenapiRouterConfig = PowerPartial<IOpenapiRouterConfig> & { controllerDir: string, docsDir: string };

export type IOpenapiRouterConfig = {
  /**
   * controller folder name
   * @example
   * ```typescript
   * path.join(process.cwd(), "controller/openapi")
   * ```
   */
  controllerDir: string,

  /**
   * folder of openapi docs
   * @example
   * ```typescript
   * path.join(process.cwd(), "openapi-doc")
   * ```
   */
  docsDir: string,

  /**
   * wath file/dir
   */
  watcher: {
    enabled: boolean,
    interval: number,
  };

  /**
   * @default true
   */
  recursive: boolean;

  /**
   * validation config
   */
  validSchema: {
    request: boolean,
    reponse: boolean
  },

  proxyAction?: KoaControllerAction,

  test: {
    enabled: boolean;
    controllerFileExt: '.ts' | '.js'
  };
};

export type IOpenapiRouterFactoryConfig = { router: Router | IRouterOptions, config: IOptionalOpenapiRouterConfig };

export const OPERATION_SCHEMA = 'operation-schema';

export type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends object
    ? PowerPartial<T[U]>
    : T[U]
};
