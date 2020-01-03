/*
 *************************************************************************
 *    File Name:  GameRedis.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Mon 20 Aug 2018 04:46:00 AM EDT
 * 
 *  Description: 游戏使用Redis功能的封装, 带有游戏业务基础功能的API
 *  管理框架适用维护的在redis库中的数据结构:
 *  游戏信息:
 *      game_id: 1000,  // key类型
 *
 *  服信息:
 *      H::onlineList     // hash类型, 服信息；用于online/gateway拉去服列表等
 *      H::gatewayList    // hash类型, 服信息，具体如下:
 *        n: "{id:n,startTime:1534758847,lastAcitve:1534758897,userCount:256}"
 *        n: "{id:n,startTime:1534758847,lastAcitve:1534758897,userCount:256}"
 *        n: "{id:n,startTime:1534758847,lastAcitve:1534758897,userCount:256}"
 *
 *  玩家信息:
 *      H::userCore       // hash类型, 用户核心信息,游戏中批量、频繁拉取更新
 *        n: "{id:n,name:'abc',nick:'edf',lastLoginTime:1534758897,account:256}"
 *      H::userDetail_xx  // hash类型, 用户详细信息,只能单个全拉取,运行中细力度更新
 *        f1: v1
 *        f2: v2
 *        f3: v3
 * 
 ************************************************************************
*/
'use strict';
const logger = require('../utils/logger.js');
const RedisClient = require('./RedisClient.js');
const misc = require("../utils/misc.js");

const USER_LOGIN_SET = "userLoginSet";
const USER_CORE_HKEY = "userCore";
const USER_DETAIL_PREV = "userDetail_";
const SAVE_DATA_TYPE = ['number', 'boolean', 'string', 'undefined', 'null'];

const CH_CTRL = "CH_CTRL";              // 跨服发送控制指令(服务器内部用)
const CH_NEW_SERVER = "CH_NEW_SERVER";  // 发送新服通知
const CH_CHAT = "CH_CHAT";              // 发送跨服聊天

const RANK_PREFIX = "Rank-";                    // 排行榜类型数据
const USER_ATTR_PREFIX = "userAttr_";           // 玩家永久有效的属性
const USER_ATTR_TIME_PREFIX = "userAttrTime_";  // 玩家某时间段内有效的属性

class GameRedis {
  constructor (redisOption, gameOption){
    let self = this;
    this.redisClient = new RedisClient(redisOption);
    this.redisOpt = redisOption;
    this.gameOpt  = gameOption;
    this.startTime = gameOption.startTime || Math.floor(Date.now()/1000);
    this.pid = process.pid;
    this.server_ucnt = 0; // 本服在线人数
    this.syncExtraInfo = {}; // 同步的额外自定义信息
    if (gameOption.initSync && typeof gameOption.initSync === typeof {}){
      try{
        this.syncExtraInfo = JSON.parse(JSON.stringify(gameOption.initSync));
      }
      catch(e){
        this.syncExtraInfo = {};
        logger.error(`GameRedis.constructor initSync error: ${e.stack}`);
      }
    }

    this.checkGameCfg((error, result)=>{
      if (error){
        logger.error(`GameRedis constructor error: ${error}, ${result}`);
        misc.EXIT(1);
      }
      else{
        self.updateServerInfoInRedis();
      }
    });
  }
}

// 检测当前服配置的游戏 和 redis里相应库的游戏 是否一致
GameRedis.prototype.checkGameCfg = function(cb) {
  this.redisClient.keyGet('game_id', (error, reply)=>{
    if (error){
      logger.error(`GameRedis.checkGameCfg but get game_id 
                    from redis error: ${error}`);
      misc.EXIT(1);
    }

    if (reply && Number(reply) !== this.gameOpt.game_id){
      logger.error(`GameRedis.checkGameCfg error, game_id in db is: ${reply}, 
                  but in config file is: ${this.gameOpt.game_id}.`);
      misc.EXIT(1);
    }

    if (!reply){
      this.regGameToRedis(cb);
    }
    else{
      cb(null, "checkGameCfg OK");
    }
  });
};

// 匹配本服游戏ID和数据库中的游戏ID信息
GameRedis.prototype.regGameToRedis = function(cb) {
  this.redisClient.keySet('game_id', this.gameOpt.game_id, (error, reply)=>{
    if (error){
      logger.error(`GameRedis.checkGameCfg but get game_id 
                    from redis error: ${error}`);
      misc.EXIT(1);
    }
    cb(null, "regGameToRedis OK: " + reply);
  });
};

