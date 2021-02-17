# @rickyli79/koa-openapi-router
[[English]](../../README.md) | 简体中文

[[总览]][1] | [[Config 配置]][2] | [[Controller 控制器]][3] | [[Validate 校验]][4] | File Watcher 文件监控

[1]:../../README.zh-CN.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---

## File Watcher 文件监控
如果启用，`OpenapiRouter`会监控文件/目录的变化。

任何以下变动都会自动同步到`OpenapiRouter`的router配置，无需重启app。
- 有新的OpeanApi-doc新增。 *当给定`docsDir`是目录时*
- 现存的OpeanApi-doc被移除。
- 现存的OpeanApi-doc其内容有任意修改。
- 不在`docsDir`目录内，但又被`$ref`指定依赖关系的文档，有任何内容变动。

*只会监控这些文件 : `'.json' | '.yml' | '.yaml'`*

>***注意事项/建议：在生产环境下不要启动该功能***
