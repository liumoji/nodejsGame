'use strict';
const http = require("http");
const https = require("https");
const Url = require("url");
const querystring = require("querystring");

const logger = require("../utils/logger.js");
const xmlUtils = require("../utils/XMLUtils.js");
const f_debug = false;

const httpClient = {};

function maybeCallback(cb) {
  return typeof cb === 'function' ? cb : rethrow();
}

function rethrow() {
  // Only enable in debug mode. A backtrace uses ~1000 bytes of heap space and
  // is fairly slow to generate.
  if (f_debug) {
    let backtrace = new Error();
    return function (err) {
      if (err) {
        backtrace.stack = err.name + ': ' + err.message +
          backtrace.stack.substr(backtrace.name.length);
        err = backtrace;
        throw err;
      }
    };
  }

  return function (err) {
    if (err) {
      throw err;
    }
  };
}

let httpContentType = {};
httpContentType.FORM = "application/x-www-form-urlencoded";
httpContentType.JSON = "application/json";

let formatType = {};
formatType.QueryString = "querystring";
formatType.JSON = "json";
formatType.String = "string";
formatType.Buffer = "buffer";
formatType.XML = "xml";

formatType.encodeFuncs = {};
formatType.encodeFuncs[formatType.QueryString] = function encodeQueryString(data) {
  return querystring.stringify(data);
};
formatType.encodeFuncs[formatType.JSON] = function encodeJSON(data) {
  return JSON.stringify(data);
};
formatType.encodeFuncs[formatType.String] = function encodeString(data) {
  return data + "";
};
formatType.encodeFuncs[formatType.Buffer] = function encodeBuffer(data) {
  return data;
};
formatType.encodeFuncs[formatType.XML] = function encodeXML(data) {
  return xmlUtils.encodeSimpleJS2XML(data);
};

formatType.decodeFuncs = {};
formatType.decodeFuncs[formatType.QueryString] = function decodeQueryString(buf) {
  return querystring.parse(buf.toString("utf-8"));
};
formatType.decodeFuncs[formatType.JSON] = function decodeJSON(buf) {
  return JSON.parse(buf.toString("utf-8"));
};
formatType.decodeFuncs[formatType.String] = function decodeString(buf) {
  return buf.toString("utf-8");
};
formatType.decodeFuncs[formatType.Buffer] = function decodeBuffer(buf) {
  return buf;
};
formatType.decodeFuncs[formatType.XML] = function encodeXML(buf) {
  return xmlUtils.decodeSimpleJS2XML(buf.toString("utf-8"));
};

formatType.decode = function (format, buf) {
  return formatType.decodeFuncs[format](buf);
};

formatType.encode = function (format, data) {
  return formatType.encodeFuncs[format](data);
};

/////////方便外部直接调用的 API 
// Getxxxxx
httpClient.Get = function (url, format, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsGet(url, format, callback);
  }
  else {
    httpClient.httpGet(url, format, callback);
  }
}
httpClient.GetJson = function (url, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsGetJson(url, callback);
  }
  else {
    httpClient.httpGetJson(url, callback);
  }
}
httpClient.GetQueryString = function (url, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsGetQueryString(url, callback);
  }
  else {
    httpClient.httpGetQueryString(url, callback);
  }
}

// Postxxxxx
httpClient.Post = function (url, data, requestFormat, responseFormat, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsPost(url, data, requestFormat, responseFormat, callback);
  }
  else {
    httpClient.httpPost(url, data, requestFormat, responseFormat, callback);
  }
}
httpClient.PostJson = function (url, data, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsPostJson(url, data, callback);
  }
  else {
    httpClient.httpPostJson(url, data, callback);
  }
}
httpClient.PostXML = function (url, data, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsPostXML(url, data, callback);
  }
  else {
    httpClient.httpPostXML(url, data, callback);
  }
}
httpClient.PostQueryString = function (url, data, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsPostQueryString(url, data, callback);
  }
  else {
    httpClient.httpPostQueryString(url, data, callback);
  }
}
httpClient.PostQueryStringReJson = function (url, data, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsPostQueryStringReJson(url, data, callback);
  }
  else {
    httpClient.httpPostQueryStringReJson(url, data, callback);
  }
}
httpClient.PostFormQueryStringReJson = function (url, data, callback) {
  if (url.toLowerCase().indexOf('https') === 0) {
    httpClient.httpsPostFormQueryStringReJson(url, data, callback);
  }
  else {
    httpClient.httpPostFormQueryStringReJson(url, data, callback);
  }
}