GameRedis.prototype.getServerInfoByGameCfg = function () {
  let info = {};
  info.id = this.gameOpt.server_id;
  info.pid = process.pid;
  info.memUsed =  process.memoryUsage().heapUsed;
  info.startTime  = this.startTime;
  info.lastActive = Math.floor(Date.now()/1000);
  info.userCount  = this.server_ucnt;
  if ( this.syncExtraInfo && typeof this.syncExtraInfo === typeof {} ){
    Object.assign(info, this.syncExtraInfo);
  }

  // 在线服
  if (this.gameOpt.server_type === 'online'){
    if ( this.gameOpt.forClient && 
         this.gameOpt.forClient.schema && 
         this.gameOpt.forClient.host && 
         this.gameOpt.forClient.port ) {
      // 直接对外开放
      info.forClient = this.gameOpt.forClient;
    }
    if ( this.gameOpt.forGateway &&
         this.gameOpt.forGateway.schema && 
         this.gameOpt.forGateway.host && 
         this.gameOpt.forGateway.port ) {
      // 通过网卡间接对外
      info.forGateway = this.gameOpt.forGateway;
    }
  }
  else if (this.gameOpt.server_type === 'gateway'){
  // 网关服 - 不是必须
    if ( this.gameOpt.forClient && 
         this.gameOpt.forClient.schema && 
         this.gameOpt.forClient.host && 
         this.gameOpt.forClient.port ) 
      info.forClient = this.gameOpt.forClient;

    if ( this.gameOpt.forOnline &&
         this.gameOpt.forOnline.schema && 
         this.gameOpt.forOnline.host && 
         this.gameOpt.forOnline.port ) 
      info.forOnline = this.gameOpt.forOnline;
  }
  else if (this.gameOpt.server_type === 'battle'){
  // 战斗服 - 不是必须
    if ( this.gameOpt.forOnline &&
         this.gameOpt.forOnline.schema && 
         this.gameOpt.forOnline.host && 
         this.gameOpt.forOnline.port ) 
      info.forOnline = this.gameOpt.forOnline;
  }
  else if (this.gameOpt.server_type === 'family'){
  // 家族服- 不是必须
    if ( this.gameOpt.forOnline &&
         this.gameOpt.forOnline.schema && 
         this.gameOpt.forOnline.host && 
         this.gameOpt.forOnline.port ) 
      info.forOnline = this.gameOpt.forOnline;
  }
	else if (this.gameOpt.server_type === 'home'){
		// 家园服- 不是必须
		if ( this.gameOpt.forOnline &&
			this.gameOpt.forOnline.schema && 
			this.gameOpt.forOnline.host && 
			this.gameOpt.forOnline.port ) 
			info.forOnline = this.gameOpt.forOnline;
	} 
	else if (this.gameOpt.server_type === 'nickname'){
		// 昵称服- 不是必须
		if ( this.gameOpt.forOnline &&
			this.gameOpt.forOnline.schema && 
			this.gameOpt.forOnline.host && 
			this.gameOpt.forOnline.port ) 
			info.forOnline = this.gameOpt.forOnline;
	}
	else if(this.gameOpt.server_type==='open-proxy' || this.gameOpt.server_type==='account'){
		// 账号与支付服 - 不是必须
		if ( this.gameOpt.forClient && 
			this.gameOpt.forClient.schema && 
         this.gameOpt.forClient.host && 
         this.gameOpt.forClient.port ) 
      info.forClient = this.gameOpt.forClient;

    if ( this.gameOpt.forOnline &&
         this.gameOpt.forOnline.schema && 
         this.gameOpt.forOnline.host && 
         this.gameOpt.forOnline.port ) 
      info.forOnline = this.gameOpt.forOnline;

    if ( this.gameOpt.forGateway &&
         this.gameOpt.forGateway.schema && 
         this.gameOpt.forGateway.host && 
         this.gameOpt.forGateway.port ) 
      info.forGateway = this.gameOpt.forGateway;
  }
  else{
    logger.warn(`本服服务类型未知: ${this.gameOpt.server_type}, 
                 框架不会自动将本服加入系统联动, 跨服联动需要业务模块自行完成.`);
  }

  return info;
};

// 将本服注册到 redis 内存中(本框架假设游戏后台服务以redis为中心)
GameRedis.prototype.updateServerInfoInRedis = function(cb) {
  let info = this.getServerInfoByGameCfg();
  let strInfo = JSON.stringify(info);
  let hKey = this.gameOpt.server_type.toLowerCase() + "List";
  this.redisClient.hMSet(hKey, [info.id, strInfo], (error, result)=>{
    if (error){
      logger.warn(`GameRedis.updateServerInfoInRedis redisClient.hMSet 
                    error: ${error}, ${result}`);
      if (typeof cb === 'function') cb(error, result);
    }
    else{
      if (typeof cb === 'function') cb(null);
    }
  });
};

