import { suite, test } from '@testdeck/mocha';
import { Severity } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import assert from 'assert';
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
import { docsFile_create_oas3_json } from './docs/docsPath';

let defaultOpenapiRouterConfig: IOptionalOpenapiRouterConfig;

@suite('OpenapiRouter: valid.request.path')
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
    allure.story('OpenapiRouter: path');
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
  }

  protected createAllureAgentProxy(url?: string) {
    const agent = supertest.agent(url ?? TestSuite.server);
    TestSuite.allureAgentProxy = AllureStepProxy.create(agent);
    return TestSuite.allureAgentProxy!;
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , no `tags` => `default`')
  public async test1() {

    const url = '/path/of/api1';
    runStep(`set URL = '${url}'`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .send('123')
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
        .expect(200)
        .expect(url)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , has `tags[0]`')
  public async test2() {

    const url = '/path2/of/api1';
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
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(200)
        .expect(url)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , path parameter')
  public async test3() {

    const p1 = Math.ceil(Math.random() * 100);
    const p2 = Math.ceil(Math.random() * 100);
    const url = `/path/parameter/${p1}/${p2}`;
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

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(200)
        .expect(`p1=${p1}&p2=${p2}`)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , order : `GET`|`POST`|`DELETE`|`PATCH`|...')
  public async test4() {

    const data = { num: Math.ceil(Math.random() * 100) };
    const url = '/path3/of/api1';
    runStep(`set URL = '${url}', num=${data.num}`, () => {
      return url;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(url)
        .send(data)
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
        .post(url)
        .send(data)
        .expect(200)
        .expect(res => {
          assert.strictEqual(res.body.result, data.num * 2);
          // res.body.result = data.num * 2;
        })
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , order : `ALL`')
  public async test5() {

    const url = '/path4/of/api1';
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
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(200)
        .expect('ALL ' + url)
        .endAllureStep();
    }
  }


  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , order : `none`')
  public async test6() {

    const url = '/path5/of/api1';
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
      await OpenapiRouter.Start(TestSuite.app, { router: {}, config: defaultOpenapiRouterConfig });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(url)
        .expect(200)
        .expect('none ' + url)
        .endAllureStep();
    }
  }
}
