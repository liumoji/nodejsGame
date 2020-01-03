'use strict';
const net = require('net');
const logger = require('../utils/logger.js');
const misc = require('../utils/misc.js');
const streamCutter = require("../utils/streamCutter.js");
const NetApi= require("./NetApi.js");
const f_debug = false;


class TCPServer extends NetApi{
  constructor(opt, handler){
    super('server', opt, handler);
	  this.isRunning = false;
    this.tcpServer = null;
    this.clients= {};
    this.clientId  = 0;
  }
}

TCPServer.prototype.tmStart = function () {
  let self = this;
  let promise = new Promise(function(resolve, reject){
    if (self.tcpServer && self.isRunning === true){
      return resolve("OK");
    }
    let opt = self.opt;
    self.allowHalfOpen = false;
    self.pauseOnConnect= false;
    self.tcpServer = new net.createServer(opt);

    self.tcpServer.on('listening', () => {
      resolve("OK");
	    logger.info("Listen TCP on: " + JSON.stringify(self.tcpServer.address()));
      if ( !self.isRunning ){
        self.isRunning = true;
      }
    });

    self.tcpServer.on('error', (error) => {
	  	let tips = "TCP error:" + error;
      logger.error(tips);
      if ( !self.isRunning ){
        reject(tips);
      }
    });
    
    self.tcpServer.on('connection', (socket) => {
      socket._clientId = ++self.clientId;
      socket._rcvBfLen = misc.NET_RCV_BUFFER_LEN; // 初始化缓冲区长度
      socket._rcvBf = Buffer.alloc(socket._rcvBfLen, 0);
      socket._rcvBfDtLen = 0; // 缓冲区中存储的有效数据长度
      socket._remote = {};
      socket._remote.address= socket.remoteAddress;
      socket._remote.family = socket.remoteFamily;
      socket._remote.port   = socket.remotePort;
      socket._strRemote = JSON.stringify(socket._remote);
      self.clients[socket._clientId] = socket;
      // 将 socket 包装成NetAPI
      if (!socket.schema) socket.schema = self.schema;
      if (!socket.side) socket.side = self.side;

      if (typeof socket.tmSendData !== 'function'){
        socket.toString = ()=>{
          return self.id + ' <=> ' +  JSON.stringify(socket._strRemote);
        };
        socket.tmSendData  = (data, timeout)=>{
          //console.error("tcp server socket send data to client.");
          self.sendSocketData(socket, data, timeout);
        }
      }

      if (typeof socket.tmStart !== 'function') {
        socket.tmStart = ()=>{ logger.warn("Socket connection has no tmStart implements.");};
      }

      if (typeof socket.toString !== 'function') {
        socket.toString = ()=>{ return socket._strRemote;};
      }

      if (typeof socket.tmClose !== 'function') {
        socket.tmClose = ()=>{
          if (socket.isAlive === false) socket.destroy();
          delete self.clients[socket._clientId];
        };
      }

      socket.on('error', (error) => {
        if (typeof error === 'string'){
          logger.warn(self + " client socket " + socket._strRemote + 
                      " error: " + error);
        }
        else if(error instanceof Error){
          logger.warn(self + " client socket " + socket._strRemote + 
                      " error " + (error? ": " +error.message : ".") );
        }
        else{
          try{
            logger.warn(self + " client socket " + socket._strRemote + 
                        " error: " + JSON.stringify(error));
          }
          catch(e){
            logger.warn(self + " client socket " + socket._strRemote + 
                        " error: " + error);
          }
        }
      });

      socket.on('close', (error) => {
        if (typeof self.tmHandler === 'function' ) {
          self.tmHandler(socket, -1); // -1: close, notfiy appliction
        }
        if(error){
          logger.error(self + " client socket " + socket._strRemote +
                      " had a transmission error, so closed." + error);
        }
        else{
          logger.warn(self + " client socket " + socket._strRemote +
                      " had closed.");
        }
        socket._rcvBf = null;
        delete self.clients[socket._clientId];
      });

      socket.on('data', (data) => {
        if (socket && socket._rcvBf && Buffer.isBuffer(data)){
          if (f_debug) logger.debug(self + " client socket " + 
                       socket._strRemote + " emit data.");
          // 是否需要增加缓冲区
          let cpLen = 0;
          let tmpBuffer = null;
          while (socket._rcvBf.length < misc.NET_RCV_BUFFER_LEN_MAX && 
                 socket._rcvBf.length < (data.length+socket._rcvBfDtLen)){
            tmpBuffer = Buffer.from(socket._rcvBf);
            socket._rcvBfLen += misc.NET_RCV_BUFFER_LEN;
            socket._rcvBf = Buffer.alloc(socket._rcvBfLen, 0);
            cpLen = tmpBuffer.copy(socket._rcvBf, 0, 0, tmpBuffer.length);
            if (cpLen === tmpBuffer.length){
              if (f_debug) logger.debug(self + " client socket " + socket._strRemote + 
                          " alloc more socket._rcvBfLen:" + socket._rcvBfLen);
            }
            else{
              let tips = self + " client socket " + socket._strRemote +
                           " alloc more recv buff copy failed, would close it.";
              logger.error(tips);
              socket.destroy(tips);
              return;
            }
          }
          if (socket._rcvBf.length >= misc.NET_RCV_BUFFER_LEN_MAX){
            let tips = self + " client socket " + socket._strRemote +
                         " rcv buffer len is too long:" +
                         socket._rcvBf.length + ", escape its data of req";
            logger.error(tips);
            socket.destroy(tips);
            socket._rcvBfDtLen = 0; // 一旦长度非法,缓冲数据清空
            return;
          }

          // 新数据转入缓冲区, 假设下面 copy 总是成功
          cpLen = data.copy(socket._rcvBf, socket._rcvBfDtLen, 0, data.length);
          if (cpLen !== data.length){
            let tips = self + " client socket " + socket._strRemote +
                         " data buff copy failed, would close it.";
            logger.error(tips);
            socket.destroy(tips);
            return;
          }
          socket._rcvBfDtLen += data.length;

          if(socket._rcvBfDtLen < 4){ // 此时才可以解析出头四个字节---包长信息
            logger.warn(self + " client socket " + socket._strRemote +
                        " buffer data len:" + socket._rcvBf.length +
                        ", it is too short:" + socket._rcvBfDtLen + 
                        ", continue recv..." );
            return;
          }

          // 此时才可以解析出头四个字节---包长信息
          let msgLen = 0;
          if (self.opt.isLE){
            msgLen = socket._rcvBf.readUInt32LE(0);
          }
          else{
            msgLen = socket._rcvBf.readUInt32BE(0);
          }

          if ( msgLen > socket._rcvBfDtLen ){ // 不够一个完整包
            if (msgLen > self.opt.max_pkg_byte){
              logger.warn(self + " client socket " + socket._strRemote + 
                          ", message len:" + msgLen + " too long than " +
                          self.opt.max_pkg_byte + ", would close socket...");
              socket.destroy("Message too long, would close client");
              return;
            }
            else{
              logger.warn(self + " client socket " + socket._strRemote + 
                          " buffer data len:" + socket._rcvBfDtLen + 
                          ", message len:" + msgLen + ",continue recv...");
              return;
            }
          }
          // 能够解析包了， 但有可能有多
          let msgInfo = streamCutter.parseMessageData(socket._rcvBf, socket._rcvBfDtLen, self.opt); 
          if (msgInfo === null){
            socket.destroy("The client socket " + socket._strRemote +  
                           " sent len illegal data, so closed it.");
            logger.error("The client socket " + socket._strRemote +  
                           " sent data message head " + 
                           "len illegal, so closed it.");
            socket._rcvBf = null;
            socket.destroy("The client send data message illegal.");
            return;
          }

          if (msgInfo.restLen > 0){
            socket._rcvBfDtLen = msgInfo.restLen;
            // 数据移动已经在 parseMessageData(...) 中完成
          }
          else{
            socket._rcvBfDtLen = 0;
          }

          // 某些情况下需要同步处理(如后继包对前面某个包业务强依赖，
          // 但这几个包一次网络event到到服务端应用层---客户端未做等待返回后再请求)，暂时异步处理
          if ( msgInfo && Array.isArray(msgInfo.messages) && 
               msgInfo.messages.length > 0 && typeof self.tmHandler === 'function' ){
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
                self.tmHandler(socket, jsonMsg);
              }
            });
          }
          else{
            logger.error('tcpserver parsed msgInfo or self.tmHandler error');
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
          self.tmHandler(socket, jsonMsg);
        }
        else{
          logger.warn("Unsported data typeof: " + (typeof data));
        }
      });
    });

    self.tcpServer.listen(self.opt);
  });
  return promise;
};

