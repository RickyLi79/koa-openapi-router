# @rickyli79/koa-openapi-router
[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@rickyli79/koa-openapi-router.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@rickyli79/koa-openapi-router
[download-image]: https://img.shields.io/npm/dm/@rickyli79/koa-openapi-router.svg?style=flat-square
[download-url]: https://npmjs.org/package/@rickyli79/koa-openapi-router

[[English]](./README.md) | 简体中文

总览 | [[Config 配置]][2] | [[Controller 控制器]][3] | [[Validate 校验]][4] | [[File Watcher 文件监控]][5]

[1]:README.md
[2]:./docs/zh-CN/Config.md
[3]:./docs/zh-CN/Controller.md
[4]:./docs/zh-CN/Validate.md
[5]:./docs/zh-CN/FileWatcher.md

---
#### 简述
- 通过给定的Openapi-doc初始化`koa-router`，并定位`controller`里面的`method`
- 根据给定Openapi-doc中的schema，校验request和response
- 监控Openapi-doc的文件变化，无需重启app便会对router生效。 方便开发。

#### 安装

```shell
npm i -S @rickyli79/koa-openapi-router
```

#### 使用示例
[Example](./test)

#### 测试报告
[Allure Report](https://rickyli79.gitee.io/testing-reports/koa-openapi-router/allure-report/)

#### egg-plugin version
https://github.com/RickyLi79/egg-openapi-router

