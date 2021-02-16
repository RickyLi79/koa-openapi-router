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

@suite('OpenapiRouter: valid.request.para')
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
    const url = `/valid/request/path/${p1}/${p2}`;
    runStep(`set URL='${url}', p1=${p1}, p2=${p2}`, () => {
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
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    const url2 = url + '/abc';
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
        .get(url)
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

    const url = '/valid/request/header';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('expect(404)')
        .get(url)
        .set('h1', 'any')
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
        .get(url)
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `header`')
        .get(url)
        .set('h1', 'any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `header`')
        .get(url)
        .set('h1', 'a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `header`')
  public async test2() {

    const url = '/valid/request/header';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(url)
        .set('h1', 'any')
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
        .stepName('no `header`')
        .post(url)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `header`')
        .post(url)
        .set('h1', 'any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `header`')
        .post(url)
        .set('h1', 'a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : required `query`')
  public async test_3() {

    const url = '/valid/request/query';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .query({ q1: 'any' })
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
        .stepName('no `query`')
        .get(url)
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `query`')
        .get(url)
        .query({ q1: 'any' })
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `query`')
        .get(url)
        .query({ q1: 'a too long text. length > maxLength' })
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `query`')
  public async test4() {

    const url = '/valid/request/query';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(url)
        .query({ q1: 'any' })
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
        .stepName('invalid `query`')
        .post(url)
        .query({ q1: 'any' })
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `query`')
        .post(url)
        .query({ q1: 'any' })
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `query`')
        .post(url)
        .query({ q1: 'a too long text. length > maxLength' })
        .expect(422)
        .endAllureStep();
    }
  }
  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : required `cookie`')
  public async test5() {

    const url = '/valid/request/cookie';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .set('Cookie', 'c1=any')
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
        .stepName('no `cookie`')
        .get(url)
        .expect(422)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .set('Cookie', 'c1=any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `cookie`')
        .get(url)
        .set('Cookie', 'c1=a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.NORMAL)
  @test('valid.request : optional `cookie`')
  public async test6() {

    const url = '/valid/request/cookie';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });
    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(url)
        .set('Cookie', 'c1=any')
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
        .stepName('no `cookie`')
        .post(url)
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('valid `cookie`')
        .post(url)
        .set('Cookie', 'c1=any')
        .expect(200)
        .endAllureStep();
    }

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .stepName('invalid `cookie`')
        .post(url)
        .set('Cookie', 'c1=a too long text. length > maxLength')
        .expect(422)
        .endAllureStep();
    }
  }

}
