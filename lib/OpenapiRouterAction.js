"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTX_OPEANAPI_ROUTER = exports.CTX_OPERATION_SCHEMA = exports.OPENAPI_RQEUST_BODY_SCHEMA = void 0;
const tslib_1 = require("tslib");
/* eslint-disable @typescript-eslint/no-var-requires */
const jsonschema = tslib_1.__importStar(require("jsonschema"));
const OpenapiRouter_1 = require("./OpenapiRouter");
const Test_Response_Header_1 = require("./Test-Response-Header");
const types_1 = require("./types");
const OPEANAPI_PREFIX = 'x-openapi-';
const HEADER_MARKER = `${OPEANAPI_PREFIX}mark`;
const HEADER_MARKER_ACCEPT_CONTENT_TYPES = `${HEADER_MARKER}accept-content-types`;
const HEADER_MARKER_REQUEST_BODY_REQUIRED = `${HEADER_MARKER}quest-body-required`;
const HEADER_MARKER_RESPONSE_CONTENT_TYPES = `${HEADER_MARKER}response-content-types`;
exports.OPENAPI_RQEUST_BODY_SCHEMA = `${OPEANAPI_PREFIX}request-bodySchema`;
exports.CTX_OPERATION_SCHEMA = Symbol(`OpenapiRouterAction#${types_1.OPERATION_SCHEMA}`);
exports.CTX_OPEANAPI_ROUTER = Symbol('OpenapiRouterAction#openapiRouter');
function OpenapiRouterAction(openapiRouter) {
    return async (ctx, next) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        // const prefix = (<any>ctx.router).opts.prefix ?? '';
        const opt = `${ctx.method.toUpperCase()} ${ctx.routerPath}`;
        const operation = openapiRouter.getOperationByOpt(opt);
        if (operation === undefined) {
            ctx.status = 404;
            return;
        }
        const config = openapiRouter.config;
        const actionInfo = openapiRouter.getKoaControllerAction(opt);
        if (config.test.enabled) {
            const controllerFile = openapiRouter.getKoaControllerActionFile(opt) + config.test.controllerFileExt;
            ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_CONTROLLER_FILE, controllerFile);
            ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_REQUEST_SCHEMA, JSON.stringify(operation));
        }
        if ((actionInfo === null || actionInfo === void 0 ? void 0 : actionInfo.proxyAction) === undefined && (actionInfo === null || actionInfo === void 0 ? void 0 : actionInfo.action) === undefined) {
            ctx.status = 501;
            return;
        }
        ctx[exports.CTX_OPEANAPI_ROUTER] = openapiRouter;
        const doc_ver = operation[OpenapiRouter_1.X_OAS_VER];
        if (config.validSchema.request) {
            let bodyRequired = false;
            let bodySchema;
            if (operation.parameters !== undefined) {
                for (const iOpt of operation.parameters) {
                    let iOptRequired = (_a = iOpt.required) !== null && _a !== void 0 ? _a : false;
                    let para;
                    let location = iOpt.in;
                    switch (iOpt.in) {
                        case 'path':
                            para = ctx.params[iOpt.name];
                            break;
                        case 'query':
                            para = ctx.query[iOpt.name];
                            break;
                        case 'header':
                            para = ctx.get(iOpt.name);
                            if (para === '') {
                                para = undefined;
                            }
                            break;
                        case 'cookie':
                            para = ctx.cookies.get(iOpt.name);
                            break;
                        case 'body':
                            bodyRequired = iOptRequired;
                            bodySchema = iOpt.schema;
                            iOptRequired = false;
                            para = undefined;
                            location = 'unknown';
                            break;
                        default:
                            para = undefined;
                            location = 'unknown';
                            break;
                    }
                    if (para !== undefined) {
                        try {
                            if (iOpt.schema.type !== 'string') {
                                if (iOpt.schema.type === 'integer') {
                                    para = Number.parseInt(para);
                                }
                                else if (iOpt.schema.type === 'float') {
                                    para = Number.parseFloat(para);
                                }
                            }
                            jsonschema.validate(para, iOpt.schema, { throwFirst: true, throwError: true });
                        }
                        catch (err) {
                            ctx.status = 422;
                            const e = err.errors[0];
                            const re = { location, property: e.property, message: e.message };
                            ctx.body = re;
                            return;
                        }
                    }
                    else if (iOptRequired === true) {
                        ctx.status = 422;
                        ctx.body = { message: `'${iOpt.name}' in '${location}' required` };
                        return;
                    }
                }
            }
            // #region `body` validation
            {
                let acceptContentTypes = operation[HEADER_MARKER_ACCEPT_CONTENT_TYPES];
                let requestBodyRequired = operation[HEADER_MARKER_REQUEST_BODY_REQUIRED];
                let contentType;
                if (acceptContentTypes === undefined) {
                    acceptContentTypes = {};
                    if (doc_ver === 2) {
                        for (const iContentType of (_b = operation.consumes) !== null && _b !== void 0 ? _b : []) {
                            acceptContentTypes[iContentType] = true;
                        }
                        requestBodyRequired = bodyRequired;
                    }
                    else {
                        for (const iContentType in (_c = operation.requestBody) === null || _c === void 0 ? void 0 : _c.content) {
                            requestBodyRequired = requestBodyRequired || ((_d = operation.requestBody) === null || _d === void 0 ? void 0 : _d.required);
                            acceptContentTypes[iContentType] = true;
                        }
                    }
                    operation[HEADER_MARKER_ACCEPT_CONTENT_TYPES] = acceptContentTypes;
                    operation[HEADER_MARKER_REQUEST_BODY_REQUIRED] = requestBodyRequired !== null && requestBodyRequired !== void 0 ? requestBodyRequired : false;
                }
                const ctxContentType = ctx.request.get('content-type');
                if (acceptContentTypes) {
                    if (acceptContentTypes[ctxContentType]) {
                        contentType = ctxContentType;
                    }
                    else {
                        for (const iContentType in acceptContentTypes) {
                            if (ctx.is(iContentType) !== false) {
                                contentType = iContentType;
                                break;
                            }
                        }
                    }
                }
                if (!contentType && requestBodyRequired && acceptContentTypes) {
                    if (acceptContentTypes || ctxContentType) {
                        ctx.status = 415;
                        return;
                    }
                }
                const reqBodySchema = doc_ver === 2 ? bodySchema : (_f = (_e = operation.requestBody) === null || _e === void 0 ? void 0 : _e.content[contentType]) === null || _f === void 0 ? void 0 : _f.schema;
                ctx[exports.OPENAPI_RQEUST_BODY_SCHEMA] = reqBodySchema;
                if (Object.keys(ctx.request.body).length === 0) {
                    if (requestBodyRequired !== true) {
                        // pass
                    }
                    else {
                        ctx.status = 422;
                        ctx.body = { message: 'request `body` required' };
                        return;
                    }
                }
                else if (reqBodySchema) {
                    try {
                        jsonschema.validate(ctx.request.body, reqBodySchema, { throwError: true, throwFirst: true });
                    }
                    catch (err) {
                        ctx.status = 422;
                        const e = err.errors[0];
                        const re = { location: 'body', property: e.property, message: e.message };
                        ctx.body = re;
                        return;
                    }
                }
            }
            // #endregion
        }
        ctx[exports.CTX_OPERATION_SCHEMA] = operation;
        ctx.getOperation = getOperation.bind(ctx);
        ctx.getRequestBodySchema = getRequestBodySchema.bind(ctx);
        if (OpenapiRouter_1.OpenapiRouter.isEggApp) {
            await next();
        }
        else {
            await ((_g = actionInfo.proxyAction) !== null && _g !== void 0 ? _g : actionInfo.action)(ctx, next);
        }
        if (config.validSchema.reponse) {
            do {
                let toBreak = false;
                const reponseSchema = operation.responses[ctx.status];
                const resHeaders = reponseSchema === null || reponseSchema === void 0 ? void 0 : reponseSchema.headers;
                for (const iHeaderName in resHeaders) {
                    let iHaderValue = ctx.response.get(iHeaderName);
                    if (resHeaders[iHeaderName].required === true && !iHaderValue) {
                        OpenapiRouter_1.OpenapiRouter.logger.error(new SyntaxError(`'${iHeaderName}' in 'response.header' required`));
                        if (config.test.enabled) {
                            ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '415');
                        }
                        toBreak = true;
                        break;
                    }
                    else if (resHeaders[iHeaderName].schema) {
                        const schema = resHeaders[iHeaderName].schema;
                        try {
                            if (schema.type !== 'string') {
                                if (schema.type === 'integer') {
                                    iHaderValue = Number.parseInt(iHaderValue);
                                }
                                else if (schema.type === 'float') {
                                    iHaderValue = Number.parseFloat(iHaderValue);
                                }
                            }
                            jsonschema.validate(iHaderValue, schema, { throwFirst: true, throwError: true });
                        }
                        catch (err) {
                            OpenapiRouter_1.OpenapiRouter.logger.error(err.errors[0]);
                            if (config.test.enabled) {
                                ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '422');
                            }
                            toBreak = true;
                            break;
                        }
                    }
                }
                if (toBreak)
                    break;
                if (reponseSchema) {
                    try {
                        let responseContentTypes = reponseSchema[HEADER_MARKER_RESPONSE_CONTENT_TYPES];
                        let contentType;
                        if (responseContentTypes === undefined) {
                            responseContentTypes = {};
                            if (doc_ver === 2) {
                                for (const iContentType of (_h = operation.produces) !== null && _h !== void 0 ? _h : []) {
                                    responseContentTypes[iContentType] = true;
                                }
                            }
                            else {
                                for (const iContentType in reponseSchema === null || reponseSchema === void 0 ? void 0 : reponseSchema.content) {
                                    responseContentTypes[iContentType] = true;
                                }
                            }
                            reponseSchema[HEADER_MARKER_RESPONSE_CONTENT_TYPES] = responseContentTypes;
                        }
                        const ctxContentType = ctx.response.get('content-type');
                        if (responseContentTypes) {
                            if (responseContentTypes[ctxContentType]) {
                                contentType = ctxContentType;
                            }
                            else {
                                for (const iContentType in responseContentTypes) {
                                    if (ctx.response.is(iContentType) !== false) {
                                        contentType = iContentType;
                                        break;
                                    }
                                }
                            }
                        }
                        if (!contentType && ctxContentType && config.test.enabled) {
                            ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
                            break;
                        }
                        const resContentSchema = doc_ver === 2 ? (_j = reponseSchema) === null || _j === void 0 ? void 0 : _j.schema : (_l = (_k = reponseSchema === null || reponseSchema === void 0 ? void 0 : reponseSchema.content) === null || _k === void 0 ? void 0 : _k[contentType !== null && contentType !== void 0 ? contentType : 'default']) === null || _l === void 0 ? void 0 : _l.schema;
                        if (resContentSchema !== undefined) {
                            try {
                                jsonschema.validate(ctx.body, resContentSchema, { throwError: true, throwFirst: true });
                            }
                            catch (err) {
                                OpenapiRouter_1.OpenapiRouter.logger.error(err.errors[0]);
                                if (config.test.enabled) {
                                    ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '422');
                                    break;
                                }
                            }
                        }
                    }
                    catch (err) {
                        OpenapiRouter_1.OpenapiRouter.logger.error(err);
                    }
                }
                else {
                    if (config.test.enabled) {
                        ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
                        break;
                    }
                }
                ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '200');
                // eslint-disable-next-line no-constant-condition
            } while (false);
            if (config.test.enabled) {
                if (!ctx.response.get(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS)) {
                    ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '200');
                }
            }
        }
    };
}
exports.default = OpenapiRouterAction;
function getOperation() {
    return this[exports.CTX_OPERATION_SCHEMA];
}
function getRequestBodySchema() {
    return this[exports.OPENAPI_RQEUST_BODY_SCHEMA];
}
/*
function preValidateProperty(instance: any, _key: string, schema: Schema): any {
  if (typeof instance === 'string' && schema.type) {
    let result: number;
    switch (schema.type) {
      case 'integer':
        result = Number.parseInt(instance);
        return result ? result : 0;
      case 'number':
        result = Number.parseFloat(instance);
        return result ? result : 0;
      case 'object':
      case 'array':
      case 'boolean':
        try {
          return JSON.parse(instance);
        } catch (err) {
          return instance;
        }

      default:
        return instance;
    }
  }
  return instance;
}

function rewrite(instance: any, schema: Schema): any {
  if (
    typeof instance === 'string'
    && ((Array.isArray(schema.type) && schema.type.includes('string')) || schema.type === 'string')
    && schema.format
  ) {
    switch (schema.format) {
      case 'date-time':
      case 'date':
        return new Date(instance);
      default:
        return instance;
    }
  }
  return instance;
}
 */
