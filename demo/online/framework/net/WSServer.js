'use strict';
const WebSocket = require('ws');
const logger = require('../utils/logger.js');
const misc = require('../utils/misc.js');
const streamCutter = require("../utils/streamCutter.js");
const NetApi= require("./NetApi.js");

const f_debug = false;

class WSServer extends NetApi {
  constructor(opt, handler){
    super('server', opt, handler);
	  this.isRunning = false;
    this.wsServer = null;
    this.clients= {};
    this.clientId  = 0;
  }
}

WSServer.prototype.tmStart = function () {
  let self = this;
  let promise = new Promise(function(resolve, reject){
    if (self.wsServer && self.isRunning === true){
      return resolve("ws server OK");
    }
    let opt = self.opt;
    //opt.backlog {Number} The maximum length of the queue of pending connections
    //opt.verifyClient {Function} A function which can be used to validate incoming 
    //opt.connections. See description below.
    //opt.perMessageDeflate {Boolean|Object} Enable/disable permessage-deflate.
    //opt.maxPayload {Number} The maximum allowed message size in bytes.
    self.wsServer = new WebSocket.Server(opt);
    self.wsServer.on('listening', (ws)=>{
      resolve("OK");
	    //logger.info("Listen WebSocket on: " + JSON.stringify(self.wsServer.address()));
	    logger.info("Listen WebSocket on WS://" + opt.host + ":" + opt.port + "/");
      if ( !self.isRunning ){
        self.isRunning = true;
      }
    });


    self.wsServer.on('error', (error) => {
	  	let tips = "WebSocket error:" + error;
      logger.error(tips);
      if ( !self.isRunning ){
        reject(tips);
      }
    });
    
    self.wsServer.on('connection', (ws, req) => {
      ws._clientId = ++self.clientId;
      ws._rcvBfLen = misc.NET_RCV_BUFFER_LEN; // 初始化缓冲区长度
      ws._rcvBf = Buffer.alloc(ws._rcvBfLen, 0);
      ws._rcvBfDtLen = 0; // 缓冲区中存储的有效数据长度

	    ws.opt = self.opt;
      ws._remote = streamCutter.getReqIp(req);
      logger.info("WebSocket connect from client: " + JSON.stringify(ws._remote) + ' to ' + self.id);
      ws._strRemote = JSON.stringify(ws._remote);
      self.clients[ws._clientId] = ws;

      // 将 ws 包装成NetAPI
      if (!ws.schema) ws.schema = self.schema;
      if (!ws.side) ws.side = self.side;

      if (typeof ws.tmSendData !== 'function'){
        ws.toString = ()=>{
          return self.id + ' <=> ' +  ws._strRemote + ', net id:[' + ws._clientId + ']';
        };
        ws.tmSendData  = (data, timeout)=>{
          //console.error("websocket send data to client.");
          self.sendWebSocketData(ws, data, timeout);
        }
      }

      if (typeof ws.tmStart !== 'function') {
        ws.tmStart = ()=>{ logger.warn("WebSocket connection has no tmStart implements.");};
      }

      if (typeof ws.toString !== 'function') {
        ws.toString = ()=>{ return ws._strRemote;};
      }
      if (typeof ws.tmClose !== 'function') {
        ws.tmClose = ()=>{
          if (ws.isAlive === false) ws.terminate();
        };
      }

      ws.on('error', (error) => {
        if (typeof error === 'string'){
          logger.warn(self + " ws with remote " + ws._strRemote + 
                      " error: " + error);
        }
        else if(error instanceof Error){
          logger.warn(self + " ws with remote " + ws._strRemote + 
                      " error " + (error? ": " +error.message : ".") );
        }
        else{
          try{
            logger.warn(self + " ws with remote " + ws._strRemote + 
                        " error: " + JSON.stringify(error));
          }
          catch(e){
            logger.warn(self + " ws with remote " + ws._strRemote + 
                        " error: " + error);
          }
        }
        if (ws.isAlive) ws.terminate(`ws:${ws._strRemote} on error`);
      });

      ws.on('close', (error, desc) => {
        if (typeof self.tmHandler === 'function' ) {
          self.tmHandler(ws, -1); // -1: ws close, notfiy appliction
        }
        if(error){
          logger.warn(self + " ws with remote " + ws._strRemote +
                      " had a transmission error, so closed" + ", " + desc);
        }
        else{
          if (f_debug) logger.trace(self + " ws with remote " + ws._strRemote +
                      " had closed.");
        }
        ws._sndBf = null;
        ws._rcvBf = null;
        delete self.clients[ws._clientId];
      });

      ws.on('message', (data) => {
        ws.isAlive = true;
        if (ws && ws._rcvBf && Buffer.isBuffer(data)) {
          if (ws.opt && ws.opt.limit && false === streamCutter.check_ws_network_speed(ws, data.length)) {
            // 框架只通知应用层，由应用层做处理
            self.tmHandler(ws, -2); // -2: network illegal
          }

          if (f_debug) logger.debug(self + " ws with remote " + 
                       ws._strRemote + " emit buffer data.");
          // 是否需要增加缓冲区
          let cpLen = 0;
          let tmpBuffer = null;
          while (ws._rcvBf.length < misc.NET_RCV_BUFFER_LEN_MAX && 
                 ws._rcvBf.length < (data.length+ws._rcvBfDtLen)){
            tmpBuffer = Buffer.from(ws._rcvBf);
            ws._rcvBfLen += misc.NET_RCV_BUFFER_LEN;
            ws._rcvBf = Buffer.alloc(ws._rcvBfLen, 0);
            cpLen = tmpBuffer.copy(ws._rcvBf, 0, 0, tmpBuffer.length);
            if (cpLen === tmpBuffer.length){
              if (f_debug) logger.debug(self + " ws with remote " + ws._strRemote + 
                          " alloc more ws._rcvBfLen:" + ws._rcvBfLen);
            }
            else{
              let tips = self + " ws with remote " + ws._strRemote +
                           " alloc more recv buff copy failed, would close it.";
              logger.error(tips);
              ws.terminate(tips);
              return;
            }
          }
          if (ws._rcvBf.length >= misc.NET_RCV_BUFFER_LEN_MAX){
            let tips = self + " ws with remote " + ws._strRemote +
                         " rcv buffer len is too long:" +
                         ws._rcvBf.length + ", escape its data of req";
            logger.error(tips);
            ws.terminate(tips);
            ws._rcvBfDtLen = 0; // 一旦长度非法,缓冲数据清空
            return;
          }

          // 新数据转入缓冲区, 假设下面 copy 总是成功
          cpLen = data.copy(ws._rcvBf, ws._rcvBfDtLen, 0, data.length);
          if (cpLen !== data.length){
            let tips = self + " ws with remote " + ws._strRemote +
                         " data buff copy failed, would close it.";
            logger.error(tips);
            ws.terminate(tips);
            return;
          }
          ws._rcvBfDtLen += data.length;

          if(ws._rcvBfDtLen < 4){ // 此时才可以解析出头四个字节---包长信息
            logger.warn(self + " ws with remote " + ws._strRemote +
                        " buffer data len:" + ws._rcvBf.length +
                        ", it is too short:" + ws._rcvBfDtLen + 
                        ", continue recv..." );
            return;
          }

          // 此时才可以解析出头四个字节---包长信息
          let msgLen = null;
          if (self.opt.isLE){
            msgLen = ws._rcvBf.readUInt32LE(0);
          }
          else{
            msgLen = ws._rcvBf.readUInt32BE(0);
          }
          if ( msgLen > ws._rcvBfDtLen ){ // 不够一个完整包
            if (msgLen > self.opt.max_pkg_byte){
              logger.warn(self + " ws with remote " + ws._strRemote + 
                          ", message len:" + msgLen + " too long than " +
                          self.opt.max_pkg_byte + ", would close ws...");
              ws.terminate("Message too long, would close client");
              return;
            }
            else{
              logger.warn(self + " ws with remote " + ws._strRemote + 
                          " buffer data len:" + ws._rcvBfDtLen + 
                          ", message len:" + msgLen + ",continue recv...");
              return;
            }
          }
          // 能够解析包了， 但有可能有多
          let msgInfo = streamCutter.parseMessageData(ws._rcvBf, ws._rcvBfDtLen, self.opt); 
          if (msgInfo === null){
            ws.terminate("The server ws with remote " + ws._strRemote +  
                           " sent len illegal data, so closed it.");
            logger.error("The server ws with remote " + ws._strRemote +  
                           " sent data message head " + 
                           "len illegal, so closed it.");
            ws._rcvBf = null;
            return;
          }

          if (msgInfo.restLen > 0){
            ws._rcvBfDtLen = msgInfo.restLen;
            // 数据移动已经在 parseMessageData(...) 中完成
          }
          else{
            ws._rcvBfDtLen = 0;
          }

          if ( msgInfo && Array.isArray(msgInfo.messages) && msgInfo.messages.length > 0 ){
            msgInfo.messages.forEach(function(msg){
              if ( msg && typeof self.tmHandler === 'function' ) {
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
                  if (typeof strMsg === 'string'){
                    jsonMsg = JSON.parse(strMsg.replace(' ', ''));
                  }
                  else{
                    jsonMsg = strMsg;
                  }
                }
                catch(e){
                  logger.error("WSServer JSON.parse("+strMsg+") len:"+strMsg.length+" exception: " + e);
                  ws.tmSendData("data error, JSON.parse error.", 3000);
                  return;
                }
                if (!jsonMsg){
                  logger.error("WSServer JSON.parse("+strMsg+") return null: " + jsonMsg);
                  // TEST
                  ws.tmSendData("data error, could not parsed as json", 3000);
                  return;
                }

                self.tmHandler(ws, jsonMsg);
              }
            });
          }
        }
        else if (typeof data === 'string'){
          if (f_debug) logger.debug(self + " ws with remote " + 
                       ws._strRemote + " emit string data.");
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
          self.tmHandler(ws, jsonMsg);
        }
        else{
          logger.warn("Unsported data typeof: " + (typeof data));
        }
      });
    });
  });
  return promise;
};