// 将本服的信息从 reids 内存中删除
GameRedis.prototype.delServerInfoInRedis = function (cb) {
  let info = this.getServerInfoByGameCfg();
  let hKey = this.gameOpt.server_type.toLowerCase() + "List";
  this.redisClient.hDel(hKey, info.id, (error, result)=>{
    if (error){
      logger.warn(`GameRedis.delServerInfoInRedis redisClient.hDel 
                    error: ${error}, ${result}`);
      if (typeof cb === 'function') cb(error, result);
    }
    else{
      if (typeof cb === 'function') cb(null);
    }
  });
};

// 定时更新本服在 redis 中心的保活信息
GameRedis.prototype.keepActiveToRedis = function(info, cb) {
  if (typeof info === 'number'){
    this.server_ucnt = info;
  }
  else if (info && typeof info === typeof {}){
    try{
      this.syncExtraInfo = JSON.parse(JSON.stringify(info));
    }
    catch(e){
      this.syncExtraInfo = {};
      logger.error(`GameRedis.keepActiveToRedis param info error: ${e.stack}`);
    }

    if (this.syncExtraInfo.hasOwnProperty('userCount')){
      this.server_ucnt = this.syncExtraInfo.userCount;
    }
  }

  if (typeof cb === 'function' ){
    this.updateServerInfoInRedis(cb);
  }
  else{
    this.updateServerInfoInRedis();
  }
};

// 从redis获取服列表
GameRedis.prototype.getServerListByType = function(type, cb) {
  let hKey = `${type}List`;
  this.getServerList(hKey, cb);
};
GameRedis.prototype.getOnlineList = function(cb) {
  this.getServerListByType('online', cb);
};
GameRedis.prototype.getGatewayList = function(cb) {
  this.getServerListByType('gateway', cb);
};
GameRedis.prototype.getBattleList = function(cb) {
  this.getServerListByType('battle', cb);
};
GameRedis.prototype.getFamilyList = function(cb) {
  this.getServerListByType('family', cb);
};
GameRedis.prototype.getHomeList = function(cb) {
  this.getServerListByType('home', cb);
};
GameRedis.prototype.getOpenproxyList = function(cb) {
  this.getServerListByType('open-proxy', cb);
};
GameRedis.prototype.getNickList= function(cb) {
  this.getServerListByType('nickname', cb);
};

GameRedis.prototype.getServerList = function(server_type, cb) {
  let hKey = server_type;
  this.redisClient.hGetAll(hKey, (error, result)=>{
    if (!error){
      if (result){
        //logger.debug(result);
        let svrs = {};
        let values = Object.values(result);
        for(let i=0; i < values.length; i++){
          let v = values[i];
          let s = JSON.parse(v);
          svrs[s.id] = s;
        }
        if (typeof cb === 'function') cb(null, svrs);
      }
      else{
        if (typeof cb === 'function') cb(null, {});
      }
    }
    else{
      logger.warn(`GameRedis.getServerList redisClient.hGetAll 
                    error: ${error}, ${result}`);
      if (typeof cb === 'function') cb(error, result);
    }
  });
};

// 游戏玩家登录，需要向中心服注册
GameRedis.prototype.isUserOnline = function(uid, cb){
  // TODO 实现, 换服的时候用；内存中判断失败后使用 redis 上的判断
  // 根据 redis 中是否有玩家数据,活跃时间是否在最近 30min 内；
  if (uid){
		this.getUserDetailByIdProps(uid, 'heartBeatTime', (err, result) => {
			if (err) {
				logger.error(`GameRedis.prototype.isUserOnline error, user detail info not exist : ${err}`);	
				cb(err, false);
				return;
			}

			let nowTime = Math.floor(Date.now() / 1000);
			if (result + 300 < nowTime) { // 5min内没有心跳则下线
				cb(null, false);	
			} else {
				cb(null, true);	
			}
		});
  }
};

// 一次性更新玩家所有核心信息(只能一次更新所有)
GameRedis.prototype.updateUserCoreInfo = function(user, cb){
  if (!user || !user.id || typeof user.coreToJSON !== 'function'){
    logger.error(`GameRedis.updateUserCoreInfo but user obj error`);
    return cb('error', `GameRedis.updateUserCoreInfo but user obj error`);
  }

  let hKey = USER_CORE_HKEY;
  let coreInfo = user.coreToJSON();
  let strCoreInfo = JSON.stringify(coreInfo);
  this.redisClient.hSet(hKey, user.id, strCoreInfo, (e,r)=>{
    if (e){
      return cb(e, r);
    }
    else{
      // 同步更新 详细信息存储
      let hKey = USER_DETAIL_PREV + user.id;
      let fvList = [];
      for(let key in coreInfo){
        if (key) { 
          fvList.push(key);
          fvList.push(coreInfo[key]);
        }
      }
      this.redisClient.hMSet(hKey, fvList, cb);
    }
  });
};

