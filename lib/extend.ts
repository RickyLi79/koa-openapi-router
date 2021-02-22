import querystring from 'querystring';
const RE_ARRAY_KEY = /[^\[\]]+\[\]$/;

export function toQueries(querystring: string) {
  return _customQuery(querystring, arrayValue);
}

function arrayValue(value: any) {
  if (!Array.isArray(value)) {
    value = [ value ];
  }
  return value;
}

// How to read query safely
// https://github.com/koajs/qs/issues/5
function _customQuery(qryStr: string, filter: (value: any) => any) {
  const str = qryStr || '';
  const c = {};
  let cacheQuery = c[str];
  if (!cacheQuery) {
    cacheQuery = c[str] = {};
    const isQueries = true;
    // `querystring.parse` CANNOT parse something like `a[foo]=1&a[bar]=2`
    const query = str ? querystring.parse(str) : {};
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
