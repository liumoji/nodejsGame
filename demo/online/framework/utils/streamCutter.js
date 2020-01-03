/*
 *************************************************************************
 *    File Name:  ./streamCutter.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Fri 10 Aug 2018 03:28:54 AM EDT
 * 
 *  Description: 将字节流按照协议边界切分成一个个数据包
 *               包边界首部的包长信息注意字节序 
 * 
 ************************************************************************
*/
'use strict';
const logger = require('./logger.js');
const misc = require('./misc.js');

const f_debug = false;

let streamCutter = {};

streamCutter.getReqIp = function(req){
  if (req.headers && req.headers['x-forwarded-for']){
    return req.headers['x-forwarded-for'];
  }
  else if (req && req.socket && req.socket.remoteAddress){
    return req.socket.remoteAddress + (req.socket.remotePort ? ":"+req.socket.remotePort:"");
  }
  else if (req && req.connection){
    if (req && req.connection.socket){
      return req.socket.remoteAddress + (req.socket.remotePort ? ":"+req.socket.remotePort:"");
    }
    if (req && req.connection.socket.remoteAddress){
      return req.connection.socket.remoteAddress + (req.connection.socket.remotePort ? ":"+req.connection.socket.remotePort:"");
    }
    else{
      return "Uknown remot IP";
    }
  }
  else{
    return "Uknown remot IP";
  }
};

function dumpBuffer(binBuffer, len){
  let str = "";
  for(let i=0 ; i<len && i <binBuffer.length; ++i){
    str += binBuffer[i].toString(16); 
  }
  return str;
}

// 从流缓冲区里解析出消息包
//     每个消息包以 uint32 开头,该数值指明其所在消息包长度(包含本uint32大小)
//     缓冲区中可能有任意多个消息包,最后一个甚至可能是半包
// 参数:
//      buffer: 存储数据的缓冲区
//      dataLen: 指明buffer中有效数据长度(从buffer的0位置开始算)
//      option: 网络参数, 格式信息: 
//        {
//          max_pkg_byte: 一个发包最大长度, 
//          max_pkg_cnt, 一次缓冲的最多包数, 
//          isLE: 包边界长度数的 小段大端指示
//        }
// 返回: 
//      null: buffer 中的数据非法
//      {messages:[], restLen:N}, 成功解析出的数据信息,
//        messages: 解析出的完整消息数据包被一个个放入该列表中
//        restLen: 不能完整解析的消息包剩余长度, 
//                 剩余数据已经移动到传入参数的buffer的0位置开始
//streamCutter.parseMessageData = function(buffer, dataLen, maxMsgLen, maxMsgCnt, isLE){
streamCutter.parseMessageData = function(buffer, dataLen, option){
  if (!option) option = {};
  if (!option.max_pkg_byte) option.max_pkg_byte = misc.MAX_MSG_LEN; 
  if (!option.max_pkg_cnt) option.max_pkg_cnt = misc.MAX_MSG_CNT; 
  if (!option.hasOwnProperty('isLE') || typeof option.isLE !== 'boolean') option.isLE = true; 

  let msgDataInfo = {messages:[], restLen:0};
  let offset = 0;
  let idx = 0;
  while(true) {
    if (buffer.length - 4 < offset) { // buffer解析消息长度不够4字节
		logger.error("buffer data not enough, buffer length:" + buffer.length + ", offset:" + offset);
		return null;
	}

    let msgLen = 0;
    if (option.isLE){
      msgLen = buffer.readUInt32LE(offset);
    }
    else{
      msgLen = buffer.readUInt32BE(offset);
    }
    if (msgLen === dataLen){
      if (f_debug) logger.debug("Got the [idx:"+idx+"] message len:" + msgLen + 
                   ", all of this buffer data len:" + dataLen);
    }
    else{
      logger.warn("Got the [idx:"+idx+"] message len:" + msgLen + 
                  ", part of this buffer data len:" + dataLen);
    }
    if (msgLen === 0) { // 避免客户端发恶意包使此处进入死循环
      logger.error("Rcv data is illegal, with offset ["+offset +
                   "] in the buffer: message len in header is 0, " +
                   "should close the client! The rcv buffer data(" +
                   dataLen+"): " + dumpBuffer(buffer, dataLen) );
      return null;
    }
    if (msgLen > option.max_pkg_byte) { // 避免客户端发恶意大包耗服务器内存资源性能
      logger.error("Rcv data is illegal, with offset [" + offset +
                   "] in the buffer: message len in header is " + msgLen +
                    ", bigger than max client message len:" + option.max_pkg_byte +
                    ", should close the client!");
      return null;
    }

    if ( (offset + msgLen) > dataLen ) {
      // 剩余不够，转移数据
      msgDataInfo.restLen = dataLen - offset;
      let tmpBuff = Buffer.alloc(msgDataInfo.restLen, 0);
      buffer.copy( tmpBuff, 0, offset, offset+msgDataInfo.restLen );
      buffer.fill(0, 0);
      tmpBuff.copy(buffer, 0, 0, msgDataInfo.restLen);
      logger.warn("Got the [idx:"+idx+"] message data is scrap part, " +
                   "has received len:" + msgDataInfo.restLen);
      break;
    }
    else {
      // 可以取到一个完整包
      let msgBuffer = Buffer.alloc(msgLen-4, 0);
      // remove first uint32
      buffer.copy(msgBuffer, 0, offset+4, offset+msgLen);
      msgDataInfo.messages.push(msgBuffer);
      offset += msgLen;
      if (offset === dataLen){
        msgDataInfo.restLen = 0;
        buffer.fill(0, 0);
        if (f_debug) logger.debug("Got all of a message data.");
        break;
      }
    }
    idx += 1;
    if ( idx > option.max_pkg_cnt ){ // 避免恶意对端发大量小包耗服务器性能
      logger.error("Rcv data is illegal, more than " + option.max_pkg_cnt + 
                   " small message reqs. should close the client!");
      return null;
    }
  }
  return msgDataInfo;
};

