/*
 *************************************************************************
 *    File Name:  RedisClient.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Mon 20 Aug 2018 12:03:20 AM EDT
 * 
 *  Description: Redis 接口的封装，并非全部的，选取游戏可能用到的
 * 
 *              要求: redis version >= 2.4 
 ************************************************************************
*/
'use strict';
const Redis = require("redis");

const logger = require("../utils/logger.js");
const misc = require("../utils/misc.js");

const HASH_PREV = "H::";
const LIST_PREV = "L::";
const SET_PREV = "S::";
const SORTED_SET_PREV = "Z::";

let self = null;
class RedisClient {
	constructor(option) {
    self = this;
		option.max_attempts = option.max_attempts || 0;                       // 最多尝试重连次数， 0:无限， 1:不重连
		option.retry_max_delay = option.retry_max_delay || 6 * 1000;	        // 最大重连间隔时间
		option.connect_timeout = option.connect_timeout || 60 * 60 * 1000;    // 最久多长时间内重连
		option.connect_timeout = Math.max(option.connect_timeout, 60 * 1000); // 配置重连的情况下，至少重连1分钟
    this.option = {};
    this.channelCB = {};
    Object.assign(this.option, option);
    // 将老配置的格式转换成新的
    this.option.retry_strategy = (opts)=>{
			let tip = "";
			let delay = Math.min(option.retry_max_delay, 3000 * (opts.attempt || 1));
			delay = Math.max(delay, 1000); // 控制不能太快的重连... 避免重连操作本身消耗系统性能
      if (opts.error && opts.error.code === 'ECONNREFUSED') {
				let desc = JSON.stringify(opts.error);
      	tip = `Redis server [${this.option.host}:${this.option.port} db:${this.option.db}] error: ${desc}.`;
				logger.error(tip);
      }

			if (option.max_attempts === 1){
			// 配置不用重连
      	tip = `The redis [${this.option.host}:${this.option.port} db:${this.option.db}] connection lost, not try reconnect because config.`;
				logger.error(tip);
      	return new Error(tip);
			}
      else if (option.max_attempts <= 0) {
			// 重连次数不限(根据时间控制是否继续重连)
				if (opts.total_retry_time >= option.connect_timeout){
      		tip = `Try reconnect to redis [${this.option.host}:${this.option.port} db:${this.option.db}] cost ${opts.total_retry_time}ms, time over, will not ry again!`;
					logger.error(tip);
					return new Error(tip);
				}
				else{
      		//return delay;
				}
			}
			else {
			// 重连次数有限
				if (opts.attempt >= option.max_attempts){
      		tip = `Try reconnect to redis [${this.option.host}:${this.option.port} db:${this.option.db}] [${opts.attempt}]] times, but failed, will not try again.`;
					logger.error(tip);
      		return new Error(tip);
				}
				else{
					if (opts.total_retry_time >= option.connect_timeout){
      			tip = `Try reconnect to redis [${this.option.host}:${this.option.port} db:${this.option.db}] cost ${opts.total_retry_time}ms, time over, will not ry again.`;
						logger.error(tip);
						return new Error(tip);
					}
					else{
      			//return delay;
					}
				}
			}
      tip = `Try reconnect to redis [${this.option.host}:${this.option.port} db:${this.option.db}] ${opts.attempt} times, , will try again in ${delay}ms.`;
			logger.warn(tip);
			return delay;
    };
		delete this.option.max_attempts;
		delete this.option.retry_max_delay;

    if (this.option && this.option.host && this.option.port){
      // 通常功能用的链接
      this.commConn = Redis.createClient(this.option.port,
                                          this.option.host,
                                          this.option);
      // 消息发布订阅用的链接
      this.pubConn = this.commConn.duplicate();
      this.subConn = this.commConn.duplicate();
      logger.info(`RedisClient connect to ${this.option.host}:${this.option.port} db:${this.option.db}`);
    }
    else{
      logger.error("RedisClient constructor parameter error: ", this.option);
			misc.EXIT(1);
    }
	}
}