// 增加在线用户入集合 
GameRedis.prototype.addUserInRedisSet = function (user, cb) {
	if (!user || !user.id) {
		logger.error(`GameRedis.prototype.addUserInRedisSet, but user obj error`);
		return;
	}

	let sKey = USER_LOGIN_SET;
	this.redisClient.sAdd(sKey, user.id, (e, r) => {
		if (cb && typeof cb === 'function') cb(e, r);
	});
};

// 移除在线集合中的用户
GameRedis.prototype.removeUserFromRedisSet = function (user, cb) {
	if (!user || !user.id) {
		logger.error(`GameRedis.prototype.removeUserFromRedisSet, but user obj error`);
		return;
	}

	let sKey = USER_LOGIN_SET;
	this.redisClient.sRem(sKey, user.id, (e, r) => {
		if (cb && typeof cb === 'function') cb(e, r);
	});
};

// 随机若干在线玩家
GameRedis.prototype.randRedisUser = function (count, cb) {
	let sKey = USER_LOGIN_SET;
	this.redisClient.sRandmember(sKey, count, (e, r) => {
		if (cb && typeof cb === 'function') cb(e, r);
	});
		
};

// 游戏玩家登录，需要向中心服注册
// 一次性更新玩家所有详细信息(成功的话会更新玩家 核心 信息)
GameRedis.prototype.userLogin = function(user, cb){
  if (!user || !user.id || typeof user.detailToJSON !== 'function'){
    logger.error(`GameRedis.userLogin but user obj error`);
    return cb('error', `GameRedis.userLogin but user obj error`);
  }

  let hKey = USER_DETAIL_PREV + user.id;
  let detailInfo = user.detailToJSON();
  let fvList = [];
  for(let key in detailInfo){
    if (key){
      if (key === 'coreJson') continue;
      let value = detailInfo[key];
      let type = typeof value;
      if (SAVE_DATA_TYPE.indexOf(type) >= 0 ){
        fvList.push(key);
        if (type === 'undefined'){
          fvList.push("" + value);
        }
        else{
          fvList.push(value);
        }
      }
      else{
        logger.warn(`GameRedis.userLogin 
                    but user ${key} value is ${value} and its type is ${type}.`);
      }
    }
  }
  let self = this;
  if (fvList.length > 0) {
    return this.redisClient.hMSet(hKey, fvList, (e, r)=>{
      if (!e){
      // 同步更新 核心信息存储
        self.updateUserCoreInfo(user, cb);
			// 增加user进登陆集合
				self.addUserInRedisSet(user, cb);
      }
      else{
        cb(e, r);
      }
    });
  }
  else{
    cb(null, user + " detail nothing update to redis.");
  }
};
// 更新玩家详细信息中指定的项
GameRedis.prototype.updateUserDetailInfoByProps = function(user, propList, cb){
  let hKey = USER_DETAIL_PREV + user.id;
  let fvList = [];
  let coreInfo = user.coreToJSON();
  let updateCore = false;
  for(let i=0; i < propList.length; i++){
    let key = propList[i];
    let value = user[key];
    let type = typeof value;
    if (user.hasOwnProperty(key) && SAVE_DATA_TYPE.indexOf(type) >= 0 ){
      if (coreInfo.hasOwnProperty(key)) updateCore = true;
      fvList.push(key);
      if (type === 'undefined'){
        fvList.push("" + value);
      }
      else{
        fvList.push(value);
      }
    }
    else{
      logger.warn(`GameRedis.updateUserDetailInfoByProps,
                  but user ${key} value is ${value} and its type is ${type}.`);
    }
  }

  let self = this;
  if (fvList.length > 0) {
    this.redisClient.hMSet(hKey, fvList, (e, r)=>{
      if (e){
        return cb(e, r);
      }
      else if (updateCore){
        // 同步更新 核心信息存储
        return self.updateUserCoreInfo(user, cb);
      }
      else{
        return cb(e, r);
      }
    });
  }
  else{
    cb(null, user + " detail nothing update to redis!");
  }
};

