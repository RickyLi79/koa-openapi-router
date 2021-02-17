# @rickyli79/koa-openapi-router
English | [[简体中文]](../../README.zh-CN.md)

[[Overview]][1] | [[Config]][2] | [[Controller]][3] | [[Validate]][4] | File Watcher

[1]:../../README.md
[2]:./Config.md
[3]:./Controller.md
[4]:./Validate.md
[5]:./FileWatcher.md

---

## File Watcher
when set to `true`, `OpenapiRouter` will watch the file/dir.

Any follow changes will sync to router connect in `OpenapiRouter`. no need to reboot app.
- valid file ext name : `'.json' | '.yml' | '.yaml'`
- new OpeanApi-doc added.  *when `docsDir` is dir*
- exists OpeanApi-doc removed.
- any content changed in OpeanApi-doc
- any file not in `docsDir`, but `$ref` by OpenApi-doc, content changed.

*valid file ext name : `'.json' | '.yml' | '.yaml'`*

>***Caution : don't enable this in production environment***
