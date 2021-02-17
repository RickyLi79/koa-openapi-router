# @rickyli79/koa-openapi-router
[[English]](../../README.md) | 简体中文

[[总览]][1] | Config 配置 | [[Controller 控制器]][3] | [[Validate 校验]][4] | [[File Watcher 文件监控]][5]

[1]:../../README.zh-CN.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---
## Config 配置 

#### 定义
```ts
export type IOpenapiRouterConfig = {
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

#### 通过`getConfig()`初始化
```ts
import { getConfig } from 'koa-openapi-router';
const config = getConfig({
  controllerDir: path.join(process.cwd(), 'controller'),
  docsDir: path.join(process.cwd(), 'oas-doc'),
});
```

#### 通过`new ()`初始化
```ts
import { OpenapiRouter } from 'koa-openapi-router';
const router = new Router();
const openapiRouter = new OpenapiRouter(router,
  {
    controllerDir: path.join(process.cwd(), 'controller'),
      docsDir: path.join(process.cwd(), 'oas-doc'),
  });
openapiRouter.loadOpenapi();
app.use(router.routes());  // same as : app.use(openapiRouter.getRouter().routes());

/**
 * the follow code is NOT recommended when `config.watcher.enabled===true`
 */
app.use(router.allowedMethods());
```
#### 通过工厂方法`OpenapiRouter.Start()`初始化
```ts
import { OpenapiRouter } from 'koa-openapi-router';
// ... app init
OpenapiRouter.Start(app, {
  router: { prefix: '/my/api' },
  config: {
    controllerDir: path.join(process.cwd(), 'controller'),
     docsDir: path.join(process.cwd(), 'oas-doc'),
   },
});
```
