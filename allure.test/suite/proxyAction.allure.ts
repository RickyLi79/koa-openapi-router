import { suite, test } from '@testdeck/mocha';
import { Severity } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import http from 'http';
import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import { IRouterContext } from 'koa-router';
import path from 'path';
import supertest, { SuperAgentTest } from 'supertest';
import { AllureHelper, AllureStepProxy } from 'supertest-allure-step-helper';
import * as allureDecorators from 'ts-test-decorators';
import { OpenapiRouter } from '../../lib/OpenapiRouter';
import { createOpenapiRouterConfig } from '../../lib/OpenapiRouterConfig';
import { IOpenapiRouterConfig, IOpenapiRouterOptions, PowerPartial } from '../../lib/types';
import { MutedLogger, TestStore } from '../TestStore';
import { docsFile_create_oas3_json } from './docs/docsPath';

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

@suite('OpenapiRouter: proxyAction')
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
        docsDir: docsFile_create_oas3_json,
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
    allure.story('OpenapiRouter: proxyAction');
    OpenapiRouter.logger = new MutedLogger();
    AllureHelper.runStep('new Koa()', () => {
      TestSuite.app = new Koa();
      TestSuite.app.use(bodyParser());
      TestSuite.server = TestSuite.app.listen();
    });
  }

  public after() {
    OpenapiRouter.closeAll();
    TestSuite.server.close();
  }

  protected createAllureAgentProxy(url?: string) {
    const agent = supertest.agent(url ?? TestSuite.server);
    TestSuite.allureAgentProxy = AllureStepProxy.create(agent);
    return TestSuite.allureAgentProxy!;
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('set `proxyAction` by config')
  public async test1() {
    const toPath = '/path0/of/api1';
    AllureHelper.runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .endAllureStep();
    }
    await AllureHelper.runStep('OpenapiRouter.Start(), with `proxyAction`', async () => {
      const config = createOpenapiRouterConfig(defaultOpenapiRouterConfig);
      await OpenapiRouter.Start(TestSuite.app, config, { ...option,
        proxyAction: async (ctx: IRouterContext) => {
          ctx.status = 305;
          ctx.set('x-mark', 'proxyAction');
          ctx.body = 'ok';
        } });
      AllureHelper.attachmentUtf8FileAuto(config.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(305)
        .expect('ok')
        .expectHeader('x-mark', 'proxyAction')
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('set `proxyAction` by code')
  public async test2() {
    const toPath = '/path0/of/api1';
    AllureHelper.runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .endAllureStep();
    }

    await AllureHelper.runStep('OpenapiRouter.Start(), no `proxyAction`', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      AllureHelper.attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(toPath)
        .endAllureStep();
    }

    {
      await AllureHelper.runStep('set `proxyAction`', async () => {
        OpenapiRouter.proxyAction = async (ctx: IRouterContext) => {
          ctx.status = 305;
          ctx.set('x-mark', 'proxyAction');
          ctx.body = 'ok';
        };
      });

      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(305)
        .expect('ok')
        .expectHeader('x-mark', 'proxyAction')
        .endAllureStep();
    }

    {
      await AllureHelper.runStep('remove `proxyAction`', async () => {
        OpenapiRouter.proxyAction = undefined;
      });

      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(toPath)
        .endAllureStep();
    }
  }
  @allureDecorators.severity(Severity.NORMAL)
  @test('remove `proxyAction`')
  public async test3() {
    const toPath = '/path0/of/api1';
    AllureHelper.runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(404)
        .endAllureStep();
    }

    await AllureHelper.runStep('OpenapiRouter.Start(), no `proxyAction`', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, option);
      AllureHelper.attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(toPath)
        .endAllureStep();
    }

    {
      await AllureHelper.runStep('set `proxyAction`', async () => {
        OpenapiRouter.proxyAction = async (ctx: IRouterContext) => {
          ctx.status = 305;
          ctx.set('x-mark', 'proxyAction');
          ctx.body = 'ok';
        };
      });

      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(305)
        .expect('ok')
        .expectHeader('x-mark', 'proxyAction')
        .endAllureStep();
    }

    {
      await AllureHelper.runStep('remove `proxyAction`', async () => {
        OpenapiRouter.proxyAction = undefined;
      });

      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(toPath)
        .endAllureStep();
    }
  }

}