///////////////////////////////////////////////////////////////////////////////
// key 主要存储管理游戏级别的数据 
// 设置 key
RedisClient.prototype.keySet = function(key, value, cb) {
  if (typeof value !== 'string'){
    value = JSON.stringify(value);
  }
  this.commConn.set(key, value, cb);
};
// 获取 key
RedisClient.prototype.keyGet = function(key, cb) {
  this.commConn.get(key,cb);
};
// 判断 key 是否存在
RedisClient.prototype.keyExist = function(key, cb) {
  this.commConn.exists(key,cb);
};
// 不支持游戏直接模糊搜索key， 避免数量大时影响常规访问
//RedisClient.prototype.keys = function(key, pattern) {
//};
// 不支持游戏直接删除key; 直接的key存的是游戏管理信息，不可以删除
//RedisClient.prototype.keyDel = function(key, cb) {
//};

// 注意下面的命令redis是包括key, has,list,set,sorted set的
// 此处接口封装则分开独立实现 --- 以为key 加上前缀, 从严控制根上数据的删除
RedisClient.prototype.keyExpire = function(key, seconds, cb) {
  if (key.indexOf(HASH_PREV) === 0 || key.indexOf(SET_PREV) === 0 || key.indexOf(SORTED_SET_PREV) === 0 || key.indexOf(LIST_PREV) === 0){
    return cb('error', 'keyExpireAt key must not use hash/list/set/zset prefix.');
  }
  this.commConn.expire(key, seconds, cb);
};
RedisClient.prototype.keyExpireAt = function(key, timestamp, cb) {
  //if (key.indexOf(HASH_PREV) === 0 || key.indexOf(SET_PREV) === 0 || key.indexOf(SORTED_SET_PREV) === 0 || key.indexOf(LIST_PREV) === 0){
  if (key.indexOf(HASH_PREV)  &&  key.indexOf(SET_PREV)  && key.indexOf(SORTED_SET_PREV)  &&  key.indexOf(LIST_PREV)){
    return cb('error', 'keyExpireAt key must not use hash/list/set/zset prefix.');
  }
  this.commConn.expireat(key, timestamp, cb);
};

RedisClient.prototype.keyPersist = function(key, cb) {
  if (key.indexOf(HASH_PREV) === 0 || key.indexOf(SET_PREV) === 0 || key.indexOf(SORTED_SET_PREV) === 0 || key.indexOf(LIST_PREV) === 0){
    return cb('error', 'keyExpireAt key must not use hash/list/set/zset prefix.');
  }
  this.commConn.persist(key, cb);
};
RedisClient.prototype.keyTTL = function(key, cb) {
  if (key.indexOf(HASH_PREV) === 0 || key.indexOf(SET_PREV) === 0 || key.indexOf(SORTED_SET_PREV) === 0 || key.indexOf(LIST_PREV) === 0){
    return cb('error', 'keyExpireAt key must not use hash/list/set/zset prefix.');
  }
  this.commConn.ttl(key, cb);
};

//RedisClient.prototype.keyRename = function(key, cb) {
//};

///////////////////////////////////////////////////////////////////////////////
// 按照 hash 存储管理服，玩家，玩法系统的数据
//
RedisClient.prototype.hSet = function(hKey, field, value, cb) {
  if (typeof value !== 'string'){
    value = JSON.stringify(value);
  }
  hKey = HASH_PREV + hKey;
  this.commConn.hset(hKey, field, value, cb);
};

RedisClient.prototype.hGet = function(hKey, field, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hget(hKey, field, cb);
};
// 批量设置hKey下 field列表的值
RedisClient.prototype.hMSet = function(hKey, fieldValueList, cb) {
  if (!Array.isArray(fieldValueList) || fieldValueList.length===0 || fieldValueList.length % 2 !== 0){
    return cb('error', `RedisClient.hMSet parameter fieldValueList error: ${fieldValueList}`);
  }
  hKey = HASH_PREV + hKey;
  this.commConn.hmset(hKey, fieldValueList, cb);
};
// 获取hKey里的所有的域和值
RedisClient.prototype.hGetAll = function(hKey, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hgetall(hKey, cb);
};
// 获取hKey里的所有的域
RedisClient.prototype.hKeys = function(hKey, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hkeys(hKey, cb);
};
// 获取hKey里的所有的值
RedisClient.prototype.hVals = function(hKey, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hvals(hKey, cb);
};
// 批量获取hKey下 field列表的值
RedisClient.prototype.hMGet = function(hKey, fieldList, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hmget(hKey, fieldList, cb);
};
// 可以用于随机推荐好友等
//RedisClient.prototype.hScan = function(hKey, cursor) {
//  hKey = HASH_PREV + hKey;
//}

