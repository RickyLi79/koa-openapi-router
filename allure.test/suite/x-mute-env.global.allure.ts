import { suite, test } from '@testdeck/mocha';
import { Severity, Status } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import http from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import supertest, { SuperAgentTest } from 'supertest';
import { AllureStepProxy, AllureHelper } from 'supertest-allure-step-helper';
import * as allureDecorators from 'ts-test-decorators';
import { OpenapiRouter } from '../../lib/OpenapiRouter';
import { createOpenapiRouterConfig } from '../../lib/OpenapiRouterConfig';
import { TEST_RESPONSE_HEADER_ACTION_MUTED, TEST_RESPONSE_HEADER_TEST_ENABLED } from '../../lib/Test-Response-Header';
import { IOpenapiRouterConfig, IOpenapiRouterOptions, PowerPartial } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_mute_global_oas3_yaml } from './docs/docsPath';

let defaultOpenapiRouterConfig: IOpenapiRouterConfig;
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

@suite("OpenapiRouter: oasDoc['x-mute-env']")
export class TestSuite {

  static server: http.Server;
  static app: Koa;
  static allureAgentProxy: SuperAgentTest | undefined;

  public static async before() {
    await TestStore.setup(this);

    AllureHelper.runStep('mute OpenapiRouter.logger', () => { OpenapiRouter.logger = new MutedLogger(); });

    AllureHelper.runStep('const defaultConfig', () => {
      defaultOpenapiRouterConfig = createOpenapiRouterConfig({
        controllerDir: path.join(__dirname, 'controller'),
        docsDir: docsFile_mute_global_oas3_yaml,
      });
      AllureHelper.attachmentJson('defaultConfig', defaultOpenapiRouterConfig);
    });

  }

  public static after() {
    AllureHelper.runStep('teardown class', () => {
      TestStore.teardown(this);
    });
  }

  public async before() {
    allure.epic('koa-openapi-router');
    allure.story("OpenapiRouter: oasDoc['x-mute-env']");
    AllureHelper.runStep('new Koa()', () => {
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
  @test("oasDoc['x-mute-env']")
  public async test1() {

    // OpenapiRouter.logger = console;

    const toPath = '/hello';
    AllureHelper.runStep(`set : toPath = '${toPath}'`, () => {
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

    await AllureHelper.runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      AllureHelper.attachmentJson('openapiRouter config', defaultOpenapiRouterConfig);
      AllureHelper.attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    AllureHelper.logStep(`current env === '${TestSuite.app.env}'`, Status.PASSED);

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

}
