'use strict';
// 框架使用的通用服配置
const config = {
  //必须配置，支持绝对路径，如果写相对路径，则是基于程序运行目录
  game_config: './config/game.js',
  sig_exit_waiting: 1000,  // 进程收到退出信号时，框架调用 gameExit 接口后等待毫秒数 - 给业务代码时间保存数据，

  // 必须配置, 本服监听端口, 必须字段：schema, host, port; 
  // 可选配置 max_pkg_size 允许的单个最大数据包-字节数, 缺失则默认4096; http[s] 无须此参数
  // 可选配置 isLE 只能为true或false, 指明包长度整数的字节序, 缺失则默认 为 true, http[s] 无须此参数
  listen: [
    //{schema: "http",  host:"10.1.1.248", port: 2000},
    {lid: 1, schema: "ws",    host:"0.0.0.0", port: 2003, max_pkg_byte: 1024 * 8, isLE: true},
    //{schema: "tcp",   host:"10.1.1.248", port: 2002, max_pkg_byte: 1024 * 8, isLE: true},
  ],

  // 可选配置, 本服链接的它服, 必须字段：schema, host, port
  // 可选配置 max_pkg_size 允许的单个最大数据包-字节数, 缺失则默认4096; http[s] 无须次参数
  // 可选配置 isLE 只能为true或false, 指明包长度整数的字节序, 缺失则默认 为 true, http[s] 无须次参数
  connect: [
    //{schema: "http",  host:"10.1.1.43", port: 2000, max_pkg_byte: 1024 * 8, isLE: true},
    //{schema: "ws",    host:"10.1.1.43", port: 2001, max_pkg_byte: 1024 * 8, isLE: true},
    //{schema: "tcp",   host:"10.1.1.43", port: 2002, max_pkg_byte: 1024 * 8, isLE: true},
  ],
};

module.exports = config;
