/*
 *************************************************************************
 *    File Name:  MysqlClient.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: 2019年09月17日 星期二 11时42分02秒
 * 
 *  Description: ...
 * 
 ************************************************************************
*/
'use strict';

const Mysql = require('mysql');
const logger = require('../utils/logger.js');

function findNumberInRangeList(num, rangeList, assert) {
  if (isNaN(num) || !Array.isArray(rangeList)) {
    logger.error(`findNumberInRangeList parameter error. not number or not list.`);
    if (assert){
      process.exit(1);
    }
    else{
      return null;
    }
  }
  num = Number(num);

  for(let part of rangeList) {
    if (!Array.isArray(part) || part.length !== 2 || isNaN(part[0]) || isNaN(part[1])){
      logger.error(`findNumberInRangeList parameter error. not number or not list.`);
      if (assert){
        process.exit(1);
      }
      else{
        return null;
      }
    }

    let start = Number(part[0]);
    let end =  Number(part[1]);
    if (start < end) {
      const tmp = start;
      start = end;
      end = tmp;
    }

    if ( start <= num && num <= start ){
      return [start, end];
    }
  }

  return null;
}

class MysqlClient {
  constructor(mysqlCfg) {
    logger.trace('Try init MySQL DB config...');
    this.mysqlCfg = mysqlCfg;
    this.mysqlCfg.db_split_cnt = Number(mysqlCfg.db_split_cnt || 100);
    if ([0, 1, 10, 100, 1000].indexOf(this.mysqlCfg.db_split_cnt) < 0){
      logger.error(`The mysql config db_split_cnt error:[${this.mysqlCfg.db_split_cnt}], only could by 0, 1, 10, 100 or 1000.`);
      process.exit(1);
    }

    this.boundList = [];
    this.poolCluster = Mysql.createPoolCluster(mysqlCfg.clusterOptions);

    let conf, name, part;
    for (let i = 0; i < this.mysqlCfg.options.length; ++i) {
      conf = this.mysqlCfg.options[i];
      name = conf.part;
      part = name.split('-');
      let start, end, idx;
      if (part.length === 2 && !isNaN(part[0]) && !isNaN(part[1])){
        start = Number(part[0]);
        end = Number(part[1]);
        if (start > end) {
          const tmp = start;
          start = end;
          end = tmp;
        }
      }
      else if (part.length === 1){
        if (isNaN(part[0])){
          part[0] = 0;
        }
        start = Number(part[0]);
        end = Number(part[0]);
      }
      else{
        logger.error(`Mysql db config part error: [${name}].`);
        process.exit(1);
      }

      if (end >= this.mysqlCfg.db_split_cnt){
        logger.error(`The options part [${name}] error, bigger than split count.`);
        process.exit();
      }

      if (findNumberInRangeList(start, this.boundList, true)){
        logger.error(`The options part [${name}] start value intersected with other.`);
        process.exit();
      }

      if (findNumberInRangeList(end, this.boundList, true)){
        logger.error(`The options part [${name}] end value intersected with other.`);
        process.exit();
      }

      idx = `${start}-${end}`;
      this.boundList.push([start, end]);
      this.poolCluster.add(idx, conf);
    }
    this._tryConnect();
  }
}

MysqlClient.prototype._tryConnect = function () {
  const connectedCallback = (err, connection)=> {
    let info = '';
    if (connection && connection.config) {
      info = `${connection.config.user}@${connection.config.host}:${connection.config.port}`;
    }

    if (err){
      logger.error(`MysqlClient._tryConnect db [${info}] error: ${err.stack}`);
      process.exit(1);
    }
    else{
      //console.log(connection.config);
      logger.info(`Has connected to MySQL DB: ${info} OK.`);
      connection.release();
    }
  };

  for(let part of this.boundList){
    const connName = `${part[0]}-${part[1]}`;
    logger.trace(`MysqlClient._tryConnect to ${connName}`);
    this.poolCluster.getConnection(connName, connectedCallback);
  }
};

MysqlClient.prototype._getConnName = function (id) {
  if (this.mysqlCfg.db_split_cnt <= 1) {
    return '0-0';
  }

  const dbNo = Number(id) % this.mysqlCfg.db_split_cnt;
  const len = this.boundList.length;
  for (let i = 0; i < len; ++i) {
    const part = this.boundList[i];
    if (Array.isArray(part) && part.length===2 && part[0]<=dbNo && dbNo<=part[1]){
      return `${part[0]}-${part[1]}`;
    }
  }
  return null;
};

MysqlClient.prototype._querySql = function (idx, sql, callback) {
  let connName = this._getConnName(idx);
  if (!connName){
    const desc = `MysqlClient._querySql _getConnName failed for idx ${idx} sql: ${sql}`;
    logger.error(desc);
    callback('error', desc);
    return;
  }

  this.poolCluster.getConnection(connName, (err, connection) => {
    if (err) {
      const desc = `_querySql get db ${connName} connection for idx ${idx} error: ${err}`;
      logger.error(desc);
      if (connection && connection.release) connection.release();

      callback(err, desc);
    } else {
      connection.query(sql, (err, rows, fields) => {
        connection.release();
        if (err) {
          const desc = `_querySql ERROR: ${sql} with db connection: ${connection.threadId}`;
          logger.error(desc);
          callback(err, desc);
        } else {
          logger.trace(`_querySql OK: ${sql} with db connection: ${connection.threadId}`);
          callback(null, rows, fields);
        }
      });
    }
  });
};

