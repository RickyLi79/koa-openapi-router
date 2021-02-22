"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toQueries = void 0;
const tslib_1 = require("tslib");
const querystring_1 = tslib_1.__importDefault(require("querystring"));
const RE_ARRAY_KEY = /[^\[\]]+\[\]$/;
function toQueries(querystring) {
    return _customQuery(querystring, arrayValue);
}
exports.toQueries = toQueries;
function arrayValue(value) {
    if (!Array.isArray(value)) {
        value = [value];
    }
    return value;
}
// How to read query safely
// https://github.com/koajs/qs/issues/5
function _customQuery(qryStr, filter) {
    const str = qryStr || '';
    const c = {};
    let cacheQuery = c[str];
    if (!cacheQuery) {
        cacheQuery = c[str] = {};
        const isQueries = true;
        // `querystring.parse` CANNOT parse something like `a[foo]=1&a[bar]=2`
        const query = str ? querystring_1.default.parse(str) : {};
        for (const key in query) {
            if (!key) {
                // key is '', like `a=b&`
                continue;
            }
            const value = filter(query[key]);
            cacheQuery[key] = value;
            if (isQueries && RE_ARRAY_KEY.test(key)) {
                // `this.queries['key'] => this.queries['key[]']` is compatibly supported
                const subkey = key.substring(0, key.length - 2);
                if (!cacheQuery[subkey]) {
                    cacheQuery[subkey] = value;
                }
            }
        }
    }
    return cacheQuery;
}
