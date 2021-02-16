import { suite, test } from '@testdeck/mocha';
import { Severity } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import extend from 'extend';
import http from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import Router from 'koa-router';
import path from 'path';
import supertest, { SuperAgentTest } from 'supertest';
import * as allureDecorators from 'ts-test-decorators';
import { OpenapiRouter } from '../../lib/OpenapiRouter';
import { IOptionalOpenapiRouterConfig } from '../../lib/types';
import { docsDir, docsFile_create_oas3_json, docsFile_valid_req_para_oas3_json, docsFile_valid_req_body_oas3_yaml } from './docs/docsPath';
import { MutedLogger, TestStore } from '../TestStore';
import { attachmentJson, attachmentJsonByObj, attachmentUtf8FileAuto, runStep } from 'supertest-allure-step-helper/helpers/AllureHelper';
import { AllureStepProxy } from 'supertest-allure-step-helper';


let defaultOpenapiRouterConfig: IOptionalOpenapiRouterConfig;

@suite('OpenapiRouter: create')
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
    allure.story('OpenapiRouter: create');
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

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `new OpenapiRouter()` , one doc-file')
  public async test1() {

    const url = '/no/such/action/api1';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(404)
        .endAllureStep();
    }

    await runStep('new OpenapiRouter()', async () => {
      const router = new Router();
      const openapiRouter = new OpenapiRouter(router, defaultOpenapiRouterConfig);
      await openapiRouter.loadOpenapi();
      TestSuite.app.use(router.routes());
      attachmentJson('openapiRouter config', openapiRouter.config);
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(501)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `new OpenapiRouter()` , scan dir')
  public async test2() {

    const url = '/no/such/action/api1';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(404)
        .endAllureStep();
    }

    await runStep('new OpenapiRouter()', async () => {
      const router = new Router();
      const config = extend(true, {}, defaultOpenapiRouterConfig, { docsDir });
      const openapiRouter = new OpenapiRouter(router, config);
      await openapiRouter.loadOpenapi();
      TestSuite.app.use(router.routes());

      attachmentJson('openapiRouter config', openapiRouter.config);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(501)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `OpenapiRouter.Start()` , use `Router.IRouterOptions`')
  public async test3() {

    const url = '/api/no/such/action/api1';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(404)
        .endAllureStep();
    }

    await runStep('OpenapiRouter.Start()', async () => {
      const routerConfig = { prefix: '/api' };
      await OpenapiRouter.Start(TestSuite.app, { router: routerConfig, config: defaultOpenapiRouterConfig });
      attachmentJsonByObj({ routerConfig, defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(501)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `OpenapiRouter.Start()` , mix')
  public async test4() {

    const url1 = '/api1/no/such/action/api1';
    const url2 = '/api2/no/such/action/api2';
    const url3 = '/api3/no/such/action/api3';
    runStep('set URLs', () => {
      runStep(`set url1 = '${url1}'`, () => {
        return url1;
      });
      runStep(`set url2 = '${url2}'`, () => {
        return url2;
      });
      runStep(`set url3 = '${url3}'`, () => {
        return url3;
      });
    });

    await runStep("request.get('${url}').expect(404)", async () => {
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(url1)
          .expect(404)
          .endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(url2)
          .expect(404)
          .endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(url3)
          .expect(404)
          .endAllureStep();
      }
    });

    await runStep('OpenapiRouter.Start(), mutil', async () => {
      const config1 = extend(true, {}, defaultOpenapiRouterConfig, { docsDir: docsFile_create_oas3_json });
      const config2 = extend(true, {}, defaultOpenapiRouterConfig, { docsDir: docsFile_valid_req_para_oas3_json });
      const config3 = extend(true, {}, defaultOpenapiRouterConfig, { docsDir: docsFile_valid_req_body_oas3_yaml });
      const routerConfig1 = { prefix: '/api1' };
      const routerConfig2 = { prefix: '/api2' };
      const routerConfig3 = { prefix: '/api3' };
      const router = new Router(routerConfig1);
      await OpenapiRouter.Start(TestSuite.app,
        [
          { router, config: config1 },
          { router: routerConfig2, config: config2 },
          { router: routerConfig3, config: config3 },
        ]);
      attachmentJsonByObj([{ routerConfig1, config1 }, { routerConfig2, config2 }, { routerConfig3, config3 }]);
      attachmentUtf8FileAuto(config1.docsDir);
      attachmentUtf8FileAuto(config2.docsDir);
      attachmentUtf8FileAuto(config3.docsDir);
    });

    await runStep("request.get('${url}').expect(501)", async () => {
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(url1)
          .expect(501).endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(url2)
          .expect(501)
          .endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(url3)
          .expect(501)
          .endAllureStep();
      }
    });
  }
}
