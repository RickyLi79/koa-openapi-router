import { OperationSchema, Schema } from './lib/types';

export { OpenapiRouter } from './lib/OpenapiRouter';
export * from './lib/types';
export { defaultOpenapiRouterConfig, createOpenapiRouterConfig, createOpenapiRouterConfigByDefault } from './lib/OpenapiRouterConfig';

declare module 'koa-router' {
  interface IRouterContext {
    getOperation(): OperationSchema;
    getRequestBodySchema(): Schema;
    getRequestQuery(): any;
  }
}
