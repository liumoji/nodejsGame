/*
 *************************************************************************
 *    File Name:  ConnectNetClass.js
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

class ConnectNetClass extends NetApi{
  constructor(opt, handler) {
    super('client', opt, handler);
  }
}

ConnectNetClass.prototype.tmConnect = function () {
  let prr = (resolve, reject) => {
		reject(new Error(this.opt.host +":"+ this.opt.port + " not supported not, " +
           "would implement schema:" + this.opt.schema));
  };

  let promise = null;
	switch(this.schema){
	case 'http':
    promise = this.connectHttp();
		break;
	case 'ws':
    promise = this.connectWs();
		break;
	case 'tcp':
    promise = this.connectTcp();
		break;
	default:
    promise = new Promise(prr);
		break;
	}
  return promise;
};

ConnectNetClass.prototype.connectHttp = function () {
  logger.trace("Try start connect to " + this.id);
  let HttpClientSimple = require('./HttpClientSimple.js');
  this.net = new HttpClientSimple(this.opt, this.tmHandler);
  return this.net.connect();
};

ConnectNetClass.prototype.connectWs = function () {
  logger.trace("Try start connect to " + this.id);
  let WSClient = require('./WSClient.js');
  this.net = new WSClient(this.opt, this.tmHandler);
  return this.net.connect();
};

ConnectNetClass.prototype.connectTcp = function () {
  logger.trace("Try start connect to " + this.id);
  let TCPClient = require('./TCPClient.js');
  this.net = new TCPClient(this.opt, this.tmHandler);
  return this.net.connect();
};

module.exports = ConnectNetClass;
