import * as jsonschema from 'jsonschema';
import { toQueries } from './extend';
import { OpenapiRouter, X_OAS_VER } from './OpenapiRouter';
import { TEST_RESPONSE_HEADER_CONTROLLER_FILE, TEST_RESPONSE_HEADER_REQUEST_SCHEMA, TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS } from './Test-Response-Header';
import { OperationSchema, OPERATION_SCHEMA, Schema } from './types';

const OPEANAPI_PREFIX = 'x-openapi-';

const HEADER_MARKER = `${OPEANAPI_PREFIX}mark`;
const HEADER_MARKER_ACCEPT_CONTENT_TYPES = `${HEADER_MARKER}accept-content-types`;
const HEADER_MARKER_REQUEST_BODY_REQUIRED = `${HEADER_MARKER}quest-body-required`;
const HEADER_MARKER_RESPONSE_CONTENT_TYPES = `${HEADER_MARKER}response-content-types`;

export const OPENAPI_RQEUST_BODY_SCHEMA = `${OPEANAPI_PREFIX}request-bodySchema`;
export const CTX_OPERATION_SCHEMA = Symbol(`OpenapiRouterAction#${OPERATION_SCHEMA}`);
export const CTX_OPEANAPI_ROUTER = Symbol('OpenapiRouterAction#openapiRouter');