MysqlClient.prototype.startTransaction = function (idx, callback) {
  let connName = this._getConnName(idx);
  if (!connName){
    const desc = `MysqlClient.startTransaction _getConnName failed for idx ${idx}.`;
    let err = new Error(desc);
    logger.error(err.message);
    callback('error', err);
    return;
  }

  this.poolCluster.getConnection(connName, (err, connection) => {
    if (err) {
      const desc = `startTransaction get db ${connName} connection for idx ${idx} error: ${err}`;
      logger.error(desc + err);
      if (connection && connection.release) connection.release();
      callback('error', err);
    } else {
      connection.beginTransaction((err)=>{
        if (err) {
          connection.release();
          const desc = `begin transaction failed, err: ${err}, connection: ${connection.threadId}`;
          logger.error(desc);
          callback(err, desc);
        } else {
          logger.trace(`startTransaction idx ${idx}, connection: ${connection.threadId}`);
          callback(null, connection);
        }
      });
    }
  });
};

MysqlClient.prototype.queryInTraction = function (connection, sql, callback) {
  if (connection) {
    connection.query(sql, (err, rows, fields) => {
      if (err) {
        logger.error(`queryInTraction SQL ERROR: ${sql}, connection: ${connection.threadId}`);
        callback(err, rows, fields);
      } else {
        logger.trace(`queryInTraction SQL OK: ${sql}, connection: ${connection.threadId}`);
        callback(null, rows, fields);
      }
    });
  }
  else{
    const desc = `finishTraction parameter connection is error: ${connection}.`;
    logger.error(desc);
    callback('error', desc);
  }
};

MysqlClient.prototype.finishTraction = function (connection, callback) {
  if (connection) {
    connection.commit((err)=>{
      if (err) {
        logger.error(`transaction commit failed, will rollback, connection: ${connection.threadId}, err: ${err}`);
        connection.rollback(()=>{
          logger.error(`transaction has rollbacked, connection: ${connection.threadId}.`);
          connection.release();
          callback(err);
        });
      } else {
        logger.trace(`commit success, connection: ${connection.threadId}`);
        connection.release();
        callback(null);
      }
    });
  }
  else{
    const desc = `finishTraction parameter connection is error: ${connection}.`;
    logger.error(desc);
    callback('error', desc);
  }
};

MysqlClient.prototype.select = function (idx, sql, callback) {
  try {
    if (sql.toUpperCase().indexOf('SELECT ') === 0){
      return this._querySql(idx, sql, callback); 
    }
    else{
      const desc = 'MysqlClient.select sql is not startswith: SELECT ...';
      logger.error(desc);
      callback('error', desc);
    }
  } catch (e) {
    logger.error(`MysqlClient.select: [${sql}] execption: ${e.stack}`);
    callback('error', `${e}: ${sql}`);
  } 
};

MysqlClient.prototype.insert = function (idx, sql, callback) {
  try {
    if (sql.toUpperCase().indexOf('INSERT ') === 0){
      return this._querySql(idx, sql, callback); 
    }
    else{
      const desc = 'MysqlClient.insert sql is not startswith: INSERT ...';
      logger.error(desc);
      callback('error', desc);
    }
  } catch (e) {
    logger.error(`MysqlClient.insert: [${sql}] execption: ${e.stack}`);
    callback('error', `${e}: ${sql}`);
  } 
};

MysqlClient.prototype.update = function (idx, sql, callback) {
  try {
    if (sql.toUpperCase().indexOf('UPDATE ') === 0){
      return this._querySql(idx, sql, callback); 
    }
    else{
      const desc = 'MysqlClient.update sql is not startswith: UPDATE ...';
      logger.error(desc);
      callback('error', desc);
    }
  } catch (e) {
    logger.error(`MysqlClient.update: [${sql}] execption: ${e.stack}`);
    callback('error', `${e}: ${sql}`);
  } 
};

MysqlClient.prototype.delete = function (idx, sql, callback) {
  try {
    if (sql.toUpperCase().indexOf('DELETE ') === 0){
      return this._querySql(idx, sql, callback); 
    }
    else{
      const desc = 'MysqlClient.delete sql is not startswith: DELETE ...';
      logger.error(desc);
      callback('error', desc);
    }
  } catch (e) {
    logger.error(`MysqlClient.delete: [${sql}] execption: ${e.stack}`);
    callback('error', `${e}: ${sql}`);
  } 
};


MysqlClient.prototype.createTable = function (idx, sql, callback) {
  try {
    if (sql.toUpperCase().indexOf('CREATE TABLE ') === 0){
      return this._querySql(idx, sql, callback); 
    }
    else{
      const desc = 'MysqlClient.createTable sql is not startswith: CREATE TABLE ...';
      logger.error(desc);
      callback('error', desc);
    }
  } catch (e) {
    logger.error(`MysqlClient.createTable: [${sql}] execption: ${e.stack}`);
    callback('error', `${e}: ${sql}`);
  } 
};

MysqlClient.prototype.rawSQL = function (idx, sql, callback) {
  try {
    return this._querySql(idx, sql, callback); 
  } catch (e) {
    logger.error(`MysqlClient.rawSQL: [${sql}] execption: ${e.stack}`);
    callback('error', `${e}: ${sql}`);
  } 
};

module.exports = MysqlClient;
