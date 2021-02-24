# @rickyli79/koa-openapi-router
English | [[简体中文]](../../README.zh-CN.md)

[[Overview]][1] | [[Config]][2] | Controller | [[Validate]][4] | [[File Watcher]][5]

[1]:../../README.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---

## Controller
`OpenapiRouter` will try to locate Controller and calls the method.

### controller file 
`OpenapiRouter` will try to locate file by schema `x-controller`. default value is `default` if not given.

#### example : controller file 
```yaml
  openapi: 3.0.0
  paths:
    /the/path/1:
      get:
        x-controller: my/ctl-1
        description: no `x-controller`
    /the/path/2:
      get:
        description: no `x-controller`, with `x-controller`
        x-controller: my/ctl-2
        ....
    /the/path/3:
      get:
        description: no `x-controller`, no `x-controller`
        ...
```
```
app-root
└── controller
    ├── default.js  // method 'GET /the/path/3' should be found here
    └── my
        ├── ctl-1.js  // method 'GET /the/path/1' should be found here
        └── ctl-2.js  // method 'GET /the/path/2' should be found here
```

### method name in controller
`OpenapiRouter` will calls first aviable method named `"GET /my/path"` / `"ALL /my/path"` / `"/my/path"` in controller file

#### example : method name in controller
```yaml
  opeanapi: 3.0.0
  ...
  paths:
    /my/path:
      get:
        x-controller: my/tag
        ....
```
- `javascript`
  ```js
  // {contorller}/my/tag.js
  exports['GET /my/path'] = async ctx => {
    // will be called first
  };
  exports['ALL /my/path'] = async ctx => {
    // will be called if 'GET /my/path' not exists
  };
  exports['/my/path'] = async ctx => {
    // will be called if 'GET /my/path' and 'ALL /my/path' not exists
  };
  ```

- `typescript`
  ```ts
  // {contorller}/my/tag.ts
  import { IRouterContext } from 'koa-router';

  export default class {
    async 'GET /my/path'(ctx: IRouterContext) {
      // will be called first
    }

    async 'ALL /my/path'(ctx: IRouterContext) {
      // will be called if 'GET /my/path' not exists
    }

    async '/my/path'(ctx: IRouterContext) {
      // will be called if 'GET /my/path' and 'ALL /my/path' not exists
    }

  }
  ```

#### `path` method name
OpenApi-doc expample :
```yaml
  opeanapi: 3.0.0
  ...
  paths:
    /pets/{petId}:
    get:
      x-controller: pets
```
`OpenapiRouter` will calls `'GET /pets/:petId'`.

`'GET /pets/{petId}'` will never be called.

controller code example :
```ts
// {contorller}/pets.ts
import { IRouterContext } from 'koa-router';
export default class {
  async 'GET /pets/:petId'(ctx: IRouterContext) {
    // correct method name
  }

  async 'GET /pets/{petId}'(ctx: IRouterContext) {
    throw new Error('incorrect method name')
  }
}
```

### check the logger
if not sure controller file and method name. logger will tells the correct way.
- success logger example :
  ```js
  [connected] : method='POST' path='POST /myapi/register' from > 'user.js' # 'POST /register'
  ```
- failed logger example :
  ```js
  [notImpelement] : method='POST' path='POST /myapi/login' from > 'default.js' # 'POST /login'
  ```