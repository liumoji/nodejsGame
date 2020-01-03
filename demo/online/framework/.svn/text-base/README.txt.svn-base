# 用法说明
## 1, 将本目录嵌入到服务模块下(推荐使用 svn external 方式)

## 2, 创建业务代码目录，服配置文件，日志配置文件, app.js文件

## 3, app.js 文件中引入 Application, 创建实例，将2中的数据当参数传入

## 4, 调用3中创建的实例:，初始化，注册API，运行


### app.js 代码例子:

'use strict';
const Application = require('./framework/Application.js');

// 业务模块在哪, 支持绝对路径, 如果相对路径则以程序当前运行目录为参考
const appDir = "app";

// log4js配置在哪, 支持绝对路径, 如果相对路径则以程序当前运行目录为参考
const logCfg = "config/log4js.json";

// 配置文件在哪, 支持绝对路径, 如果相对路径则以程序当前运行目录为参考
const svrCfg = "config/server.js";

const app = new Application(appDir, svrCfg, logCfg);
app.init().regApi().run();
