import { suite, test } from '@testdeck/mocha';
import { Severity } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import http from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import supertest, { SuperAgentTest } from 'supertest';
import { AllureHelper, AllureStepProxy } from 'supertest-allure-step-helper';
import * as allureDecorators from 'ts-test-decorators';
import { OpenapiRouter } from '../../lib/OpenapiRouter';
import { createOpenapiRouterConfig } from '../../lib/OpenapiRouterConfig';
import { TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS } from '../../lib/Test-Response-Header';
import { IOpenapiRouterConfig, IOpenapiRouterOptions, PowerPartial } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_valid_res_body_oas3_yaml } from './docs/docsPath';

const { attachmentJson, attachmentUtf8FileAuto, runStep } = AllureHelper;
const option: PowerPartial<IOpenapiRouterOptions> = {
  testMode: true,
  recursive: true,
  watcher: {
    enabled: false,
  },
  validSchema: {
    request: true,
    reponse: true,
  },
};

let defaultOpenapiRouterConfig: IOpenapiRouterConfig;

@suite('OpenapiRouter: valid.response.body  oas3')
export class TestSuite {


  static server: http.Server;
  static app: Koa;
  static allureAgentProxy: SuperAgentTest | undefined;

  public static async before() {
    await TestStore.setup(this);

    runStep('mute OpenapiRouter.logger', () => { OpenapiRouter.logger = new MutedLogger(); });
    runStep('const defaultConfig', () => {
      defaultOpenapiRouterConfig = createOpenapiRouterConfig({
        controllerDir: path.join(__dirname, 'controller'),
        docsDir: docsFile_valid_res_body_oas3_yaml,
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
    allure.story('OpenapiRouter: valid : response.body');
    OpenapiRouter.logger = new MutedLogger();
    OpenapiRouter.closeAll();
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

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : no `response.body` schema')
  public async test1() {

    const toPath = '/valid/response/body';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .get(toPath)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `response.body`')
        .get(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415')
        .endAllureStep();
    }

  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.body` valid')
  public async test2() {

    const toPath = '/valid/response/body';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .post(toPath)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('`response.body` valid')
        .post(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '200')
        .endAllureStep();
    }

  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.body` invalid')
  public async test3() {

    const toPath = '/valid/response/body';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .patch(toPath)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('`response.body` invalid')
        .patch(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '422')
        .endAllureStep();
    }

  }

}
