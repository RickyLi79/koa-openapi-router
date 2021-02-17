import Koa from 'koa';
import { getConfig, OpenapiRouter } from '@rickyli79/koa-openapi-router';
import Router from 'koa-router';
import bodyparser from 'koa-bodyparser';
import path from 'path';

const PORT = 5500;

const app = new Koa();
app.use(bodyparser());

const config = getConfig({
  controllerDir: path.join(process.cwd(), 'controller'),
  docsDir: path.join(process.cwd(), 'oas-doc'),
});

const router = new Router({ prefix: '/my/api' });
OpenapiRouter.Start(app, { router, config });

app.listen(PORT);
