import { IRouterContext } from 'koa-router';

export default class {
  async 'GET /path1/of/api1'(ctx:IRouterContext) {
    ctx.body = '/path1/of/api1';
  }
  async 'GET /path2/of/api1'(ctx:IRouterContext) {
    ctx.body = '/path2/of/api1';
  }
}
