/*
 *************************************************************************
 *    File Name:  commonMsgProcessor.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Wed 22 Aug 2018 05:21:31 AM EDT
 * 
 *  Description: ...
 * 
 ************************************************************************
*/
'use strict';
const logger = require('../framework/utils/logger.js');
const commonMsgProcessor = {};

commonMsgProcessor.processMsg = (net,msg)=>{
  logger.debug('commonMsgProcessor.processMsg(...)'); // 下面测试代码, 根据业务需要自行修改
  let strMsg =JSON.stringify(msg);
  logger.trace(`API.processClientMessage(${net.schema}, ${net.side}, len:${strMsg.length}, ${strMsg})`);
  if (msg && msg.bd) msg.bd.ext = 'message data from server.';
  else msg.ext = "..." + net.schema;
  
  if (net.schema === 'ws'){
    net.tmSendData(msg);
  }
  else{
    net.tmSendData(msg);
  }
};

module.exports = commonMsgProcessor ;