// 将数据发送给所有连接的客户端
TCPServer.prototype.tmSendData = function (data, timeout) {
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
  let dtBf  = Buffer.alloc(ttLen, 0);
  dtBf.writeUInt32LE(ttLen);
  dtBf.write(strData, 4, btLen, 'utf8');

  let keys = Object.keys(self.clients);
  let socket = null;
  keys.forEach(function(k){
    socket = self.clients[k];
    self._sendSocketBuffer(socket, dtBf, timeout);
  });
};

// 给一个 socket 发送data
TCPServer.prototype.sendSocketData = function (socket, data, timeout) {
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
  let dtBf  = Buffer.alloc(ttLen, 0);
  dtBf.writeUInt32LE(ttLen);
  dtBf.write(strData, 4, btLen, 'utf8');

  if (f_debug) logger.debug('TCPServer snd msg total len:' + ttLen);
  self._sendSocketBuffer(socket, dtBf, timeout);
};

// 给一个 socket 发送buffer (填实了data)
// 		优先将 socket 发送缓冲区中的数据发送出去
// 		如果发送缓冲区空 则直接发送本次数据
// 		否则将本次数据追加到发送缓冲末尾, 然后再发生
// 		socket 的 drain 事件中也触发发送缓冲区数据
TCPServer.prototype._sendSocketBuffer = function (socket, dtBf, timeout) {
  if (socket instanceof net.Socket && typeof socket.write === 'function' && Buffer.isBuffer(dtBf)){
    socket.write(dtBf, (error)=>{
      if (error){
        logger.error(`TCPServer ws.send data len ${dtBf.length} error ${error}`);
      }
      else{
        //logger.debug(`TCPServer.send data len ${dtBf.length} OK.`);
      }
    });
  }
  else{
    logger.error("TCPServer._sendSocketBuffer parameter error.");
    return false;
  }
};

module.exports = TCPServer;