// 通过玩家的游戏内 id 查询其核心信息(只能一次查所有)
GameRedis.prototype.getUserCoreById = function(id, cb){
  let hKey = USER_CORE_HKEY;
  this.redisClient.hGet(hKey, id, (error, result)=>{
    if (error){
      logger.error(`GameRedis.getUserCoreById but error: ${error}`);
      return cb(error, result);
    }
    if (!result) return cb(null, null);
    //logger.debug(result);
    cb(null, result);
  });
};
// 查一批玩家的核心信息
GameRedis.prototype.getUsersCoreById = function(idList, cb){
  let hKey = USER_CORE_HKEY;
  this.redisClient.hMGet(hKey, idList, (error, result)=>{
    if (error){
      logger.error(`GameRedis.getUsersCoreById but error: ${error}`);
      return cb(error, result);
    }
    if (!result) return cb(null, null);
    //logger.debug(result);
    cb(null, result);
  });
};

// 通过玩家的游戏内 id 查询其所有详细信息
GameRedis.prototype.getUserDetailById = function(id, cb){
  let hKey = USER_DETAIL_PREV + id;
  this.redisClient.hGetAll(hKey, (error, result)=>{
    if (error){
      logger.error(`GameRedis.getUserById but error: ${error}`);
      return cb(error, result);
    }
    if (!result) return cb(null, null);
    //logger.debug(result);
    cb(null, result);
  });
};

// 通过玩家的游戏内 id 查询其指定项的信息
GameRedis.prototype.getUserDetailByIdProps = function(id, propList, cb){
  let hKey = USER_DETAIL_PREV + id;
  this.redisClient.hMGet(hKey, propList, (error, result)=>{
    if (error){
      logger.error(`GameRedis.getUserDetailByIdProps but error: ${error}`);
      return cb(error, result);
    }
    if (!result) return cb(null, null);
    cb(null, result);
  });
};

// 订阅新服通知信息
GameRedis.prototype.subscribeForNewServer = function(cb){
  this.redisClient.cSubscribe(CH_NEW_SERVER, (result)=>{
    cb(result);
  });
};

// 发布新服信息 - 与redis断线重连后
//
// 参数式例:
// sInfo: {
//   schema: 'ws',
//   host: '10.1.1.248',
//   port: 15505,
//   type: 'online',
//   usage: 'forClient',
// }
//
GameRedis.prototype.publishNewServer = function(sInfo, cb) {
  if (sInfo && sInfo.schema && sInfo.host && sInfo.port){
    sInfo.time = sInfo.time || Date.now();
    sInfo = JSON.stringify(sInfo);
    this.redisClient.cPublish(CH_NEW_SERVER, sInfo, (error, result)=>{
      if (typeof cb === 'function' ) cb(error, result);
    });
  }
  else{
    if (typeof cb === 'function' ) cb('error', "parameter error, sInfo must like: {schema:xxx,host:xxx,port:xxx,type:'xxxx',usage:'xxx'}, but now:" + sInfo);
  }
};

// 订阅跨服聊天信息
GameRedis.prototype.subscribeForChat = function(cb){
  this.redisClient.cSubscribe(CH_CHAT, (result)=>{
    if (typeof cb === 'function' ) cb(result);
  });
};

// 发布聊天信息
//
// 参数式例:
// mInfo: {
//   type: 'global',
//   from: 10079,
//   to: 19999,
//   content: 'hello world!',
// }
//
GameRedis.prototype.publishChat = function(mInfo, cb){
  if (mInfo && mInfo.type && mInfo.to && mInfo.from && mInfo.content){
    mInfo.time = mInfo.time || Date.now();
    let strInfo = JSON.stringify(mInfo);
    this.redisClient.cPublish(CH_CHAT, strInfo, (error, result)=>{
      if (typeof cb === 'function' ) cb(error, result);
    });
  }
  else{
    cb('error', "parameter error, mInfo must like: {type:xxx,to:xxx,from:xxx,content:'xxxx'}");
  }
};

// 订阅管理控制信息
GameRedis.prototype.subscribeForCtrlCmd = function(cb){
  this.redisClient.cSubscribe(CH_CTRL, (result)=>{
    if (typeof cb === 'function' ) cb(result);
  });
};

// 发布管理控制信息
//
// 参数式例:
// cInfo: {
//	type : typeId,
//	from : "online",
//	to : "gateway",
//	time : timestamp,
//	data : {
//		subType : subTypeId,
//		param : {}
//	}
// }
//

GameRedis.prototype.publishCtrlCmd = function(cInfo, cb) {
  if (cInfo && cInfo.type && cInfo.time){
    cInfo.time = cInfo.time || Date.now();
    cInfo = JSON.stringify(cInfo);
    this.redisClient.cPublish(CH_CTRL, cInfo, (error, result)=>{
      if (typeof cb === 'function' ) cb(error, result);
    });
  }
  else{
    if (typeof cb === 'function' ) cb('error', "parameter error, cInfo must like: {schema:xxx,host:xxx,port:xxx,type:'xxxx',usage:'xxx'}");
  }
};

