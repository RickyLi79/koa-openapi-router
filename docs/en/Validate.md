# @rickyli79/koa-openapi-router
English | [[简体中文]](../../README.zh-CN.md)

[[Overview]][1] | [[Config]][2] | [[Controller]][3] | Validate | [[File Watcher]][5]

[1]:../../README.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---

## Validate

### Request validation

#### request content to be validated
- `content-type`
- `parameters` in `path/query/cookie/header`
- `body`

invalid request content will cause `415 'unsupported media type'` or `422 'unprocessable entity'` status. And ***the follow method won't be called***.

### Response validation

#### response content to be validated
- `content-type`
- `header` / `cookie`
- `body`

invalid response content won't cause any `Error`, just logger the message. 

>***It's useful in develment environment***


