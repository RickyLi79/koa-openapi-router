import { RouterContext } from 'koa-router';

export default class {

  async 'GET /valid/request/path/:p1/:p2'(ctx:RouterContext) {
    const { p1, p2 } = ctx.params;
    ctx.body = `p1=${p1}&p2=${p2}`;
  }

  async '/valid/request/header'(ctx:RouterContext) {
    ctx.body = 'ok';
  }

  async '/valid/request/query'(ctx:RouterContext) {
    ctx.body = 'ok';
  }

  async '/valid/request/cookie'(ctx:RouterContext) {
    ctx.body = 'ok';
  }

  async '/valid/request/body'(ctx:RouterContext) {
    ctx.body = 'ok';
  }

  async '/valid/request/contentType'(ctx:RouterContext) {
    ctx.body = 'ok';
  }
}
