import { RouterContext } from 'koa-router';

export default class {
  async 'GET /path/of/api1'(ctx:RouterContext) {
    ctx.body = '/path/of/api1';
  }

  async 'GET /path2/of/api1'(ctx:RouterContext) {
    ctx.body = 'never';
  }

  async 'GET /path/parameter/:p1/:p2'(ctx:RouterContext) {
    const { p1, p2 } = ctx.params;
    ctx.body = `p1=${p1}&p2=${p2}`;
  }
}
