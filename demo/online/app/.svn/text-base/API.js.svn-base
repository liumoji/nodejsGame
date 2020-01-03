/*
 *************************************************************************
 *    File Name:  Api.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Thu 09 Aug 2018 07:07:40 AM EDT
 * 
 *  Description: 本文件是使用框架的必须入口; 是业务和框架交互的接口
 *              框架提供的接口，包括三部分
 *              1，框架要求App实现的接口，以供框架调用，驱动App来运行逻辑
 *              2，框架提供给App访问接口，以供业务调用，访问框架基础功能
 *              3，接口中的net对象接口，接口参见 ../framework/net/NetApi.js
 *              4，和redis中心系统通信的对象redisCenter，接口参见 ../framework/redis/GameRedis.js
 * 
 ************************************************************************
*/
'use strict';
const logger = require('../framework/utils/logger.js');
// WARN: 为避免循环引用，此接口文件引用其它项目文件，均放在函数作用域内
//       以防项目文件引用此文件造成循环引用

const API = {};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// *** 1 *** 下面几个接口是游戏需要实现，框架会调用

// 加载游戏配置
// 初始化如果有同步依赖，实现此接口时自己保障
API.gameInit = (svrCfgObj, gameCfgObj) => {
  const initFunc = require('./gameInit.js');
  initFunc(svrCfgObj, gameCfgObj);
};

// 处理网络消息. 如果游戏配置配置联动 handler 目录，则框架优先使用handler处理，否则调用此接口
// schema: 连接类型, NetApi对象, 支持 http, ws, tcp, TODO: 支持 https, wss
// net: 网络连接对象
// msg: json格式的数据包, 对端一次发送的业务协议数据包, 
//      App根据自己的协议格式进行解析json字段
API.processClientMessage = function(net, msg) {
  if (net && net.side && net.schema && typeof net.tmSendData === 'function'){
    const netmsg = require('./netMsg.js');
    netmsg.processMsg(net, msg);
  }
  else{
    let strNet = net;
    logger.error(`API.processClientMessage(...) parameter net error: ${strNet}`);
  }
};

// 框架收到redis发布的控制消息，调用此接口通知业务
// 参数式例:
// cInfo: {
//   cmd: 'ws',
//   time: now timestamp,
//   params: '10.1.1.248',
// }
API.processRedisCenterCtrlMessage = function(channel, msg) {
  const redisMsg = require('./redisMsg.js');
  redisMsg.doControl(channel, msg);
};

// 框架收到redis发布的新服消息，调用此接口通知业务
// 参数式例:
// sInfo: {
//   schema: 'ws',
//   host: '10.1.1.248',
//   port: 15505,
//   type: 'online',
//   usage: 'forClient',
// }
API.processRedisCenterNewServerMessage = function(channel, msg) {
  const redisMsg = require('./redisMsg.js');
  redisMsg.newServer(channel, msg);
};

// 框架收到redis发布的跨服聊天消息，调用此接口通知业务
// 参数式例:
// mInfo: {
//   type: 'global',
//   from: 10079,
//   to: 19999,
//   content: 'hello world!',
// }
API.processRedisCenterChatMessage = function(channel, msg) {
  const redisMsg = require('./redisMsg.js');
  redisMsg.notifyChatting(channel, msg);
};

// 游戏退出，清理资源, (框架在收到停服指令或检测到异常时调用)
API.gameExit = function(code, desc) {
  logger.trace(`API.gameExit(${code}, ${desc})`);
  const exitFunc = require('./gameExit.js');
  exitFunc(code, desc);
};

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
// *** 2 *** 下面几个接口是框架提供给游戏使用的, 不要覆盖

// 发送网络消息
// function API.sendMessage(net, msg);

// 关闭对端链接
// function API.closeNetPeer(net, reason);
//};

// 获取json配置文件的内容对象
// function API.getJsonCfg(json_file_name);

// 通过 rediscenter 发布(自己作为)新服的消息
// function API.publishNewServer(svrInfo, (error, result)=>{});

// 通过 rediscenter 发布系统控制指令
// function API.publishCtrlCmd(ctrlInfo, (error, result)=>{});

// 通过 rediscenter 发布跨服聊天信息
// function API.publishChat(chatMsg, (error, result)=>{});

// 通过 rediscenter 订阅自定义channel
// function API.subscribeChannelMessage(channel, (channel, message)=>{});
//
// 通过 rediscenter 发布自定义channel信息
// function API.publishChannelMessage(charmsg, (error, result)=>{});

// object API.redisCenter 类对象 ../framework/redis/GameRedis.js, 可直接操作redis接口

module.exports = API;
