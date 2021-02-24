# @rickyli79/koa-openapi-router
[[English]](../../README.md) | 简体中文

[[总览]][1] | [[Config 配置]][2] | Controller 控制器 | [[Validate 校验]][4] | [[File Watcher 文件监控]][5]

[1]:../../README.zh-CN.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---

## Controller 控制器
`OpenapiRouter` 会尝试通过约定规则定位Controller，并调用符合命名规则的method

### controller命名规则
`OpenapiRouter` 会通过每个`path`中的`x-controller`定位控制器文件。
如果没有`x-controller`若无给出，则会取值`default`。

#### 例子 : controller file 控制器文件命名规则 
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

### method命名规则
`OpenapiRouter` 会依次尝试调用控制器中第一个可用的method: `"GET /my/path"` / `"ALL /my/path"` / `"/my/path"`

#### 例子 : method命名规则
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
    // 会第一个被尝试调用
  };
  exports['ALL /my/path'] = async ctx => {
    // 如果'GET /my/path'不存在，则会调用该method
  };
  exports['/my/path'] = async ctx => {
    // 如果'GET /my/path'和'ALL /my/path'不存在，则会调用该method
  };
  ```

- `typescript`
  ```ts
  // {contorller}/my/tag.ts
  import { IRouterContext } from 'koa-router';

  export default class {
    async 'GET /my/path'(ctx: IRouterContext) {
      // 会第一个被尝试调用
    }

    async 'ALL /my/path'(ctx: IRouterContext) {
      // 如果'GET /my/path'不存在，则会调用该method
    }

    async '/my/path'(ctx: IRouterContext) {
      // 如果'GET /my/path'和'ALL /my/path'不存在，则会调用该method
    }

  }
  ```

#### `path` method 的特殊命名规则
OpenApi-doc 示例 :
```yaml
  opeanapi: 3.0.0
  ...
  paths:
    /pets/{petId}:
    get:
      x-controller: pets
```
`OpenapiRouter` 将会寻找method: `'GET /pets/:petId'`。

`'GET /pets/{petId}'` 是不符合约定的命名，将永远不会被尝试调用。

controller代码示例 :
```ts
// {contorller}/pets.ts
import { IRouterContext } from 'koa-router';
export default class {
  async 'GET /pets/:petId'(ctx: IRouterContext) {
    // 正确的method命名
  }

  async 'GET /pets/{petId}'(ctx: IRouterContext) {
    throw new Error('不符合约定的method命名')
  }
}
```

### 通过logger确认是否命名正确、
如果无法确定controller和method是否命名正确，可通过logger给出的信息进行调整。
- 命名正确的logger信息 :
  ```js
  [connected] : method='POST' path='POST /myapi/register' from > 'user.js' # 'POST /register'
  ```
- 命名错误导致失败的logger信息 :
  ```js
  [notImpelement] : method='POST' path='POST /myapi/login' from > 'default.js' # 'POST /login'
  ```