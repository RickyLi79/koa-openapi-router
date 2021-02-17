# @rickyli79/koa-openapi-router
[[English]](../../README.md) | 简体中文

[[总览]][1] | [[Config 配置]][2] | [[Controller 控制器]][3] | Validate 校验 | [[File Watcher 文件监控]][5]

[1]:../../README.zh-CN.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---

## Validate 校验

### Request校验

#### Request校验的内容
- `content-type`
- `parameters` in `path/query/cookie/header`
- `body`

无效的请求内容会直接返回`415 'unsupported media type'`或者`422 'unprocessable entity'`。***后续method将不会被调用***.

### Response校验

#### Response校验的内容
- `content-type`
- `header` / `cookie`
- `body`

无效的响应内容不会抛出任何异常`Error`，仅会在logger给出警告提示。

>*在开发/调试环境下启用该选项，可尽早发现不符合Openapi-doc描述规范的情况*


