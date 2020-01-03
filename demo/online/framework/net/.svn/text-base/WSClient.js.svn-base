'use strict';
//const net = require('net');
const WebSocket = require('ws');
const logger = require('../utils/logger.js');
const misc = require('../utils/misc.js');
const streamCutter = require("../utils/streamCutter.js");
const NetApi= require("./NetApi.js");

const f_debug = false;

class WSClient extends NetApi{
  constructor(opt, handler){
    super('client', opt, handler);
	  this.isRunning = false;
    this.ws = null;
    this.opt.rest_connected_times = opt.reconnect_times || 3;
    if (opt.host.indexOf('0.0.0.0') === 0) {
      logger.error(`The ip: ${opt.host} could not be set as WSClient server address`);
    }
  }
}

WSClient.prototype.connect = function () {
  let self = this;
  logger.info("Try connect to " + self.id);
  let promise = new Promise(function(resolve, reject){
    if (self.ws && self.isRunning === true){
      if (f_debug) logger.trace(`${self.id} has been working ok`);
      return resolve("OK");
    }

    let opt = self.opt;
    self.ws = new WebSocket('ws://' + opt.host + ":" + opt.port + "/");
    self.ws._remote = {ip:opt.host, port:opt.port};
    self.ws._strRemote = JSON.stringify(self.ws._remote);

    self.ws.on('error', (error)=>{
      if (typeof error === 'string'){
        logger.warn(self.side + " ws with remote " + self.ws._strRemote + 
                    " error1: " + error);
      }
      else if(error instanceof Error){
        logger.warn(self.side + " ws with remote " + self.ws._strRemote + 
                    " error2:" + (error? ": " +error.message : "."));
      }
      else{
        try{
          logger.warn(self.side + " ws with remote " + self.ws._strRemote + 
                      " error3: " + JSON.stringify(error));
        }
        catch(e){
          logger.warn(self.side + " ws with remote " + self.ws._strRemote + 
                      " error4: " + error);
        }
      }

      if ( !self.isRunning ){
        reject(new Error("WSClient.connect FAILED"));
      }

      if (self.ws.isAlive) self.ws.terminate();
    });

    self.ws.on('close', (error, desc)=>{
      if (typeof self.tmHandler === 'function' ) {
        //self.tmHandler(self.ws, -1); // -1: ws close, notfiy appliction
        self.tmHandler(self, -1); // -1: ws close, notfiy appliction
      }

      if ( !self.isRunning ){
        reject(new Error("WSClient.connect CLOSED"));
      }

      if(error){
        logger.warn(self.side + " ws with remote " + self.ws._strRemote +
                    " had a transmission error, so closed. " + error + ", " + desc);
      }
      else{
        logger.info(self.side + " ws with remote " + self.ws._strRemote +
                    " had closed.");
      }
      self.ws._rcvBf = null;

      // 断线重连...
      if (self.opt.hasOwnProperty('reconnect') && self.opt.rest_connected_times > 0) {
        let tm = self.opt.reconnect || 3000;
        logger.warn(`${self.side} ws with remote ${self.ws._strRemote} will be reconnect in ${tm}ms ${self.opt.rest_connected_times} times`);
        setTimeout(()=>{
          if (!self.ws) {
            self.opt.rest_connected_times -= 1;
            self.connect().then(p=>{
              logger.info(`Reconnect to server ${self.id} OK!`);
            }).catch(e=>{
              logger.error(`Reconnect to server ${self.id} failed: ${e}`);
            });
          }
        }, tm);
      }
      self.ws = null;
      self.isRunning = false;
    });

    self.ws.on('open', (ws) => {
      self.opt.rest_connected_times = self.opt.reconnect_times || 3;
      if ( !self.isRunning ){
        self.isRunning = true;
        resolve("OK");
      }
      self.ws._rcvBfLen = misc.NET_RCV_BUFFER_LEN; // 初始化缓冲区长度
      self.ws._rcvBf = Buffer.alloc(self.ws._rcvBfLen, 0);
      self.ws._rcvBfDtLen = 0; // 缓冲区中存储的有效数据长度
      logger.info(`Connection with ${self.id} OK.`);
      if (typeof self.tmHandler === 'function' ) {
        self.tmHandler(self, 999999);
      }
    });

    self.ws.on('message', (data) => {
      if (self.ws && self.ws._rcvBf && Buffer.isBuffer(data)){
        // 是否需要增加缓冲区
        let cpLen = 0;
        let tmpBuffer = null;
        while (self.ws._rcvBf.length < misc.NET_RCV_BUFFER_LEN_MAX && 
               self.ws._rcvBf.length < (data.length+self.ws._rcvBfDtLen)){
          tmpBuffer = Buffer.from(self.ws._rcvBf);
          self.ws._rcvBfLen += misc.NET_RCV_BUFFER_LEN;
          self.ws._rcvBf = Buffer.alloc(self.ws._rcvBfLen, 0);
          cpLen = tmpBuffer.copy(self.ws._rcvBf, 0, 0, tmpBuffer.length);
          if (cpLen === tmpBuffer.length){
            if (f_debug) logger.debug(self.side + " ws with remote " + self.ws._strRemote + 
                        " alloc more ws._rcvBfLen:" + self.ws._rcvBfLen);
          }
          else{
            let tips = self.side + " ws with remote " + self.ws._strRemote +
                         " alloc more recv buff copy failed, would close it.";
            logger.error(tips);
            self.ws.terminate(tips);
            return;
          }
        }
        if (self.ws._rcvBf.length >= misc.NET_RCV_BUFFER_LEN_MAX){
          let tips = self.side + " ws with remote " + self.ws._strRemote +
                       " rcv buffer len is too long:" +
                       self.ws._rcvBf.length + ", escape its data of req";
          logger.error(tips);
          self.ws.terminate(tips);
          self.ws._rcvBfDtLen = 0; // 一旦长度非法,缓冲数据清空
          return;
        }

        // 新数据转入缓冲区, 假设下面 copy 总是成功
        cpLen = data.copy(self.ws._rcvBf, self.ws._rcvBfDtLen, 0, data.length);
        if (cpLen !== data.length){
          let tips = self.side + " ws with remote " + self.ws._strRemote +
                       " data buff copy failed, would close it.";
          logger.error(tips);
          self.ws.terminate(tips);
          return;
        }
        self.ws._rcvBfDtLen += data.length;

        if(self.ws._rcvBfDtLen < 4){ // 此时才可以解析出头四个字节---包长信息
          logger.warn(self.side + " ws with remote " + self.ws._strRemote +
                      " buffer data len:" + self.ws._rcvBf.length +
                      ", it is too short:" + self.ws._rcvBfDtLen + 
                      ", continue recv..." );
          return;
        }

        // 此时才可以解析出头四个字节---包长信息
        let msgLen = null;
        if (self.opt.isLE){
          msgLen = self.ws._rcvBf.readUInt32LE(0);
        }
        else{
          msgLen = self.ws._rcvBf.readUInt32BE(0);
        }
        if ( msgLen > self.ws._rcvBfDtLen ){ // 不够一个完整包
          if (msgLen > self.opt.max_pkg_byte){
            logger.warn(self.side + " ws with remote " + self.ws._strRemote + 
                        ", message len:" + msgLen + " too long than " +
                        self.opt.max_pkg_byte + ", would close ws...");
            self.ws.terminate("Message too long, would close ws");
            return;
          }
          else{
            logger.warn(self.side + " ws with remote " + self.ws._strRemote + 
                        " buffer data len:" + self.ws._rcvBfDtLen + 
                        ", message len:" + msgLen + ",continue recv...");
            return;
          }
        }
        // 能够解析包了， 但有可能有多
        let msgInfo = streamCutter.parseMessageData(self.ws._rcvBf, self.ws._rcvBfDtLen, self.opt); 
        if (msgInfo === null){
          self.ws.terminate("The ws with remote " + self.ws._strRemote +  
                         " sent len illegal data, so closed it.");
          logger.error("The ws with remote " + self.ws._strRemote +  
                         " sent data message head " + 
                         "len illegal, so closed it.");
          self.ws._rcvBf = null;
          self.ws.terminate("The ws send data message illegal.");
          return;
        }

        if (msgInfo.restLen > 0){
          self.ws._rcvBfDtLen = msgInfo.restLen;
          // 数据移动已经在 parseMessageData(...) 中完成
        }
        else{
          self.ws._rcvBfDtLen = 0;
        }

        // 某些情况下需要同步处理(如后继包对前面某个包业务强依赖，
        // 但这几个包一次网络event到到服务端应用层---客户端未做等待返回后再请求)，暂时异步处理
        if ( msgInfo && Array.isArray(msgInfo.messages) && 
            msgInfo.messages.length > 0 && typeof self.tmHandler === 'function' ){
          msgInfo.messages.forEach(function(msg){
            if ( msg) {
              let strMsg = null;
              if (typeof msg === 'string'){
                if (f_debug) logger.debug('recieved string message.');
                strMsg = msg;
              }
              else if( Buffer.isBuffer(msg) ){
                if (f_debug) logger.debug('recieved buffer message.');
                let zipped = msg.readUInt8(0);
                let newMsg = Buffer.alloc(msg.length - 1);
                msg.copy(newMsg, 0, 1, msg.length);
                if (zipped){
                  logger.warn("zipped flag in message, but server not support now....");
                  strMsg = newMsg.toString('utf8');
                }
                else{
                  strMsg = newMsg.toString('utf8');
                }
              }
              else{
                logger.error("Unsported ws msg type: " + typeof msg);
                return;
              }

              let jsonMsg = null;
              try{
                jsonMsg = JSON.parse(strMsg);
              }
              catch(e){
                logger.error("JSON.parse("+strMsg+") exception: " + e);
                return;
              }
              if (!jsonMsg){
                logger.error("JSON.parse("+strMsg+") return null: " + jsonMsg);
                return;
              }

              self.tmHandler(self, jsonMsg);
            }
            else{
              logger.warn("msg in parse obj error.");
            }
          });
        }
        else{
          var isH = typeof self.tmHandler;
          logger.warn(`msgInfo error or self.tmHandler ${isH} error.`);
        }
      }
      else if (typeof data === 'string'){
        let jsonMsg = null;
        try{
          jsonMsg = JSON.parse(data);
        }
        catch(e){
          logger.error("JSON.parse("+data+") exception: " + e);
          return;
        }
        if (!jsonMsg){
          logger.error("JSON.parse("+data+") return null: " + jsonMsg);
          return;
        }
        self.tmHandler(self, jsonMsg);
      }
      else{
        logger.warn("Unsported data typeof: " + (typeof data));
      }
    });
  });
  return promise;
};

