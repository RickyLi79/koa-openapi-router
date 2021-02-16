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
import { TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS } from '../../lib/Test-Response-Header';
import { IOptionalOpenapiRouterConfig } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_valid_res_body_oas2_json } from './docs/docsPath';

let defaultOpenapiRouterConfig: IOptionalOpenapiRouterConfig;

@suite('OpenapiRouter: valid.response.body  oas2')
export class TestSuite {


  static server: http.Server;
  static app: Koa;
  static allureAgentProxy: SuperAgentTest | undefined;

  public static async before() {
    await TestStore.setup(this);

    runStep('mute OpenapiRouter.logger', () => { OpenapiRouter.logger = new MutedLogger(); });
    runStep('const defaultConfig', () => {
      defaultOpenapiRouterConfig = {
        controllerDir: path.join(__dirname, 'controller'),
        docsDir: docsFile_valid_res_body_oas2_json,
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
      };
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

    const url = '/valid/response/body';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .get(url)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `response.body`')
        .get(url)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '415')
        .endAllureStep();
    }

  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.body` valid')
  public async test2() {

    const url = '/valid/response/body';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .post(url)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('`response.body` valid')
        .post(url)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '200')
        .endAllureStep();
    }

  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.body` invalid')
  public async test3() {

    const url = '/valid/response/body';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .patch(url)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('`response.body` invalid')
        .patch(url)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_BODY_STATUS, '422')
        .endAllureStep();
    }

  }

}
