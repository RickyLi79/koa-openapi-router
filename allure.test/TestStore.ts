import { allure } from 'allure-mocha/runtime';
import http from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import supertest from 'supertest';
import { config, runStep, writePackageVerToEnvironmentInfo } from 'supertest-allure-step-helper/helpers/AllureHelper';
import * as allureDecorators from 'ts-test-decorators';
import { OpenapiRouter } from '../lib/OpenapiRouter';
import { ILogger, IOptionalOpenapiRouterConfig } from '../lib/types';
import { docsFile_create_oas3_json } from './suite/docs/docsPath';

const SUITE_COUNTER = Symbol('TestStoreStatic#suiteCounter');
const ALLURE_INITED = Symbol('TestStoreStatic#allureInited');

export class MutedLogger implements ILogger {
  errorMsg: any[] = [];
  error(msg: any, ...args: any[]): void {
    this.addMsg(this.errorMsg, [ msg, ...args ]);
  }
  warnMsg: any[] = [];
  warn(msg: any, ...args: any[]): void {
    this.addMsg(this.warnMsg, [ msg, ...args ]);
  }
  infoMsg: any[] = [];
  info(msg: any, ...args: any[]): void {
    this.addMsg(this.infoMsg, [ msg, ...args ]);
  }
  debugMsg: any[] = [];
  debug(msg: any, ...args: any[]): void {
    this.addMsg(this.debugMsg, [ msg, ...args ]);
  }

  protected readonly maxMsgLen = 100;
  protected addMsg(msgArr: any[], ...msg: any[]) {
    msgArr.push(...msg);
    if (msgArr.length > this.maxMsgLen) {
      msgArr.splice(0, this.maxMsgLen - msgArr.length);
    }
  }

  hasMsg(group: 'error' | 'warn' | 'info' | 'debug', msg: string): boolean {
    const msgStr: string = this[group + 'msg'].join('\n');
    return msgStr.includes(msg);
  }
}

class TestStoreStatic {
  protected suiteMap: Map<any, boolean> = new Map<any, boolean>();

  constructor() {
    this[SUITE_COUNTER] = 0;
  }

  public async setup(suite: any) {

    if (this[ALLURE_INITED] === undefined) {
      allureDecorators.decorate<any>(allure);
      config.baseDir = path.join(__dirname, 'suite');

      writePackageVerToEnvironmentInfo(process.cwd(), [ 'koa', 'koa-bodyparser', 'koa-router', 'supertest', 'jsonschema', '@apidevtools/swagger-parser' ]);

      OpenapiRouter.logger = new MutedLogger();
      const testConfig: IOptionalOpenapiRouterConfig = {
        controllerDir: path.join(__dirname, 'suite/controller'),
        docsDir: docsFile_create_oas3_json,
        recursive: false,
        watcher: {
          enabled: false,
        },
        validSchema: {
          request: true,
          reponse: true,
        },
      };

      const app: Koa = suite.app = new Koa();
      const server: http.Server = suite.sever = app.listen();
      app.use(bodyParser());
      const openapiRouter = new OpenapiRouter(testConfig);
      await openapiRouter.loadOpenapi();
      app.use(openapiRouter.getRouter().routes());

      await supertest.agent(server)
        .get('/no/such/path')
        .expect(404);

      OpenapiRouter.closeAll();
      server.close();
      server.removeAllListeners();

      this[ALLURE_INITED] = true;
    }


    if (!(this.suiteMap?.[suite] === true)) {
      this.suiteMap[suite] = true;
      this[SUITE_COUNTER]++;
    }
  }

  public teardown(suite: any) {
    if (this.suiteMap?.[suite] === true) {
      this.suiteMap[suite] = false;
      this[SUITE_COUNTER]--;
      this.checkAllDown();
    }
  }

  protected timer: NodeJS.Timeout;
  protected checkAllDown() {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => this.exit(), 200);
  }

  protected exit() {
    if (this[SUITE_COUNTER] <= 0) {
      runStep('process.exit()', () => { process.exit(); });
    }
  }
}


export const TestStore = new TestStoreStatic();