// 内部https及https实现方式

//////////////////////////////////////////////////////////////////////////////
/////////// Get
httpClient.httpsGet = function (url, format, callback) {
  let cb = maybeCallback(arguments[arguments.length - 1]);
  if (typeof format === 'function' || !format) { format = formatType.Buffer; }
  httpClient._httpGet(https, url, format, cb);
};
httpClient.httpGet = function (url, format, callback) {
  let cb = maybeCallback(arguments[arguments.length - 1]);
  if (typeof format === 'function' || !format) { format = formatType.Buffer; }
  httpClient._httpGet(http, url, format, cb);
};

/////////// GetJson
httpClient.httpsGetJson = function (url, callback) {
  httpClient._httpGet(https, url, formatType.JSON, callback);
};
httpClient.httpGetJson = function (url, callback) {
  httpClient._httpGet(http, url, formatType.JSON, callback);
};

/////////// GetQueryString
httpClient.httpsGetQueryString = function (url, callback) {
  httpClient._httpGet(https, url, formatType.QueryString, callback);
};
httpClient.httpGetQueryString = function (url, callback) {
  httpClient._httpGet(http, url, formatType.QueryString, callback);
};

httpClient._httpGet = function (httpObj, url, format, callback) {
  logger.trace(`http get request url: ${url}`);
  let cb = maybeCallback(arguments[arguments.length - 1]);
  if (typeof format === 'function' || !format) { format = formatType.Buffer; }

  let req = httpObj.get(url, function (res) {
    let dataChunks = null;
    res.on('data', (chunk) => {
      if (dataChunks === null) { dataChunks = []; }
      dataChunks.push(chunk);
    });
    res.on('end', () => {
      if (dataChunks && dataChunks.length > 0) {
        let buf = Buffer.concat(dataChunks);
        let result;
        try {
          let result = formatType.decode(format, buf);
          if (f_debug) {
            logger.trace(`http GET url: ${url}, ` +
              `response data: ${format}, ` +
              JSON.stringify(result));
          }
          cb(null, result);
        } catch (err) {
          logger.error(`http GET url: ${url}, ` +
            `want responseFormat: ${format}, ` +
            `decode error: ${err}, ${err.stack}, buf data: ` +
            (buf ? buf.toString("utf-8") : buf + ""));
          cb(`${err}`, result);
        }
      }
      else {
        cb(`Http server ${url} no data return`, 'no data');
      }
    });
  }).on('error', function (e) {
    logger.error(`http get response err url: ${url}, error: ${e}`);
    cb(e, `URL:${url}`);
  });
  req.end();
};

//////////////////////////////////////////////////////////////////////////////
/////////// Post
httpClient.httpsPost = function (url, data, requestFormat, responseFormat, callback) {
  let cb = maybeCallback(arguments[arguments.length - 1]);
  if (typeof requestFormat === 'function' || !requestFormat) { requestFormat = formatType.Buffer; }
  if (typeof responseFormat === 'function' || !responseFormat) { responseFormat = formatType.Buffer; }
  httpClient._httpPost(https, url, data, requestFormat, responseFormat, cb);
};
httpClient.httpPost = function (url, data, requestFormat, responseFormat, callback) {
  let cb = maybeCallback(arguments[arguments.length - 1]);
  if (typeof requestFormat === 'function' || !requestFormat) { requestFormat = formatType.Buffer; }
  if (typeof responseFormat === 'function' || !responseFormat) { responseFormat = formatType.Buffer; }
  httpClient._httpPost(http, url, data, requestFormat, responseFormat, cb);
};

/////////// PostJson 
httpClient.httpsPostJson = function (url, data, callback) {
  httpClient._httpPost(https, url, data, formatType.JSON, formatType.JSON, callback);
};
httpClient.httpPostJson = function (url, data, callback) {
  httpClient._httpPost(http, url, data, formatType.JSON, formatType.JSON, callback);
};

