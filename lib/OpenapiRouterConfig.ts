import extend from 'extend';
import { IOpenapiRouterConfig, IOptionalOpenapiRouterConfig } from './types';

/**
 * recommanded config in production env
 */
export const defaultOpenapiRouterConfig: IOpenapiRouterConfig = {

  routerPrefix: '',

  controllerDir: '',
  docsDir: '',

};


/**
 * create a OpenapiRouterConfig , extend the default value
 * @see #defaultOpenapiRouterConfig
 */
export function createOpenapiRouterConfig(config: IOptionalOpenapiRouterConfig, ...configs: IOptionalOpenapiRouterConfig[]): IOpenapiRouterConfig {
  return extend(true, {}, defaultOpenapiRouterConfig, config, ...configs);
}

export function createOpenapiRouterConfigByDefault(configs: IOptionalOpenapiRouterConfig[]): IOpenapiRouterConfig[] {
  const result:IOpenapiRouterConfig[] = [];
  for (const iConfig of configs) {
    result.push(extend(true, {}, defaultOpenapiRouterConfig, iConfig));
  }
  return result;
}

