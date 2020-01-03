/*
 *************************************************************************
 *    File Name:  gameInit.js
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
const fs = require('fs');
const path = require('path');

module.exports = (serverCfg, gameCfg) => {
  logger.debug(`gameInit.js serverCfg: ${serverCfg}, gameCfg: ${gameCfg}`);
  // TODO: load all handlers from ./wsHandlers/*.js

  // 下面是测试代码
//  const API = require('./API.js');
//  API.subscribeForCtrlCmd((message)=>{
//    logger.debug(`subscribeForCtrlCmd message: ${message}`);
//  });
//  API.subscribeForNewServer((message)=>{
//    logger.debug(`subscribeForNewServer message: ${message}`);
//  });
//  API.subscribeForChat((message)=>{
//    logger.debug(`subscribeForChat message: ${message}`);
//  });
//
//  API.getOnlineList((error, result)=>{
//    if (error){
//      logger.debug(`API.getOnlineList error: ${error}`, result);
//    }
//    else{
//      logger.debug('API.getOnlineList: ' + JSON.stringify(result));
//    }
//  });
//
//  const User = require('../framework/models/User.js');
//  let u = new User(55, 15505, 'aceway', 'xxx');
//  API.updateUserCoreInfo(u, (e, r)=>{
//    if (e){
//      logger.error(`API.updateUserCoreInfo error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.updateUserCoreInfo: ' + info);
//    }
//  });
//
//  API.userLogin(u, (e, r)=>{
//    if (e){
//      logger.error(`API.userLogin error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.userLogin: ' + info);
//    }
//  });
//  let svr = {schema:'ws',host:'127.0.0.1',port:1024,type:'gamecenter',usage:'GM'};
//  API.publishNewServer(svr, (e, r)=>{
//    if (e){
//      logger.error(`API.publishNewServer error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.publishNewServer: ' + info);
//    }
//  });
//
//  // 测试阶段为便于查看， id 用名字
//  let rankType = "level";
//  let id = u.id;
//  let score = 123;
//  API.updateScoreInRank(rankType, 'tom', score, (e, r)=>{
//    if (e){
//      logger.error(`API.updateScoreInRank error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.updateScoreInRank: ' + info);
//    }
//  });
//  API.updateScoreInRank(rankType, 'hank', 321, (e, r)=>{
//    if (e){
//      logger.error(`API.updateScoreInRank error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.updateScoreInRank: ' + info);
//    }
//  });
//  API.updateScoreInRank(rankType, 'lucy', 555, (e, r)=>{
//    if (e){
//      logger.error(`API.updateScoreInRank error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.updateScoreInRank: ' + info);
//    }
//  });
//  API.updateScoreInRank(rankType, 'jack', 1024, (e, r)=>{
//    if (e){
//      logger.error(`API.updateScoreInRank error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.updateScoreInRank: ' + info);
//    }
//  });
//  API.updateScoreInRank(rankType, 'bobo', 4096, (e, r)=>{
//    if (e){
//      logger.error(`API.updateScoreInRank error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.updateScoreInRank: ' + info);
//    }
//  });
//
//  API.queryTotalCountFromRank(rankType, (e, r)=>{
//    if (e){
//      logger.error(`API.queryTotalCountFromRank error: ${e}, ${r}`);
//    }
//    else{
//      let info = JSON.stringify(r);
//      logger.debug('API.queryTotalCountFromRank : ' + info);
//    }
//  });
//
//  id = 'tom';
//  API.queryIdxFromRank(rankType, id, (e, r)=>{
//    if (e){
//      logger.error(`API.queryIdxFromRank error: ${e}, ${r}`);
//    }
//    else{
//      logger.debug('user [' + id + '] API.queryIdxFromRank : ' + r);
//    }
//  });
//  API.queryScoreFromRank(rankType, id, (e, r)=>{
//    if (e){
//      logger.error(`API.queryScoreFromRank error: ${e}, ${r}`);
//    }
//    else{
//      logger.debug('user [' + id + '] API.queryScoreFromRank : ' + r);
//    }
//  });
//
//  // 按名次范围拉取排行榜
//  let start = 3;
//  let end = 0;
//  API.queryRankListByIdx(rankType, start, end, true, (e, r)=>{
//    if (e){
//      logger.error(`API.queryRankListByIdx error: ${e}, ${r}`);
//    }
//    else{
//      logger.debug('start [' + start + '] end [' + end + '] API.queryRankListByIdx : ' + r);
//    }
//  });
//
//  // 按分数范围拉取排行榜
//  let from = 1024;
//  let to = 0;
//  API.queryRankListByScore(rankType, from, to, false, (e, r)=>{
//    if (e){
//      logger.error(`API.queryRankListByScore error: ${e}, ${r}`);
//    }
//    else{
//      logger.debug('from [' + from + '] to [' + to + '] API.queryRankListByScore: ' + r);
//    }
//  });
//
//  let attr = "pvpLevel";
//  let value = 3455;
//  API.userAttrSet(u.id, attr, value, (e, r)=>{
//    if (e){
//      logger.error(`API.userAttrSet error: ${e}, ${r}`);
//    }
//    else{
//      logger.debug('API.userAttrSet ' + attr + ': ' + r);
//    }
//  });
//
//  attr = "toptop";
//  value = 3455;
//  let now = Math.floor(Date.now()/1000);
//  let sTime = now - 3600 * 8;
//  let eTime = now + 3600 * 8;
//  API.userAttrWithTimeSet(u.id, attr, value, sTime, eTime, (e, r)=>{
//    if (e){
//      logger.error(`API.userAttrWithTimeSet error: ${e}, ${r}`);
//    }
//    else{
//      logger.debug('API.userAttrWithTimeSet' + attr + ': ' + r);
//    }
//  });
//  API.userAttrWithTimeAddValue(u.id, attr, 100, (e, r)=>{
//    if (e){
//      logger.error(`API.userAttrWithTimeAddValue error: ${e}, ${r}`);
//    }
//    else{
//      logger.debug('API.userAttrWithTimeAddValue' + attr + ': ' + r);
//    }
//  });
};
