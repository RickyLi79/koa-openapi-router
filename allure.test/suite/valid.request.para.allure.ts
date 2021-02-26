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
import { docsFile_valid_req_body_oas3_yaml } from './docs/docsPath';

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

@suite('OpenapiRouter: valid.request.para')
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
        docsDir: docsFile_valid_req_body_oas3_yaml,
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
    allure.story('OpenapiRouter: valid : request.para');
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
  @test('valid.request : required `path`')
  public async test0() {

    const p1 = Math.random().toFixed(3);
    const p2 = Math.random().toFixed(3);
    const toPath = `/valid/request/path/${p1}/${p2}`;
    runStep(`set : toPath='${toPath}', p1=${p1}, p2=${p2}`, () => {
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

    const toPath2 = toPath + '/abc';
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
        .get(toPath)
        .expect(200)
        .endAllureStep();

    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `path`')
        .get(`/valid/request/path/${Math.random().toPrecision(10)}/${p2}`)
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : required `header`')
  public async test1() {

    const toPath = '/valid/request/header';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .get(toPath)
        .set('h1', 'any')
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
        .get(toPath)
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `header`')
        .get(toPath)
        .set('h1', 'any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `header`')
        .get(toPath)
        .set('h1', 'a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `header`')
  public async test2() {

    const toPath = '/valid/request/header';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(toPath)
        .set('h1', 'any')
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
        .stepName('no `header`')
        .post(toPath)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `header`')
        .post(toPath)
        .set('h1', 'any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `header`')
        .post(toPath)
        .set('h1', 'a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : required `query`')
  public async test_3() {

    const toPath = '/valid/request/query';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .query({ q1: 'any' })
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
        .stepName('no `query`')
        .get(toPath)
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `query`')
        .get(toPath)
        .query({ q1: 'any' })
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `query`')
        .get(toPath)
        .query({ q1: 'a too long text. length > maxLength' })
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `query`')
  public async test4() {

    const toPath = '/valid/request/query';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(toPath)
        .query({ q1: 'any' })
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
        .stepName('invalid `query`')
        .post(toPath)
        .query({ q1: 'any' })
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `query`')
        .post(toPath)
        .query({ q1: 'any' })
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `query`')
        .post(toPath)
        .query({ q1: 'a too long text. length > maxLength' })
        .expect(422)
        .endAllureStep();
    }
  }
  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : required `cookie`')
  public async test5() {

    const toPath = '/valid/request/cookie';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .set('Cookie', 'c1=any')
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
        .stepName('no `cookie`')
        .get(toPath)
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .set('Cookie', 'c1=any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `cookie`')
        .get(toPath)
        .set('Cookie', 'c1=a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `cookie`')
  public async test6() {

    const toPath = '/valid/request/cookie';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(toPath)
        .set('Cookie', 'c1=any')
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
        .stepName('no `cookie`')
        .post(toPath)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `cookie`')
        .post(toPath)
        .set('Cookie', 'c1=any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `cookie`')
        .post(toPath)
        .set('Cookie', 'c1=a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

}
