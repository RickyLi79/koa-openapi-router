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
import { IOptionalOpenapiRouterConfig } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_valid_req_body_oas3_yaml } from './docs/docsPath';

let defaultOpenapiRouterConfig: IOptionalOpenapiRouterConfig;

@suite('OpenapiRouter: valid.request.body - oas3')
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
        docsDir: docsFile_valid_req_body_oas3_yaml,
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

  protected createAllureAgentProxy(url?:string) {
    const agent = supertest.agent(url ?? TestSuite.server);
    TestSuite.allureAgentProxy = AllureStepProxy.create(agent);
    return TestSuite.allureAgentProxy!;
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : required `body`')
  public async test1() {

    const url = '/valid/request/body';
    const body = { time: new Date(), value: 1 };
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(url)
        .send(body)
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
        .stepName('no `body`')
        .post(url)
        .expect(415)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('no `body`')
        .post(url)
        .set('content-type', 'application/json')
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `body`')
        .post(url)
        .send(body)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `body`')
        .post(url)
        .send({ value: '1' })
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `body`')
  public async test3() {

    const url = '/valid/request/body';
    const body = { time: new Date(), value: 1 };
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .patch(url)
        .send(body)
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
        .stepName('no `body`')
        .patch(url)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `body`')
        .patch(url)
        .send(body)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `body`')
        .patch(url)
        .send({ value: 1 })
        .expect(422)
        .endAllureStep();
    }
  }


}
