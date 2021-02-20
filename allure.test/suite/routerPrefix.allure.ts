import { suite, test } from '@testdeck/mocha';
import { Severity } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import http from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import supertest, { SuperAgentTest } from 'supertest';
import { AllureStepProxy } from 'supertest-allure-step-helper';
import { attachmentJson, attachmentUtf8FileAuto, runStep } from 'supertest-allure-step-helper/helpers/AllureHelper';
import * as allureDecorators from 'ts-test-decorators';
import { OpenapiRouter } from '../../lib/OpenapiRouter';
import { createOpenapiRouterConfig } from '../../lib/OpenapiRouterConfig';
import { IOpenapiRouterConfig } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_create_oas3_json } from './docs/docsPath';

let defaultOpenapiRouterConfig: IOpenapiRouterConfig;

@suite('OpenapiRouter: routerPrefix')
export class TestSuite {

  static server: http.Server;
  static app: Koa;
  static allureAgentProxy: SuperAgentTest | undefined;

  public static async before() {
    await TestStore.setup(this);

    runStep('mute OpenapiRouter.logger', () => { OpenapiRouter.logger = new MutedLogger(); });
    runStep('const defaultConfig', () => {
      defaultOpenapiRouterConfig = createOpenapiRouterConfig({
        routerPrefix: '/myApi',
        controllerDir: path.join(__dirname, 'controller'),
        docsDir: docsFile_create_oas3_json,
        recursive: false,
        watcher: {
          enabled: false,
        },
        validSchema: {
          request: true,
          reponse: true,
        },
        test: {
          enabled: true,
          controllerFileExt: '.ts',
        },
      });
      attachmentJson('defaultConfig', defaultOpenapiRouterConfig);
    });

  }

  public static after() {
    runStep('teardown class', () => {
      TestStore.teardown(this);
    });
  }

  public async before() {
    allure.epic('koa-openapi-router');
    allure.story('OpenapiRouter: routerPrefix');
    runStep('new Koa()', () => {
      TestSuite.app = new Koa();
      TestSuite.app.use(bodyParser());
      TestSuite.server = TestSuite.app.listen();
    });
  }

  public after() {
    OpenapiRouter.closeAll();
    TestSuite.server.close();
    TestSuite.server.removeAllListeners();
  }

  protected createAllureAgentProxy(url?: string) {
    const agent = supertest.agent(url ?? TestSuite.server);
    TestSuite.allureAgentProxy = AllureStepProxy.create(agent);
    return TestSuite.allureAgentProxy!;
  }

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `new OpenapiRouter()` , one doc-file')
  public async test1() {

    OpenapiRouter.logger = console;

    const toPath = '/myApi/no/such/action/api1';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .endAllureStep();
    }

    await runStep('new OpenapiRouter()', async () => {
      const openapiRouter = new OpenapiRouter(defaultOpenapiRouterConfig);
      await openapiRouter.loadOpenapi();
      TestSuite.app.use(openapiRouter.getRouter().routes());
      attachmentJson('openapiRouter config', openapiRouter.config);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(501)
        .endAllureStep();
    }
  }
}
