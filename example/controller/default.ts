import { IRouterContext } from 'koa-router';

export default class {
  async 'ALL /hello'(ctx: IRouterContext) {
    ctx.body = 'hello world';
  }
  async 'POST /hello'(ctx: IRouterContext) {
    ctx.body = `hello ${ctx.request.body!.name}`;
  }

}
