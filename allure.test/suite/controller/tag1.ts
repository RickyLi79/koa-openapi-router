import { Context } from 'koa';

export default class {
  async 'GET /path2/of/api1'(ctx:Context) {
    ctx.body = '/path2/of/api1';
  }
}
