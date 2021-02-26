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
import { IOpenapiRouterConfig, IOpenapiRouterOptions, PowerPartial } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_valid_req_contentType_oas2_json } from './docs/docsPath';

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

@suite('OpenapiRouter: valid.request.contentType  oas2')
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
        docsDir: docsFile_valid_req_contentType_oas2_json,
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
    allure.story('OpenapiRouter: valid : request.contentType');
    OpenapiRouter.logger = new MutedLogger();
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
  @test('valid.request : no `req.contentType` required')
  public async test1() {

    const toPath = '/valid/request/contentType';
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

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `req.contentType`')
        .get(toPath)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName("`req.contentType` === 'application/json'")
        .get(toPath)
        .set('content-type', 'application/json')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName("`req.contentType` === 'html/text'")
        .get(toPath)
        .set('content-type', 'html/text')
        .expect(200)
        .endAllureStep();
    }

  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : `content-type` optional')
  public async test2() {

    const toPath = '/valid/request/contentType';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
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
        .stepName('no `req.contentType`')
        .post(toPath)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName(" `req.contentType` === 'application/json'")
        .post(toPath)
        .set('content-type', 'application/json')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName(" `req.contentType` === 'html/text'")
        .post(toPath)
        .set('content-type', 'html/text')
        .expect(200)
        .endAllureStep();
    }

  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : `content-type` required')
  public async test3() {

    const toPath = '/valid/request/contentType';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
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
        .stepName('no `req.contentType`')
        .patch(toPath)
        .expect(415)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName(" `req.contentType` === 'application/json'")
        .patch(toPath)
        .set('content-type', 'application/json')
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName(" `req.contentType` === 'html/text'")
        .patch(toPath)
        .set('content-type', 'html/text')
        .expect(415)
        .endAllureStep();
    }

  }
}
