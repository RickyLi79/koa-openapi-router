import { IOpenapiRouterConfig } from './types';

const defaultOpenapiRouterConfig:IOpenapiRouterConfig = {
  controllerDir: '',
  docsDir: '',

  recursive: true,
  watcher: {
    enabled: true,
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

export default defaultOpenapiRouterConfig;
