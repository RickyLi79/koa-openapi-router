import { RouterContext } from 'koa-router';

export default class {
  async 'GET /path3/of/api1'(ctx:RouterContext) {
    ctx.body = 'GET /path3/of/api1';
  }

  async 'POST /path3/of/api1'(ctx:RouterContext) {
    ctx.body = { result: ctx.request.body.num * 2 };
  }

  async 'ALL /path3/of/api1'(ctx:RouterContext) {
    ctx.throw(new Error('never'));
  }

  async '/path3/of/api1'(ctx:RouterContext) {
    ctx.throw(new Error('never'));
  }

  async 'ALL /path4/of/api1'(ctx:RouterContext) {
    ctx.body = 'ALL /path4/of/api1';
  }

  async '/path4/of/api1'(ctx:RouterContext) {
    ctx.throw(new Error('never'));
  }

  async '/path5/of/api1'(ctx:RouterContext) {
    ctx.body = 'none /path5/of/api1';
  }
}
