"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/no-var-requires */
const jsonschema = tslib_1.__importStar(require("jsonschema"));
const OpenapiRouter_1 = require("./OpenapiRouter");
const Test_Response_Header_1 = require("./Test-Response-Header");
const types_1 = require("./types");
const HEADER_MARKER = 'x-openapi-mark-';
const HEADER_MARKER_ACCEPT_CONTENT_TYPES = `${HEADER_MARKER}accept-content-types`;
const HEADER_MARKER_REQUEST_BODY_REQUIRED = `${HEADER_MARKER}quest-body-required`;
const HEADER_MARKER_RESPONSE_CONTENT_TYPES = `${HEADER_MARKER}response-content-types`;
const CTX_OPERATION_SCHEMA = Symbol(`OpenapiRouterAction#${types_1.OPERATION_SCHEMA}`);
function OpenapiRouterAction(openapiRouter) {
    return async (ctx, next) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const prefix = (_a = ctx.router.opts.prefix) !== null && _a !== void 0 ? _a : '';
        const opt = `${ctx.method.toUpperCase()} ${ctx.routerPath.substr(prefix.length)}`;
        const operation = openapiRouter.getOperationByOpt(opt);
        if (operation === undefined) {
            ctx.status = 404;
            return;
        }
        const config = openapiRouter.config;
        const action = openapiRouter.getKoaControllerAction(opt);
        if (config.test.enabled) {
            const controllerFile = openapiRouter.getKoaControllerActionFile(opt) + config.test.controllerFileExt;
            ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_CONTROLLER_FILE, controllerFile);
            ctx.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_REQUEST_SCHEMA, JSON.stringify(operation));
        }
        if (action === undefined) {
            ctx.status = 501;
            return;
        }
        const doc_ver = operation[OpenapiRouter_1.X_OAS_VER];
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
                            jsonschema.validate(para, iOpt.schema, { throwFirst: true, throwError: true, rewrite, preValidateProperty });
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
                const ctxContentType = ctx.request.get('content-type');
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
                if (!contentType && requestBodyRequired && acceptContentTypes) {
                    ctx.status = 415;
                    return;
                }
                if (!contentType && ctxContentType) {
                    ctx.status = 415;
                    return;
                }
                const reqBodySchema = doc_ver === 2 ? bodySchema : (_g = (_f = operation.requestBody) === null || _f === void 0 ? void 0 : _f.content[contentType]) === null || _g === void 0 ? void 0 : _g.schema;
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
                        jsonschema.validate(ctx.request.body, reqBodySchema, { throwError: true, throwFirst: true, rewrite, preValidateProperty });
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
        ctx[CTX_OPERATION_SCHEMA] = operation;
        await action(ctx, next);
        if (config.validSchema.reponse) {
            do {
                let toBreak = false;
                const reponseSchema = operation.responses[ctx.status];
                const resHeaders = reponseSchema === null || reponseSchema === void 0 ? void 0 : reponseSchema.headers;
                for (const iHeaderName in resHeaders) {
                    const iHaderValue = ctx.response.get(iHeaderName);
                    if (resHeaders[iHeaderName].required === true && !iHaderValue) {
                        OpenapiRouter_1.OpenapiRouter.logger.error(new SyntaxError(`'${iHeaderName}' in 'response.header' required`));
                        if (config.test.enabled) {
                            ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '415');
                        }
                        toBreak = true;
                        break;
                    }
                    else if (resHeaders[iHeaderName].schema) {
                        try {
                            jsonschema.validate(iHaderValue, resHeaders[iHeaderName].schema, { throwFirst: true, throwError: true });
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
                        if (!contentType && ctxContentType && config.test.enabled) {
                            ctx.response.set(Test_Response_Header_1.TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
                            break;
                        }
                        const resContentSchema = doc_ver === 2 ? reponseSchema === null || reponseSchema === void 0 ? void 0 : reponseSchema.schema : (_j = reponseSchema === null || reponseSchema === void 0 ? void 0 : reponseSchema.content[contentType]) === null || _j === void 0 ? void 0 : _j.schema;
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
                        debugger;
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
function preValidateProperty(instance, _key, schema) {
    if (typeof instance === 'string' && schema.type) {
        let result;
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
                }
                catch (err) {
                    return instance;
                }
            default:
                return instance;
        }
    }
    return instance;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiT3BlbmFwaVJvdXRlckFjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIk9wZW5hcGlSb3V0ZXJBY3Rpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsZ0NBQWdDO0FBQ2hDLHVEQUF1RDtBQUN2RCwrREFBeUM7QUFJekMsbURBQTJEO0FBQzNELGlFQUEyTTtBQUMzTSxtQ0FBMkM7QUFHM0MsTUFBTSxhQUFhLEdBQUcsaUJBQWlCLENBQUM7QUFDeEMsTUFBTSxrQ0FBa0MsR0FBRyxHQUFHLGFBQWEsc0JBQXNCLENBQUM7QUFDbEYsTUFBTSxtQ0FBbUMsR0FBRyxHQUFHLGFBQWEscUJBQXFCLENBQUM7QUFDbEYsTUFBTSxvQ0FBb0MsR0FBRyxHQUFHLGFBQWEsd0JBQXdCLENBQUM7QUFFdEYsTUFBTSxvQkFBb0IsR0FBRyxNQUFNLENBQUMsdUJBQXVCLHdCQUFnQixFQUFFLENBQUMsQ0FBQztBQUUvRSxTQUF3QixtQkFBbUIsQ0FBQyxhQUE0QjtJQUN0RSxPQUFPLEtBQUssRUFBRSxHQUF5QixFQUFFLElBQVUsRUFBRSxFQUFFOztRQUNyRCxNQUFNLE1BQU0sU0FBUyxHQUFHLENBQUMsTUFBTyxDQUFDLElBQUksQ0FBQyxNQUFNLG1DQUFJLEVBQUUsQ0FBQztRQUNuRCxNQUFNLEdBQUcsR0FBRyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsV0FBVyxFQUFFLElBQVUsR0FBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFFekYsTUFBTSxTQUFTLEdBQVEsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTVELElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRTtZQUMzQixHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztZQUNqQixPQUFPO1NBQ1I7UUFFRCxNQUFNLE1BQU0sR0FBRyxhQUFhLENBQUMsTUFBTSxDQUFDO1FBQ3BDLE1BQU0sTUFBTSxHQUFHLGFBQWEsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUN6RCxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO1lBQ3ZCLE1BQU0sY0FBYyxHQUFHLGFBQWEsQ0FBQywwQkFBMEIsQ0FBQyxHQUFHLENBQUMsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDO1lBQ3JHLEdBQUcsQ0FBQyxHQUFHLENBQUMsMkRBQW9DLEVBQUUsY0FBYyxDQUFDLENBQUM7WUFFOUQsR0FBRyxDQUFDLEdBQUcsQ0FBQywwREFBbUMsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7U0FDekU7UUFFRCxJQUFJLE1BQU0sS0FBSyxTQUFTLEVBQUU7WUFDeEIsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7WUFDakIsT0FBTztTQUNSO1FBRUQsTUFBTSxPQUFPLEdBQVUsU0FBUyxDQUFDLHlCQUFTLENBQUMsQ0FBQztRQUM1QyxJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO1lBQzlCLElBQUksWUFBWSxHQUFHLEtBQUssQ0FBQztZQUN6QixJQUFJLFVBQWUsQ0FBQztZQUNwQixJQUFJLFNBQVMsQ0FBQyxVQUFVLEtBQUssU0FBUyxFQUFFO2dCQUN0QyxLQUFLLE1BQU0sSUFBSSxJQUFJLFNBQVMsQ0FBQyxVQUFVLEVBQUU7b0JBQ3ZDLElBQUksWUFBWSxTQUFZLElBQUksQ0FBQyxRQUFRLG1DQUFJLEtBQUssQ0FBQztvQkFDbkQsSUFBSSxJQUFTLENBQUM7b0JBQ2QsSUFBSSxRQUFRLEdBQVcsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDL0IsUUFBUSxJQUFJLENBQUMsRUFBRSxFQUFFO3dCQUNmLEtBQUssTUFBTTs0QkFDVCxJQUFJLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7NEJBQzdCLE1BQU07d0JBQ1IsS0FBSyxPQUFPOzRCQUNWLElBQUksR0FBRyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDNUIsTUFBTTt3QkFDUixLQUFLLFFBQVE7NEJBQ1gsSUFBSSxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDOzRCQUMxQixJQUFJLElBQUksS0FBSyxFQUFFLEVBQUU7Z0NBQUUsSUFBSSxHQUFHLFNBQVMsQ0FBQzs2QkFBRTs0QkFDdEMsTUFBTTt3QkFDUixLQUFLLFFBQVE7NEJBQ1gsSUFBSSxHQUFHLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQzs0QkFDbEMsTUFBTTt3QkFDUixLQUFLLE1BQU07NEJBQ1QsWUFBWSxHQUFHLFlBQVksQ0FBQzs0QkFDNUIsVUFBVSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7NEJBRXpCLFlBQVksR0FBRyxLQUFLLENBQUM7NEJBQ3JCLElBQUksR0FBRyxTQUFTLENBQUM7NEJBQ2pCLFFBQVEsR0FBRyxTQUFTLENBQUM7NEJBQ3JCLE1BQU07d0JBQ1I7NEJBQ0UsSUFBSSxHQUFHLFNBQVMsQ0FBQzs0QkFDakIsUUFBUSxHQUFHLFNBQVMsQ0FBQzs0QkFDckIsTUFBTTtxQkFDVDtvQkFFRCxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUU7d0JBQ3RCLElBQUk7NEJBQ0YsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDO3lCQUM5Rzt3QkFBQyxPQUFPLEdBQUcsRUFBRTs0QkFDWixHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQzs0QkFDakIsTUFBTSxDQUFDLEdBQStCLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQ3BELE1BQU0sRUFBRSxHQUFRLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUM7NEJBQ3ZFLEdBQUcsQ0FBQyxJQUFJLEdBQUcsRUFBRSxDQUFDOzRCQUNkLE9BQU87eUJBQ1I7cUJBQ0Y7eUJBQU0sSUFBSSxZQUFZLEtBQUssSUFBSSxFQUFFO3dCQUNoQyxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQzt3QkFDakIsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLE9BQU8sRUFBRSxJQUFJLElBQUksQ0FBQyxJQUFJLFNBQVMsUUFBUSxZQUFZLEVBQUUsQ0FBQzt3QkFDbkUsT0FBTztxQkFDUjtpQkFDRjthQUNGO1lBRUQsNEJBQTRCO1lBQzVCO2dCQUNFLElBQUksa0JBQWtCLEdBQW9DLFNBQVMsQ0FBQyxrQ0FBa0MsQ0FBQyxDQUFDO2dCQUN4RyxJQUFJLG1CQUFtQixHQUFZLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxDQUFDO2dCQUNsRixJQUFJLFdBQStCLENBQUM7Z0JBRXBDLElBQUksa0JBQWtCLEtBQUssU0FBUyxFQUFFO29CQUNwQyxrQkFBa0IsR0FBRyxFQUFFLENBQUM7b0JBQ3hCLElBQUksT0FBTyxLQUFLLENBQUMsRUFBRTt3QkFDakIsS0FBSyxNQUFNLFlBQVksVUFBSSxTQUFTLENBQUMsUUFBUSxtQ0FBSSxFQUFFLEVBQUU7NEJBQ25ELGtCQUFrQixDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQzt5QkFDekM7d0JBQ0QsbUJBQW1CLEdBQUcsWUFBWSxDQUFDO3FCQUNwQzt5QkFBTTt3QkFDTCxLQUFLLE1BQU0sWUFBWSxVQUFJLFNBQVMsQ0FBQyxXQUFXLDBDQUFFLE9BQU8sRUFBRTs0QkFDekQsbUJBQW1CLEdBQUcsbUJBQW1CLFdBQUksU0FBUyxDQUFDLFdBQVcsMENBQUUsUUFBUSxDQUFBLENBQUM7NEJBQzdFLGtCQUFrQixDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQzt5QkFDekM7cUJBQ0Y7b0JBQ0QsU0FBUyxDQUFDLGtDQUFrQyxDQUFDLEdBQUcsa0JBQWtCLENBQUM7b0JBQ25FLFNBQVMsQ0FBQyxtQ0FBbUMsQ0FBQyxHQUFHLG1CQUFtQixhQUFuQixtQkFBbUIsY0FBbkIsbUJBQW1CLEdBQUksS0FBSyxDQUFDO2lCQUMvRTtnQkFFRCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQztnQkFDdkQsSUFBSSxrQkFBa0IsQ0FBQyxjQUFjLENBQUMsRUFBRTtvQkFDdEMsV0FBVyxHQUFHLGNBQWMsQ0FBQztpQkFDOUI7cUJBQU07b0JBQ0wsS0FBSyxNQUFNLFlBQVksSUFBSSxrQkFBa0IsRUFBRTt3QkFDN0MsSUFBSSxHQUFHLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxLQUFLLEtBQUssRUFBRTs0QkFDbEMsV0FBVyxHQUFHLFlBQVksQ0FBQzs0QkFDM0IsTUFBTTt5QkFDUDtxQkFDRjtpQkFDRjtnQkFFRCxJQUFJLENBQUMsV0FBVyxJQUFJLG1CQUFtQixJQUFJLGtCQUFrQixFQUFFO29CQUM3RCxHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztvQkFDakIsT0FBTztpQkFDUjtnQkFDRCxJQUFJLENBQUMsV0FBVyxJQUFJLGNBQWMsRUFBRTtvQkFDbEMsR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7b0JBQ2pCLE9BQU87aUJBQ1I7Z0JBQ0QsTUFBTSxhQUFhLEdBQUcsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsYUFBQyxTQUFTLENBQUMsV0FBVywwQ0FBRSxPQUFPLENBQUMsV0FBWSwyQ0FBRyxNQUFNLENBQUM7Z0JBQ3hHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUU7b0JBQzlDLElBQUksbUJBQW1CLEtBQUssSUFBSSxFQUFFO3dCQUNoQyxPQUFPO3FCQUNSO3lCQUFNO3dCQUNMLEdBQUcsQ0FBQyxNQUFNLEdBQUcsR0FBRyxDQUFDO3dCQUNqQixHQUFHLENBQUMsSUFBSSxHQUFHLEVBQUUsT0FBTyxFQUFFLHlCQUF5QixFQUFFLENBQUM7d0JBQ2xELE9BQU87cUJBQ1I7aUJBQ0Y7cUJBQU0sSUFBSSxhQUFhLEVBQUU7b0JBQ3hCLElBQUk7d0JBQ0YsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUUsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLENBQUMsQ0FBQztxQkFDNUg7b0JBQUMsT0FBTyxHQUFHLEVBQUU7d0JBQ1osR0FBRyxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUM7d0JBQ2pCLE1BQU0sQ0FBQyxHQUErQixHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO3dCQUNwRCxNQUFNLEVBQUUsR0FBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQzt3QkFDL0UsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUM7d0JBQ2QsT0FBTztxQkFDUjtpQkFDRjthQUNGO1lBQ0QsYUFBYTtTQUNkO1FBRUQsR0FBRyxDQUFDLG9CQUFvQixDQUFDLEdBQUcsU0FBUyxDQUFDO1FBQ3RDLE1BQU0sTUFBTSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUV4QixJQUFJLE1BQU0sQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO1lBQzlCLEdBQUc7Z0JBQ0QsSUFBSSxPQUFPLEdBQUcsS0FBSyxDQUFDO2dCQUNwQixNQUFNLGFBQWEsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDdEQsTUFBTSxVQUFVLEdBQUcsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLE9BQU8sQ0FBQztnQkFDMUMsS0FBSyxNQUFNLFdBQVcsSUFBSSxVQUFVLEVBQUU7b0JBQ3BDLE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDO29CQUNsRCxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxRQUFRLEtBQUssSUFBSSxJQUFJLENBQUMsV0FBVyxFQUFFO3dCQUM3RCw2QkFBYSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxXQUFXLENBQUMsSUFBSSxXQUFXLGlDQUFpQyxDQUFDLENBQUMsQ0FBQzt3QkFDOUYsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTs0QkFDdkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0VBQTJDLEVBQUUsS0FBSyxDQUFDLENBQUM7eUJBQ3RFO3dCQUNELE9BQU8sR0FBRyxJQUFJLENBQUM7d0JBQ2YsTUFBTTtxQkFDUDt5QkFBTSxJQUFJLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxNQUFNLEVBQUU7d0JBQ3pDLElBQUk7NEJBQ0YsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7eUJBQzFHO3dCQUFDLE9BQU8sR0FBRyxFQUFFOzRCQUNaLDZCQUFhLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7NEJBQzFDLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7Z0NBQ3ZCLEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGtFQUEyQyxFQUFFLEtBQUssQ0FBQyxDQUFDOzZCQUN0RTs0QkFDRCxPQUFPLEdBQUcsSUFBSSxDQUFDOzRCQUNmLE1BQU07eUJBQ1A7cUJBQ0Y7aUJBQ0Y7Z0JBQ0QsSUFBSSxPQUFPO29CQUFFLE1BQU07Z0JBR25CLElBQUksYUFBYSxFQUFFO29CQUNqQixJQUFJO3dCQUNGLElBQUksb0JBQW9CLEdBQW9DLGFBQWEsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDO3dCQUNoSCxJQUFJLFdBQStCLENBQUM7d0JBQ3BDLElBQUksb0JBQW9CLEtBQUssU0FBUyxFQUFFOzRCQUN0QyxvQkFBb0IsR0FBRyxFQUFFLENBQUM7NEJBQzFCLElBQUksT0FBTyxLQUFLLENBQUMsRUFBRTtnQ0FDakIsS0FBSyxNQUFNLFlBQVksVUFBSSxTQUFTLENBQUMsUUFBUSxtQ0FBSSxFQUFFLEVBQUU7b0NBQ25ELG9CQUFvQixDQUFDLFlBQVksQ0FBQyxHQUFHLElBQUksQ0FBQztpQ0FDM0M7NkJBQ0Y7aUNBQU07Z0NBQ0wsS0FBSyxNQUFNLFlBQVksSUFBSSxhQUFhLGFBQWIsYUFBYSx1QkFBYixhQUFhLENBQUUsT0FBTyxFQUFFO29DQUNqRCxvQkFBb0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxJQUFJLENBQUM7aUNBQzNDOzZCQUNGOzRCQUNELGFBQWEsQ0FBQyxvQ0FBb0MsQ0FBQyxHQUFHLG9CQUFvQixDQUFDO3lCQUM1RTt3QkFFRCxNQUFNLGNBQWMsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQzt3QkFDeEQsSUFBSSxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsRUFBRTs0QkFDeEMsV0FBVyxHQUFHLGNBQWMsQ0FBQzt5QkFDOUI7NkJBQU07NEJBQ0wsS0FBSyxNQUFNLFlBQVksSUFBSSxvQkFBb0IsRUFBRTtnQ0FDL0MsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsS0FBSyxLQUFLLEVBQUU7b0NBQzNDLFdBQVcsR0FBRyxZQUFZLENBQUM7b0NBQzNCLE1BQU07aUNBQ1A7NkJBQ0Y7eUJBQ0Y7d0JBRUQsSUFBSSxDQUFDLFdBQVcsSUFBSSxjQUFjLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxPQUFPLEVBQUU7NEJBQ3pELEdBQUcsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLGdFQUF5QyxFQUFFLEtBQUssQ0FBQyxDQUFDOzRCQUNuRSxNQUFNO3lCQUNQO3dCQUNELE1BQU0sZ0JBQWdCLEdBQUcsT0FBTyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQUMsYUFBYSxhQUFiLGFBQWEsdUJBQWIsYUFBYSxDQUFFLE9BQU8sQ0FBQyxXQUFZLDJDQUFHLE1BQU0sQ0FBQzt3QkFDOUcsSUFBSSxnQkFBZ0IsS0FBSyxTQUFTLEVBQUU7NEJBQ2xDLElBQUk7Z0NBQ0YsVUFBVSxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQzs2QkFDekY7NEJBQUMsT0FBTyxHQUFHLEVBQUU7Z0NBQ1osNkJBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQ0FDMUMsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTtvQ0FDdkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0VBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7b0NBQ25FLE1BQU07aUNBQ1A7NkJBQ0Y7eUJBQ0Y7cUJBQ0Y7b0JBQUMsT0FBTyxHQUFHLEVBQUU7d0JBQ1osNkJBQWEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO3dCQUNoQyxRQUFRLENBQUM7cUJBQ1Y7aUJBQ0Y7cUJBQU07b0JBQ0wsSUFBSSxNQUFNLENBQUMsSUFBSSxDQUFDLE9BQU8sRUFBRTt3QkFDdkIsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0VBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7d0JBQ25FLE1BQU07cUJBQ1A7aUJBQ0Y7Z0JBRUQsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsZ0VBQXlDLEVBQUUsS0FBSyxDQUFDLENBQUM7Z0JBQ3JFLGlEQUFpRDthQUNoRCxRQUFRLEtBQUssRUFBRTtZQUVoQixJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFO2dCQUN2QixJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0VBQTJDLENBQUMsRUFBRTtvQkFDbEUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0VBQTJDLEVBQUUsS0FBSyxDQUFDLENBQUM7aUJBQ3RFO2FBQ0Y7U0FDRjtJQUNILENBQUMsQ0FBQztBQUNKLENBQUM7QUF6UEQsc0NBeVBDO0FBRUQsU0FBUyxtQkFBbUIsQ0FBQyxRQUFhLEVBQUUsSUFBWSxFQUFFLE1BQWM7SUFDdEUsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLElBQUksTUFBTSxDQUFDLElBQUksRUFBRTtRQUMvQyxJQUFJLE1BQWMsQ0FBQztRQUNuQixRQUFRLE1BQU0sQ0FBQyxJQUFJLEVBQUU7WUFDbkIsS0FBSyxTQUFTO2dCQUNaLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNuQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsS0FBSyxRQUFRO2dCQUNYLE1BQU0sR0FBRyxNQUFNLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxDQUFDO2dCQUNyQyxPQUFPLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDN0IsS0FBSyxRQUFRLENBQUM7WUFDZCxLQUFLLE9BQU8sQ0FBQztZQUNiLEtBQUssU0FBUztnQkFDWixJQUFJO29CQUNGLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQztpQkFDN0I7Z0JBQUMsT0FBTyxHQUFHLEVBQUU7b0JBQ1osT0FBTyxRQUFRLENBQUM7aUJBQ2pCO1lBRUg7Z0JBQ0UsT0FBTyxRQUFRLENBQUM7U0FDbkI7S0FDRjtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUM7QUFFRCxTQUFTLE9BQU8sQ0FBQyxRQUFhLEVBQUUsTUFBYztJQUM1QyxJQUNFLE9BQU8sUUFBUSxLQUFLLFFBQVE7V0FDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLElBQUksS0FBSyxRQUFRLENBQUM7V0FDNUYsTUFBTSxDQUFDLE1BQU0sRUFDaEI7UUFDQSxRQUFRLE1BQU0sQ0FBQyxNQUFNLEVBQUU7WUFDckIsS0FBSyxXQUFXLENBQUM7WUFDakIsS0FBSyxNQUFNO2dCQUNULE9BQU8sSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUM7WUFDNUI7Z0JBQ0UsT0FBTyxRQUFRLENBQUM7U0FDbkI7S0FDRjtJQUNELE9BQU8sUUFBUSxDQUFDO0FBQ2xCLENBQUMifQ==