RedisClient.prototype.hDel = function(hKey, field, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hdel(hKey, field, cb);
};
RedisClient.prototype.hExists = function(hKey, field, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hexists(hKey, field, cb);
};
RedisClient.prototype.hLen = function(hKey, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hlen(hKey, cb);
};
RedisClient.prototype.hIncrBy = function(hKey, field, value, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hincrby(hKey, field, value, cb);
};
RedisClient.prototype.hIncrByFloat = function(hKey, field, value, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.hincrbyfload(hKey, field, value, cb);
};

// 过期删除，秒控
RedisClient.prototype.hExpire = function(hKey, seconds, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.expire(hKey, seconds, cb);
};
// 过期删除，时间戳控
RedisClient.prototype.hExpireAt = function(hKey, timestamp, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.expireat(hKey, timestamp, cb);
};
// 将hash类型的key设置为永久有效
RedisClient.prototype.hPersist = function(hKey, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.persist(hKey, cb);
};
// 查hash 类型的剩余生存时间(秒)
RedisClient.prototype.hTTL = function(hKey, cb) {
  hKey = HASH_PREV + hKey;
  this.commConn.ttl(hKey, cb);
};

///////////////////////////////////////////////////////////////////////////////
// 通信频道
// 通过模式匹配批量订阅
// 订阅
RedisClient.prototype.cSubscribe = function(channel, cb) {
  this.subConn.subscribe(channel);
  if (Object.keys(this.channelCB).length === 0){
    this.subConn.on('message', (ch, msg)=>{
      if (typeof this.channelCB[ch] === 'function'){
        this.channelCB[ch](msg);
      }
      else{
        logger.error(`Got unsubscribe channel [${ch}] msg from rediscenter: ${msg}`);
      }
    });
  }
  this.channelCB[channel] = cb;
};
// 发布消息
RedisClient.prototype.cPublish = function(channel, message, cb) {
  this.pubConn.publish(channel, message, cb);
};

//RedisClient.prototype.cPSubscribe = function(partternList, cb) {
//};
//RedisClient.prototype.cPubSub = function(subCmd, args, cb) {
//}
// 通过模式匹配批量退订
//RedisClient.prototype.cPUnsubscribe = function(patternList, cb) {
//};
// 退订
//RedisClient.prototype.cUnSubscribe = function(channelList, cb) {
//};

///////////////////////////////////////////////////////////////////////////////
// 有序集合, 适合各种排行榜

