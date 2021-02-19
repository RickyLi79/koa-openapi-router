import http from 'http';
import Koa from 'koa';
import bodyparser from 'koa-bodyparser';
import path from 'path';
import supertest from 'supertest';
import { createOpenapiRouterConfig, OpenapiRouter } from '..';


describe('index.test', () => {
  let server:http.Server;
  let app:Koa;
  before(() => {
    app = new Koa();
    app.use(bodyparser());
    server = app.listen();
  });

  it('call before init, expect 404', async () => {
    const agent = supertest.agent(server);

    await agent
      .get('/my/api/pets')
      .expect(404);
  });

  it('init `OpenapiRouter`', async () => {
    const config = createOpenapiRouterConfig({
      routerPrefix: '/my/api',
      controllerDir: path.join(__dirname, 'controller'),
      docsDir: path.join(__dirname, 'oas-doc'),
    });
    await OpenapiRouter.Start(app, config);
  });

  it('call after expect 200', async () => {
    const agent = supertest.agent(server);

    await agent
      .get('/my/api/pets')
      .expect(200);
  });

});

