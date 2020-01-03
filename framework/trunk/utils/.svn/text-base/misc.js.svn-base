/*
 *************************************************************************
 *    File Name:  misc.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Sun 19 Aug 2018 11:29:31 PM EDT
 * 
 *  Description: 各种不好归类的功能函数封装
 * 
 ************************************************************************
*/
'use strict';
const fs = require('fs');
const misc = {};

misc.ALLOWED_HTTP_METHODS = ['post', 'get', ];   // 先期实现post, get方法
misc.ALLOWED_NET_SCHEMA = ['http', 'ws', 'tcp', ];   // 先期实现的网络协议

// 下面大小均是字节单位
misc.NET_RCV_BUFFER_LEN     = 1024 * 128;       	// 每个接收缓冲区初始化长度
misc.NET_RCV_BUFFER_LEN_MAX = 1024 * 1024 * 64; 	// 每个接收缓冲区最大长度
// 注意下面消息长度的大小 不能一个就撑爆上面的最大缓冲区...
misc.MAX_MSG_LEN = 1024 * 8; // 允许对端发送的最大包长(字节单位)
misc.MAX_MSG_CNT = 4096;     // 允许缓冲区里最多容纳的消息个数

misc.stringify = (obj)=>{
  let ret = {ok: false, str:""};
  if (typeof obj === 'string'){
    ret.ok = true;
    ret.str = obj;
  }
  else{
    try{
      ret.str = JSON.stringify(obj);
      ret.ok = true;
    }
    catch(e){
      ret.ok = false;
      ret.str = JSON.stringify(e);
    }
  }
  return ret;
};

misc.parse = (str)=>{
  let ret = {ok: false, obj:undefined};
  if (typeof str === 'string'){
    try{
      ret.obj = JSON.parse(str);
      ret.ok = true;
    }
    catch(e){
      ret.ok = false;
      ret.obj = JSON.stringify(e);
    }
  }
  else if (typeof str === 'object'){
      ret.ok = true;
      ret.obj = str;
  }
  else{
    ret.ok = false;
    ret.obj = "parameter error, it is not a string or obj.";
  }
  return ret;
};

// 调用会显示退出程序进程的，函数名大写.
misc.EXIT = (code)=>{
  process.nextTick(()=>{
    process.exit(code);
  });
};

misc.ASSERT_ACCESS_PATH = (path)=>{
  let self = this;
	try{
		fs.accessSync(path, fs.R_OK);
	}
	catch(error){
    if (self && self.logger && typeof self.logger.error === 'function') {
		  self.logger.error(`访问 [${path}] 失败, ${error}\n${error.stack}`);
    }
    else{
		  console.error(`访问 [${path}] 失败, ${error}\n${error.stack}`);
    }
		misc.EXIT(1);
	}
}

/**
 * @function 转换callback为Promise, 无 reject, 均为resolve
 * @param {Function} f
 * @param {Object} ctx
 */
misc.callback2Promise = function (f, ctx) {
  ctx = ctx || this;
  return function () {
    let fArgs       = Array.prototype.slice.call(arguments);
    let paramLength = f.length;
    let args        = [];

    for (let i = 0; i < paramLength - 1; i++) {
      if (i < fArgs.length) {
          args.push(fArgs[i])
      } else {
          args.push(undefined);
      }
    }

    return new Promise((resolve, reject) => {
      args.push(function (err, result) {
        if (err) {
          resolve({error: err, data: result});
        }
        else {
          let callBackArgs = Array.prototype.slice.call(arguments);
          let callBackArgsLength = callBackArgs.length;
          if (callBackArgsLength > 2) {
            callBackArgs.shift();
            result = callBackArgs;
          }
          resolve({error: null, data:result});
        }
      });

      f.apply(ctx, args);
    });
  }
};


module.exports = misc;
