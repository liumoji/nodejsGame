'use strict';
const http = require("http");
const queryStr = require('querystring');
const urlMgr = require('url');
const logger = require("../utils/logger.js");
const NetApi= require("./NetApi.js");

class HttpServer extends NetApi  {
  constructor(opt, handler) {
    super('server', opt, handler);
	  this.isRunning = false;
    this.httpServer= null;
  }
}

HttpServer.prototype.tmStart = function () {
  let self = this;
  let promise = new Promise(function(resolve, reject){
    if (self.httpServer && self.isRunning === true){
      return resolve("OK");
    }

	  if ( typeof self.tmHandler === 'function'
         && typeof self.tmHandler.set === 'function'
         && typeof self.tmHandler.get === 'function'
         && typeof self.tmHandler.use === 'function' ){
      // 使用set,use方法的处理器，如 express
      self.httpServer = http.createServer(self.tmHandler);
    }
    else{
      // 完全定义处理数据
      self.httpServer = http.createServer(function (req, res) {
        let dataChunks = null;
        req.on('data', function (chunk) {
          if(dataChunks === null) { dataChunks = []; }
          dataChunks.push(chunk);
        });

        req.on('end', function () {
	    		let queryInfo = urlMgr.parse(req.url);
	    		let params = queryStr.parse(queryInfo.query);
          // HTTP 协议包体数据，某些方法无此数据
          let data = null;
	    		if (dataChunks && dataChunks.length > 0){
            let str = Buffer.concat(dataChunks).toString('utf8');
            try{
              data = JSON.parse(str);
            }
            catch(e){
              data = {};
              data.error = e + "";
              data.desc = str;
            }
            // 合并 url 上的参数
            let keys = Object.keys(params);
            let k = null;
            for(let i=0; i < keys.length; i++){
              k = keys[i];
              if (!data.hasOwnProperty(k)){
                data[k] = params[k];
              }
            }
	    		}
	    		else{
	    			data = params;
	    		}

          // 将res 包装成 NetApi
          if (typeof res.tmSendData !== 'function'){
            res.side = self.side;
            res.schema = self.schema;
            res.tmSendData  = (dt, timeout)=>{
              if (typeof res.write === 'function'){
                // let ret = {code: 0};
                res.desc = 'test respone .';
	              res.writeHead(200, {'Content-Type': 'text/json'});
	              res.write(JSON.stringify(dt));
	              res.end();
                //console.error("HttServer send dt to client.");
              }
              else{
                logger.warn("HttServer send dt to client, but it has been closed.");
              }
            }

            if (typeof res.tmStart !== 'function') {
              res.tmStart = ()=>{
                // no need: ...
              };
            }

            if (typeof res.toString !== 'function') {
              res.toString= ()=>{
                // no need: ...
              };
            }

            if (typeof res.tmClose !== 'function') {
              res.tmClose = ()=>{
	    			    res.end();
              };
            }
          }

	    		if ( typeof self.tmHandler === 'function' ){
	    		  self.tmHandler(res, data);
	    		}
	    		else{
	    			logger.warn("The cb:" + self.tmHandler + " is not a function.");
	    			res.writeHead(200, {'Content-Type': 'text/json'});
	    			res.end();
	    		}
        });
      });
    }

    self.httpServer.on('listening', function () {
      let address = self.httpServer.address();
      resolve("OK");
	    logger.info("Listen http on: " + JSON.stringify(address));
      if ( !self.isRunning ){
        self.isRunning = true;
      }
    });

    self.httpServer.on('error', function (e) {
	  	let tips = `HTTPServer error: ${e.message}`;
      logger.error(tips);
      if ( !self.isRunning ){
        reject(tips);
      }
    });

    self.httpServer.on('close', function (error) {
	  	let tips = "Http server " + self.opt.host + ':' + self.opt.port + ' close';
      logger.error(tips);
      if (self.isRunning === true){
        self.isRunning = false;
        logger.error("self.httpServer.on close, error: " + error);
        return reject(error);
      }
    });

    self.httpServer.listen(self.opt);
  });
  return promise;
};

HttpServer.prototype.tmSendData = function (data, timeout) {
  logger.warn("HttServer could not call tmSendData directly.");
};

module.exports = HttpServer;
