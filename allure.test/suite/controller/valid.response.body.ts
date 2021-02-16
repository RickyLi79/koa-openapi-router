import { RouterContext } from 'koa-router';

export default class {

  async 'GET /valid/response/body'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.body = { ok: 1 };
    ctx.response.set('content-type', 'application/json');
  }

  async 'POST /valid/response/body'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.body = { ok: 1 };
    ctx.response.set('content-type', 'application/json');
  }

  async 'PATCH /valid/response/body'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.body = { ok: 1 };
    ctx.response.set('content-type', 'application/json');
  }

}
