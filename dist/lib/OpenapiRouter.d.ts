import { Next } from 'koa';
import Router, { IRouterContext } from 'koa-router';
import { ILogger, IOpenapiRouterConfig, IOpenapiRouterOptions, IOptionalOpenapiRouterConfig, KoaControllerAction, OperationSchema } from './types';
export declare const OPENAPI_ROUTER_LOGGER: unique symbol;
export declare const X_OAS_VER = "x-oas-ver";
export declare type KoaControllerActionInfo = {
    mute: boolean;
    file: string;
    func: string;
    action?: KoaControllerAction;
    ctl?: any;
    proxyAction?: (ctx: IRouterContext, next?: Next) => Promise<any>;
};
export declare class OpenapiRouter {
    private filesToConnect;
    private docsRefs;
    private optInDoc;
    private operationMap;
    /**
     * @private
     */
    getOperationByOpt(opt: string): OperationSchema;
    static get logger(): ILogger;
    static set logger(value: ILogger);
    readonly config: IOpenapiRouterConfig;
    constructor(config: IOptionalOpenapiRouterConfig);
    /**
     * dispose all working OpenapiRouter
     */
    static closeAll(): void;
    toString(): string;
    private readonly _router;
    getRouter(): Router;
    static isEggApp: boolean;
    private static app;
    static testMode: boolean;
    static Start(app: any, configs: IOptionalOpenapiRouterConfig | (IOptionalOpenapiRouterConfig[]), options?: IOpenapiRouterOptions): Promise<void>;
    private get logger();
    private static readonly _openapiRouters;
    static getOpenapiRouters(): OpenapiRouter[];
    /**
     * 记录指定outter file已经被哪些OpenapiRouter监控中
     */
    private static readonly filewatchsByOr;
    private static readonly filewatchs;
    /**
     * 本OpenapiRouter正在监控的file
     */
    private readonly wactchingFile;
    private static watchOutterFile;
    private static unwatchOutterFile;
    private _proxyAction?;
    static proxyAction?: KoaControllerAction;
    /**
     * if set, all request will lead to this method.
     *
     * set `undefined` to resume normal mode
     */
    get proxyAction(): KoaControllerAction | undefined;
    set proxyAction(value: KoaControllerAction | undefined);
    private koaControllerActionMap;
    /**
     * @private
     */
    getKoaControllerAction(opt: string, qry?: {
        mute: boolean;
        method: string;
        path: string;
    }, force?: boolean): KoaControllerActionInfo;
    /**
     * @private
     */
    getKoaControllerActionFile(opt: string): string;
    private watchMonitor;
    /**
     * 重新扫描读取openapi文档
     *
     * load/reload OpenApi-doc
     */
    private loadOpenapi;
    /**
     * dispose current OpeanapiRouter
     */
    close(dispose?: boolean): void;
    private checkDocUpdated;
    private addDocTimer?;
    private addDocToConnect;
    private connectOneApi;
    private get action();
    private addRouter;
    private markControllerStats;
}