const MAX_NETWORK_REQ_SPEED = 5;  // KB/sec
const MAX_NETWORK_REQ_FREQ = 60;  // times/sec
const CHECK_TIME_SPAN = 15;       // sec
// 计算 10 秒平均网速, 平均请求次数，过大的认为客户端非法，关闭
streamCutter.check_ws_network_speed = function(ws, new_len) {
  if (!ws) {
    return true;
  }

  if (ws.checked_closed === true) {
    return false;
  }

  if (ws.checked_closed === undefined) ws.checked_closed = false;
  if (ws.hasRecordTimes === undefined) ws.hasRecordTimes = 0;
  if (ws.hasRecordLen === undefined) ws.hasRecordLen = 0;
  if (ws.lastStartRecord === undefined) ws.lastStartRecord = 0;

  let nowTime = Math.floor(new Date().getTime() / 1000);
  let lostSec = nowTime - ws.lastStartRecord;
  ws.hasRecordTimes += 1;
  ws.hasRecordLen += new_len;

  if (lostSec > CHECK_TIME_SPAN) {
    ws.lastStartRecord = nowTime;

    let speed = Math.floor(100 * ws.hasRecordLen / lostSec / 1024) / 100;
    let freq = Math.floor(10 * ws.hasRecordTimes / lostSec) / 10;

    ws.hasRecordLen = 0;
    if (speed > MAX_NETWORK_REQ_SPEED) {
      ws.checked_closed = true;
      logger.warn("The ws [" + ws + "] client network req speed too fast:" + speed + "(K/s), now frequency:" + freq + "(times/s). It should be closed.");
      return false;
    }

    ws.hasRecordTimes = 0;
    if (freq > MAX_NETWORK_REQ_FREQ) {
      ws.checked_closed = true;
      logger.warn("The ws [" + ws + "] client network req frequency too large:" + freq + "(times/s), now speed:" + speed + "(K/s). It should be closed.");
      return false;
    }

    logger.info("The ws [" + ws + "] client network req speed:" + speed + "(K/s), frequency:" + freq + "(times/s).");
    return true;
  }
  else {
    return true;
  }
}

module.exports = streamCutter;
