'use strict';
// 主要由业务模块使用的配置
// 框架会检测几个必须配置项: game_id, server_id, redis
const config = {};

// 此配置必须
config.game_id  = 10000;

// 此配置必须
config.server_type= 'online'; // 服类型, online 或 pay, account等
config.server_id= 55;         // 服id

// 协议处理器路径
config.ws_handler_dir = './app/wsHandlers/';    // websocket协议处理器, 绝对路径，或 路径相对于程序运行目录, 空则忽略
config.tcp_handler_dir = '';                    // ./app/tcpHandlers/';   // 如果协议格式、处理逻辑一样，则可以配置成一样的, 空则忽略
config.http_handler_dir = '';                   // ./app/httpHandlers/';  // 如果协议格式、处理逻辑一样，则可以配置成一样的, 空则忽略

// 此配置必须
config.redis = {
  host: '10.1.1.248',
  port: 6379,
  db: 14,       // 10.1.1.248 开发机器配置最大值 16, so...
  user: 'xyxmgr',
  passwd: 'xyx@123PWD',
  socket_keepalive: true,
  // 下面三项是老配置格式，用于控制自动重连；框架代码会自动转换成新的 retry_strategy 配置方式
  retry_max_delay: 6000,         // 自动重连间隔时间的最大值；
  connect_timeout: 3600000 * 12, // 断线后在 12 个小时内会不断自动重连
  max_attempts: 0,               // 最多重连次数，1:不重连， 0:无限次, 其它...
};


// 指明本服监听端口的业务用途,会写入redis,其它服读取到根据需要连接相应业务服务端口
// 注意要在 server.js 中已经 listen
// 客户端会拉取所有服的 forClient 作为服列表
config.forClient = 1;

config.mysql = {
  host: '127.0.0.1',
  port: 3306,
  user: 'xyx',
  passwd: 'xyx@123PWD',
  db: 'DB_XYX',
  charset: 'utf8',
};

// 此配置onine必须，gateway不用
// 如果配置了，则框架会检测合法性
// 策划案配置目录,支持绝对路径, 如果写相对路径，则是基于程序运行目录
config.json_path = './config/json/';
config.json_list = [ // 策划案配置列表, 在上面路径下
  'item.json',
  'pet.json',
];

module.exports = config;