/////////// PostXML 
httpClient.httpsPostXML = function (url, data, callback) {
  httpClient._httpPost(https, url, data, formatType.XML, formatType.XML, callback);
};
httpClient.httpPostXML = function (url, data, callback) {
  httpClient._httpPost(http, url, data, formatType.XML, formatType.XML, callback);
};

/////////// PostQueryString 
httpClient.httpsPostQueryString = function (url, data, callback) {
  httpClient._httpPost(https, url, data, formatType.QueryString, formatType.QueryString, callback);
};
httpClient.httpPostQueryString = function (url, data, callback) {
  httpClient._httpPost(http, url, data, formatType.QueryString, formatType.QueryString, callback);
};

/////////// PostQueryStringReJson
httpClient.httpsPostQueryStringReJson = function (url, data, callback) {
  httpClient._httpPost(https, url, data, formatType.QueryString, formatType.JSON, callback);
};
httpClient.httpPostQueryStringReJson = function (url, data, callback) {
  httpClient._httpPost(http, url, data, formatType.QueryString, formatType.JSON, callback);
};

/////////// PostFormQueryStringReJson
httpClient.httpsPostFormQueryStringReJson = function (url, data, callback) {
  httpClient._httpPostContentType(https, url, data, httpContentType.FORM, formatType.QueryString, formatType.JSON, callback);
};
httpClient.httpPostFormQueryStringReJson = function (url, data, callback) {
  httpClient._httpPostContentType(http, url, data, httpContentType.FORM, formatType.QueryString, formatType.JSON, callback);
};

httpClient._httpPost = function (httpObj, url, data, requestFormat, responseFormat, callback) {
  let cb = maybeCallback(arguments[arguments.length - 1]);
  if (typeof requestFormat === 'function' || !requestFormat) { requestFormat = formatType.Buffer; }
  if (typeof responseFormat === 'function' || !responseFormat) { responseFormat = formatType.Buffer; }
  httpClient._httpPostContentType(httpObj, url, data, undefined, requestFormat, responseFormat, cb);
};

httpClient._httpPostContentType = function (httpObj, url, data, contentType, requestFormat, responseFormat, callback) {
  let cb = maybeCallback(arguments[arguments.length - 1]);
  if (typeof requestFormat === 'function' || !requestFormat) { requestFormat = formatType.Buffer; }
  if (typeof responseFormat === 'function' || !responseFormat) { responseFormat = formatType.Buffer; }
  let uri = Url.parse(url);
  let opt = {
    hostname: uri.hostname,
    method: 'POST',
    path: uri.path,
    headers: {}
  };

  if (uri.port) opt.port = uri.port;

  let requestBody = formatType.encode(requestFormat, data);

  if (contentType === httpContentType.FORM) {
    opt.headers['Content-Type'] = httpContentType.FORM;
    opt.headers['Content-Length'] = requestBody.length;
  } else if (requestFormat === formatType.JSON) {
    opt.headers['Content-Type'] = httpContentType.JSON;
    opt.headers['Content-Length'] = Buffer.byteLength(requestBody);
  }

  logger.trace(`http POST request url: ${url}, body: ${requestBody}`);
  let req = httpObj.request(opt, function (res) {
    let dataChunks = null;
    res.on('data', (chunk) => {
      if (dataChunks === null) { dataChunks = []; }
      dataChunks.push(chunk);
    });
    res.on('end', () => {
      if (dataChunks && dataChunks.length > 0) {
        let buf = Buffer.concat(dataChunks);
        let result;
        let resErr;
        try {
          result = formatType.decode(responseFormat, buf);
          if (f_debug) {
            logger.trace(`http POST url: ${url}, ` +
              `response data: ${responseFormat}, ` +
              JSON.stringify(result));
          }
        } catch (err) {
          logger.error(`http POST url: ${url}, ` +
            `responseFormat: ${responseFormat}, ` +
            `decode error: ${err}, ${err.stack}, buf data: ` +
            (buf ? buf.toString("utf-8") : buf + ""));
          resErr = `${err}`;
        }
        cb(resErr, result);
      }
      else {
        cb(`Http server ${url} no data return`);
      }
    });
  }).on('error', function (e) {
    logger.warn(`http POST url: ${url}, encount error: ${e}`);
    cb(e, `URL:${url}`);
  });

  req.write(requestBody);
  req.end();
};

httpClient.formatType = formatType;
module.exports = httpClient;
