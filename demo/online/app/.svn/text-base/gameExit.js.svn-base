/*
 *************************************************************************
 *    File Name:  gameExit.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Wed 22 Aug 2018 05:30:38 AM EDT
 * 
 *  Description: ...
 * 
 ************************************************************************
*/
'use strict';
const logger = require('../framework/utils/logger.js');

module.exports = (code, desc)=>{
  logger.debug(`gameExit.js code: ${code}, desc: ${desc}`);

  const API = require('./API.js');
  // 下面测试代码, 根据业务需要自行修改
  let msg = {type:'global',to:'robin',from:'aceway',content:'xxxx'};
  if (typeof API.publishChat === 'function')
    API.publishChat(msg, (e, r)=>{
      if (e){
        logger.error(`publishChat error: ${e}, ${r}`);
      }
      else{
        let info = JSON.stringify(r);
        logger.debug('API.publishChat: ' + info);
      }
    });

  if (typeof API.keepActiveToRedis === 'function')
    API.keepActiveToRedis(100);

  const User = require('../framework/models/User.js');
  let u = new User(55, 15505, 'aceway', 'xxx');
  if (typeof API.getUserCoreById === 'function')
    API.getUserCoreById(u.id, (e, r)=>{
      if (e){
        logger.error(`API.getUserCoreById error: ${e}, ${r}`);
      }
      else{
        let info = JSON.parse(r);
        logger.debug('API.getUserCoreById: ' + r);
      }
    });

  if (typeof API.getUserDetailById === 'function')
    API.getUserDetailById(u.id, (e, r)=>{
      if (e){
        logger.error(`API.getUserCoreById error: ${e}, ${r}`);
      }
      else{
        let info = JSON.stringify(r);
        logger.debug('API.getUserDetailById: ' + info);
      }
    });

  let attr = "toptop";
  if (typeof API.userAttrWithTimeGet === 'function')
    API.userAttrWithTimeGet(u.id, attr, (e, r)=>{
      if (e){
        logger.error(`API.userAttrWithTimeGet error: ${e}, ${r}`);
      }
      else{
        logger.debug('API.userAttrWithTimeGet: ' + r);
      }
    });

  if (typeof API.userAttrWithTimeGetAll === 'function')
    API.userAttrWithTimeGetAll(u.id, (e, r)=>{
      if (e){
        logger.error(`API.userAttrWithTimeGetAll error: ${e}, ${r}`);
      }
      else{
        logger.debug('API.userAttrWithTimeGetAll: ');
        logger.debug(r);
      }
    });
};
