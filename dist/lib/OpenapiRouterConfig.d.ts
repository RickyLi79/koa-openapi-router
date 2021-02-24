import { IOpenapiRouterConfig, IOptionalOpenapiRouterConfig } from './types';
/**
 * recommanded config in production env
 */
export declare const defaultOpenapiRouterConfig: IOpenapiRouterConfig;
/**
 * create a OpenapiRouterConfig , extend the default value
 * @see #defaultOpenapiRouterConfig
 */
export declare function createOpenapiRouterConfig(config: IOptionalOpenapiRouterConfig, ...configs: IOptionalOpenapiRouterConfig[]): IOpenapiRouterConfig;
export declare function createOpenapiRouterConfigByDefault(configs: IOptionalOpenapiRouterConfig[]): IOpenapiRouterConfig[];