// 添加成员进入排序集
// 注意 score 在 value 前面
RedisClient.prototype.zAdd = function(zKey, scoreValueList, cb) {
  zKey = SORTED_SET_PREV + zKey;
  if (!Array.isArray(scoreValueList) || scoreValueList.length===0 || scoreValueList.length % 2 !== 0){
    return cb('error', `RedisClient.hMSet parameter scoreValueList error: ${scoreValueList}`);
  }
  this.commConn.zadd([zKey].concat(scoreValueList), cb);
};
// 某排序集合 成员总数
RedisClient.prototype.zCard = function(zKey, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zcard(zKey, cb);
};
// 某排序集合 在指定分数区间的成员数
RedisClient.prototype.zCount = function(zKey, min, max, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zcount(zKey, min, max, cb);
};
// 给某排序集合里某个成员加分
RedisClient.prototype.zIncrBy = function(zKey, increment, member, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zincrby(zKey, increment, member, cb);
};
// 获取某排序集合里指定排名区间的分数(由小到大排序)
RedisClient.prototype.zRange = function(zKey, start, stop, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zrange(zKey, start, stop, 'WITHSCORES', cb);
};
// 获取某排序集合里指定排名区间的分数(由大到小排序)
RedisClient.prototype.zRevRange = function(zKey, start, stop, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zrevrange(zKey, start, stop, 'WITHSCORES', cb);
};
// 获取某排序集合里指定分数区间的分数(由小到大排序)
RedisClient.prototype.zRangebyScore = function(zKey, start, stop, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zrangebyscore(zKey, start, stop, 'WITHSCORES', cb);
};
// 获取某排序集合里指定分数区间的分数(由大到小排序)
RedisClient.prototype.zRevRangebyScore = function(zKey, start, stop, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zrevrangebyscore(zKey, start, stop, 'WITHSCORES', cb);
};
// 获取某排序集合里指定指定成员的排名(由小到大)
RedisClient.prototype.zRank = function(zKey, member, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zrank(zKey, member, cb);
};
// 获取某排序集合里指定指定成员的排名(由大到小)
RedisClient.prototype.zRevRank = function(zKey, member, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zrevrank(zKey, member, cb);
};
// 删除某排序集合里指定指定成员(单个，或多个---成员list)
RedisClient.prototype.zRem = function(zKey, members, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zrem(zKey, members, cb);
};
// 获取某排序集合里指定指定成员的分数
RedisClient.prototype.zScore = function(zKey, member, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.zscore(zKey, member, cb);
};

// 过期删除，秒控
RedisClient.prototype.zExpire = function(zKey, seconds, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.expire(zKey, seconds, cb);
};
// 过期删除，时间戳控
RedisClient.prototype.zExpireAt = function(zKey, timestamp, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.expireat(zKey, timestamp, cb);
};
// 将有序集合类型的key设置为永久有效
RedisClient.prototype.zPersist = function(zKey, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.persist(zKey, cb);
};
// 查有序集合 类型的剩余生存时间(秒)
RedisClient.prototype.zTTL = function(zKey, cb) {
  zKey = SORTED_SET_PREV + zKey;
  this.commConn.ttl(zKey, cb);
};

///////////////////////////////////////////////////////////////////////////////
// 无序集合

