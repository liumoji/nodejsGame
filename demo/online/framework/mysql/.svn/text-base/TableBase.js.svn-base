/*
 *************************************************************************
 *    File Name:  tableBase.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: 2019年09月17日 星期二 11时49分40秒
 * 
 *  Description: ...
 * 
 ************************************************************************
*/
'use strict';

const logger = require('../../framework/utils/logger.js');

class TableBase {
  constructor(mysqlClient, tb_prefix, tb_split_cnt) {
    this.mysqlClient = mysqlClient;
    this.db_prefix = mysqlClient.mysqlCfg.db_prefix;
    this.db_split_cnt = mysqlClient.mysqlCfg.db_split_cnt;

    if (this.db_prefix === undefined || this.db_split_cnt === undefined){
      logger.error(`TableBase parameter mysqlClient db_prefix or db_split_cnt undefined.`);
      process.exit();
    }

    this.tb_prefix = tb_prefix;
    this.tb_split_cnt = tb_split_cnt;
  }
}

TableBase.prototype.getDBTableName = function (idx) {
  let dbName = '';
  if (this.db_split_cnt <= 1){
    dbName = this.db_prefix;
  }
  else{
    let db_idx = idx % this.db_split_cnt;
    if (this.db_split_cnt <= 10){
      db_idx = `${db_idx}`;
    }
    else if (10 < this.db_split_cnt && this.db_split_cnt <= 100 ){
      if (db_idx < 10){
        db_idx = `0${db_idx}`;
      }
      else{
        db_idx = `${db_idx}`;
      }
    }
    else if (100 < this.db_split_cnt && this.db_split_cnt <= 1000 ){
      if (db_idx < 10){
        db_idx = `00${db_idx}`;
      }
      else if (10 <= db_idx && db_idx < 100){
        db_idx = `0${db_idx}`;
      }
      else{
        db_idx = `${db_idx}`;
      }
    }
    else {
      logger.error(`TableBase.getDBTableName db_split_cnt error: ${this.db_split_cnt}`);
      return null;
    }

    dbName = `${this.db_prefix}${db_idx}`;
  }

  let tbName = '';
  if (this.tb_split_cnt <= 1){
    tbName = this.tb_prefix;
  }
  else{
    let tb_idx;
    if (this.db_split_cnt <= 1){
      tb_idx = Number(idx) % this.tb_split_cnt;
    }
    else{
      tb_idx = Math.floor(Number(idx) / this.db_split_cnt) % this.tb_split_cnt;
    }

    if (this.tb_split_cnt <= 10){
      tb_idx = `${tb_idx}`;
    }
    else if (10 < this.tb_split_cnt && this.tb_split_cnt <= 100 ){
      if (tb_idx < 10){
        tb_idx = `0${tb_idx}`;
      }
      else{
        tb_idx = `${tb_idx}`;
      }
    }
    else if (100 < this.tb_split_cnt && this.tb_split_cnt <= 1000 ){
      if (tb_idx < 10){
        tb_idx = `00${tb_idx}`;
      }
      else if (10 <= tb_idx && tb_idx < 100){
        tb_idx = `0${tb_idx}`;
      }
      else{
        tb_idx = `${tb_idx}`;
      }
    }
    else {
      logger.error(`TableBase.getDBTableName tb_split_cnt error: ${this.tb_split_cnt}`);
      return null;
    }

    tbName = `${this.tb_prefix}${tb_idx}`;
  }

  return `${dbName}.${tbName}`;
};

TableBase.prototype.getDBTableNameByDate = function (idx, dateFormat, theDate) {
  let dbName = '';
  if (this.db_split_cnt <= 1){
    dbName = this.db_prefix;
  }
  else{
    let db_idx = idx % this.db_split_cnt;
    if (this.db_split_cnt <= 10){
      db_idx = `${db_idx}`;
    }
    else if (10 < this.db_split_cnt && this.db_split_cnt <= 100 ){
      if (db_idx < 10){
        db_idx = `0${db_idx}`;
      }
      else{
        db_idx = `${db_idx}`;
      }
    }
    else if (100 < this.db_split_cnt && this.db_split_cnt <= 1000 ){
      if (db_idx < 10){
        db_idx = `00${db_idx}`;
      }
      else if (10 <= db_idx && db_idx < 100){
        db_idx = `0${db_idx}`;
      }
      else{
        db_idx = `${db_idx}`;
      }
    }
    else {
      logger.error(`TableBase.getDBTableName db_split_cnt error: ${this.db_split_cnt}`);
      return null;
    }

    dbName = `${this.db_prefix}${db_idx}`;
  }

  const today = theDate || new Date();
  let tb_idx = today.format(dateFormat || 'yyyyMMdd');
  const tbName = `${this.tb_prefix}${tb_idx}`;

  return `${dbName}.${tbName}`;
};

TableBase.prototype.select = function (idx, sql, callback) {
  this.mysqlClient.select(idx, sql, callback);
};

TableBase.prototype.insert = function (idx, sql, callback) {
  this.mysqlClient.insert(idx, sql, callback);
};

TableBase.prototype.update = function (idx, sql, callback) {
  this.mysqlClient.update(idx, sql, callback);
};

TableBase.prototype.delete = function (idx, sql, callback) {
  this.mysqlClient.delete(idx, sql, callback);
};

module.exports = TableBase;
