/*
 *************************************************************************
 *    File Name:  User.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Tue 21 Aug 2018 03:58:39 AM EDT
 * 
 *  Description: 框架提供模型定义，规范几个核心接口；
 *               业务实现应从本模型继承，再根据业务具体需要实现、覆盖本模型 
 * 
 ************************************************************************
*/
'use strict';

// 特殊指定跳过不存储的字段
const ESCAPE_SAVE_ATTR = [];

// 对于值是下面类型从才存储到redis
const SAVE_DATA_TYPE = ['number', 'boolean', 'string', 'undefined', 'null', 'object'];

class User {
  constructor(id, account, name, nick) {
    this.coreJson = {
      id: id || -1,  // 测试框架用 -1； 最终默认用 0 --- 用于相关关节调节检测
      account: (account || 'no account') + '',
      name: (name || 'no name') + '',
      nick: (nick || 'no nick') + '',
      createTime: 0, //Math.floor(Date.now()/1000);
      lastLoginTime: 0, //Math.floor(Date.now()/1000);
      lastLogoutTime: 0,
    };
    // 以上定义的是玩家核心信息

    // this.headImage = 0;   //头像
    // this.heartBeatTime = Math.floor(Date.now() / 1000);
    // this.title = '';  //称号
    // this.familyName = '';  //家族名字
    // this.achievementCnt = 0;   //成就点数
    // this.clothesCnt = 0;   //服装数目
    // this.lastLogoutTime = 0;   //最后一次下线时间
    // this.sex = 0;   //性别
    // this.vipLevel = 0;   //Vip等级

    // this.headImage = 0; //头像
    // this.headFrame = 0;
    // this.userid = 0;
    // this.nick = "";
    // this.sex = 0;
    // this.regtime = 0;
    // this.exp = 0;
    // this.vipType = 0;
    // this.vipLevel = 0;
    // this.constellation = 0;

    // this.family = "";
    // this.curClothes = [];
    // this.suitCnt = 0;
    // this.achievement = 0;
    // this.title = 0;
  }
  // 以下是核心信息的 get,set处理
  get id() { return this.coreJson.id; }
  set id(value) { this.coreJson.id = value; }

  get account() { return this.coreJson.account; }
  set account(value) { this.coreJson.account = value; }

  get name() { return this.coreJson.name; }
  set name(value) { this.coreJson.name = value; }

  get nick() { return this.coreJson.nick; }
  set nick(value) { this.coreJson.nick = value; }

  get createTime() { return this.coreJson.createTime; }
  set createTime(value) { this.coreJson.createTime = value; }

  get lastLoginTime() { return this.coreJson.lastLoginTime; }
  set lastLoginTime(value) { this.coreJson.lastLoginTime = value; }

  get lastLogoutTime() { return this.coreJson.lastLogoutTime; }
  set lastLogoutTime(value) { this.coreJson.lastLogoutTime = value; }

  // 以上是核心信息的 get,set处理

  toString() {
    return `[User id:${this.id}, account:${this.account}, name:${this.name}, nick:${this.nick}, createTime:${this.createTime}]`;
  }

  // 玩家核心信息转换成json格式; 对应于redis存储中的 H::userCore 数据项目
  coreToJSON() {
    return this.coreJson;
  }
  initFromCoreJson(json) {
    for (let k in json) {
      if (this.coreJson.hasOwnProperty(k)) {
        this.coreJson[k] = json[k];
      }
    }
  }

  // 玩家详细信息转换成json格式; 对应于redis存储中的 H::userDetal_xx 数据项目
  detailToJSON() {
    let json = {};
    let keys = Object.keys(this);
    //for(let i=0; i < keys.length; i++) {
    for (let key in this) {
      if (key === 'coreJson') continue;
      if (ESCAPE_SAVE_ATTR.indexOf(key) >= 0) continue;
      let value = this[key];
      if (SAVE_DATA_TYPE.indexOf(typeof value) < 0) continue;
      json[key] = value;
    }
    Object.assign(json, this.coreJson);
    return json;
  }
  initFromDetailJson(json) {
    for (let k in json) {
      if (this.hasOwnProperty(k)) {
        this[k] = json[k];
      }
    }
  }

  initFromUserDetailJson(json) {
    for (let k in json) {
      this[k] = json[k];
    }
  }
}


module.exports = User;
