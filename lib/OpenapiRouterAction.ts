/* eslint-disable no-debugger */
/* eslint-disable @typescript-eslint/no-var-requires */
import * as jsonschema from 'jsonschema';
import { Next } from 'koa';
import Router from 'koa-router';
import { OpenapiRouter, X_OAS_VER } from './OpenapiRouter';
import { TEST_RESPONSE_HEADER_CONTROLLER_FILE, TEST_RESPONSE_HEADER_REQUEST_SCHEMA, TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS } from './Test-Response-Header';
import { OPERATION_SCHEMA } from './types';


const HEADER_MARKER = 'x-openapi-mark-';
const HEADER_MARKER_ACCEPT_CONTENT_TYPES = `${HEADER_MARKER}accept-content-types`;
const HEADER_MARKER_REQUEST_BODY_REQUIRED = `${HEADER_MARKER}quest-body-required`;
const HEADER_MARKER_RESPONSE_CONTENT_TYPES = `${HEADER_MARKER}response-content-types`;

const CTX_OPERATION_SCHEMA = Symbol(`OpenapiRouterAction#${OPERATION_SCHEMA}`);

export default function OpenapiRouterAction(openapiRouter: OpenapiRouter): any {
  return async (ctx: Router.RouterContext, next: Next) => {
    const prefix = (<any>ctx.router).opts.prefix ?? '';
    const opt = `${ctx.method.toUpperCase()} ${(<any>ctx).routerPath.substr(prefix.length)}`;

    const operation: any = openapiRouter.getOperationByOpt(opt);

    if (operation === undefined) {
      ctx.status = 404;
      return;
    }

    const config = openapiRouter.config;
    const action = openapiRouter.getKoaControllerAction(opt);
    if (config.test.enabled) {
      const controllerFile = openapiRouter.getKoaControllerActionFile(opt) + config.test.controllerFileExt;
      ctx.set(TEST_RESPONSE_HEADER_CONTROLLER_FILE, controllerFile);

      ctx.set(TEST_RESPONSE_HEADER_REQUEST_SCHEMA, JSON.stringify(operation));
    }

    if (action.action === undefined) {
      ctx.status = 501;
      return;
    }

    const doc_ver: 2 | 3 = operation[X_OAS_VER];
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
              para = ctx.query[iOpt.name];
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
              jsonschema.validate(para, iOpt.schema, { throwFirst: true, throwError: true });
            } catch (err) {
              ctx.status = 422;
              const e: jsonschema.ValidationError = err.errors[0];
              const re: any = { location, property: e.property, message: e.message };
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

        const ctxContentType = ctx.request.get('content-type');
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
        // if (!contentType && ctxContentType) {
        //   ctx.status = 415;
        //   return;
        // }
        const reqBodySchema = doc_ver === 2 ? bodySchema : operation.requestBody?.content[contentType!]?.schema;
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
            jsonschema.validate(ctx.request.body, reqBodySchema, { throwError: true, throwFirst: true });
          } catch (err) {
            ctx.status = 422;
            const e: jsonschema.ValidationError = err.errors[0];
            const re: any = { location: 'body', property: e.property, message: e.message };
            ctx.body = re;
            return;
          }
        }
      }
      // #endregion
    }

    ctx[CTX_OPERATION_SCHEMA] = operation;
    await action.action!(ctx, next);

    if (config.validSchema.reponse) {
      do {
        let toBreak = false;
        const reponseSchema = operation.responses[ctx.status];
        const resHeaders = reponseSchema?.headers;
        for (const iHeaderName in resHeaders) {
          const iHaderValue = ctx.response.get(iHeaderName);
          if (resHeaders[iHeaderName].required === true && !iHaderValue) {
            OpenapiRouter.logger.error(new SyntaxError(`'${iHeaderName}' in 'response.header' required`));
            if (config.test.enabled) {
              ctx.response.set(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '415');
            }
            toBreak = true;
            break;
          } else if (resHeaders[iHeaderName].schema) {
            try {
              jsonschema.validate(iHaderValue, resHeaders[iHeaderName].schema, { throwFirst: true, throwError: true });
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

            const ctxContentType = ctx.response.get('content-type');
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
            const resContentSchema = doc_ver === 2 ? reponseSchema?.schema : reponseSchema?.content[contentType!]?.schema;
            if (resContentSchema !== undefined) {
              try {
                jsonschema.validate(ctx.body, resContentSchema, { throwError: true, throwFirst: true });
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
            debugger;
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