// 将数据发送给所有连接的客户端
// TODO: 自动压缩的实现支持
WSServer.prototype.tmSendData = function (data, timeout) {
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
  let dtBf  = Buffer.alloc(ttLen, 0);
  dtBf.writeUInt32LE(ttLen);
  dtBf.writeUInt8(0, 4);  // 压缩标识, 目前不支持压缩实现
  dtBf.write(strData, 5, btLen, 'utf8');

  if (f_debug) logger.debug(`sends total len: ${ttLen}, msg data len:${btLen}`);

  let keys = Object.keys(self.clients);
  let ws = null;
  keys.forEach(function(k){
    ws = self.clients[k];
    if (f_debug) logger.debug('WSServer snd msg total len:' + ttLen);
    self._sendWebSocketBuffer(ws, dtBf, timeout);
  });
};

// 给一个 ws 发送data
WSServer.prototype.sendWebSocketData = function (ws, data, timeout) {
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
  let dtBf  = Buffer.alloc(ttLen, 0);
  dtBf.writeUInt32LE(ttLen);
  dtBf.writeUInt8(0, 4);  // 压缩标识, 目前不支持压缩实现
  dtBf.write(strData, 5, btLen, 'utf8');

  if (f_debug) logger.debug(`send total len: ${ttLen}, msg data len:${btLen}`);
  if (f_debug) logger.debug('WSServer snd msg total len:' + ttLen);
  self._sendWebSocketBuffer(ws, dtBf, timeout);
};

// 给一个 ws 发送buffer (填实了data)
// 		优先将 ws 发送缓冲区中的数据发送出去
// 		如果发送缓冲区空 则直接发送本次数据
// 		否则将本次数据追加到发送缓冲末尾, 然后再发生
WSServer.prototype._sendWebSocketBuffer = function (ws, dtBf, timeout) {
  if (ws instanceof WebSocket && typeof ws.send === 'function' && Buffer.isBuffer(dtBf)){
    // 底层API 无返回值处理，虽然最底层 node.js 源码里 socket.write 有返回值....
    // 目前暂未看到有 websocket 封装对 socket.write 有完善的处理---完美处理 数据发送一半(只有一半数据从用户空间内存拷贝的系统内核内存)和抛出 drain事件
    ws.send(dtBf, (error)=>{
      if (error){
        logger.error(`WSServer ${this} ws.send to ${ws} data len ${dtBf.length} error ${error}`);
      }
      else{
        if (f_debug) logger.debug(`WSServerws.send data len ${dtBf.length} OK.`);
      }
    }); 
    return false;
  }
  else{
    logger.error("WSServer._sendWebSocketBuffer parameter error.");
    return false;
  }
};

module.exports = WSServer;
