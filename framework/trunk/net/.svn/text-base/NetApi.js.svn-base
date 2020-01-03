/*
 *************************************************************************
 *    File Name:  NetApi.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Fri 10 Aug 2018 03:35:46 AM EDT
 * 
 *  Description: 网络对象的统一封装接口(http,websocket,tcp等，客户端服务端均含)
 *              tmStart(), 启动网络接口(服务端listen, 客户端connect)
 *              tmClose(), 关闭网络链接接口
 *              tmSendData(data [,option]), 发送数据接口 
 *              tmHandler: (net, msg)=>{...}, 业务提供的处理收到数据的回调接口 

 *              由于某些情况下要将第三方对象包装成 NetApi，
 *              所以接口名加 tm (TaoMee)前缀, 以免冲突
 ************************************************************************
*/
'use strict';
const logger = require('../utils/logger.js');

class NetApi {
  constructor(side, opt, handler) {
    // 断线重连的间隔最低6秒
    if (opt.reconnect || opt.reconnect < 1000) opt.reconnect = 1000;
    this.side = side;   // server/client
    this.opt  = opt;
    this.tmHandler   = handler;
    // 为保证 id 代表的网络对象是同一个的话id也一样,所以用toUpperCase().trim()
    this.id = opt.schema.toUpperCase().trim() + "://" + 
                opt.host.toUpperCase().trim() +
                ":" + (""+opt.port) + "/";
    this.schema = opt.schema;
    this.net = null;
  }
}

NetApi.prototype.toString = function () {
  return `[side:${this.side}, schema:${this.schema}, id:${this.id}]`;
};

NetApi.prototype.tmStart = function () {
	let self = this;
  let prr = function(resolve, reject){
		reject(self.opt.host +":"+ self.opt.port + " not supported not, " +
           "would implement schema:" + self.opt.schema);
  };
};

NetApi.prototype.tmSendData = function (data) {
  let self = this;
  if (self.net && typeof self.net.tmSendData === 'function'){
    self.net.tmSendData(data);
  }
  else{
    logger.warn(`This ${self.id} ${self.side} has no tmSendData function now.`);
  }
};

NetApi.prototype.tmClose = function () {
  // 在具体子类中实现
}

module.exports = NetApi;
