/*
 *************************************************************************
 *    File Name:  ListenNetClass.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Fri 10 Aug 2018 03:35:46 AM EDT
 * 
 *  Description: 对http, tcp, websocket 网络统一封装，
 *               简化网络操作，游戏业务可以统一的接口使用
 * 
 ************************************************************************
*/
'use strict';
const logger = require('../utils/logger.js');
const NetApi = require('./NetApi.js');

class ListenNetClass extends NetApi {
  constructor(opt, handler) {
    super('server', opt, handler);
  }
}

ListenNetClass.prototype.tmStart = function () {
	let self = this;
  let prr = function(resolve, reject){
		reject(self.opt.host +":"+ self.opt.port + " not supported not, " +
           "would implement schema:" + self.schema);
  };

  let promise = null;
	switch(self.schema){
	case 'http':
    promise = self._startHttpListen();
		break;
	case 'ws':
    promise = self._startWsListen();
		break;
	case 'tcp':
    promise = self._startTcpListen();
		break;
	default:
    promise = new Promise(prr);
		break;
	}
  return promise;
};

ListenNetClass.prototype._startHttpListen = function () {
  let self = this;
	logger.trace("Try tmStart listen on " + self.id);
  let HttpServer = require('./HttpServer.js');
  self.net = new HttpServer(self.opt, self.tmHandler);
  return self.net.tmStart();
};

ListenNetClass.prototype._startWsListen = function () {
  let self = this;
	logger.trace("Try tmStart listen on " + self.id);
  let WSServer = require('./WSServer.js');
  self.net = new WSServer(self.opt, self.tmHandler);
  return self.net.tmStart();
};

ListenNetClass.prototype._startTcpListen = function () {
  let self = this;
	logger.trace("Try tmStart listen on " + self.id);
  let TCPServer = require('./TCPServer.js');
  self.net = new TCPServer(self.opt, self.tmHandler);
  return self.net.tmStart();
};

module.exports = ListenNetClass;
