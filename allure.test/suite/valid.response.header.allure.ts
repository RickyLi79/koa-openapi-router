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
import { TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS } from '../../lib/Test-Response-Header';
import { IOptionalOpenapiRouterConfig } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_valid_res_header_oas3_yaml } from './docs/docsPath';

let defaultOpenapiRouterConfig: IOptionalOpenapiRouterConfig;

@suite('OpenapiRouter: valid.response.header')
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
        docsDir: docsFile_valid_res_header_oas3_yaml,
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
  @test('valid.response : no `response.header` required')
  public async test1() {

    const toPath = '/valid/response/header';
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
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `response.header`')
        .get(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '200')
        .endAllureStep();
    }

  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.header` optional, valid')
  public async test2() {

    const toPath = '/valid/response/header';
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
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `response.header`')
        .post(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '200')
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.header` optional, invalid')
  public async test3() {

    const toPath = '/valid/response/header';
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
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `response.header`')
        .patch(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '422')
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.header` required, valid')
  public async test4() {

    const toPath = '/valid/response/header';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .delete(toPath)
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
        .stepName('valid `response.header`')
        .delete(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '200')
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.response : `response.header` required, invalid')
  public async test5() {

    const toPath = '/valid/response/header';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .put(toPath)
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
        .stepName('valid `response.header`')
        .put(toPath)
        .expect(200)
        .expectHeader(TEST_RESPONSE_HEADER_RESPONSE_HEADER_STATUS, '422')
        .endAllureStep();
    }
  }
}
