#!/usr/bin/env node
/*
 *************************************************************************
 *    File Name:  app.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Thu 09 Aug 2018 05:53:18 AM EDT
 * 
 *  Description: 服务程序启动入口代码
 * 
 ************************************************************************
*/
'use strict';
const Application = require('./framework/Application.js');

// 业务模块在哪, 支持绝对路径, 如果相对路径则以程序执行前目录为参考
const appDir = "app";

// log4js配置在哪, 支持绝对路径, 如果相对路径则以程序执行前目录为参考
const logCfg = "config/log4js.json";

// 配置文件在哪, 支持绝对路径, 如果相对路径则以程序执行前目录为参考
const svrCfg = "config/server.js";

// 创建实例...
const app = new Application(appDir, svrCfg, logCfg);
app.init().regApi().run();
