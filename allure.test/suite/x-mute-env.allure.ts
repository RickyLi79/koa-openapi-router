import { suite, test } from '@testdeck/mocha';
import { Severity, Status } from 'allure-js-commons';
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
import { TEST_RESPONSE_HEADER_ACTION_MUTED, TEST_RESPONSE_HEADER_TEST_ENABLED } from '../../lib/Test-Response-Header';
import { IOpenapiRouterConfig, IOpenapiRouterOptions, PowerPartial } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_mute_oas3_yaml } from './docs/docsPath';

const { attachmentJson, attachmentUtf8FileAuto, runStep, logStep } = AllureHelper;
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

@suite("OpenapiRouter: operation['x-mute-env']")
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
        docsDir: docsFile_mute_oas3_yaml,
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
    allure.story("OpenapiRouter: operation['x-mute-env']");
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
  @test("operation['x-mute-env'] is Array")
  public async test1() {

    // OpenapiRouter.logger = console;

    const toPath = '/hello';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .expectHeader(TEST_RESPONSE_HEADER_TEST_ENABLED, undefined)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      attachmentJson('openapiRouter config', defaultOpenapiRouterConfig);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    logStep(`current env === '${TestSuite.app.env}'`, Status.PASSED);

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .expectHeader(TEST_RESPONSE_HEADER_TEST_ENABLED, 'true')
        .expectHeader(TEST_RESPONSE_HEADER_ACTION_MUTED, 'true')
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test("operation['x-mute-env'] is string")
  public async test2() {

    // OpenapiRouter.logger = console;

    const toPath = '/nihao';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .expectHeader(TEST_RESPONSE_HEADER_TEST_ENABLED, undefined)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      attachmentJson('openapiRouter config', defaultOpenapiRouterConfig);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    logStep(`current env === '${TestSuite.app.env}'`, Status.PASSED);

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .expectHeader(TEST_RESPONSE_HEADER_TEST_ENABLED, 'true')
        .expectHeader(TEST_RESPONSE_HEADER_ACTION_MUTED, 'true')
        .endAllureStep();
    }
  }
  @allureDecorators.severity(Severity.NORMAL)

  @test("operation['x-mute-env'] not match")
  public async test3() {

    // OpenapiRouter.logger = console;

    const toPath = '/greeting';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .expectHeader(TEST_RESPONSE_HEADER_TEST_ENABLED, undefined)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      attachmentJson('openapiRouter config', defaultOpenapiRouterConfig);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    logStep(`current env === '${TestSuite.app.env}'`, Status.PASSED);

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(501)
        .expectHeader(TEST_RESPONSE_HEADER_TEST_ENABLED, 'true')
        .expectHeader(TEST_RESPONSE_HEADER_ACTION_MUTED, undefined)
        .endAllureStep();
    }
  }
}
