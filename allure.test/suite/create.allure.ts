import { suite, test } from '@testdeck/mocha';
import { Severity } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import extend from 'extend';
import http from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import path from 'path';
import supertest, { SuperAgentTest } from 'supertest';
import { AllureStepProxy } from 'supertest-allure-step-helper';
import { attachmentJson, attachmentJsonByObj, attachmentUtf8FileAuto, runStep } from 'supertest-allure-step-helper/helpers/AllureHelper';
import * as allureDecorators from 'ts-test-decorators';
import { OpenapiRouter } from '../../lib/OpenapiRouter';
import { IOptionalOpenapiRouterConfig } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsDir, docsFile_create_oas3_json, docsFile_valid_req_body_oas3_yaml, docsFile_valid_req_para_oas3_json } from './docs/docsPath';

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

  protected createAllureAgentProxy(url?: string) {
    const agent = supertest.agent(url ?? TestSuite.server);
    TestSuite.allureAgentProxy = AllureStepProxy.create(agent);
    return TestSuite.allureAgentProxy!;
  }

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `new OpenapiRouter()` , one doc-file')
  public async test1() {

    const toPath = '/no/such/action/api1';
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

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `new OpenapiRouter()` , scan dir')
  public async test2() {

    const toPath = '/no/such/action/api1';
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
      const config = extend(true, {}, defaultOpenapiRouterConfig, { docsDir });
      const openapiRouter = new OpenapiRouter(config);
      await openapiRouter.loadOpenapi();
      TestSuite.app.use(openapiRouter.getRouter().routes());

      attachmentJson('openapiRouter config', openapiRouter.config);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(501)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `OpenapiRouter.Start()` , use `Router.IRouterOptions`')
  public async test3() {

    const toPath = '/api/no/such/action/api1';
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
      const routerConfig = extend(true, {}, defaultOpenapiRouterConfig, { routerPrefix: '/api' });
      await OpenapiRouter.Start(TestSuite.app, routerConfig);
      attachmentJsonByObj({ routerConfig });
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

  @allureDecorators.severity(Severity.BLOCKER)
  @test('by `OpenapiRouter.Start()` , mix')
  public async test4() {

    const toPath1 = '/api1/no/such/action/api1';
    const toPath2 = '/api2/no/such/action/api2';
    const toPath3 = '/api3/no/such/action/api3';
    runStep('set : toPaths', () => {
      runStep(`set : toPath1 = '${toPath1}'`, () => {
        return toPath1;
      });
      runStep(`set : toPath2 = '${toPath2}'`, () => {
        return toPath2;
      });
      runStep(`set : toPath3 = '${toPath3}'`, () => {
        return toPath3;
      });
    });

    await runStep("request.get('${toPath}').expect(404)", async () => {
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(toPath1)
          .expect(404)
          .endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(toPath2)
          .expect(404)
          .endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(toPath3)
          .expect(404)
          .endAllureStep();
      }
    });

    await runStep('OpenapiRouter.Start(), mutil', async () => {
      const config1 = extend(true, {}, defaultOpenapiRouterConfig, { routerPrefix: '/api1', docsDir: docsFile_create_oas3_json });
      const config2 = extend(true, {}, defaultOpenapiRouterConfig, { routerPrefix: '/api2', docsDir: docsFile_valid_req_para_oas3_json });
      const config3 = extend(true, {}, defaultOpenapiRouterConfig, { routerPrefix: '/api3', docsDir: docsFile_valid_req_body_oas3_yaml });
      await OpenapiRouter.Start(TestSuite.app, [ config1, config2, config3 ]);
      attachmentJsonByObj([ config1, config2, config3 ]);
      attachmentUtf8FileAuto(config1.docsDir);
      attachmentUtf8FileAuto(config2.docsDir);
      attachmentUtf8FileAuto(config3.docsDir);
    });

    await runStep("request.get('${url}').expect(501)", async () => {
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(toPath1)
          .expect(501).endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(toPath2)
          .expect(501)
          .endAllureStep();
      }
      {
        const agent = this.createAllureAgentProxy();
        await agent
          .get(toPath3)
          .expect(501)
          .endAllureStep();
      }
    });
  }
}