// 添加无序集合成员(单个，或多个成员list)
RedisClient.prototype.sAdd = function(sKey, members, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.sadd(sKey, members, cb);
};
// 获取无序几个成员数量
RedisClient.prototype.sCard = function(sKey, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.scard(sKey, cb);
};
// 无序集合1 减去 无序集合2 的结果集
RedisClient.prototype.sDiff = function(sKey1, sKey2, cb) {
  sKey1 = SET_PREV + sKey1;
  sKey2 = SET_PREV + sKey2;
  this.commConn.sdiff(sKey1, sKey2, cb);
};
// 将 无序集合1 减去 无序集合2 的结果存在 dest集合中
RedisClient.prototype.sDiffStore = function(destKey, sKey1, sKey2, cb) {
  destKey = SET_PREV + destKey;
  sKey1 = SET_PREV + sKey1;
  sKey2 = SET_PREV + sKey2;
  this.commConn.sdiffstore(destKey, sKey1, sKey2, cb);
};
// 无序集合1 和 无序集合2 的交集
RedisClient.prototype.sInter = function(sKey1, sKey2, cb) {
  sKey1 = SET_PREV + sKey1;
  sKey2 = SET_PREV + sKey2;
  this.commConn.sinter(sKey1, sKey2, cb);
};
// 将 无序集合1 和 无序集合2 的交集 存到dest集合中
RedisClient.prototype.sInterStore = function(destKey, sKey1, sKey2, cb) {
  destKey = SET_PREV + destKey;
  sKey1 = SET_PREV + sKey1;
  sKey2 = SET_PREV + sKey2;
  this.commConn.sinterstore(destKey, sKey1, sKey2, cb);
};
// 判断一个数据是否是集合的成员
RedisClient.prototype.sIsMember = function(sKey, member, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.sismember(sKey, member, cb);
};
// 返回一个集合的所有成员
RedisClient.prototype.sMembers = function(sKey, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.smembers(sKey, cb);
};
// 将一个集合的成员 移 到另一个集合里
RedisClient.prototype.sMove = function(sKeySrc, sKeyDst, member, cb) {
  sKeySrc = SET_PREV + sKeySrc;
  sKeyDst = SET_PREV + sKeyDst;
  this.commConn.smove(sKeySrc, sKeyDst, cb);
};
// 从集合中随机移除一个成员，并返回该成员
RedisClient.prototype.sPop = function(sKey, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.spop(sKey, cb);
};
// 从集合中移除一个成员或多个成员(列表)
RedisClient.prototype.sRem = function(sKey, members, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.srem(sKey, members, cb);
};
// 从集合随机返回指定个数的成员
RedisClient.prototype.sRandmember = function(sKey, count, cb) {
  sKey = SET_PREV + sKey;
  if (count){
    this.commConn.srandmember(sKey, count, cb);
  }
  else{
    this.commConn.srandmember(sKey, 1, cb);
  }
};
//RedisClient.prototype.sUnion = function(sKeyList, cb) {
//  sKey = SET_PREV + sKey;
//};
//RedisClient.prototype.sUnionStore = function(dest, sKeyList, cb) {
//  sKey = SET_PREV + sKey;
//};
// 过期删除，秒控
RedisClient.prototype.sExpire = function(sKey, seconds, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.expire(sKey, seconds, cb);
};
// 过期删除，时间戳控
RedisClient.prototype.sExpireAt = function(sKey, timestamp, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.expireat(sKey, timestamp, cb);
};
// 将无序集合类型的key设置为永久有效
RedisClient.prototype.sPersist = function(sKey, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.persist(sKey, cb);
};
// 查无序集合 类型的剩余生存时间(秒)
RedisClient.prototype.sTTL = function(sKey, cb) {
  sKey = SET_PREV + sKey;
  this.commConn.ttl(sKey, cb);
};

///////////////////////////////////////////////////////////////////////////////
// 列表
// 返回列表的长度
RedisClient.prototype.lLen = function(lKey, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.llen(lKey, cb);
};
// 向列表左侧(头部)压入一个值
RedisClient.prototype.lLPush = function(lKey, value, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.lpush(lKey, value, cb);
};
// 向列表右侧(尾部)压入一个值
RedisClient.prototype.lRPush = function(lKey, value, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.rpush(lKey, value, cb);
};
// 从列表左侧(头部)删除一个值，并返回该值
RedisClient.prototype.lLPop = function(lKey, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.lpop(lKey, cb);
};
// 从列表右侧(尾部)删除一个值，并返回该值
RedisClient.prototype.lRPop = function(lKey, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.rpop(lKey, cb);
};
// 从列表指定位置处返回该一个值
RedisClient.prototype.lIndex = function(lKey, idx, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.lindex(lKey, idx, cb);
};
// 设置列表指定位置的值
RedisClient.prototype.lSet = function(lKey, idx, value, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.lset(lKey, idx, value, cb);
};
// 删除列表中特殊值, count控制删除次数，正负控制顺序，0位所有
RedisClient.prototype.lLRem = function(lKey, count, value, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.lrem(lKey, count, value, cb);
};
// 从列表中获取指定范围的元素
RedisClient.prototype.lRange = function(lKey, start, stop, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.lrange(lKey, start, stop, cb);
};
// 过期删除，秒控
RedisClient.prototype.lExpire = function(lKey, seconds, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.expire(lKey, seconds, cb);
};
// 过期删除，时间戳控
RedisClient.prototype.lExpireAt = function(lKey, timestamp, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.expireat(lKey, timestamp, cb);
};

// 将列表类型的key设置为永久有效
RedisClient.prototype.lPersist = function(lKey, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.persist(lKey, cb);
};
// 查询列表 类型的剩余生存时间(秒)
RedisClient.prototype.lTTL = function(lKey, cb) {
  lKey = LIST_PREV + lKey;
  this.commConn.ttl(lKey, cb);
};

module.exports = RedisClient;
