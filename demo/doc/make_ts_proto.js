#!/usr/bin/env node
/*
 *************************************************************************
 *    File Name:  make_ts_proto.js
 *       Author: Taomee Shanghai,Inc.
 *         Mail: aceway@taomee.com
 * Created Time: Tue 28 Aug 2018 01:59:42 AM EDT
 * 
 *  Description: 将 js 格式定义的协议转换成前端使用的 .d.ts 格式(前端ts语言使用)
 * 
 ************************************************************************
*/
'use strict';
const fs = require('fs');

// 字段key支持的类型
const KEY_TYPES = ['string'];

// 字段value支持的类型
const VALUE_TYPES = ['number', 'string', 'object', 'undefined'];
const KV_PREFIX = " "; // 生成字段的缩进前缀

// 将字符串重复多次
const repeat_string = (str, times)=>{
  if (!times) return "";
  if (times == 1) return str + "";

  str = str + "";
  return new Array(times + 1).join(str);
}

// 协议一个字段从 js 定义转换成 ts 定义
const make_proto_content = (key,value, root, deep)=>{
  if (!deep) deep = 1;
  else deep = deep + 1;

  const ktype = typeof key;
  const vtype = typeof value;
  if (KEY_TYPES.indexOf(ktype) < 0 ){
    throw new Error(`the proto key <${key}] type error, must be string`);
  }
  if (VALUE_TYPES.indexOf(vtype) < 0 ){
    throw new Error(`字段<${key}>的值<${value}>的类型错误, 不可以是类: <${vtype}>.`);
  }

  let content = "";
  if (vtype === 'undefined'){
    content = `${key}: any`;
  }
  else if (vtype === 'string' && value.length > 0){
    if (value.indexOf('cs_') === 0 || value.indexOf('sc_') === 0){
      throw new Error(`字段<${key}>的值<${value}>错误, 协议字段的值不能是别的协议.`);
    }
    else if (root[value]){
      content = `${key}: ${value};`;
    }
    else{
      throw new Error(`字段<${key}>的值<${value}>错误, 既不是原子类型也不是协议已定义的对象类型.`);
    }
  }
  else if (vtype === 'object'){
    if (Array.isArray(value)) {
      if (value.length != 1){
        throw new Error(`字段<${key}>的值是列表，则有且只能有一个元素来指明内部类型.`);
      }
      var innerValue = value[0];
      var innerType = typeof value[0];
      if ('number' === innerType){
        content = `${key}: ${innerType}[]`;
      }
      else if ('undefined' === innerType ){
        content = `${key}: any[]`;
      }
      else if ('string' === innerType){
        if (innerValue.length > 0){
          if (innerValue.indexOf('cs_') === 0 || innerValue.indexOf('sc_') === 0){
            throw new Error(`字段<${key}>的值<${innerValue}>错误, 协议字段的值不能是别的协议.`);
          }
          else if (root[innerValue]){
            content = `${key}: ${innerValue}[]`;
          }
          else{
            throw new Error(`字段<${key}>的值是对象列表，但对象<${value}>未在协议里定义.`);
          }
        }
        else{
          content = `${key}: ${innerType}[]`;
        }
      }
      else{
        throw new Error(`字段<${key}>值是类别，但值定义错误: <${value}>.`);
      }
    }
    else{
      throw new Error(`字段<${key}>的值<${value}>定义错误, 如果是对象，则只能是列表.`);
    }
  }
  else{
    content = `${key}: ${vtype}`;
  }

  const prefix = repeat_string(KV_PREFIX, deep * 2);
  return `${prefix}${content};`;
}

// 根据一条协议的 js 格式生成 ts 格式
const make_one_poro = (name, content, root)=>{
  const head = `export interface ${name}{`;

  let kvs = "";
  for(let k in content){
    try{
      const kv = make_proto_content(k, content[k], root);

      if (kvs.length === 0) kvs = kv;
      else kvs = `${kvs}\n${kv}`;
    }
    catch(e){
      console.error(`协议<${name}>字段<${k}>定义错误, ${e}`);
      process.exit(1);
    }

  }

  const tail = `}`;
  
  return `${head}\n${kvs}\n${tail}\n\n`
};

// 生成的 ts 协议写入文件
const make_output_d_ts = (tsProto, outFile)=>{
  fs.writeFile(outFile, tsProto, (error, result)=>{
    if (error){
      console.error(`生成 d.ts 协议写入文件<${outFile}> 失败:`, error, result);
    }
    else{
      console.info(`生成 d.ts 协议写入文件<${outFile}> OK`);
    }
  });
}

const main = (jsProtoFile, tsProtoFile)=>{
  const jsPoro = require(jsProtoFile);
  let tsProto = "";
  for(let k in jsPoro){
    const ts_proto = make_one_poro(k, jsPoro[k], jsPoro);
    console.log(ts_proto);
    if (tsProto.length === 0) tsProto = ts_proto;
    else tsProto = `${tsProto}\n${ts_proto}`;
  }

  make_output_d_ts(tsProto, tsProtoFile);
}

const input_js_proto_file = './proto.js';
const output_ts_proto_file = './proto.d.ts';
main(input_js_proto_file, output_ts_proto_file);
