import { IRouterContext } from 'koa-router';

export default class {
  async '/nihao'(ctx: IRouterContext) {
    ctx.body = 'nihao world';
  }

}