WSClient.prototype.tmClose = function () {
  this.opt.rest_connected_times = -1;
  if (this.ws && this.ws.isAlive) this.ws.terminate();
	this.isRunning = false;
  this.ws = null;
}

// 优先将 ws 发送缓冲区中的数据发送出去
// 如果发送缓冲区空 则直接发送本次数据
// 否则发送后将本次数据追加到 发送缓冲末尾
// ws 的 drain 事件中也触发发送缓冲区数据
WSClient.prototype.tmSendData = function (data, timeout) {
  let self = this;
  let strData = null;
  if (typeof data === 'string'){
    strData = data;
  }
  else{
    strData = JSON.stringify(data);
  }
  let btLen = Buffer.byteLength(strData, 'utf8');

  let ttLen = 4 + 1 + btLen;
  let dtBf = Buffer.alloc(ttLen, 0);
  dtBf.writeUInt32LE(ttLen);
  dtBf.writeUInt8(0, 4);  // 压缩标识, 目前不支持压缩实现
  dtBf.write(strData, 5, btLen, 'utf8');

  if (f_debug) logger.debug('WSClient snd msg total len:' + ttLen);
  self.sendSocketBuffer(self.ws, dtBf, timeout);
};

// 给一个 ws 发送数据
WSClient.prototype.sendSocketBuffer = function (ws, dtBf, timeout) {
  let self = this;
  if (ws instanceof WebSocket && typeof ws.send === 'function' && Buffer.isBuffer(dtBf)){
    ws.send(dtBf, (error)=>{
      if (error){
        logger.error(`WSClient ws.send data len ${dtBf.length} error ${error}`);
      }
      else{
        if (f_debug) logger.debug(`WSClient.send data len ${dtBf.length} OK.`);
      }
    });
  }
  else{
    logger.error(self + " WSClient.sendSocketBuffer parameter error.");
    return false;
  }
};

module.exports = WSClient;
