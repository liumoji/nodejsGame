'use strict';
const http = require("http");
const logger = require("../utils/logger.js");
const misc = require("../utils/misc.js");
const NetApi= require("./NetApi.js");

class HttpClientSimple extends NetApi {
  constructor(opt, handler) {
    super('client', opt, handler);
    if (opt.host.indexOf('0.0.0.0') === 0) {
      logger.error(`The ip: ${opt.host} could not be set as HTTPClient server address`);
    }
  }
}

HttpClientSimple.prototype.connect = function () {
  let self = this;
  logger.info("Try connect to " + self.id);
  return self.tmSendData({'data':"HTTP ping!"},3000,'/ping/', 'post');
};

HttpClientSimple.prototype.tmSendData = function (data, timeout, path, method) {
  let self = this;
  let has_return = false;
  let promise = new Promise((resolve, reject) => {
		let commitData = null;
    if (typeof data === 'string'){
		  commitData = data;
    }
    else{
		  commitData = JSON.stringify(data);
    }
    let m = typeof method==='string'  
            ? method.toLowerCase().trim() : method + "";
    let opt = {};
    Object.assign(opt, self.opt);
    opt.hostname =  self.opt.hostname || self.opt.host;
    opt.path = typeof path === 'string' ? path : '/';
    opt.method = misc.ALLOWED_HTTP_METHODS.indexOf(m) >= 0 ?  m : 'POST';
    opt.headers = {
      'Content-Type': 'application/json;charset=utf-8',
      'Content-Length': commitData.length
    };
    opt.timeout = isNaN(timeout) || Number(timeout) < 0 ? 1000 : Number(timeout);
    let req = http.request(opt, (res) => {
      //logger.trace(`STATUS: ${res.statusCode}`);
      //logger.trace(`HEADERS: ${JSON.stringify(res.headers)}`);
      res.setEncoding('utf8');
      let dataChunks = null;
      res.on('data', (chunk) => {
        if(dataChunks === null) { dataChunks = []; }
        dataChunks.push(chunk);
      });
      res.on('end', () => {
        let retData = null;
	  		if (dataChunks && dataChunks.length > 0 && Buffer.isBuffer(dataChunks[0])){
          let str = Buffer.concat(dataChunks).toString('utf8');
          try{
            retData = JSON.parse(str);
          }
          catch(e){
            retData = {};
            retData.error = e + "";
            retData.desc = str;
          }
	  		}
	  		else if (dataChunks && dataChunks.length > 0 && typeof dataChunks[0] === 'string'){
          //let str = dataChunks.toString('utf8');
          let str = dataChunks.join('');
          try{
            retData = JSON.parse(str);
          }
          catch(e){
            retData = {};
            retData.error = e + "";
            retData.desc = str;
          }
	  		}
	  		else{
	  			retData = {};
	  		}
        dataChunks = null;

        if (typeof self.tmHandler === 'function'){
          self.tmHandler(self, retData);
        }
      });
    });

    req.on('error', (e) => {
      let tips = `HTTPClient error with request: ${e.message}`;
      logger.error(tips);
    });
    
    req.write(commitData);
    req.end();

    if (!has_return){
      has_return = true;
      resolve("OK");
    }
  });
  return promise;
};

module.exports = HttpClientSimple;
