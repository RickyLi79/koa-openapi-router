## CHANGE LOG

### 1.2.0
**Refactorings**
- controller path detecting only check `x-controller-folder` and `x-controller`
- action name in controller SHOULD NOT includes `prefix` any more

### 1.1.11

**New Features**
- OpenapiDoc `x-path-prefix`
- OpenapiDoc `x-mute-env`
- add Response Header when `config.test.enabled === true`

### 1.0.0

**New Features**
- init `koa-router` and connect `controller` by Openapi-doc
- validate the request and response by Openapi-doc
- watch Openapi-doc changes, no need to reboot app. handy in develment environment
