/*
 *************************************************************************
 *    File Name:  Application.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Thu 09 Aug 2018 05:56:41 AM EDT
 * 
 *  Description: 主框架类，实例化此类，依次调用 init(); regApi(); run();
 *              example:
 *                  const app = new Application('./app', './config/server.js', './config/log4js.json');
 *                  app.init().regApi().run();
 * 
 ************************************************************************
*/
'use strict';
const fs = require('fs');
const path = require('path');
const misc = require('./utils/misc.js');

let self = null;

const HANDLER_PREFIX = "handler_";
const HANDLER_CS_PREFIX = HANDLER_PREFIX + "cs_";
const HANDLER_NOTIFY_PREFIX = HANDLER_PREFIX + "notify_";

module.exports = class Application {
  constructor(appPath, svrCfg, logCfg) {
    if (self) return self; // 单例模式

    if (path.isAbsolute(appPath)) {
      this.appPath = appPath;
    }
    else {
      this.appPath = path.join(process.cwd(), appPath);
    }
    this.api = path.join(this.appPath, 'API.js');

    if (path.isAbsolute(svrCfg)) {
      this.svrCfg = svrCfg;
    }
    else {
      this.svrCfg = path.join(process.cwd(), svrCfg);
    }

    if (path.isAbsolute(logCfg)) {
      this.logCfg = logCfg;
    }
    else {
      this.logCfg = path.join(process.cwd(), logCfg);
    }

    misc.ASSERT_ACCESS_PATH(this.appPath);
    misc.ASSERT_ACCESS_PATH(this.api);
    misc.ASSERT_ACCESS_PATH(this.svrCfg);
    misc.ASSERT_ACCESS_PATH(this.logCfg);

    this.logger = null;
    this.apiList = null;
    this.svrListeners = {};
    this.cltConnections = {};
    self = this;
    self.logger = require('./utils/logger.js');
    self.logger.create(self.logCfg);

    self.wsHandlers = {};
    self.tcpHandlers = {};
    self.httpHandlers = {};
    global.tmApp = self;
  }

  init() {
    self.svrCfgObj = require(self.svrCfg);
    self._parseSvrCfg();
    self._parseGameCfg(self.gameCfgObj);
    return self;
  }

  regApi() {
    self.apiObj = require(self.api);
    self._checkApi();
    self._updateAPI();
    return self;
  }

  async run() {
    await self._connect2Dependency();
    await self._startListening();
    self._loadHandlers(self.wsHandlers, self.gameCfgObj.ws_handler_dir);
    self._loadHandlers(self.tcpHandlers, self.gameCfgObj.tcp_handler_dir);
    self._loadHandlers(self.httpHandlers, self.gameCfgObj.http_handler_dir);

    await self.apiObj.gameInit(self.svrCfgObj, self.gameCfgObj);

    process.on('SIGINT', function () {
      //if (self.in_exiting){ return };
      const reason = 'GOT SYSTEM SIGINT';
      let waiting = self.svrCfgObj.sig_exit_waiting;
      if (waiting === undefined || isNaN(waiting)) waiting = 1500;
      if (!self.in_exiting) self.logger.warn(`process.on('SIGINT',...) going to exit in ${waiting}ms...`);

      if (typeof self.apiObj.gameExit === 'function') {
        if (!self.in_exiting) {
          self.in_exiting = true;
          self.apiObj.gameExit('SIGINT', reason);
          setTimeout(() => {
            misc.EXIT(1);
          }, waiting);
        }
        else {
          self.logger.warn(`Process exiting in ${waiting}ms, please pay patient...`);
        }
      }
      else {
        self.logger.warn('app必须实现 gameExit接口!');
        misc.EXIT(1);
      }
    });

    process.on('SIGTERM', function () {
      //if (self.in_exiting){ return };
      const reason = 'GOT SYSTEM SIGTERM';
      let waiting = self.svrCfgObj.sig_exit_waiting;
      if (waiting === undefined || isNaN(waiting)) waiting = 1500;
      if (!self.in_exiting) self.logger.warn(`process.on('SIGTERM',...) going to exit in ${waiting}ms...`);

      if (typeof self.apiObj.gameExit === 'function') {
        if (!self.in_exiting) {
          self.in_exiting = true;
          self.apiObj.gameExit('SIGTERM', reason);
          setTimeout(() => {
            misc.EXIT(1);
          }, waiting);
        }
        else {
          self.logger.warn(`Process exiting in ${waiting}ms, please pay patient...`);
        }
      }
      else {
        self.logger.warn('app必须实现 gameExit接口!');
        misc.EXIT(1);
      }
    });


    // 最后启动 全局异常捕获
    process.on('uncaughtException', function (error) {
      self.logger.error(`程序框架捕获异常: ${error}\n${error.stack}`);
    });

    process.on('unhandledRejection', function (err) {
      self.logger.error(`caught unhandledRejection : ${err.stack}`);
    });

    self.logger.info("Running...");
  }


  ///////////////////////// private func ///////////////////
  _parseSvrCfg() {
    // 检测配置，根据配置创建....
    if (path.isAbsolute(self.svrCfgObj.game_config)) {
      self.gameCfg = self.svrCfgObj.game_config;
    }
    else {
      self.gameCfg = path.join(process.cwd(), self.svrCfgObj.game_config);
    }
    misc.ASSERT_ACCESS_PATH(self.gameCfg);
    self.gameCfgObj = require(self.gameCfg);

    if (!Array.isArray(self.svrCfgObj.listen) || self.svrCfgObj.listen.length <= 0) {
      self.logger.error(`作为服务必须监听端口，请检查配置: ${self.svrCfg}`);
      misc.EXIT(1);
    }
    self.svrCfgObj.listen.forEach((L, I) => {
      const tip = JSON.stringify(L);
      if (!L || typeof L !== 'object' || misc.ALLOWED_NET_SCHEMA.indexOf(L.schema) < 0 ||
        !L.host || !L.port) {
        self.logger.error(`${tip} 配置本服监听的参数 schema 缺失或错误, 当前支持的schema: ${misc.ALLOWED_NET_SCHEMA}`);
        misc.EXIT(1);
      }

      if (L.schema.toLowerCase().indexOf('http') < 0 && (!L.hasOwnProperty('max_pkg_byte') || isNaN(L.max_pkg_byte) || L.max_pkg_byte < 4096)) {
        L.max_pkg_byte = 4096;
        self.logger.warn(`${tip} 配置本服监听的参数 max_pkg_byte 缺失或错误, 使用默认值: ${L.max_pkg_byte}`);
      }

      if (L.schema.toLowerCase().indexOf('http') < 0 && (!L.hasOwnProperty('isLE') || typeof L.isLE !== 'boolean')) {
        L.isLE = true;
        self.logger.warn(`${tip} 配置本服监听的参数 isLE 缺失或错误, 使用默认值: ${L.isLE}`);
      }
    });

    self.svrCfgObj.connect.forEach((C, I) => {
      const tip = JSON.stringify(C);
      if (!C || typeof C !== 'object' || misc.ALLOWED_NET_SCHEMA.indexOf(C.schema) < 0 ||
        !C.host || !C.port) {
        self.logger.error(`${tip} 配置连接的参数 schema 缺失或错误, 当前支持的schema: ${misc.ALLOWED_NET_SCHEMA}`);
        misc.EXIT(1);
      }

      if (C.schema.toLowerCase().indexOf('http') < 0 && (!C.hasOwnProperty('max_pkg_byte') || isNaN(C.max_pkg_byte) || C.max_pkg_byte < 4096)) {
        C.max_pkg_byte = 4096;
        self.logger.warn(`${tip} 配置连接的参数 max_pkg_byte 缺失或错误, 使用默认值: ${C.max_pkg_byte}`);
      }

      if (C.schema.toLowerCase().indexOf('http') < 0 && (!C.hasOwnProperty('isLE') || typeof C.isLE !== 'boolean')) {
        C.isLE = true;
        self.logger.warn(`${tip} 配置连接的参数 isLE 缺失或错误, 使用默认值: ${C.isLE}`);
      }
    });
  }
  _parseGameCfg() {
    const obj = self.gameCfgObj;
    let check_failed = false;
    if (!obj.game_id) {
      self.logger.error(`game_id必须配置，请检查配置:${self.gameCfg}`);
      check_failed = true;
    }
    if (typeof obj.server_type !== 'string' || obj.server_type.length <= 0) {
      self.logger.error(`server_type必须配置，请检查配置:${self.gameCfg}`);
      check_failed = true;
    }
    if (!obj.server_id) {
      self.logger.error(`server_id必须配置，请检查配置:${self.gameCfg}`);
      check_failed = true;
    }
    if (!obj.redis || !obj.redis.host || !obj.redis.port || !obj.redis.db) {
      self.logger.error(`redis配置错误，请检查配置:${self.gameCfg}`);
      check_failed = true;
    }

    if (obj.hasOwnProperty('forClient')) {
      let found = false;
      for(let i=0; i < self.svrCfgObj.listen.length; i++){
        let listen = self.svrCfgObj.listen[i];
        if (listen && listen.lid == obj.forClient) {
          found = true;
          obj.forClient = {};
          Object.assign(obj.forClient, listen);
          break;
        }
      }
      if (!found) {
        self.logger.error(`game.js的forClient配置错误，请配置server.js的listen存在的lid`);
        check_failed = true;
      }
    }

    if (obj.hasOwnProperty('forBattle')) {
      let found = false;
      for(let i=0; i < self.svrCfgObj.listen.length; i++){
        let listen = self.svrCfgObj.listen[i];
        if (listen && listen.lid == obj.forBattle) {
          found = true;
          obj.forBattle = {};
          Object.assign(obj.forBattle, listen);
          break;
        }
      }
      if (!found) {
        self.logger.error(`game.js的forBattle配置错误，请配置server.js的listen存在的lid`);
        check_failed = true;
      }
    }

    if (obj.hasOwnProperty('forGateway')) {
      let found = false;
      for(let i=0; i < self.svrCfgObj.listen.length; i++){
        let listen = self.svrCfgObj.listen[i];
        if (listen && listen.lid == obj.forGateway) {
          found = true;
          obj.forGateway = {};
          Object.assign(obj.forGateway, listen);
          break;
        }
      }
      if (!found) {
        self.logger.error(`game.js的forGateway配置错误，请配置server.js的listen存在的lid`);
        check_failed = true;
      }
    }

    if (obj.hasOwnProperty('forOnline')) {
      let found = false;
      for(let i=0; i < self.svrCfgObj.listen.length; i++){
        let listen = self.svrCfgObj.listen[i];
        if (listen && listen.lid == obj.forOnline) {
          found = true;
          obj.forOnline = {};
          Object.assign(obj.forOnline, listen);
          break;
        }
      }
      if (!found) {
        self.logger.error(`game.js的forOnline配置错误，请配置server.js的listen存在的lid`);
        check_failed = true;
      }
    }

    if (obj.hasOwnProperty('forPay')) {
      let found = false;
      for(let i=0; i < self.svrCfgObj.listen.length; i++){
        let listen = self.svrCfgObj.listen[i];
        if (listen && listen.lid == obj.forPay) {
          found = true;
          obj.forPay = {};
          Object.assign(obj.forPay, listen);
          break;
        }
      }
      if (!found) {
        self.logger.error(`game.js的forPay配置错误，请配置server.js的listen存在的lid`);
        check_failed = true;
      }
    }

    // 如果配置了策划表，则检测合法性
    if (typeof obj.json_path === 'string' && Array.isArray(obj.json_list) &&
      obj.json_path.length > 0 && obj.json_list.length > 0) {
      if (path.isAbsolute(obj.json_path)) {
        self.json_path = obj.json_path;
      }
      else {
        self.json_path = path.join(process.cwd(), obj.json_path);
      }
      misc.ASSERT_ACCESS_PATH(self.json_path);
      self.json_objs = {};
      obj.json_list.forEach((json, idx) => {
        if (json.indexOf(".json") !== json.length - 5) {
          self.logger.error(`配置的 [${json}] 文件扩展名错误,请检查: config.json_list`);
          check_failed = true;
        }
        const f = path.join(self.json_path, json);
        misc.ASSERT_ACCESS_PATH(f);
        self.json_objs[json.toLowerCase()] = require(f);
      });
    }

    if (typeof obj.ws_handler_dir === 'string' && obj.ws_handler_dir.length > 0) {
      let ws_hd = "";
      if (path.isAbsolute(obj.ws_handler_dir)) {
        ws_hd = obj.ws_handler_dir;
      }
      else {
        ws_hd = path.join(process.cwd(), obj.ws_handler_dir);
      }
      misc.ASSERT_ACCESS_PATH(ws_hd);
      obj.ws_handler_dir = ws_hd;
    }

    if (typeof obj.tcp_handler_dir === 'string' && obj.tcp_handler_dir.length > 0) {
      let tcp_hd = "";
      if (path.isAbsolute(obj.tcp_handler_dir)) {
        tcp_hd = obj.tcp_handler_dir;
      }
      else {
        tcp_hd = path.join(process.cwd(), obj.tcp_handler_dir);
      }
      misc.ASSERT_ACCESS_PATH(tcp_hd);
      obj.tcp_handler_dir = tcp_hd;
    }

    if (typeof obj.http_handler_dir === 'string' && obj.http_handler_dir.length > 0) {
      let http_hd = "";
      if (path.isAbsolute(obj.http_handler_dir)) {
        http_hd = obj.http_handler_dir;
      }
      else {
        http_hd = path.join(process.cwd(), obj.http_handler_dir);
      }
      misc.ASSERT_ACCESS_PATH(http_hd);
      obj.http_handler_dir = http_hd;
    }

    if (check_failed) {
      misc.EXIT(1);
    }
  }

  _checkApi() {
    // TODO: 此处扩展检查框架要求app实现的API
    self.apiList = ['gameInit',
      'processClientMessage',  //框架处理到 handler, 在找不具体的业务handler时调用
      'processRedisCenterCtrlMessage',
      'processRedisCenterNewServerMessage',
      //'processRedisCenterChatMessage',  // 聊天API可选
      'gameExit'];
    self.apiList.forEach((api, idx) => {
      if (!self.apiObj || typeof self.apiObj[api] !== 'function') {
        self.logger.error(`${self.api} 中未实现框架接口: [${api}]`);
        misc.EXIT(1);
      }
    });
  }

  _loadHandlers(handlersManager, dir) {
    if (typeof handlersManager !== 'object' || !handlersManager) {
      return;
    }
    if (typeof dir !== 'string' || dir.length === 0) {
      return;
    }

    let self = this;
    const p = fs.readdirSync(dir);
    p.forEach((ele, index) => {
      const pfile = path.join(dir, ele);
      var info = fs.statSync(pfile);
      if (info.isFile()) {
        if (ele.indexOf(".js") === ele.length - 3 &&
          (ele.indexOf(HANDLER_CS_PREFIX) === 0 || ele.indexOf(HANDLER_NOTIFY_PREFIX) === 0)) {
          const handler = require(pfile);
          if (typeof handler === 'function') {
            self.logger.info(`Loaded wsHandlers [${ele}] from: ${pfile}`);
            handlersManager[ele] = handler;
          }
          else {
            self.logger.warn(`It is not ws handler in wsHandlers js file: ${pfile}`);
          }
        }
        else {
          self.logger.warn(`It is not a js file in wsHandlers dir: ${pfile}`);
        }
      } else if (info.isDirectory()) {
        self.logger.debug("dir: ", pfile);
      }
    });

    if (Object.keys(handlersManager).length === 0) {
      self.logger.warn(`Loaded handler from ${dir}, but no right handler in it.`);
    }
  }

  _updateAPI() {
    self.apiObj.getJsonCfg = function (json_file) {
      if (self.json_objs[json_file.toLowerCase()]) {
        return self.json_objs[json_file.toLowerCase()];
      }
      else {
        return null;
      }
    };

    self.apiObj.sendMessage = function (net, msg, option) {
      self.logger.trace(`${net}, ${msg}`);
      if (net && net.schema && net.tmSendData) {
        net.tmSendData(msg, option);
      }
      else {
        self.logger.warn('self.apiObj.sendMessage parameter net error.');
      }
    };

    self.apiObj.closeNetPeer = function (net, reason) {
      self.logger.trace(`${net}, ${reason}`);
      if (typeof net.tmClose === 'function') net.tmClose();
    };

    // TODO: 此处扩展框架暴露给app使用的API
  }

  async  _connect2Dependency() {
    //所有服依赖中心服，当前设计去掉 switch，直接以 redis为中心，因必依赖redis
    self._startRedisCenter();
    await self._startConnect();
  }

  _dispatchMessage(schema, net, msg) {
    let self = this;
    if (msg && msg.hd && typeof msg.hd.cmd === 'string' && (msg.hd.cmd.indexOf('notify_') === 0 ||
      msg.hd.cmd.indexOf('sc_') === 0 || msg.hd.cmd.indexOf('cs_') === 0)) {
      const cmd = msg.hd.cmd;
      const hname = HANDLER_PREFIX + cmd + ".js";
      self.logger.debug(`_dispatchMessage [${net.schema}] msg for handler [${hname}].`);
      if (['ws', 'wss'].indexOf(net.schema) >= 0) {
        if (typeof self.wsHandlers[hname] === 'function') {
          self.wsHandlers[hname](net, msg);
        }
        else {
          self.logger.warn(`No special handler for ws proto ${cmd}, call common process in API.js`);
          self.apiObj.processClientMessage(net, msg);
        }
      }
      else if (['http', 'https'].indexOf(net.schema) >= 0) {
        if (typeof self.httpHandlers[hname] === 'function') {
          self.httpHandlers[hname](net, msg);
        }
        else {
          self.logger.warn(`No special handler for http proto ${cmd}, call common process in API.js`);
          self.apiObj.processClientMessage(net, msg);
        }
      }
      else if (['tcp', 'tls'].indexOf(net.schema) >= 0) {
        if (typeof self.tcpHandlers[hname] === 'function') {
          self.tcpHandlers[hname](net, msg);
        }
        else {
          self.logger.warn(`No special handler for tcp proto ${cmd}, call common process in API.js`);
          self.apiObj.processClientMessage(net, msg);
        }
      }
      else {
        self.logger.error(`message net obj schema not support: ${net.schema}`);
      }
    }
    else {
      //self.logger.debug(`Schema ${net.schema} message proto format is not like: {hd:{cmd:xxxx,...},bd:{...}}, would call common process in API.js.`);
      self.apiObj.processClientMessage(net, msg);
    }
  }

  async _startListening() {
    const ListenNetClass = require('./net/ListenNetClass.js');
    self.svrListeners = {};
    function iterListen(idx) {
      let netOpt = null;
      if (idx < self.svrCfgObj.listen.length) {
        netOpt = {};
        Object.assign(netOpt, self.svrCfgObj.listen[idx]);
        let netSvr = null;
        if (netOpt && ['http', 'https'].indexOf(netOpt.schema)>=0 && self.apiObj.express) {
          netSvr = new ListenNetClass(netOpt, self.apiObj.express);
        }
        else{
          netSvr = new ListenNetClass(netOpt, (net, msg) => {
            if (net && net.side && net.schema && typeof net.tmSendData === 'function') {
              self._dispatchMessage(net.schema, net, msg);
            }
            else {
              self.logger.error("message net obj error from clienf of server:", JSON.stringify(netOpt));
            }
          });
        }

        return netSvr.tmStart().then(async p => {
          await iterListen(++idx);
          self.svrListeners[netSvr.id] = netSvr;
        }).catch(e => {
          self.logger.error(`create listen on failed: ${e}`);
          misc.EXIT(1);
        });
      }
    }
    await iterListen(0);
  }

  _startRedisCenter() {
    const GameRedis = require('./redis/GameRedis.js');
    self.redisCenter = new GameRedis(self.gameCfgObj.redis, self.gameCfgObj);
    // 暴露封装的接口以便API.js直接使用
    for (let attr in self.redisCenter) {
      if (self.apiObj[attr]) {
        self.logger.error(`redisCenter function ${attr} has been defined in app/API.js, could not set it`);
        continue;
      }

      if (typeof self.redisCenter[attr] === 'function') {
        self.apiObj[attr] = self.redisCenter[attr];
        self.apiObj[attr].bind(self.redisCenter);
      }
      else {
        self.apiObj[attr] = self.redisCenter[attr];
      }
    }

    // 框架自动注册的channel
    if (typeof self.apiObj.processRedisCenterChatMessage === 'function'){
      self.redisCenter.subscribeForChat(self.apiObj.processRedisCenterChatMessage);
    }
    self.redisCenter.subscribeForCtrlCmd(self.apiObj.processRedisCenterCtrlMessage);
    self.redisCenter.subscribeForNewServer(self.apiObj.processRedisCenterNewServerMessage);

    // 暴露可直接操作的对象接口
    self.apiObj.redisCenter = self.redisCenter;
  }

  async _startConnect() {
    const ConnectNetClass = require('./net/ConnectNetClass.js');
    self.cltConnections = {};
    function iterConnect(idx) {
      let netOpt = null;
      if (idx < self.svrCfgObj.connect.length) {
        netOpt = {};
        Object.assign(netOpt, self.svrCfgObj.connect[idx]);
        const netClt = new ConnectNetClass(netOpt, (net, msg) => {
          if (net && net.side && net.schema && typeof net.tmSendData === 'function') {
            self._dispatchMessage(net.schema, net, msg);
          }
          else {
            self.logger.error("message net obj error from client of server:", JSON.stringify(netOpt));
          }
        });
        self.propList = ['side', 'schema'];
        self.propList.forEach((prop, idx) => {
          if (typeof netClt[prop] !== 'string' || netClt[prop].length === 0) {
            const s = JSON.stringify(netOpt);
            self.logger.error(`${s} 网络类未实现属性: [${prop}]`);
            misc.EXIT(1);
          }
        });

        return netClt.tmConnect().then(async p => {
          await iterConnect(++idx);
          self.cltConnections[netClt.id] = netClt;
        }).catch(e => {
          self.logger.error(`create connect on failed: ${e}`);
          misc.EXIT(1);
        });
      }
    }
    await iterConnect(0);
  }
};
