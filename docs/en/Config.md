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

#### IOpenapiRouterConfig
```ts
export type IOpenapiRouterConfig = {

  /**
   * Prefix for koa-router.
   */
  routerPrefix: string;

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

#### IOpenapiRouterOptions
```ts
export type IOpenapiRouterOptions = {

  logger?: ILogger,

  isEggApp: boolean,

  useAllowedMethods: boolean,

  /**
   * the middleware before all action called
   */
  proxyAction?: KoaControllerAction,


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
     * when `instance` value is `undefined`, set `instance` to `default` in schema
     * @default true
     */
    useDefault: boolean,

    /**
     * `true` is recommanded in dev env.
     * @default false
     */
    reponse: boolean
  },
};
```







#### Init config `createOpenapiRouterConfig()`
```ts
import { createOpenapiRouterConfig } from '@rickyli79/koa-openapi-router';
const config = createOpenapiRouterConfig({
  routerPrefix: '/my/api',
  controllerDir: path.join(process.cwd(), 'controller'),
  docsDir: path.join(process.cwd(), 'oas-doc'),
});
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

#### More for `config.routerPrefix`
Besides `config.routerPrefix`, prefix can be declared in the OpenAPI document through `x-path-prefix`.
```ts
// app init
OpenapiRouter.Start(app, 
  {
    routerPrefix: '/top/prefix',
    controllerDir: path.join(process.cwd(), 'controller'),
    docsDir: path.join(process.cwd(), 'oas-doc/my.oas3.yaml'),
  }
);
```
```yaml
# oas-doc/my.oas3.yaml
openapi: 3.0.0
info:
  title: "API"
  version: "1.0.0"
x-path-prefix: /my/api # all paths in this doc with have this prefix
paths:
  /hello:
    get:
      responses: 
        200:
          description: ok
```
```ts
// controller/defalut.js
const Controller = require('egg').Controller;
class HelloController extends Controller {
  async 'GET /my/api/hello'( ctx ) {
    ctx.status = 200;
  }
}
module.exports = HelloController;
```
Then the `path` shuld be: `/top/prefix/my/api/hello`

[Example of `prefix`](../../allure.test/suite/routerPrefix.allure.ts)