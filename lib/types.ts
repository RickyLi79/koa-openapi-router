import { Next } from 'koa';
import { IRouterContext } from 'koa-router';

export interface ILogger {
  error(msg: any, ...args: any[]): void;
  warn(msg: any, ...args: any[]): void;
  info(msg: any, ...args: any[]): void;
  debug(msg: any, ...args: any[]): void;
}

export type KoaControllerAction = (ctx: IRouterContext, next?: Next) => Promise<any>;

export type IOpenapiRouterOptions = {
  logger?: ILogger,
  isEggApp?: boolean,
  useAllowedMethods?:boolean,
};

export type IOptionalOpenapiRouterConfig = PowerPartial<IOpenapiRouterConfig> & { controllerDir: string, docsDir: string };

export type IOpenapiRouterConfig = {


  /**
   * Prefix for koa-router.
   */
  routerPrefix: string;


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
   * Indicates whether all subdirectories should be watched, or only the current directory. This applies when a directory is specified by `#docsDir`
   * @default true
   */
  recursive: boolean;

  /**
   * Watch file/dir. This is for dev. DON NOT enable in prod env.
   */
  watcher: {
    /**
     * @default false
     */
    enabled: boolean,
    /**
     * scan file every `interval` ms
     * @default 3000
     */
    interval: number,
  };


  /**
   * validation config
   */
  validSchema: {
    /**
     * @default true
     */
    request: boolean,

    /**
     * `true` is recommanded in dev env.
     * @default false
     */
    reponse: boolean
  },

  /**
   * if set, all operation will lead to this handler
   */
  proxyAction?: KoaControllerAction,

  /**
   * @private
   */
  test: {
    enabled: boolean;
    controllerFileExt: '.ts' | '.js'
  };
};

export const OPERATION_SCHEMA = 'operation-schema';

export type PowerPartial<T> = {
  [U in keyof T]?: T[U] extends object
    ? PowerPartial<T[U]>
    : T[U]
};

export interface Schema {
  $id?: string
  id?: string
  $schema?: string
  $ref?: string
  title?: string
  description?: string
  multipleOf?: number
  maximum?: number
  exclusiveMaximum?: number | boolean
  minimum?: number
  exclusiveMinimum?: number | boolean
  maxLength?: number
  minLength?: number
  // pattern?: string | RegExp
  additionalItems?: boolean | Schema
  items?: Schema | Schema[]
  maxItems?: number
  minItems?: number
  uniqueItems?: boolean
  maxProperties?: number
  minProperties?: number
  // required?: string[] | boolean
  additionalProperties?: boolean | Schema
  definitions?: {
    [name: string]: Schema
  }
  properties?: {
    [name: string]: Schema
  }
  patternProperties?: {
    [name: string]: Schema
  }
  dependencies?: {
    [name: string]: Schema | string[]
  }
  const?: any
  'enum'?: any[]
  type?: string | string[]
  format?: string
  allOf?: Schema[]
  anyOf?: Schema[]
  oneOf?: Schema[]
  not?: Schema
  if?: Schema
  then?: Schema
  else?: Schema

  examples?: any[]
  propertyNames?: Schema | boolean
  required?: string[]
  pattern?: string;
  contains?: Schema | boolean;
}

export interface OperationSchema {
  'x-oas-ver': 2 | 3;

  tags?: string[];
  parameters?: {
    name: string;
    in: 'path' | 'query' | 'header' | 'cookie' | 'body',
    schema: Schema,
    required?: boolean
  }[];
  responses: {
    [status: string]: {
      description: string;
      headers?: {
        [field: string]: {
          required?: boolean;
          schema: Schema;
        }
      }
      content?: {
        [contentType: string]: {
          example?: any;
          examples?: any[];
          schema?: Schema
        };
      }
    }
  }

  [key: string]: any;
}
