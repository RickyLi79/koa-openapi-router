import * as jsonschema from 'jsonschema';
import path from 'path';
import { toQueries } from './extend';
import { OpenapiRouter, X_OAS_VER } from './OpenapiRouter';
import { TEST_RESPONSE_HEADER_ACTION_MUTED, TEST_RESPONSE_HEADER_CONTROLLER_FILE, TEST_RESPONSE_HEADER_REQUEST_SCHEMA, TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, TEST_RESPONSE_HEADER_TEST_ENABLED } from './Test-Response-Header';
import { OperationSchema, OPERATION_SCHEMA, Schema } from './types';

const OPEANAPI_PREFIX = 'x-openapi-';

const HEADER_MARKER = `${OPEANAPI_PREFIX}mark-`;
const HEADER_MARKER_ACCEPT_CONTENT_TYPES = `${HEADER_MARKER}accept-content-types`;
const HEADER_MARKER_REQUEST_BODY_REQUIRED = `${HEADER_MARKER}quest-body-required`;
const HEADER_MARKER_RESPONSE_CONTENT_TYPES = `${HEADER_MARKER}response-content-types`;

export const MARKER_OPERATION_MUTED = `${HEADER_MARKER}operation-muted`;

const OPENAPI_RQEUST_BODY_SCHEMA = `${OPEANAPI_PREFIX}request-bodySchema`;
const CTX_OPERATION_SCHEMA = Symbol(`OpenapiRouterAction#${OPERATION_SCHEMA}`);
const CTX_OPEANAPI_ROUTER = Symbol('OpenapiRouterAction#openapiRouter');
const CTX_OPEANAPI_REQUEST_QUERY = Symbol('OpenapiRouterAction#openapiRouter.request.query');