///////////////////////////////////////// 下面是排行榜的封装

// 如果还没有主体则添加，有则更新分数
// rkType: 排行榜类型，推荐业务层定义一个排行榜类型列表
// id: 参与排序的主体标识
// score: 参与排序的主体的属性值 - 排序是基于该值的
//  cb: 操作结果的回调函数
GameRedis.prototype.updateScoreInRank = function(rkType, id, score, cb) {
  if (rkType.indexOf(RANK_PREFIX < 0)) rkType = RANK_PREFIX + rkType;
  if (rkType && id) {
    // 注意 zAdd 的 score, id顺序，和本函数的相反
    this.redisClient.zAdd(rkType, [score, id], cb);
  }
  else{
    cb('error', "GameRedis.addToRank parameter rkType or id error.");
  }
};

GameRedis.prototype.queryTotalCountFromRank = function(rkType, cb) {
  if (rkType.indexOf(RANK_PREFIX < 0)) rkType = RANK_PREFIX + rkType;
  if (rkType){
    this.redisClient.zCard(rkType, cb);
  }
  else{
    cb('error', "GameRedis.queryTotalCountFromRank parameter rkType.");
  }
};

// 查询某个主体的 名次
// 默认降序排列
GameRedis.prototype.queryIdxFromRank = function(rkType, id, orderByDESC, cb) {
  if (rkType.indexOf(RANK_PREFIX < 0)) rkType = RANK_PREFIX + rkType;
  if (typeof orderByDESC === 'function') { 
    cb = orderByDESC;
    orderByDESC = true;
  }
  if (rkType && id){
    if (orderByDESC){
      this.redisClient.zRevRank(rkType, id, cb);
    }
    else{
      this.redisClient.zRank(rkType, id, cb);
    }
  }
  else{
    cb('error', "GameRedis.queryIdxFromRank parameter rkType or id error.");
  }
};

// 查询某个主体的 分数
GameRedis.prototype.queryScoreFromRank = function(rkType, id, cb) {
  if (rkType.indexOf(RANK_PREFIX < 0)) rkType = RANK_PREFIX + rkType;
  if (rkType && id){
    this.redisClient.zScore(rkType, id, cb);
  }
  else{
    cb('error', "GameRedis.queryScoreFromRank parameter rkType or id error.");
  }
};
// 从排行榜删除某个主体的记录
GameRedis.prototype.remScoreFromRank = function(rkType, id, cb) {
  if (rkType.indexOf(RANK_PREFIX < 0)) rkType = RANK_PREFIX + rkType;
  if (rkType && id){
    this.redisClient.zRem(rkType, id, cb);
  }
  else{
    cb('error', "GameRedis.remScoreFromRank parameter rkType or id error.");
  }
};

// 通过名次范围查询排行榜上一段列表
GameRedis.prototype.queryRankListByIdx = function(rkType, start, to, orderByDESC, cb) {
  if (rkType.indexOf(RANK_PREFIX < 0)) rkType = RANK_PREFIX + rkType;
  if (typeof cb !== 'function' && typeof orderByDESC === 'function') { 
    cb = orderByDESC;
    orderByDESC = true;
  }
  if (start > to) {let tmp = to; to = start; start=tmp;}
  if (rkType){
    if (orderByDESC){
      this.redisClient.zRevRange(rkType, start, to, cb);
    }
    else{
      this.redisClient.zRange(rkType, start, to, cb);
    }
  }
  else{
    cb('error', "GameRedis.queryRankListByIdx parameter rkType or id error.");
  }
};

// 通过分数范围查询排行榜上一段列表
GameRedis.prototype.queryRankListByScore = function(rkType, start, to, orderByDESC, cb) {
  if (rkType.indexOf(RANK_PREFIX < 0)) rkType = RANK_PREFIX + rkType;
  if (typeof orderByDESC === 'function') { 
    cb = orderByDESC;
    orderByDESC = true;
  }
  if (rkType){
    if (orderByDESC){
      if (start < to) {let tmp = to; to = start; start=tmp;}
      this.redisClient.zRevRangebyScore(rkType, start, to, cb);
    }
    else{
      if (start > to) {let tmp = to; to = start; start=tmp;}
      this.redisClient.zRangebyScore(rkType, start, to, cb);
    }
  }
  else{
    cb('error', "GameRedis.queryRankListByScore parameter rkType or id error.");
  }
};

///////////////////////////////////////// 上面是排行榜的封装

// 基于hash集合封装属性
// TODO: 获取的 value 可能需要从 string解析JSON.parse 为 json 对象
///////////////////////////////////////// 下面是玩家属性值的封装
GameRedis.prototype.userAttrDel = function(uid, attrKey, cb) {
  let hKey = USER_ATTR_PREFIX + uid; 
  this.redisClient.hDel(hKey, attrKey, cb);
};

