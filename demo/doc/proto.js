/*
1, 网络通信协议格式定义：
  协议格式: [4字节小端,Uint32，指明本条数据总长度,包含二进制头的4+1字节][1字节,Uint8,指明后面字节流是否压缩][json协议内容的字节流]
  具体例子: [61][0][{"hd":{"cmd":1,"ret":0}, "bd":{"name":"SSO", "info":{}}}]

2, 业务协议内容直接使用json格式， 一个完整业务协议包:
  {
    hd: xyx_header;	// 见下面定义
    bd: any; 		// 见下面 cs_xxx/cs_xxx 等内容
  }
  
3, 具体每种协议使用 js 的 json 对象定义:
  json 里的key为协议字段名；
  json 里的value类型作为协议要求的类型, 0 表示number, "" 表示string, undefined 表示any;
           协议里已经定义的对象，嵌入其它协议时使用协议的字符串名表示，如:user_rank

4, 使用工具将本协议内容转换为前端使用的 .d.ts 接口文件供前端使用；

5，基于本js文件实现检查网络收发数据是否符合协议格式要求；可以作为插件形式嵌入引用程序框架
   
*/

const Proto = {};
module.exports = Proto;


/////////////////////////////////////////////////////// 协议头 hd 格式:
Proto.xyx_header = {
  cmd: "",	// 直接使用下面 cs_xxx/cs_xxx 协议名
  seq: 0,
  ret: undefined,
  uid: 0,
};

/////////////////////////////////////////////////////// 服务端返回hd中ret不为0时，返回的 bd
Proto.sc_error = {
  error_code: 0,
  error_desc: "",
  errro_param: undefined,
};

/////////////////////////////////////////////////////// 协议体 bd 格式, 服务端返回hd.ret为零时，bd为相应的 sc_xxx:

Proto.cs_login = {
  tad: undefined,
  keycode: "",
  nick: "",
  pwd: "",
};

Proto.sc_login = {
  token: "",
  ts: 0,
};

//玩家排名信息
Proto.user_rank = {
  uid: 0,
  nick: "",
  head: "",
  score: 0,
};

Proto.cs_get_rank_list = {
  type: 0,//排行类型
  start_page: 0,//开始页码
  num: 0,//每页数量
};

Proto.sc_get_rank_list = {
  start_page: 0,
  type: 0,
  rank_list: ['user_rank'],
};
 