export default function OpenapiRouterAction(openapiRouter: OpenapiRouter): any {
  return async (ctx: any, next: any) => {

    // const prefix = (<any>ctx.router).opts.prefix ?? '';
    const opt = `${ctx.method.toUpperCase()} ${ctx.routerPath}`;
    const config = openapiRouter.config;
    const operation: OperationSchema = openapiRouter.getOperationByOpt(opt);

    if (OpenapiRouter.testMode) {
      ctx.set(TEST_RESPONSE_HEADER_TEST_ENABLED, true);
    }

    if (operation[MARKER_OPERATION_MUTED]) {
      if (OpenapiRouter.testMode) {
        ctx.set(TEST_RESPONSE_HEADER_ACTION_MUTED, true);
      }
      ctx.status = 404;
      return;
    }

    if (operation === undefined) {
      ctx.status = 404;
      return;
    }

    const actionInfo = openapiRouter.getKoaControllerAction(opt);
    if (OpenapiRouter.testMode) {
      const controllerFile = path.join(config.controllerDir, actionInfo?.ctlPath ?? '??');
      // const controllerFile = openapiRouter.getKoaControllerActionFile(opt);

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
    if (OpenapiRouter.options.validSchema.request) {
      let bodyRequired = false;
      let bodySchema: any;
      if (operation.parameters !== undefined) {
        const qry: { [name: string]: any } = {};
        for (const iOpt of operation.parameters) {
          let iOptRequired: boolean = iOpt.required ?? false;
          let param: any;
          let location: string = iOpt.in;
          switch (iOpt.in) {
            case 'path':
              param = ctx.params[iOpt.name];
              break;
            case 'query':
              param = queries[iOpt.name];
              if (param === undefined) break;
              switch (iOpt.style) {
                case 'form':
                  break;
                case 'pipeDelimited':
                  {
                    const arr: string[] = param[0].split('|');
                    param = {};
                    for (let i = 0; i < arr.length; i += 2) {
                      param[arr[i]] = arr[i + 1];
                    }
                  }
                  break;
                case 'spaceDelimited':
                  {
                    const arr: string[] = param[0].split(' ');
                    param = {};
                    for (let i = 0; i < arr.length; i += 2) {
                      param[arr[i]] = arr[i + 1];
                    }
                  }
                  break;
                default:
                  param = param[0];
                  break;

              }
              break;
            case 'header':
              param = ctx.get(iOpt.name);
              if (param === '') { param = undefined; }
              break;
            case 'cookie':
              param = ctx.cookies.get(iOpt.name);
              break;
            case 'body':
              bodyRequired = iOptRequired;
              bodySchema = iOpt.schema;

              iOptRequired = false;
              param = undefined;
              location = 'unknown';
              break;
            default:
              param = undefined;
              location = 'unknown';
              break;
          }

          if (iOptRequired === true && param === undefined) {
            ctx.status = 422;
            ctx.body = { message: `'${iOpt.name}' in '${location}' required` };
            return;
          }
          try {
            const paramBox = { value: param };
            jsonschema.validate(paramBox, { type: 'object', properties: { value: iOpt.schema } }, { throwFirst: true, throwError: true, preValidateProperty, rewrite });
            if (iOpt.in === 'query') {
              qry[iOpt.name] = paramBox.value;
            }
          } catch (err) {
            ctx.status = 422;
            const e: jsonschema.ValidationError = err.errors[0];
            const re = { location, property: iOpt.name, instance: e.instance, message: e.message };
            ctx.body = re;
            return;
          }

        }
        ctx[CTX_OPEANAPI_REQUEST_QUERY] = qry;
      }

      // #region `body` validation
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

      const ctxContentType = ctx.request.type;
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
          const bodyBox = { value: ctx.request.body };
          jsonschema.validate(bodyBox, { type: 'object', properties: { value: reqBodySchema } }, { throwError: true, throwFirst: true, preValidateProperty, rewrite });
          ctx.request.body = bodyBox.value;
        } catch (err) {
          ctx.status = 422;
          const e: jsonschema.ValidationError = err.errors[0];
          const re = { location: 'body', property: e.path, instance: e.instance, message: e.message };
          ctx.body = re;
          return;
        }
      }

      // #endregion
    }

    ctx[CTX_OPERATION_SCHEMA] = operation;
    ctx.getOperation = getOperation.bind(ctx);
    ctx.getRequestBodySchema = getRequestBodySchema.bind(ctx);
    ctx.getRequestQuery = getRequestQuery.bind(ctx);

    let re: any;
    if (OpenapiRouter.isEggApp) {
      if (actionInfo.proxyAction !== undefined) {
        re = actionInfo.proxyAction(ctx, next);
      } else {
        re = next();
      }
      // await next();
    } else {
      re = (actionInfo.proxyAction ?? actionInfo.action!)(ctx, next);
    }
    if (re instanceof Promise) {
      await re;
    }

    if (OpenapiRouter.options.validSchema.reponse) {
      do {
        let toBreak = false;
        const reponseSchema = operation.responses[ctx.status];
        const resHeaders = reponseSchema?.headers;
        for (const iHeaderName in resHeaders) {
          let iHaderValue: any = ctx.response.get(iHeaderName);
          if (resHeaders[iHeaderName].required === true && !iHaderValue) {
            OpenapiRouter.logger.error(new SyntaxError(`'${iHeaderName}' in 'response.header' required`));
            if (OpenapiRouter.testMode) {
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
              if (OpenapiRouter.testMode) {
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

            if (!contentType && ctxContentType && OpenapiRouter.testMode) {
              ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
              break;
            }

            const resContentSchema = doc_ver === 2 ? (<any>reponseSchema)?.schema : reponseSchema?.content?.[contentType ?? 'default']?.schema;
            if (resContentSchema !== undefined) {
              try {
                jsonschema.validate(ctx.body, resContentSchema, { throwError: true, throwFirst: true, preValidateProperty });
              } catch (err) {
                OpenapiRouter.logger.warn(err.errors[0]);
                if (OpenapiRouter.testMode) {
                  ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '422');
                  break;
                }
              }
            }
          } catch (err) {
            OpenapiRouter.logger.warn(err);
          }
        } else {
          if (OpenapiRouter.testMode) {
            ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415');
            break;
          }
        }

        ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '200');
        // eslint-disable-next-line no-constant-condition
      } while (false);

      if (OpenapiRouter.testMode) {
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

function getRequestQuery(this: any) {
  return this[CTX_OPEANAPI_REQUEST_QUERY];
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
  return instance ?? (
    OpenapiRouter.options.validSchema.useDefault ? schema.default : instance
  );
}