// 下面无时间有效期的(永久有效)
// 直接设置属性
GameRedis.prototype.userAttrSet = function(uid, attrKey, attrValue, cb) {
  let hKey = USER_ATTR_PREFIX + uid; 
  this.redisClient.hSet(hKey, attrKey, attrValue, cb);
};
// 获取属性
GameRedis.prototype.userAttrGet = function(uid, attrKey, cb) {
  let hKey = USER_ATTR_PREFIX + uid; 
  this.redisClient.hGet(hKey, attrKey, cb);
};
// 讲属性值加值
GameRedis.prototype.userAttrValueAdd = function(uid, attrKey, addValue, cb) {
  let hKey = USER_ATTR_PREFIX + uid; 
  this.redisClient.hIncrBy(hKey, attrKey, addValue, cb);
};
// 获取所有属性
GameRedis.prototype.userAttrGetAll = function(uid, cb) {
  let hKey = USER_ATTR_PREFIX + uid; 
  this.redisClient.hGetAll(hKey, cb);
};
// 上面无时间有效期的(永久有效)

// 下面有时间效期的(阶段性有效), 时间单位 秒
// 直接设置有时间段的属性值
GameRedis.prototype.userAttrWithTimeSet = function(uid, attr, value, sTime, eTime, cb) {
  if (sTime > eTime) {let tmp=sTime; sTime=eTime;eTime=tmp;}
  let now = Math.floor(Date.now()/1000);
  if (now > eTime){
    let tip = `the user ${uid} attribute ${attr} has timeout, escape write to redis.`;
    logger.warn(tip);
    return cb('error', tip);
  }

  let hKey = USER_ATTR_TIME_PREFIX + uid; 
  let info = {key:attr, value:value, timeStart:sTime, timeEnd:eTime};
  let strInfo = JSON.stringify(info);
  this.redisClient.hSet(hKey, attr, strInfo, cb);
};
// 获取有时间段控制的属性
GameRedis.prototype.userAttrWithTimeGet = function(uid, attr, cb) {
  let hKey = USER_ATTR_TIME_PREFIX + uid; 
  this.redisClient.hGet(hKey, attr, cb);
};
// 获取所有有时间段控制的属性
GameRedis.prototype.userAttrWithTimeGetAll = function(uid, cb) {
  let hKey = USER_ATTR_TIME_PREFIX + uid; 
  this.redisClient.hGetAll(hKey, cb);
};
// 基于已存redis的数据修改
// 将属性值加值
GameRedis.prototype.userAttrWithTimeAddValue = function(uid, attr, addValue, cb) {
  let hKey = USER_ATTR_TIME_PREFIX + uid; 
  this.userAttrWithTimeGet(uid, attr, (e, r)=>{
    if (e){
      return cb(e, r);
    }
    else{
      if (typeof r !== 'string'){
        let tip = `user ${uid} attr with time ${attr} format error in redis.`;
        logger.warn(tip);
        return cb('error', tip);
      }

      try{
        let obj = JSON.parse(r);
        if (typeof obj === 'string') {obj = JSON.parse(obj);}
        obj.value = obj.value + addValue;
        return this.redisClient.hSet(hKey, attr, JSON.stringify(obj), cb);
      }
      catch(e){
        logger.error('GameRedis.userAttrWithTimeAddValue error: ' + e.stack);
        return cb('error', 'GameRedis.userAttrWithTimeAddValue error.');
      }
    }
  });
};
// 直接更新属性值
GameRedis.prototype.userAttrWithTimeUpdateValue = function(uid, attr, value, cb) {
  let hKey = USER_ATTR_TIME_PREFIX + uid; 
  this.userAttrWithTimeGet(uid, attr, (e, r)=>{
    if (e){
      return cb(e, r);
    }
    else{
      if (typeof r !== 'string'){
        let tip = `user ${uid} attr with time ${attr} format error in redis.`;
        logger.warn(tip);
        return cb('error', tip);
      }

      try{
        let obj = JSON.parse(r);
        if (typeof obj === 'string') {obj = JSON.parse(obj);}
        obj.value = value;
        return this.redisClient.hSet(hKey, attr, JSON.stringify(obj), cb);
      }
      catch(e){
        logger.error('GameRedis.userAttrWithTimeUpdateValue error: ' + e.stack);
        return cb('error', 'GameRedis.userAttrWithTimeUpdateValue error.');
      }
    }
  });
};
// 直接将属性有效期加长秒数
GameRedis.prototype.userAttrWithTimeAddEndTimeSecends = function(uid, attr, seconds, cb) {
  let hKey = USER_ATTR_TIME_PREFIX + uid; 
  this.userAttrWithTimeGet(uid, attr, (e, r)=>{
    if (e){
      return cb(e, r);
    }
    else{
      if (typeof r !== 'string'){
        let tip = `user ${uid} attr with time ${attr} format error in redis.`;
        logger.warn(tip);
        return cb('error', tip);
      }

      try{
        let obj = JSON.parse(r);
        if (typeof obj === 'string') {obj = JSON.parse(obj);}
        obj.timeEnd = Number(obj.timeEnd) + seconds;
        return this.redisClient.hSet(hKey, attr, JSON.stringify(obj), cb);
      }
      catch(e){
        logger.error('GameRedis.userAttrWithTimeAddEndTimeSecends error: ' + e.stack);
        return cb('error', 'GameRedis.userAttrWithTimeAddEndTimeSecends error.');
      }
    }
  });
};
// 直接设置属性的终止有效期
GameRedis.prototype.userAttrWithTimeSetEndTime = function(uid, attr, timeEnd, cb) {
  let hKey = USER_ATTR_TIME_PREFIX + uid; 
  this.userAttrWithTimeGet(uid, attr, (e, r)=>{
    if (e){
      return cb(e, r);
    }
    else{
      if (typeof r !== 'string'){
        let tip = `user ${uid} attr with time ${attr} format error in redis.`;
        logger.warn(tip);
        return cb('error', tip);
      }

      try{
        let obj = JSON.parse(r);
        if (typeof obj === 'string') {obj = JSON.parse(obj);}
        obj.timeEnd = timeEnd ;
        return this.redisClient.hSet(hKey, attr, JSON.stringify(obj), cb);
      }
      catch(e){
        logger.error('GameRedis.userAttrWithTimeSetEndTime error: ' + e.stack);
        return cb('error', 'GameRedis.userAttrWithTimeSetEndTime error.');
      }
    }
  });
};
// 上面有时间效期的(阶段性有效)
///////////////////////////////////////// 上面是玩家属性值的封装



