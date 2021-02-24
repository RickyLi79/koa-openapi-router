"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CTX_OPEANAPI_ROUTER = exports.CTX_OPERATION_SCHEMA = exports.OPENAPI_RQEUST_BODY_SCHEMA = exports.MARKER_OPERATION_MUTED = void 0;
const tslib_1 = require("tslib");
const jsonschema = tslib_1.__importStar(require("jsonschema"));
const extend_1 = require("./extend");
const OpenapiRouter_1 = require("./OpenapiRouter");
const Test_Response_Header_1 = require("./Test-Response-Header");
const types_1 = require("./types");
const OPEANAPI_PREFIX = 'x-openapi-';
const HEADER_MARKER = `${OPEANAPI_PREFIX}mark-`;
const HEADER_MARKER_ACCEPT_CONTENT_TYPES = `${HEADER_MARKER}accept-content-types`;
const HEADER_MARKER_REQUEST_BODY_REQUIRED = `${HEADER_MARKER}quest-body-required`;
const HEADER_MARKER_RESPONSE_CONTENT_TYPES = `${HEADER_MARKER}response-content-types`;
exports.MARKER_OPERATION_MUTED = `${HEADER_MARKER}operation-muted`;
exports.OPENAPI_RQEUST_BODY_SCHEMA = `${OPEANAPI_PREFIX}request-bodySchema`;
exports.CTX_OPERATION_SCHEMA = Symbol(`OpenapiRouterAction#${types_1.OPERATION_SCHEMA}`);
exports.CTX_OPEANAPI_ROUTER = Symbol('OpenapiRouterAction#openapiRouter');
function OpenapiRouterAction(openapiRouter) {
    return async (ctx, next) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        // const prefix = (<any>ctx.router).opts.prefix ?? '';
        const opt = `${ctx.method.toUpperCase()} ${ctx.routerPath}`;
        const config = openapiRouter.config;
        const operation = openapiRouter.getOperationByOpt(opt);
        if (OpenapiRouter_1.OpenapiRouter.testMode) {
            ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_TEST_ENABLED, true);
        }
        if (operation[exports.MARKER_OPERATION_MUTED]) {
            if (OpenapiRouter_1.OpenapiRouter.testMode) {
                ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_ACTION_MUTED, true);
            }
            ctx.status = 404;
            return;
        }
        if (operation === undefined) {
            ctx.status = 404;
            return;
        }
        const actionInfo = openapiRouter.getKoaControllerAction(opt);
        if (OpenapiRouter_1.OpenapiRouter.testMode) {
            const controllerFile = openapiRouter.getKoaControllerActionFile(opt) + '.ts';
            ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_CONTROLLER_FILE, controllerFile);
            ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_REQUEST_SCHEMA, JSON.stringify(operation));
        }
        if ((actionInfo === null || actionInfo === void 0 ? void 0 : actionInfo.proxyAction) === undefined && (actionInfo === null || actionInfo === void 0 ? void 0 : actionInfo.action) === undefined) {
            ctx.status = 501;
            return;
        }
        ctx[exports.CTX_OPEANAPI_ROUTER] = openapiRouter;
        const doc_ver = operation[OpenapiRouter_1.X_OAS_VER];
        const queries = (_a = ctx.queries) !== null && _a !== void 0 ? _a : extend_1.toQueries(ctx.request.querystring);
        if (config.validSchema.request) {
            let bodyRequired = false;
            let bodySchema;
            if (operation.parameters !== undefined) {
                for (const iOpt of operation.parameters) {
                    let iOptRequired = (_b = iOpt.required) !== null && _b !== void 0 ? _b : false;
                    let para;
                    let location = iOpt.in;
                    switch (iOpt.in) {
                        case 'path':
                            para = ctx.params[iOpt.name];
                            break;
                        case 'query':
                            para = queries[iOpt.name];
                            if (para === undefined)
                                break;
                            switch (iOpt.style) {
                                case 'form':
                                    break;
                                case 'pipeDelimited':
                                    {
                                        const arr = para[0].split('|');
                                        para = {};
                                        for (let i = 0; i < arr.length; i += 2) {
                                            para[arr[i]] = arr[i + 1];
                                        }
                                    }
                                    break;
                                case 'spaceDelimited':
                                    {
                                        const arr = para[0].split(' ');
                                        para = {};
                                        for (let i = 0; i < arr.length; i += 2) {
                                            para[arr[i]] = arr[i + 1];
                                        }
                                    }
                                    break;
                                default:
                                    para = para[0];
                                    break;
                            }
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
                            jsonschema.validate({ value: para }, { type: 'object', properties: { value: iOpt.schema } }, { throwFirst: true, throwError: true, preValidateProperty, rewrite });
                        }
                        catch (err) {
                            ctx.status = 422;
                            const e = err.errors[0];
                            const re = { location, property: iOpt.name, instance: e.instance, message: e.message };
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
                        for (const iContentType of (_c = operation.consumes) !== null && _c !== void 0 ? _c : []) {
                            acceptContentTypes[iContentType] = true;
                        }
                        requestBodyRequired = bodyRequired;
                    }
                    else {
                        for (const iContentType in (_d = operation.requestBody) === null || _d === void 0 ? void 0 : _d.content) {
                            requestBodyRequired = requestBodyRequired || ((_e = operation.requestBody) === null || _e === void 0 ? void 0 : _e.required);
                            acceptContentTypes[iContentType] = true;
                        }
                    }
                    operation[HEADER_MARKER_ACCEPT_CONTENT_TYPES] = acceptContentTypes;
                    operation[HEADER_MARKER_REQUEST_BODY_REQUIRED] = requestBodyRequired !== null && requestBodyRequired !== void 0 ? requestBodyRequired : false;
                }
                const ctxContentType = ctx.request.type;
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
                const reqBodySchema = doc_ver === 2 ? bodySchema : (_g = (_f = operation.requestBody) === null || _f === void 0 ? void 0 : _f.content[contentType]) === null || _g === void 0 ? void 0 : _g.schema;
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
                        jsonschema.validate({ value: ctx.request.body }, { type: 'object', properties: { value: reqBodySchema } }, { throwError: true, throwFirst: true, preValidateProperty, rewrite });
                    }
                    catch (err) {
                        ctx.status = 422;
                        const e = err.errors[0];
                        const re = { location: 'body', property: e.path, instance: e.instance, message: e.message };
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
        let re;
        if (OpenapiRouter_1.OpenapiRouter.isEggApp) {
            if (actionInfo.proxyAction !== undefined) {
                re = actionInfo.proxyAction(ctx, next);
            }
            else {
                re = next();
            }
            // await next();
        }
        else {
            re = ((_h = actionInfo.proxyAction) !== null && _h !== void 0 ? _h : actionInfo.action)(ctx, next);
        }
        if (re instanceof Promise) {
            await re;
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
                        if (OpenapiRouter_1.OpenapiRouter.testMode) {
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
                            jsonschema.validate(iHaderValue, schema, { throwFirst: true, throwError: true, preValidateProperty });
                        }
                        catch (err) {
                            OpenapiRouter_1.OpenapiRouter.logger.error(err.errors[0]);
                            if (OpenapiRouter_1.OpenapiRouter.testMode) {
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
                                for (const iContentType of (_j = operation.produces) !== null && _j !== void 0 ? _j : []) {
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
                        const ctxContentType = ctx.response.type;
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
                        if (!contentType && ctxContentType && OpenapiRouter_1.OpenapiRouter.testMode) {
                            ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
                            break;
                        }
                        const resContentSchema = doc_ver === 2 ? (_k = reponseSchema) === null || _k === void 0 ? void 0 : _k.schema : (_m = (_l = reponseSchema === null || reponseSchema === void 0 ? void 0 : reponseSchema.content) === null || _l === void 0 ? void 0 : _l[contentType !== null && contentType !== void 0 ? contentType : 'default']) === null || _m === void 0 ? void 0 : _m.schema;
                        if (resContentSchema !== undefined) {
                            try {
                                jsonschema.validate(ctx.body, resContentSchema, { throwError: true, throwFirst: true, preValidateProperty });
                            }
                            catch (err) {
                                OpenapiRouter_1.OpenapiRouter.logger.error(err.errors[0]);
                                if (OpenapiRouter_1.OpenapiRouter.testMode) {
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
                    if (OpenapiRouter_1.OpenapiRouter.testMode) {
                        ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
                        break;
                    }
                }
                ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '200');
                // eslint-disable-next-line no-constant-condition
            } while (false);
            if (OpenapiRouter_1.OpenapiRouter.testMode) {
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
function preValidateProperty(instance, key, schema) {
    if (typeof instance[key] === 'string' && schema.type) {
        let result;
        switch (schema.type) {
            case 'integer':
                result = Number.parseInt(instance[key]);
                instance[key] = result ? result : instance[key];
                return;
            case 'number':
                result = Number.parseFloat(instance[key]);
                instance[key] = result ? result : instance[key];
                return;
            case 'object':
            case 'array':
            case 'boolean':
                try {
                    instance[key] = JSON.parse(instance[key]);
                    return;
                }
                catch (err) {
                    return;
                }
            default:
        }
    }
}
function rewrite(instance, schema) {
    if (typeof instance === 'string'
        && ((Array.isArray(schema.type) && schema.type.includes('string')) || schema.type === 'string')
        && schema.format) {
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
