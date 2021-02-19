# @rickyli79/koa-openapi-router
English | [[简体中文]](../../README.zh-CN.md)

[[Overview]][1] | Config | [[Controller]][3] | [[Validate]][4] | [[File Watcher]][5]

[1]:../../README.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---
## Config

#### Definition
```ts
export type IOpenapiRouterConfig = {

  /**
   * Prefix for all routes.
   */
  prefix?: string;

  /**
   * controller folder name
   * @example
   * ```typescript
   * path.join(process.cwd(), "controller/openapi")
   * ```
   */
  controllerDir: string,

  /**
   * folder of openapi docs
   * @example
   * ```typescript
   * path.join(process.cwd(), "openapi-doc")
   * ```
   */
  docsDir: string,


  /**
   * Indicates whether all subdirectories should be watched, or only the current directory. This applies when a directory is specified by `#docsDir`
   * @default true
   */
  recursive: boolean;

  /**
   * Watch file/dir. This is for dev. DON NOT enable in prod env.
   */
  watcher: {
    /**
     * @default false
     */
    enabled: boolean,
    /**
     * scan file every `interval` ms
     * @default 3000
     */
    interval: number,
  };


  /**
   * validation config
   */
  validSchema: {
    /**
     * @default true
     */
    request: boolean,

    /**
     * `true` is recommanded in develment env.
     * @default false
     */
    reponse: boolean
  },

  /**
   * if set, all operation will lead to this handler
   */
  proxyAction?: KoaControllerAction,

};
```

#### Init by `getConfig()`
```ts
import { createOpenapiRouterConfig } from '@rickyli79/koa-openapi-router';
const config = createOpenapiRouterConfig({
  routerPrefix: '/my/api',
  controllerDir: path.join(process.cwd(), 'controller'),
  docsDir: path.join(process.cwd(), 'oas-doc'),
});
```

#### Init by `new ()`
```ts
import { OpenapiRouter } from '@rickyli79/koa-openapi-router';
const router = new Router();
const openapiRouter = new OpenapiRouter(
  {
    routerPrefix: '/my/api',
    controllerDir: path.join(process.cwd(), 'controller'),
    docsDir: path.join(process.cwd(), 'oas-doc'),
  });
openapiRouter.loadOpenapi();
app.use(router.routes());  // same as : app.use(openapiRouter.getRouter().routes());
```
#### Init by `OpenapiRouter.Start()`
```ts
import { OpenapiRouter } from '@rickyli79/koa-openapi-router';
// ... app init
OpenapiRouter.Start(app, 
  {
    routerPrefix: '/my/api',
    controllerDir: path.join(process.cwd(), 'controller'),
    docsDir: path.join(process.cwd(), 'oas-doc'),
  }
);
```