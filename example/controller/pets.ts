import { IRouterContext } from 'koa-router';

export default class {
  async 'GET /pets'(ctx: IRouterContext) {
    const pets: any[] = [];
    const limit = ctx.query.limit ?? 20;
    for (let i = 0; i < limit; i++) {
      pets.push({
        id: i,
        name: `pet:${i}`,
        tag: 'dog',
      });
    }
    ctx.status = 200;
    ctx.body = pets;
  }

  async 'POST /pets'(ctx: IRouterContext) {
    ctx.status = 201;
  }

  async 'GET /pets/:petId'(ctx: IRouterContext) {
    const petId = Number.parseInt(ctx.params.petId);
    if (!Number.isNaN(petId)) {
      ctx.status = 200;
      ctx.body = {
        id: petId,
        name: `pet:${petId}`,
        tag: 'cat',
      };

    } else {
      ctx.status = 404;
      ctx.body = 'pet not found';
    }
  }
}
