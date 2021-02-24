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
import { IOpenapiRouterConfig } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_valid_req_body_oas2_json } from './docs/docsPath';

const { attachmentJson, attachmentUtf8FileAuto, runStep } = AllureHelper;

let defaultOpenapiRouterConfig: IOpenapiRouterConfig;

@suite('OpenapiRouter: valid.request.body - oas2')
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
        docsDir: docsFile_valid_req_body_oas2_json,
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
    allure.story('OpenapiRouter: valid : request.body');
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
  @test('valid.request : required `body`')
  public async test1() {

    const toPath = '/valid/request/body';
    const body = { time: new Date(), value: 1 };
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(toPath)
        .send(body)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `body`')
        .post(toPath)
        .expect(415)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `body`')
        .post(toPath)
        .set('content-type', 'application/json')
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `body`')
        .post(toPath)
        .send(body)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `body`')
        .post(toPath)
        .send({ value: '1' })
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `body`')
  public async test2() {

    const toPath = '/valid/request/body';
    const body = { time: new Date(), value: 1 };
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(toPath)
        .send(body)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `body`')
        .patch(toPath)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `body`')
        .patch(toPath)
        .set('content-type', 'application/json')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `body`')
        .patch(toPath)
        .send(body)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `body`')
        .patch(toPath)
        .send({ value: 1 })
        .expect(422)
        .endAllureStep();
    }
  }

}
