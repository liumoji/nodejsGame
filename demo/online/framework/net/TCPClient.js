'use strict';
const net = require('net');
const logger = require('../utils/logger.js');
const misc= require("../utils/misc.js");
const streamCutter = require("../utils/streamCutter.js");
const NetApi= require("./NetApi.js");
const f_debug = false;

class TCPClient extends NetApi{
  constructor(opt, handler){
    super('client', opt, handler);
	  this.isRunning = false;
    this.socket = null;
    if (opt.host.indexOf('0.0.0.0') === 0) {
      logger.error(`The ip: ${opt.host} could not be set as TCPClient server address`);
    }
  }
}

TCPClient.prototype.connect = function () {
  let self = this;
  logger.info("Try connect to " + self.id);
  let promise = new Promise(function(resolve, reject){
    if (self.socket && self.isRunning === true){
      return resolve("OK");
    }
    let opt = self.opt;
    self.allowHalfOpen = false;
    self.pauseOnConnect= false;
    self.socket = new net.createConnection(opt, ()=>{
      if ( !self.isRunning ){
        self.isRunning = true;
        resolve("OK");
      }
      self.socket._rcvBfLen = misc.NET_RCV_BUFFER_LEN; // 初始化缓冲区长度
      self.socket._rcvBf = Buffer.alloc(self.socket._rcvBfLen, 0);
      self.socket._rcvBfDtLen = 0; // 缓冲区中存储的有效数据长度
      self.socket._remote = {};
      self.socket._remote.address= self.socket.remoteAddress;
      self.socket._remote.family = self.socket.remoteFamily;
      self.socket._remote.port   = self.socket.remotePort;
      self.socket._strRemote = JSON.stringify(self.socket._remote);
      if (typeof self.tmHandler === 'function' ) {
        self.tmHandler(self, 999999);
      }
    });
    self.socket.on('error', (error) => {
      if (typeof error === 'string'){
        logger.warn(self + " server socket " + self.socket._strRemote + 
                    " error: " + error);
      }
      else if(error instanceof Error){
        logger.warn(self + " server socket " + self.socket._strRemote + 
                    " error " + (error? ": " +error.message : ".") );
      }
      else{
        try{
          logger.warn(self + " server socket " + self.socket._strRemote + 
                      " error: " + JSON.stringify(error));
        }
        catch(e){
          logger.warn(self + " server socket " + self.socket._strRemote + 
                      " error: " + error);
        }
      }
      if ( !self.isRunning ){
        reject(new Error("FAILED"));
      }
    });

    self.socket.on('close', (error) => {
      if (typeof self.tmHandler === 'function' ) {
        //self.tmHandler(self.socket, -1); // -1: close, notfiy appliction
        self.tmHandler(self, -1); // -1: close, notfiy appliction
      }
      if(error){
        logger.error(self + " server socket " + self.socket._strRemote +
                    " had a transmission error, so closed." + error);
      }
      else{
        logger.warn(self + " server socket " + self.socket._strRemote +
                    " had closed.");
      }
      self.socket._rcvBf = null;
      // 断线重连...
      if (self.opt.reconnect) {
        let tm = self.opt.reconnect || 6000;
        logger.warn(self.side + " socket with remote " + self.socket._strRemote + ' will be reconnect in ' + tm + 'ms');
        setTimeout(()=>{
          if (!self.socket) {
            self.connect().then(p=>{
              logger.info(`Reconnect to server ${self.id} OK!`);
            }).catch(e=>{
              logger.error(`Reconnect to server ${self.id} failed: ${e}`);
            });
          }
        }, tm);
      }
      self.socket = null;
      self.isRunning = false;
    });

    self.socket.on('data', (data) => {
      if (self.socket && self.socket._rcvBf && Buffer.isBuffer(data)){
        if (f_debug) logger.debug(self + " server socket " + 
                     self.socket._strRemote + " emit data.");
        // 是否需要增加缓冲区
        let cpLen = 0;
        let tmpBuffer = null;
        while (self.socket._rcvBf.length < misc.NET_RCV_BUFFER_LEN_MAX && 
               self.socket._rcvBf.length < (data.length+self.socket._rcvBfDtLen)){
          tmpBuffer = Buffer.from(self.socket._rcvBf);
          self.socket._rcvBfLen += misc.NET_RCV_BUFFER_LEN;
          self.socket._rcvBf = Buffer.alloc(self.socket._rcvBfLen, 0);
          cpLen = tmpBuffer.copy(self.socket._rcvBf, 0, 0, tmpBuffer.length);
          if (cpLen === tmpBuffer.length){
            if (f_debug) logger.debug(self + " server socket " + self.socket._strRemote + 
                        " alloc more socket._rcvBfLen:" + self.socket._rcvBfLen);
          }
          else{
            let tips = self + " server socket " + self.socket._strRemote +
                         " alloc more recv buff copy failed, would close it.";
            logger.error(tips);
            self.socket.destroy(tips);
            return;
          }
        }
        if (self.socket._rcvBf.length >= misc.NET_RCV_BUFFER_LEN_MAX){
          let tips = self + " server socket " + self.socket._strRemote +
                       " rcv buffer len is too long:" +
                       self.socket._rcvBf.length + ", escape its data of req";
          logger.error(tips);
          self.socket.destroy(tips);
          self.socket._rcvBfDtLen = 0; // 一旦长度非法,缓冲数据清空
          return;
        }

        // 新数据转入缓冲区, 假设下面 copy 总是成功
        cpLen = data.copy(self.socket._rcvBf, self.socket._rcvBfDtLen, 0, data.length);
        if (cpLen !== data.length){
          let tips = self + " server socket " + self.socket._strRemote +
                       " data buff copy failed, would close it.";
          logger.error(tips);
          self.socket.destroy(tips);
          return;
        }
        self.socket._rcvBfDtLen += data.length;

        if(self.socket._rcvBfDtLen < 4){ // 此时才可以解析出头四个字节---包长信息
          logger.warn(self + " server socket " + self.socket._strRemote +
                      " buffer data len:" + self.socket._rcvBf.length +
                      ", it is too short:" + self.socket._rcvBfDtLen + 
                      ", continue recv..." );
          return;
        }

        // 此时才可以解析出头四个字节---包长信息
        let msgLen = null;
        if (self.opt.isLE){
          msgLen = self.socket._rcvBf.readUInt32LE(0);
        }
        else{
          msgLen = self.socket._rcvBf.readUInt32BE(0);
        }
        if ( msgLen > self.socket._rcvBfDtLen ){ // 不够一个完整包
          if (msgLen > self.opt.max_pkg_byte){
            logger.warn(self + " server socket " + self.socket._strRemote + 
                        ", message len:" + msgLen + " too long than " +
                        self.opt.max_pkg_byte + ", would close socket...");
            self.socket.destroy("Message too long, would close server");
            return;
          }
          else{
            logger.warn(self + " server socket " + self.socket._strRemote + 
                        " buffer data len:" + self.socket._rcvBfDtLen + 
                        ", message len:" + msgLen + ",continue recv...");
            return;
          }
        }
        // 能够解析包了， 但有可能有多
        let msgInfo = streamCutter.parseMessageData(self.socket._rcvBf, self.socket._rcvBfDtLen, self.opt); 
        if (msgInfo === null){
          self.socket.destroy("The server socket " + self.socket._strRemote +  
                         " sent len illegal data, so closed it.");
          logger.error("The server socket " + self.socket._strRemote +  
                         " sent data message head " + 
                         "len illegal, so closed it.");
          self.socket._rcvBf = null;
          self.socket.destroy("The server send data message illegal.");
          return;
        }

        if (msgInfo.restLen > 0){
          self.socket._rcvBfDtLen = msgInfo.restLen;
          // 数据移动已经在 parseMessageData(...) 中完成
        }
        else{
          self.socket._rcvBfDtLen = 0;
        }

        // 某些情况下需要同步处理(如后继包对前面某个包业务强依赖，
        // 但这几个包一次网络event到到服务端应用层---客户端未做等待返回后再请求)，暂时异步处理
        if ( msgInfo && Array.isArray(msgInfo.messages) &&
            msgInfo.messages.length > 0 && typeof self.tmHandler === 'function'){
          msgInfo.messages.forEach(function(msg){
            if ( msg ) {
              let strMsg = null;
              if (typeof msg === 'string'){
                strMsg = msg;
              }
              else if( Buffer.isBuffer(msg) ){
                strMsg = msg.toString('utf8');
              }
              else{
                logger.error("Unsported tcp msg type: " + typeof msg);
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
          });
        }
      }
      else if (typeof data === 'string' && typeof self.tmHandler === 'function'){
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
        logger.warn("Unsported data typeof: " + (typeof data) + " or not tmHandler to do.");
      }
    });
  });
  return promise;
};

// 优先将 socket 发送缓冲区中的数据发送出去
// 如果发送缓冲区空 则直接发送本次数据
// 否则发送后将本次数据追加到 发送缓冲末尾
// socket 的 drain 事件中也触发发送缓冲区数据
TCPClient.prototype.tmSendData = function (data, timeout) {
  //logger.error("try tcpclient sendata...");
  let self = this;
  let strData = null;
  if (typeof data === 'string'){
    strData = data;
  }
  else{
    strData = JSON.stringify(data);
  }
  let btLen = Buffer.byteLength(strData, 'utf8');

  let ttLen = 4 + btLen;
  let dtBf = Buffer.alloc(ttLen, 0);
  dtBf.writeUInt32LE(ttLen);
  dtBf.write(strData, 4, btLen, 'utf8');

  if (f_debug) logger.debug('TCPClient snd msg total len:' + ttLen);
  self.sendSocketBuffer(self.socket, dtBf, timeout);
};

// 给一个 socket 发送数据
TCPClient.prototype.sendSocketBuffer = function (socket, dtBf, timeout) {
  if (socket instanceof net.Socket && typeof socket.write === 'function' && Buffer.isBuffer(dtBf)){
    socket.write(dtBf, (error)=>{
      if (error){
        logger.error(`TCPClient ws.send data len ${dtBf.length} error ${error}`);
      }
      else{
        //logger.debug(`TCPClient.send data len ${dtBf.length} OK.`);
      }
    });
    //if (ret){
    //    logger.debug(`TCPClient.send data return false, data len ${dtBf.length}.`);
    //}
  }
  else{
    logger.error("TCPClient._sendSocketBuffer parameter error.");
    return false;
  }
};

module.exports = TCPClient;