export default function OpenapiRouterAction(openapiRouter: OpenapiRouter): any {
  return async (ctx: any, next: any) => {

    // const prefix = (<any>ctx.router).opts.prefix ?? '';
    const opt = `${ctx.method.toUpperCase()} ${ctx.routerPath}`;

    const operation: OperationSchema = openapiRouter.getOperationByOpt(opt);

    if (operation === undefined) {
      ctx.status = 404;
      return;
    }

    const config = openapiRouter.config;
    const actionInfo = openapiRouter.getKoaControllerAction(opt);
    if (config.test.enabled) {
      const controllerFile = openapiRouter.getKoaControllerActionFile(opt) + config.test.controllerFileExt;
      ctx.set(TEST_RESPONSE_HEADER_CONTROLLER_FILE, controllerFile);

      ctx.set(TEST_RESPONSE_HEADER_REQUEST_SCHEMA, JSON.stringify(operation));
    }

    if (actionInfo?.proxyAction === undefined && actionInfo?.action === undefined) {
      ctx.status = 501;
      return;
    }


    ctx[CTX_OPEANAPI_ROUTER] = openapiRouter;
    const doc_ver: 2 | 3 = operation[X_OAS_VER];
    const queries = ctx.queries ?? toQueries(ctx.request.querystring);
    if (config.validSchema.request) {
      let bodyRequired = false;
      let bodySchema: any;
      if (operation.parameters !== undefined) {
        for (const iOpt of operation.parameters) {
          let iOptRequired: boolean = iOpt.required ?? false;
          let para: any;
          let location: string = iOpt.in;
          switch (iOpt.in) {
            case 'path':
              para = ctx.params[iOpt.name];
              break;
            case 'query':
              para = queries[iOpt.name];
              if (para === undefined) break;
              switch (iOpt.style) {
                case 'form':
                  break;
                case 'pipeDelimited':
                  {
                    const arr: string[] = para[0].split('|');
                    para = {};
                    for (let i = 0; i < arr.length; i += 2) {
                      para[arr[i]] = arr[i + 1];
                    }
                  }
                  break;
                case 'spaceDelimited':
                  {
                    const arr: string[] = para[0].split(' ');
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
              if (para === '') { para = undefined; }
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
            } catch (err) {
              ctx.status = 422;
              const e: jsonschema.ValidationError = err.errors[0];
              const re = { location, property: iOpt.name, instance: e.instance, message: e.message };
              ctx.body = re;
              return;
            }
          } else if (iOptRequired === true) {
            ctx.status = 422;
            ctx.body = { message: `'${iOpt.name}' in '${location}' required` };
            return;
          }
        }
      }

      // #region `body` validation
      {
        let acceptContentTypes: { [contentType: string]: true } = operation[HEADER_MARKER_ACCEPT_CONTENT_TYPES];
        let requestBodyRequired: boolean = operation[HEADER_MARKER_REQUEST_BODY_REQUIRED];
        let contentType: string | undefined;

        if (acceptContentTypes === undefined) {
          acceptContentTypes = {};
          if (doc_ver === 2) {
            for (const iContentType of operation.consumes ?? []) {
              acceptContentTypes[iContentType] = true;
            }
            requestBodyRequired = bodyRequired;
          } else {
            for (const iContentType in operation.requestBody?.content) {
              requestBodyRequired = requestBodyRequired || operation.requestBody?.required;
              acceptContentTypes[iContentType] = true;
            }
          }
          operation[HEADER_MARKER_ACCEPT_CONTENT_TYPES] = acceptContentTypes;
          operation[HEADER_MARKER_REQUEST_BODY_REQUIRED] = requestBodyRequired ?? false;
        }

        const ctxContentType = ctx.type;
        if (acceptContentTypes) {
          if (acceptContentTypes[ctxContentType]) {
            contentType = ctxContentType;
          } else {
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
        const reqBodySchema = doc_ver === 2 ? bodySchema : operation.requestBody?.content[contentType!]?.schema;
        ctx[OPENAPI_RQEUST_BODY_SCHEMA] = reqBodySchema;
        if (Object.keys(ctx.request.body).length === 0) {
          if (requestBodyRequired !== true) {
            // pass
          } else {
            ctx.status = 422;
            ctx.body = { message: 'request `body` required' };
            return;
          }
        } else if (reqBodySchema) {

          try {
            jsonschema.validate({ value: ctx.request.body }, { type: 'object', properties: { value: reqBodySchema } }, { throwError: true, throwFirst: true, preValidateProperty, rewrite });
          } catch (err) {
            ctx.status = 422;
            const e: jsonschema.ValidationError = err.errors[0];
            const re = { location: 'body', property: e.path, instance: e.instance, message: e.message };
            ctx.body = re;
            return;
          }
        }
      }
      // #endregion
    }

    ctx[CTX_OPERATION_SCHEMA] = operation;
    ctx.getOperation = getOperation.bind(ctx);
    ctx.getRequestBodySchema = getRequestBodySchema.bind(ctx);

    if (OpenapiRouter.isEggApp) {
      if (actionInfo.proxyAction !== undefined) {
        actionInfo.proxyAction(ctx, next);
      } else {
        await next();
      }
      // await next();
    } else {

      await (actionInfo.proxyAction ?? actionInfo.action!)(ctx, next);
    }

    if (config.validSchema.reponse) {
      do {
        let toBreak = false;
        const reponseSchema = operation.responses[ctx.status];
        const resHeaders = reponseSchema?.headers;
        for (const iHeaderName in resHeaders) {
          let iHaderValue: any = ctx.response.get(iHeaderName);
          if (resHeaders[iHeaderName].required === true && !iHaderValue) {
            OpenapiRouter.logger.error(new SyntaxError(`'${iHeaderName}' in 'response.header' required`));
            if (config.test.enabled) {
              ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '415');
            }
            toBreak = true;
            break;
          } else if (resHeaders[iHeaderName].schema) {
            const schema = resHeaders[iHeaderName].schema;
            try {
              if (schema.type !== 'string') {
                if (schema.type === 'integer') {
                  iHaderValue = Number.parseInt(iHaderValue);
                } else if (schema.type === 'float') {
                  iHaderValue = Number.parseFloat(iHaderValue);
                }
              }
              jsonschema.validate(iHaderValue, schema, { throwFirst: true, throwError: true, preValidateProperty });
            } catch (err) {
              OpenapiRouter.logger.error(err.errors[0]);
              if (config.test.enabled) {
                ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '422');
              }
              toBreak = true;
              break;
            }
          }
        }
        if (toBreak) break;


        if (reponseSchema) {
          try {
            let responseContentTypes: { [contentType: string]: true } = reponseSchema[HEADER_MARKER_RESPONSE_CONTENT_TYPES];
            let contentType: string | undefined;
            if (responseContentTypes === undefined) {
              responseContentTypes = {};
              if (doc_ver === 2) {
                for (const iContentType of operation.produces ?? []) {
                  responseContentTypes[iContentType] = true;
                }
              } else {
                for (const iContentType in reponseSchema?.content) {
                  responseContentTypes[iContentType] = true;
                }
              }
              reponseSchema[HEADER_MARKER_RESPONSE_CONTENT_TYPES] = responseContentTypes;
            }

            const ctxContentType = ctx.response.type;
            if (responseContentTypes) {
              if (responseContentTypes[ctxContentType]) {
                contentType = ctxContentType;
              } else {
                for (const iContentType in responseContentTypes) {
                  if (ctx.response.is(iContentType) !== false) {
                    contentType = iContentType;
                    break;
                  }
                }
              }
            }

            if (!contentType && ctxContentType && config.test.enabled) {
              ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
              break;
            }

            const resContentSchema = doc_ver === 2 ? (<any>reponseSchema)?.schema : reponseSchema?.content?.[contentType ?? 'default']?.schema;
            if (resContentSchema !== undefined) {
              try {
                jsonschema.validate(ctx.body, resContentSchema, { throwError: true, throwFirst: true, preValidateProperty });
              } catch (err) {
                OpenapiRouter.logger.error(err.errors[0]);
                if (config.test.enabled) {
                  ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '422');
                  break;
                }
              }
            }
          } catch (err) {
            OpenapiRouter.logger.error(err);
          }
        } else {
          if (config.test.enabled) {
            ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
            break;
          }
        }

        ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '200');
        // eslint-disable-next-line no-constant-condition
      } while (false);

      if (config.test.enabled) {
        if (!ctx.response.get(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS)) {
          ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '200');
        }
      }
    }
  };
}

function getOperation(this: any): OperationSchema {
  return this[CTX_OPERATION_SCHEMA];
}

function getRequestBodySchema(this: any): Schema {
  return this[OPENAPI_RQEUST_BODY_SCHEMA];
}

function preValidateProperty(instance: any, key: string, schema: any): any {
  if (typeof instance[key] === 'string' && schema.type) {
    let result: number;
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
        } catch (err) {
          return;
        }

      default:
    }
  }
}

function rewrite(instance: any, schema: any): any {
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
