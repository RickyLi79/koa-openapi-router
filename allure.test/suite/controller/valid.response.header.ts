import { RouterContext } from 'koa-router';

export default class {

  async 'GET /valid/response/header'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.body = { ok: 1 };
  }

  async 'POST /valid/response/header'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.response.set('x-reponse-header', 'ok');
    ctx.body = { ok: 1 };

  }

  async 'PATCH /valid/response/header'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.response.set('x-reponse-header', 'a long long header text');
    ctx.body = { ok: 1 };
  }

  async 'DELETE /valid/response/header'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.response.set('x-reponse-header', 'ok');
    ctx.body = { ok: 1 };

  }

  async 'PUT /valid/response/header'(ctx: RouterContext) {
    ctx.status = 200;
    ctx.response.set('x-reponse-header', 'a long long header text');
    ctx.body = { ok: 1 };
  }

}
