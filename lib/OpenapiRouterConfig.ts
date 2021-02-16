import extend from 'extend';
import { IOpenapiRouterConfig, IOptionalOpenapiRouterConfig } from './types';

export const defaultOpenapiRouterConfig:IOpenapiRouterConfig = {
  controllerDir: '',
  docsDir: '',

  recursive: true,
  watcher: {
    enabled: false,
    interval: 3000,
  },

  validSchema: {
    request: true,
    reponse: false,
  },
  test: {
    enabled: false,
    controllerFileExt: '.js',
  },
};

export function getConfig(config:IOptionalOpenapiRouterConfig):IOpenapiRouterConfig {
  return extend(true, {}, defaultOpenapiRouterConfig, config);
}
