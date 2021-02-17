# @rickyli79/koa-openapi-router

[README][1] | [Config][2] | [Controller][3] | [Validate][4]

[1]:../../README.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md

## Controller
`OpenapiRouter` will try to locate Controller and calls the method.

### controller file 
`OpenapiRouter` will try to locate file by schema `tags[0]`. if `tags[0]` not given, will locate `default.js`

#### example : controller file 
```yaml
  opeanapi: 3.0.0
  ...
  paths:
    /my/path:
      get:
        description: with `tags[0]`
        tags:
          - my/tag
        ....
    /other/path:
      get:
        description: no `tags[0]`
        ...
```
```
app-root
└── controller
    ├── default.js  // 'GET /other/path' will be find here
    └── my
        └── tag.js  // 'GET /my/path' will be find here
```

### method name in controller
`OpenapiRouter` and calls first aviable method named `"GET /my/path"` / `"ALL /my/path"` / `"/my/path"` in controller file

#### example : method name in controller
```yaml
  opeanapi: 3.0.0
  ...
  paths:
    /my/path:
      get:
        tags:
          - my/tag
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
assume an OpenApi doc :
```yaml
  opeanapi: 3.0.0
  ...
  paths:
    /pets/{petId}:
    get:
      tags:
        - pets
```
`OpenapiRouter` will calls `"GET /pets/:petId"`.

`"GET /pets/{petId}"` will never be called.

code example
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
if not sure controller file and method name. logger will display how.

- success
  ```
  openapi-router connected : method='GET' path='/my/api/hello' from >   default.js#'ALL /hello'
  ```
- failed
  ```
  Can not connnect router : method='GET' path='/my/api/nihao' from >   default.js#'GET /nihao'
  ```