/// 上面是框架定制的游戏功能接口

///////////////////////////////////////////////////////////////////////////////

/// 下面是保留的redis通用接口，以供业务灵活实现自己的特殊功能
GameRedis.prototype.subscribe= function(channel, cb) {
  if ([CH_CHAT, CH_CTRL, CH_NEW_SERVER].indexOf(channel) >= 0){
    return cb('error', `[${channel}] 是系统框架保留的 channel 名, 不能直接subscribe! `);
  }
  this.redisClient.cSubscribe(channel, cb);
};
GameRedis.prototype.publish = function(channel, message, cb) {
  if ([CH_CHAT, CH_CTRL, CH_NEW_SERVER].indexOf(channel) >= 0){
    return cb('error', `[${channel}] 是系统框架保留的 channel 名, 不能直接publish! `);
  }
  this.redisClient.cPublish(channel, message, cb);
};

GameRedis.prototype.keyExpire = function(key, seconds, cb){
  this.redisClient.keyExpire(key, seconds, cb);
};

GameRedis.prototype.keyExpireAt = function(key, timestamp, cb){
  this.redisClient.keyExpireAt(key, timestamp, cb);
};

GameRedis.prototype.hExpire = function(key, seconds, cb){
  this.redisClient.hExpire(key, seconds, cb);
};

GameRedis.prototype.hExpireAt = function(key, timestamp, cb){
  this.redisClient.hExpireAt(key, timestamp, cb);
};

GameRedis.prototype.sExpire = function(key, seconds, cb){
  this.redisClient.sExpire(key, seconds, cb);
};

GameRedis.prototype.sExpireAt = function(key, timestamp, cb){
  this.redisClient.sExpireAt(key, timestamp, cb);
};

GameRedis.prototype.zExpire = function(key, seconds, cb){
  this.redisClient.zExpire(key, seconds, cb);
};

GameRedis.prototype.zExpireAt = function(key, timestamp, cb){
  this.redisClient.zExpireAt(key, timestamp, cb);
};

GameRedis.prototype.lExpire = function(key, seconds, cb){
  this.redisClient.lExpire(key, seconds, cb);
};

GameRedis.prototype.lExpireAt = function(key, timestamp, cb){
  this.redisClient.lExpireAt(key, timestamp, cb);
};

GameRedis.prototype.hSet = function(key, fiield, value, cb) {
  this.redisClient.hSet(key, fiield, value, cb);
};

GameRedis.prototype.hGet = function(key, fiield, cb) {
  this.redisClient.hGet(key, fiield, cb);
};


module.exports = GameRedis;
