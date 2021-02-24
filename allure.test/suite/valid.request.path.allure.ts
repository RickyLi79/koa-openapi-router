import { suite, test } from '@testdeck/mocha';
import { Severity } from 'allure-js-commons';
import { allure } from 'allure-mocha/runtime';
import assert from 'assert';
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
import { docsFile_create_oas3_json } from './docs/docsPath';

const { attachmentJson, attachmentUtf8FileAuto, runStep } = AllureHelper;

let defaultOpenapiRouterConfig: IOpenapiRouterConfig;

@suite('OpenapiRouter: valid.request.path')
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
        docsDir: docsFile_create_oas3_json,
        recursive: false,
        watcher: {
          enabled: false,
        },
        validSchema: {
          request: true,
          reponse: true,
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
  @test('locate controller.action , no `x-controller`, no `tags` => `default`')
  public async test0() {

    const toPath = '/path0/of/api1';
    runStep(`set : toPath = '${toPath}'`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .send('123')
        .expect(404)
        .endAllureStep();

    }
    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, { testMode: true });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(toPath)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , no `x-controller`, has `tags[0]`')
  public async test1() {

    const toPath = '/path1/of/api1';
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
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, { testMode: true });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(toPath)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , has `x-controller`, has `tags[0]`')
  public async test2() {

    const toPath = '/path2/of/api1';
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
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, { testMode: true });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(toPath)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , path parameter')
  public async test3() {

    const p1 = Math.ceil(Math.random() * 100);
    const p2 = Math.ceil(Math.random() * 100);
    const toPath = `/path/parameter/${p1}/${p2}`;
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
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, { testMode: true });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect(`p1=${p1}&p2=${p2}`)
        .endAllureStep();
    }
  }

  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , order : `GET`|`POST`|`DELETE`|`PATCH`|...')
  public async test4() {

    const data = { num: Math.ceil(Math.random() * 100) };
    const toPath = '/path3/of/api1';
    runStep(`set : toPath = '${toPath}', num=${data.num}`, () => {
      return toPath;
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(toPath)
        .send(data)
        .expect(404)
        .endAllureStep();
    }


    await runStep('OpenapiRouter.Start()', async () => {
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, { testMode: true });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .post(toPath)
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

    const toPath = '/path4/of/api1';
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
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, { testMode: true });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect('ALL ' + toPath)
        .endAllureStep();
    }
  }


  @allureDecorators.severity(Severity.CRITICAL)
  @test('locate controller.action , order : `none`')
  public async test6() {

    const toPath = '/path5/of/api1';
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
      await OpenapiRouter.Start(TestSuite.app, defaultOpenapiRouterConfig, { testMode: true });
      attachmentUtf8FileAuto(defaultOpenapiRouterConfig.docsDir);
    });

    {
      const agent = this.createAllureAgentProxy();
      await agent
        .get(toPath)
        .expect(200)
        .expect('none ' + toPath)
        .endAllureStep();
    }
  }
}
